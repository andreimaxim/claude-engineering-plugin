import { z } from "zod";
import { existsSync } from "node:fs";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { caseSnapshotDir, loadBatch, loadRecord, prepareRun, readText, saveRecord } from "./batch.ts";
import { hashTree, readJson, timestamp } from "./files.ts";
import type { HostContext, HostObservation } from "./hosts/host.ts";
import { hostFor } from "./hosts/index.ts";
import { outsideAccess, parseStream, readsSuppliedSkill, summarizeToolUse } from "./hosts/stream.ts";
import { runDir, toolchainsDir } from "./paths.ts";
import { exec, must } from "./process.ts";
import { loadRepository } from "./repositories.ts";
import {
  type Batch,
  CaseDefinition,
  type CheckResult,
  type Match,
  type Observed,
  type Outcome,
  type RunRecord,
} from "./schema.ts";


const agentTimeoutMs = 60 * 60 * 1000;

const context = async (batch: Batch, record: RunRecord): Promise<HostContext> => {
  const dir = runDir(batch.id, record.run.id);
  return {
    runDir: dir,
    workDir: join(dir, "work"),
    homeDir: join(dir, "home"),
    prompt: record.prompt ?? "",
    requested: batch.requested,
    runtimeEnv: await readJson(join(dir, "runtime-env.json"), z.record(z.string(), z.string())),
  };
};

/** Execute every prepared run. Launched-but-unfinished runs are reported, never relaunched. */
export async function executeBatch(batchId: string, jobs: number): Promise<void> {
  const batch = await loadBatch(batchId);
  const host = hostFor(batch.requested.host);
  await host.preflight();
  const records = await Promise.all(batch.runs.map((run) => loadRecord(batch.id, run.id)));
  for (const record of records.filter((r) => r.state === "launched")) {
    console.log(`uncertain  ${record.run.id}: launched at ${record.launchedAt} with no recorded exit; not relaunching.`);
  }
  const pending = records.filter((r) => r.state === "prepared");
  console.log(`${pending.length} prepared run(s); running ${Math.min(jobs, pending.length)} at a time.`);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(jobs, pending.length) }, async () => {
      while (next < pending.length) {
        const record = pending[next++];
        if (record) await executeRun(batch, record);
      }
    }),
  );
}

async function executeRun(batch: Batch, record: RunRecord): Promise<void> {
  const host = hostFor(batch.requested.host);
  const ctx = await context(batch, record);
  // Persist the launch before spawning: a crash after this point leaves the run
  // "launched" (uncertain) so it is never silently relaunched.
  record.state = "launched";
  record.launchedAt = timestamp();
  await saveRecord(batch.id, record);
  console.log(`launch     ${record.run.id}`);

  const { argv, env } = host.launch(ctx);
  let exitCode: number | null = null;
  let seconds: number | null = null;
  let launchError: string | null = null;
  try {
    const result = await exec(argv, {
      cwd: ctx.workDir,
      env,
      timeoutMs: agentTimeoutMs,
      stdoutFile: join(ctx.runDir, "transcript.jsonl"),
      stderrFile: join(ctx.runDir, "stderr.txt"),
    });
    exitCode = result.code;
    seconds = result.seconds;
    if (result.signal) launchError = `terminated by ${result.signal}`;
  } catch (error) {
    launchError = error instanceof Error ? error.message : String(error);
  }
  record.exitCode = exitCode;
  await collectEvidence(batch, record, ctx, { seconds, launchError });
  record.state = "finished";
  record.finishedAt = timestamp();
  await saveRecord(batch.id, record);
  console.log(`finished   ${record.run.id}: ${record.outcome?.execution}, checks ${record.outcome?.checks}`);
}

