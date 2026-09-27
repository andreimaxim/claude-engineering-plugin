import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { z } from "zod";
import { caseSnapshotDir, loadBatch, loadRecord, saveRecord } from "./batch.ts";
import { readJson } from "./files.ts";
import { amp, ampPublicTools } from "./hosts/amp.ts";
import type { HostContext } from "./hosts/host.ts";
import { parseStream } from "./hosts/stream.ts";
import { runDir } from "./paths.ts";
import { exec, must } from "./process.ts";
import { Action, CaseDefinition, type Grade, type RunRecord, Verdict } from "./schema.ts";

const GraderOutput = z.object({
  criteria: z.array(z.object({ id: z.string(), verdict: Verdict, evidence: z.string() })),
  note: z.string(),
});

const method =
  "Model-assisted rubric grading in a fresh isolated Amp session. The grader saw the shared task prompt (without the " +
  "skill instruction), pristine inputs, the final response, the workspace diff, harness-executed checks, and the " +
  "observed tool trace (commands with exit status and output tails) with supplied-reference reads removed. It did not see the condition label, run identity, " +
  "timing, or tokens. The response itself may still reveal the condition.";

function taskDocument(definition: CaseDefinition): string {
  const criteria = definition.criteria.map((c) => `- \`${c.id}\` (${c.kind}): ${c.text}`).join("\n");
  return `# Grading task

## Task given to the agent

${definition.prompt}

## Expected outcome

${definition.expected}

## Criteria

${criteria}

Criterion kinds: \`task\` criteria follow from the prompt or correctness; \`process\` criteria are extra expectations
the prompt did not request. Grade each independently.
`;
}

const graderPrompt = `You are grading one agent's work. Read TASK.md. The agent's final response is evidence/response.md,
its workspace changes are evidence/changes.diff, checks executed by the evaluation harness after the agent finished are
in evidence/checks.md, and the observed tool trace is evidence/actions.md. The agent's original inputs are under
inputs/ (unchanged). Verify substantive claims against inputs and executed evidence; distinguish what the agent claimed
from what was observed.

For every criterion in TASK.md, decide pass, fail, or unverified (evidence insufficient either way). Cite decisive
evidence: a short quote, file:line, check id, or action. Then write grade.json in this directory:

{"criteria":[{"id":"<criterion id>","verdict":"pass|fail|unverified","evidence":"..."}],"note":"one or two sentences"}

Do not modify inputs/ or evidence/. Work only in this directory. Do not launch another agent, push, or publish.`;

async function prepareGrader(batchId: string, record: RunRecord, definition: CaseDefinition, dir: string): Promise<void> {
  const run = runDir(batchId, record.run.id);
  const work = join(dir, "work");
  await rm(dir, { recursive: true, force: true });
  await mkdir(join(work, "evidence"), { recursive: true });
  await mkdir(join(work, "inputs"), { recursive: true });
  await mkdir(join(dir, "home"), { recursive: true });
  await writeFile(join(work, "TASK.md"), taskDocument(definition));
  await copyFile(join(run, "response.md"), join(work, "evidence", "response.md"));
  await copyFile(join(run, "changes.diff"), join(work, "evidence", "changes.diff"));
  const checks = (record.checks ?? [])
    .map((c) => `## ${c.id}: ${c.passed ? "passed" : "FAILED"} (exit ${c.exitCode})\n\n${c.description}\n\n\`${c.command.join(" ")}\`\n\n\`\`\`\n${c.output.slice(-4000)}\n\`\`\``)
    .join("\n\n");
  await writeFile(join(work, "evidence", "checks.md"), checks || "No harness checks are defined for this case.\n");
  const actions = z.array(Action).parse(JSON.parse(await readFile(join(run, "actions.json"), "utf8")));
  // Mask the condition: drop reads of the supplied reference and redact result lines naming it.
  const visible = actions
    .filter((action) => !action.summary.includes("reference/"))
    .map((action) => ({
      ...action,
      result: action.result?.replace(/^.*\breference\b.*$/gm, "[line naming the supplied reference omitted]") ?? null,
    }));
  await writeFile(
    join(work, "evidence", "actions.md"),
    visible
      .map((a, i) => `${i + 1}. ${a.tool}${a.error ? " (error)" : ""}: ${a.summary}${a.result ? `\n   Observed result:\n${a.result.replace(/^/gm, "     ")}` : ""}`)
      .join("\n") || "No tool calls.\n",
  );
  const snapshot = caseSnapshotDir(batchId, `${record.run.case.skill}/${record.run.case.name}@v${record.run.case.version}`);
  if (definition.input.kind === "files") {
    for (const file of definition.input.files) await copyFile(join(snapshot, file), join(work, "inputs", basename(file)));
  } else {
    const repo = join(work, "inputs", definition.input.repository);
    await must(["git", "init", "--quiet", repo]);
    await must(["git", "-C", repo, "fetch", "--quiet", "--depth", "1", join(run, "work"), record.baseCommit ?? "HEAD"]);
    await must(["git", "-C", repo, "checkout", "--quiet", "--detach", "FETCH_HEAD"]);
  }
}

