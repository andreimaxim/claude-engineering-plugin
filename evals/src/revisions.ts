import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { listFiles, sha256 } from "./files.ts";
import { evalsRoot, repoRoot } from "./paths.ts";
import { exec } from "./process.ts";

/** Commit of this repository and whether `path` has uncommitted changes. */
export async function revision(path: string): Promise<{ commit: string | null; dirty: boolean }> {
  const head = await exec(["git", "-C", repoRoot, "rev-parse", "HEAD"]);
  const status = await exec(["git", "-C", repoRoot, "status", "--porcelain", "--", path]);
  return { commit: head.code === 0 ? head.stdout.trim() : null, dirty: status.stdout.trim().length > 0 };
}

/** Content hash of the harness source, so dirty-tree batches remain distinguishable. */
export async function harnessSourceHash(): Promise<string> {
  const root = join(evalsRoot, "src");
  const parts: string[] = [];
  for (const file of await listFiles(root)) parts.push(`${file}:${sha256(await readFile(join(root, file)))}`);
  return sha256(parts.join("\n"));
}