async function workspaceChanges(workDir: string, baseCommit: string): Promise<{ diff: string; paths: string[] }> {
  // A throwaway index captures untracked files without touching the agent's index.
  const index = join(workDir, "..", "evaluation.index");
  const env = { ...process.env, GIT_INDEX_FILE: index };
  await must(["git", "-C", workDir, "read-tree", baseCommit], { env });
  await must(["git", "-C", workDir, "add", "--all"], { env });
  const diff = await exec(["git", "-C", workDir, "diff", "--cached", "--binary", baseCommit], { env });
  const names = await must(["git", "-C", workDir, "diff", "--cached", "--name-only", baseCommit], { env });
  await rm(index, { force: true });
  return { diff: diff.stdout, paths: names ? names.split("\n") : [] };
}

async function runChecks(batch: Batch, record: RunRecord, workDir: string, runtimeEnv: Record<string, string>): Promise<CheckResult[]> {
  const snapshot = caseSnapshotDir(batch.id, `${record.run.case.skill}/${record.run.case.name}@v${record.run.case.version}`);
  const definition = await readJson(join(snapshot, "case.json"), CaseDefinition);
  const results: CheckResult[] = [];
  for (const check of definition.checks) {
    const started = performance.now();
    if (check.kind === "file-equals") {
      const actual = existsSync(join(workDir, check.path)) ? await readFile(join(workDir, check.path)) : null;
      const expected = await readFile(join(snapshot, check.expected));
      const passed = actual !== null && actual.equals(expected);
      results.push({
        id: check.id,
        description: check.description,
        command: ["compare", check.path, `{case}/${check.expected}`],
        exitCode: passed ? 0 : 1,
        passed,
        seconds: (performance.now() - started) / 1000,
        output: actual === null ? `${check.path} is missing` : passed ? "identical" : `${check.path} differs from the expected bytes`,
      });
      continue;
    }
    if (definition.input.kind !== "repository") throw new Error(`${check.id}: repository-test needs a repository case`);
    const repository = await loadRepository(definition.input.repository);
    const path = check.path.replace("{case}", snapshot);
    const argv = [...repository.toolchain.testCommand, path];
    const result = await exec(argv, { cwd: workDir, env: { ...process.env, ...runtimeEnv }, timeoutMs: 15 * 60 * 1000 });
    const output = `${result.stdout}${result.stderr ? `\n--- stderr ---\n${result.stderr}` : ""}`;
    results.push({
      id: check.id,
      description: check.description,
      command: [...repository.toolchain.testCommand, check.path],
      exitCode: result.code,
      passed: result.code === 0,
      seconds: result.seconds,
      output: output.length > 20000 ? `${output.slice(0, 10000)}\n…\n${output.slice(-10000)}` : output,
    });
  }
  return results;
}

const sameSet = (a: string[], b: string[]) => a.length === b.length && [...a].sort().every((value, i) => value === [...b].sort()[i]);

