import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** The evals package directory (tracked, public). */
export const evalsRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const repoRoot = resolve(evalsRoot, "..");
export const casesDir = join(evalsRoot, "cases");
export const skillsDir = join(repoRoot, "skills");

/** Reviewed, publishable evidence. The server exposes only files listed from here. */
export const resultsDir = join(evalsRoot, "results");
export const datasetsDir = join(resultsDir, "datasets");
export const packetsDir = join(resultsDir, "packets");
export const webDist = join(evalsRoot, "web", "dist");

/**
 * Private state: repository caches, toolchains, run workspaces, raw traces, and
 * calibration keys. Always outside this repository and never served.
 */
export const stateHome = resolve(
  process.env.EVALS_HOME ??
    join(process.env.XDG_STATE_HOME ?? join(homedir(), ".local", "state"), "engineering-evals"),
);
export const reposDir = join(stateHome, "repos");
export const toolchainsDir = join(stateHome, "toolchains");
export const batchesDir = join(stateHome, "batches");
export const keysDir = join(stateHome, "keys");

export const batchDir = (batch: string) => join(batchesDir, batch);
export const runDir = (batch: string, run: string) => join(batchesDir, batch, "runs", run);
