import { randomInt } from "node:crypto";
import { existsSync } from "node:fs";
import { copyFile, cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import type { LoadedCase } from "./cases.ts";
import { hashTree, readJson, timestamp, writeJson } from "./files.ts";
import { hostFor } from "./hosts/index.ts";
import { batchDir, evalsRoot, runDir, skillsDir } from "./paths.ts";
import { must } from "./process.ts";
import { ensureRepository, ensureToolchain, loadRepository, materialize, runtimeEnvironment } from "./repositories.ts";
import { harnessSourceHash, revision } from "./revisions.ts";
import {
  Batch,
  CaseDefinition,
  type Condition,
  type PlannedRun,
  type RequestedSettings,
  RunRecord,
} from "./schema.ts";

// The only difference between conditions: the supplied skill directory and this line.
export const skillInstruction = "Read reference/SKILL.md and apply its guidance to this task.";

// Shared by both conditions. Kept verbatim from the pilot for comparability.
const confinement =
  "Work only in this task checkout and its supplied reference, if any. Do not inspect other runs, grading files, " +
  "unrelated directories, credentials, or personal configuration. Do not launch another agent through a CLI. Use the " +
  "tools actually available; report missing capabilities honestly. Do not push, publish, or change external services.";

export const composePrompt = (task: string, condition: Condition): string =>
  [condition === "with-skill" ? skillInstruction : null, task, confinement].filter(Boolean).join("\n\n");

/** Private workspace paths are excluded from diffs so only agent changes are reported. */
const harnessPaths = ["/reference/", "/.eval-runtime/", "/EVAL_ENVIRONMENT.md"];

const git = (cwd: string, ...args: string[]) =>
  must(["git", "-c", "user.name=evaluation", "-c", "user.email=evaluation@localhost", "-C", cwd, ...args], {
    env: { ...process.env, GIT_AUTHOR_DATE: "2026-01-01T00:00:00Z", GIT_COMMITTER_DATE: "2026-01-01T00:00:00Z" },
  });

export const loadBatch = (id: string) => readJson(join(batchDir(id), "batch.json"), Batch);
export const recordPath = (batch: string, run: string) => join(runDir(batch, run), "run.json");
export const loadRecord = (batch: string, run: string) => readJson(recordPath(batch, run), RunRecord);
export const saveRecord = (batch: string, record: RunRecord) => writeJson(recordPath(batch, record.run.id), record);
export const caseSnapshotDir = (batch: string, key: string) => join(batchDir(batch), "cases", key.replace(/[/@]/g, "."));

/** Deterministic PRNG for condition order (mulberry32). */
function orderRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function planRuns(cases: LoadedCase[], repetitions: number, seed: number): PlannedRun[] {
  const random = orderRandom(seed);
  const runs: PlannedRun[] = [];
  for (const c of cases) {
    for (let repetition = 1; repetition <= repetitions; repetition += 1) {
      const pair = `${c.skill}.${c.name}.v${c.version}.r${repetition}`;
      const order: Condition[] = random() < 0.5 ? ["without-skill", "with-skill"] : ["with-skill", "without-skill"];
      order.forEach((condition, index) =>
        runs.push({
          id: `${pair}.${condition}`,
          case: { skill: c.skill, name: c.name, version: c.version },
          repetition,
          condition,
          pair,
          orderInPair: index === 0 ? 1 : 2,
        }),
      );
    }
  }
  return runs;
}

export async function createBatch(options: {
  cases: LoadedCase[];
  requested: RequestedSettings;
  repetitions: number;
  seed?: number;
}): Promise<Batch> {
  const blocked = options.cases.filter((c) => c.status.kind === "blocked");
  if (blocked.length) throw new Error(`Blocked cases cannot run: ${blocked.map((c) => c.key).join(", ")}`);
  const host = hostFor(options.requested.host);
  await host.preflight();

  const orderSeed = options.seed ?? randomInt(2 ** 31);
  const id = `${timestamp().slice(0, 16).replace(/[-:]/g, "").replace("T", "-")}-${options.requested.host}-${randomInt(36 ** 3).toString(36)}`;
  const batch: Batch = {
    id,
    createdAt: timestamp(),
    requested: options.requested,
    repetitions: options.repetitions,
    orderSeed,
    harness: { ...(await revision("evals")), sourceSha256: await harnessSourceHash() },
    skills: await revision("skills"),
    runs: planRuns(options.cases, options.repetitions, orderSeed),
  };
  await writeJson(join(batchDir(id), "batch.json"), batch);

  // Snapshot each case definition and its input files: publication reads these, never
  // the (possibly edited) working copy.
  for (const c of options.cases) {
    const snapshot = caseSnapshotDir(id, c.key);
    await cp(c.dir, snapshot, { recursive: true });
  }
  for (const repositoryName of new Set(options.cases.flatMap((c) => (c.input.kind === "repository" ? [c.input.repository] : [])))) {
    const repository = await loadRepository(repositoryName);
    await ensureRepository(repository);
    if (options.cases.some((c) => c.input.kind === "repository" && c.input.repository === repositoryName && c.input.runtime)) {
      await ensureToolchain(repository);
    }
  }
  for (const planned of batch.runs) await prepareRun(batch, planned);
  return batch;
}

async function workspaceGuidance(workDir: string): Promise<string[]> {
  const names = ["AGENTS.md", "AGENT.md", "CLAUDE.md", ".agents", ".claude"];
  const found: string[] = [];
  for (let dir = dirname(workDir); dir !== dirname(dir); dir = dirname(dir)) {
    for (const name of names) if (existsSync(join(dir, name))) found.push(join(dir, name));
  }
  const tracked = await must(["git", "-C", workDir, "ls-files"]);
  for (const file of tracked.split("\n")) {
    if (names.some((name) => file === name || file.endsWith(`/${name}`) || file.startsWith(`${name}/`) || file.includes(`/${name}/`))) {
      found.push(`workspace: ${file}`);
    }
  }
  return found;
}

export async function prepareRun(batch: Batch, planned: PlannedRun): Promise<RunRecord> {
  const dir = runDir(batch.id, planned.id);
  const work = join(dir, "work");
  const home = join(dir, "home");
  const record: RunRecord = { run: planned, state: "prepared", resets: [] };
  try {
    const snapshot = caseSnapshotDir(batch.id, `${planned.case.skill}/${planned.case.name}@v${planned.case.version}`);
    const definition = await readJson(join(snapshot, "case.json"), CaseDefinition);
    await mkdir(work, { recursive: true });
    await mkdir(home, { recursive: true });
    let runtimeEnv: Record<string, string> = {};

    if (definition.input.kind === "files") {
      for (const file of definition.input.files) await copyFile(join(snapshot, file), join(work, basename(file)));
      await git(work, "init", "--quiet");
      await git(work, "add", "--all");
      await git(work, "commit", "--quiet", "--message", "Evaluation input");
    } else {
      const repository = await loadRepository(definition.input.repository);
      await materialize(repository, work);
      if (definition.input.overlay) {
        await git(work, "apply", join(snapshot, definition.input.overlay));
        await git(work, "commit", "--quiet", "--all", "--message", "Evaluation input");
      }
      if (definition.input.runtime) {
        const runtime = join(work, ".eval-runtime");
        await cp(join(evalsRoot, repository.toolchain.runtimeDir), runtime, { recursive: true });
        await writeFile(join(work, "EVAL_ENVIRONMENT.md"), `# Evaluation environment\n\n${repository.toolchain.agentNotes}\n`);
        runtimeEnv = runtimeEnvironment(repository, runtime);
      }
    }
    await writeFile(join(work, ".git", "info", "exclude"), `${harnessPaths.join("\n")}\n`, { flag: "a" });
    record.baseCommit = await git(work, "rev-parse", "HEAD");

    if (planned.condition === "with-skill") {
      await cp(join(skillsDir, planned.case.skill), join(work, "reference"), { recursive: true });
      record.skillFiles = await hashTree(join(work, "reference"));
    }
    record.prompt = composePrompt(definition.prompt, planned.condition);
    await writeFile(join(dir, "prompt.txt"), record.prompt);
    await writeJson(join(dir, "runtime-env.json"), runtimeEnv);
    await hostFor(batch.requested.host).prepare({
      runDir: dir,
      workDir: work,
      homeDir: home,
      prompt: record.prompt,
      requested: batch.requested,
      runtimeEnv,
    });
    record.observedAtPreparation = { workspaceGuidance: await workspaceGuidance(work) };
    record.preparedAt = timestamp();
  } catch (error) {
    record.state = "setup-failed";
    record.setupError = error instanceof Error ? error.message : String(error);
  }
  await saveRecord(batch.id, record);
  return record;
}

export async function listBatches(): Promise<string[]> {
  const root = dirname(batchDir("x"));
  return existsSync(root) ? (await readdir(root)).sort() : [];
}

export const readText = (path: string) => (existsSync(path) ? readFile(path, "utf8") : Promise.resolve(null));