async function collectEvidence(
  batch: Batch,
  record: RunRecord,
  ctx: HostContext,
  launch: { seconds: number | null; launchError: string | null },
): Promise<void> {
  const host = hostFor(batch.requested.host);
  const stream = parseStream((await readText(join(ctx.runDir, "transcript.jsonl"))) ?? "");
  let observation: HostObservation | null = null;
  let observeError: string | null = null;
  if (!launch.launchError) {
    try {
      observation = await host.observe(ctx, stream);
    } catch (error) {
      observeError = error instanceof Error ? error.message : String(error);
    }
  }
  const { diff, paths } = await workspaceChanges(ctx.workDir, record.baseCommit ?? "HEAD");
  await writeFile(join(ctx.runDir, "changes.diff"), diff);
  const response = observation?.response ?? null;
  await writeFile(join(ctx.runDir, "response.md"), response ?? "");
  const actions = stream.toolUses.map((use) => summarizeToolUse(use, ctx.workDir));
  await writeFile(join(ctx.runDir, "actions.json"), `${JSON.stringify(actions, null, 2)}\n`);
  const checks = launch.launchError ? [] : await runChecks(batch, record, ctx.workDir, ctx.runtimeEnv);
  const skillIntact = record.skillFiles
    ? JSON.stringify(await hashTree(join(ctx.workDir, "reference"))) === JSON.stringify(record.skillFiles)
    : null;

  const observed: Observed = {
    hostVersion: observation?.hostVersion ?? null,
    sessionId: observation?.sessionId ?? null,
    models: observation?.models ?? [],
    effort: observation?.effort ?? null,
    mode: observation?.mode ?? null,
    tools: observation?.tools ?? [],
    seconds: launch.seconds,
    inputTokens: observation?.inputTokens ?? null,
    outputTokens: observation?.outputTokens ?? null,
    skillRead: record.run.condition === "with-skill" ? readsSuppliedSkill(stream.toolUses) : null,
    outsideAccess: outsideAccess(stream.toolUses, ctx.workDir, [toolchainsDir]),
    disabledToolErrors: stream.toolUses.filter((use) => use.error && /is disabled/.test(use.resultText)).length,
    mcpServers: observation?.mcpServers ?? [],
    hostGuidance: observation?.hostGuidance ?? [],
    workspaceGuidance: record.observedAtPreparation?.workspaceGuidance ?? [],
  };

  const expectedTools = host.expectedTools(batch.requested);
  const model: Match = !observed.models.length
    ? "unknown"
    : batch.requested.model
      ? observed.models.length === 1 && observed.models[0] === batch.requested.model ? "match" : "mismatch"
      : "unknown";
  const tools: Match = !stream.init
    ? "unknown"
    : sameSet(observed.tools, expectedTools) && observed.disabledToolErrors === 0 ? "match" : "mismatch";
  const missingEvidence = [
    ...(stream.init ? [] : ["no host initialization event"]),
    ...(response ? [] : ["no final response"]),
    ...(observed.models.length ? [] : ["no observed model identity"]),
    ...(record.run.condition === "with-skill" && !observed.skillRead ? ["supplied skill read not observed in the trace"] : []),
    ...(stream.malformedLines ? [`${stream.malformedLines} malformed transcript line(s)`] : []),
  ];
  const outcome: Outcome = {
    execution: launch.launchError ? "launch-failed" : observation?.error || observeError || record.exitCode !== 0 ? "host-error" : "succeeded",
    detail: launch.launchError ?? observeError ?? observation?.error ?? (record.exitCode !== 0 ? `exit code ${record.exitCode}` : null),
    model,
    tools,
    skillIntact,
    missingEvidence,
    checks: launch.launchError ? "not-run" : checks.length === 0 ? "none" : checks.every((c) => c.passed) ? "passed" : "failed",
  };
  Object.assign(record, { observed, outcome, checks, changedPaths: paths });
}

/**
 * Re-derive evidence for finished runs from their preserved transcripts and
 * workspaces (for example after an adapter fix). Never relaunches an agent.
 */
export async function recollectBatch(batchId: string): Promise<void> {
  const batch = await loadBatch(batchId);
  for (const planned of batch.runs) {
    const record = await loadRecord(batchId, planned.id);
    if (record.state !== "finished" || record.outcome?.execution === "launch-failed") continue;
    await collectEvidence(batch, record, await context(batch, record), { seconds: record.observed?.seconds ?? null, launchError: null });
    await saveRecord(batchId, record);
    console.log(`recollected ${planned.id}: ${record.outcome?.execution}, checks ${record.outcome?.checks}`);
  }
}

/**
 * Explicit operator decision to discard an attempt (for example an uncertain or
 * setup-failed run). The old directory is archived, and a fresh workspace is prepared.
 */
export async function resetRun(batchId: string, runId: string, reason: string): Promise<void> {
  const batch = await loadBatch(batchId);
  const planned = batch.runs.find((run) => run.id === runId);
  if (!planned) throw new Error(`${runId} is not in ${batchId}`);
  const previous = await loadRecord(batchId, runId);
  const dir = runDir(batchId, runId);
  const archivedAs = `${dir}.attempt-${previous.resets.length + 1}`;
  await rename(dir, archivedAs);
  const fresh = await prepareRun(batch, planned);
  fresh.resets = [...previous.resets, { at: timestamp(), reason, archivedAs }];
  await saveRecord(batchId, fresh);
}
