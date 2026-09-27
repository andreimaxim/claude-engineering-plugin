import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { readJson } from "./files.ts";
import { evalsRoot, reposDir, toolchainsDir } from "./paths.ts";
import { exec, must } from "./process.ts";
import { Repositories, type Repository } from "./schema.ts";

export type NamedRepository = Repository & { name: string };

export async function loadRepository(name: string): Promise<NamedRepository> {
  const repositories = await readJson(join(evalsRoot, "repositories.json"), Repositories);
  const repository = repositories[name];
  if (!repository) throw new Error(`Unknown repository ${name}; add it to repositories.json`);
  return { ...repository, name };
}

const cachePath = (repository: NamedRepository) => join(reposDir, `${repository.name}.git`);
const toolchainPath = (repository: NamedRepository) =>
  join(toolchainsDir, `${repository.name}-${repository.commit.slice(0, 12)}`);

/** Fetch the pinned commit into a bare cache outside this repository. Idempotent. */
export async function ensureRepository(repository: NamedRepository): Promise<void> {
  const cache = cachePath(repository);
  if (!existsSync(cache)) {
    await mkdir(cache, { recursive: true });
    await must(["git", "init", "--quiet", "--bare", cache]);
  }
  const present = await exec(["git", "-C", cache, "cat-file", "-e", `${repository.commit}^{commit}`]);
  if (present.code === 0) return;
  console.log(`Fetching ${repository.url} ${repository.ref} (${repository.commit.slice(0, 12)})…`);
  await must(["git", "-C", cache, "fetch", "--quiet", "--depth", "1", repository.url, repository.commit]);
}

/** Environment for runtime-backed commands in a prepared checkout. */
export function runtimeEnvironment(repository: NamedRepository, runtimeDir: string): Record<string, string> {
  const substitutions: Record<string, string> = { runtime: runtimeDir, toolchainDir: toolchainPath(repository) };
  return Object.fromEntries(
    Object.entries(repository.toolchain.env).map(([key, value]) => [
      key,
      value.replace(/\{(\w+)\}/g, (_, name: string) => substitutions[name] ?? `{${name}}`),
    ]),
  );
}

/** Check the toolchain and install the pinned runtime into the external toolchain cache. */
export async function ensureToolchain(repository: NamedRepository): Promise<void> {
  for (const probe of repository.toolchain.probes) {
    const result = await exec(probe).catch((error: Error) => ({ code: -1, stderr: error.message, stdout: "" }));
    if (result.code !== 0) {
      throw new Error(`${repository.name} needs ${repository.toolchain.description} (${probe.join(" ")} failed)`);
    }
  }
  const runtime = join(evalsRoot, repository.toolchain.runtimeDir);
  const env = { ...process.env, ...runtimeEnvironment(repository, runtime), BUNDLE_FROZEN: "true" };
  const verified = await exec(repository.toolchain.verify, { cwd: runtime, env });
  if (verified.code === 0) return;
  console.log(`Installing the ${repository.name} runtime into ${toolchainPath(repository)}…`);
  await must(repository.toolchain.install, { cwd: runtime, env });
  await must(repository.toolchain.verify, { cwd: runtime, env });
}

/** Create a fresh, independent checkout of the pinned commit (no link back to the cache). */
export async function materialize(repository: NamedRepository, destination: string): Promise<void> {
  await must(["git", "init", "--quiet", destination]);
  await must(["git", "-C", destination, "fetch", "--quiet", "--depth", "1", cachePath(repository), repository.commit]);
  await must(["git", "-C", destination, "checkout", "--quiet", "--detach", repository.commit]);
}