export async function gradeBatch(batchId: string, options: { mode: string; force: boolean; only?: string }): Promise<void> {
  const batch = await loadBatch(batchId);
  await amp.preflight();
  for (const planned of batch.runs) {
    if (options.only && planned.id !== options.only) continue;
    const record = await loadRecord(batchId, planned.id);
    if (record.state !== "finished" || record.outcome?.execution !== "succeeded") {
      console.log(`skip       ${planned.id}: not a successful finished run`);
      continue;
    }
    if (record.grade && !options.force) continue;
    const snapshot = caseSnapshotDir(batchId, `${planned.case.skill}/${planned.case.name}@v${planned.case.version}`);
    const definition = await readJson(join(snapshot, "case.json"), CaseDefinition);
    const dir = join(runDir(batchId, planned.id), "grading");
    await prepareGrader(batchId, record, definition, dir);
    const context: HostContext = {
      runDir: dir,
      workDir: join(dir, "work"),
      homeDir: join(dir, "home"),
      prompt: graderPrompt,
      requested: { host: "amp", mode: options.mode, model: null, effort: null, tools: ampPublicTools },
      runtimeEnv: {},
    };
    await amp.prepare(context);
    const { argv, env } = amp.launch(context);
    console.log(`grade      ${planned.id}`);
    const result = await exec(argv, {
      cwd: context.workDir,
      env,
      stdoutFile: join(dir, "transcript.jsonl"),
      stderrFile: join(dir, "stderr.txt"),
    });
    const observation = await amp.observe(context, parseStream(result.stdout));
    const output = join(context.workDir, "grade.json");
    if (!existsSync(output)) {
      console.log(`failed     ${planned.id}: grader wrote no grade.json (${observation.error ?? "no error reported"})`);
      continue;
    }
    const parsed = GraderOutput.safeParse(JSON.parse(await readFile(output, "utf8")));
    const expected = definition.criteria.map((c) => c.id);
    if (!parsed.success || !expected.every((id) => parsed.data.criteria.some((c) => c.id === id))) {
      console.log(`failed     ${planned.id}: grade.json does not cover every criterion`);
      continue;
    }
    const grade: Grade = {
      grader: `Amp ${observation.hostVersion ?? "unknown version"}, mode ${observation.mode ?? options.mode}, model ${observation.models.join(", ") || "unknown"}`,
      method,
      criteria: expected.map((id) => parsed.data.criteria.find((c) => c.id === id)!),
      note: parsed.data.note,
    };
    record.grade = grade;
    await saveRecord(batchId, record);
    const failures = grade.criteria.filter((c) => c.verdict !== "pass").map((c) => `${c.id}=${c.verdict}`);
    console.log(`graded     ${planned.id}: ${failures.length ? failures.join(", ") : "all pass"}`);
  }
}
