import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { z } from "zod";
import { caseSnapshotDir, loadBatch, loadRecord, readText } from "./batch.ts";
import { readJson, sha256, timestamp, writeJson } from "./files.ts";
import { hostFor } from "./hosts/index.ts";
import { batchDir, datasetsDir, evalsRoot, runDir } from "./paths.ts";
import { findLeaks, relativizeWorkspacePaths } from "./privacy.ts";
import { loadRepository } from "./repositories.ts";
import {
  SkillName,
  Action,
  type Batch,
  CaseDefinition,
  type CaseSnapshot,
  type ContextItem,
  type Dataset,
  type Observed,
  type PublishedRun,
  type RunRecord,
} from "./schema.ts";

const emptyObserved: Observed = {
  hostVersion: null, sessionId: null, models: [], effort: null, mode: null, tools: [], seconds: null,
  inputTokens: null, outputTokens: null, skillRead: null, outsideAccess: [], disabledToolErrors: 0,
  mcpServers: [], hostGuidance: [], workspaceGuidance: [],
};

async function caseSnapshot(batch: Batch, key: string): Promise<CaseSnapshot> {
  const dir = caseSnapshotDir(batch.id, key);
  const definition = await readJson(join(dir, "case.json"), CaseDefinition);
  const context: ContextItem[] = [];
  if (definition.input.kind === "files") {
    for (const file of definition.input.files) {
      context.push({ kind: "file", path: basename(file), content: await readFile(join(dir, file), "utf8"), provenance: `Case input, v${definition.version}` });
    }
  } else {
    const repository = await loadRepository(definition.input.repository);
    context.push({ kind: "repository", name: repository.name, url: repository.url, ref: repository.ref, commit: repository.commit, provenance: "Fresh checkout of the pinned public commit" });
    if (definition.input.overlay) {
      context.push({ kind: "patch", path: definition.input.overlay, content: await readFile(join(dir, definition.input.overlay), "utf8"), provenance: "Seeded before the agent started (part of the case input)" });
    }
    if (definition.input.runtime) {
      context.push({ kind: "file", path: "EVAL_ENVIRONMENT.md", content: `# Evaluation environment\n\n${repository.toolchain.agentNotes}\n`, provenance: "Written by the harness into the checkout" });
    }
  }
  return {
    key,
    skill: definition.skill,
    name: definition.name,
    version: definition.version,
    historicalId: definition.historicalId,
    prompt: definition.prompt,
    expected: definition.expected,
    criteria: definition.criteria,
    historyPattern: definition.historyPattern ?? null,
    context,
  };
}

/**
 * Account-level skills, plugins, and MCP servers are the operator's private tooling.
 * Publish only synced skills that collide with an evaluated skill; count the rest.
 */
function publicObserved(observed: Observed): Observed {
  const colliding = observed.hostGuidance.filter((entry) =>
    SkillName.options.some((skill) => entry === `skill: ${skill}`),
  );
  const others = observed.hostGuidance.length - colliding.length;
  return {
    ...observed,
    sessionId: null,
    hostGuidance: [...colliding, ...(others ? [`${others} other account skill(s) or plugin(s), names withheld`] : [])],
    mcpServers: observed.mcpServers.length ? [`${observed.mcpServers.length} account MCP server(s) connected, names withheld`] : [],
  };
}

async function publishedRun(batch: Batch, record: RunRecord): Promise<PublishedRun | null> {
  if (record.state === "prepared") return null;
  const dir = runDir(batch.id, record.run.id);
  const actionsText = await readText(join(dir, "actions.json"));
  const annotations: string[] = [];
  if (record.resets.length) annotations.push(`Reset ${record.resets.length} time(s) by an operator: ${record.resets.map((r) => r.reason).join("; ")}`);
  const outcome = record.outcome ?? {
    execution: record.state === "setup-failed" ? "setup-failed" : "uncertain",
    detail: record.setupError ?? "launched without a recorded exit",
    model: "unknown", tools: "unknown", skillIntact: null, missingEvidence: ["run did not finish"], checks: "not-run",
  } as const;
  const skillSha256 = record.skillFiles ? sha256(JSON.stringify(record.skillFiles)) : null;
  return {
    id: record.run.id,
    caseKey: `${record.run.case.skill}/${record.run.case.name}@v${record.run.case.version}`,
    pair: record.run.pair,
    repetition: record.run.repetition,
    condition: record.run.condition,
    orderInPair: record.run.orderInPair,
    prompt: record.prompt ?? "",
    // Session identifiers are Amp thread IDs: private provenance, never published.
    observed: publicObserved(record.observed ?? emptyObserved),
    outcome,
    response: relativizeWorkspacePaths((await readText(join(dir, "response.md"))) ?? ""),
    diff: (await readText(join(dir, "changes.diff"))) ?? "",
    changedPaths: record.changedPaths ?? [],
    checks: (record.checks ?? []).map((c) => ({ ...c, output: relativizeWorkspacePaths(c.output) })),
    actions: actionsText ? z.array(Action).parse(JSON.parse(actionsText)).map((a) => ({ ...a, summary: relativizeWorkspacePaths(a.summary) })) : null,
    grade: record.grade ?? null,
    skillSha256,
    annotations,
  };
}

function preview(dataset: Dataset): string {
  const lines = [`# Export preview: ${dataset.title}`, "", "Read everything below before attesting. Nothing here is anonymized automatically.", ""];
  for (const c of dataset.cases) {
    lines.push(`## Case ${c.key}`, "", c.prompt, "");
    for (const item of c.context) lines.push(`### Context: ${item.kind} ${"path" in item ? item.path : "name" in item ? item.name : ""}`, "", "content" in item ? item.content : JSON.stringify(item), "");
  }
  for (const run of dataset.runs) {
    lines.push(`## Run ${run.id}`, "", `Outcome: ${JSON.stringify(run.outcome)}`, "", `Observed: ${JSON.stringify(run.observed)}`, "", "### Response", "", run.response, "", "### Diff", "", "```diff", run.diff, "```", "");
    lines.push("### Actions", "", ...(run.actions ?? []).map((a) => `- ${a.tool}: ${a.summary}`), "");
    if (run.grade) lines.push("### Grade", "", ...run.grade.criteria.map((c) => `- ${c.id}: ${c.verdict} — ${c.evidence}`), "", run.grade.note, "");
  }
  return lines.join("\n");
}

export async function publishBatch(batchId: string, options: { attest: string | null; title: string | null }): Promise<void> {
  const batch = await loadBatch(batchId);
  const host = hostFor(batch.requested.host);
  const records = await Promise.all(batch.runs.map((run) => loadRecord(batchId, run.id)));
  const runs = (await Promise.all(records.map((record) => publishedRun(batch, record)))).filter((run) => run !== null);
  const keys = [...new Set(runs.map((run) => run.caseKey))];
  const hostVersions = [...new Set(runs.flatMap((run) => (run.observed.hostVersion ? [run.observed.hostVersion] : [])))];
  const limitations = [
    "Configuration isolation, not an operating-system sandbox: agents could read any file the operator's user can read. Tool inputs that referenced outside paths are listed per run (heuristic).",
    "Host system instructions were present in both conditions; the comparison isolates the supplied skill, not an instruction-free baseline.",
    "Grades are model-assisted rubric judgments, not human calibration. Checks were executed by the harness after each run.",
    `Order seed ${batch.orderSeed} randomizes condition order only; it is not a model-sampling seed.`,
  ];
  if (runs.some((run) => run.observed.hostGuidance.length)) {
    limitations.push("The host synced account-level skills or plugins into the isolated home (listed per run). The skill tool was not enabled, but their presence is recorded rather than assumed harmless.");
  }
  if (host.adapter === "unexercised") limitations.push(`The ${host.name} adapter had not been exercised against real output before this batch; verify its observations.`);
  const dataset: Dataset = {
    id: batch.id,
    title: options.title ?? `${batch.requested.host} ${batch.requested.mode ?? batch.requested.model ?? ""} batch ${batch.id}`.replace(/\s+/g, " "),
    kind: "batch",
    summary: `${runs.length} executed run(s) across ${keys.length} case(s), ${batch.repetitions} repetition(s) per condition.`,
    limitations,
    createdAt: batch.createdAt,
    requested: batch.requested,
    hostVersion: hostVersions.join(", ") || null,
    repetitions: batch.repetitions,
    orderSeed: batch.orderSeed,
    harness: `${batch.harness.commit?.slice(0, 12) ?? "uncommitted"}${batch.harness.dirty ? " (dirty)" : ""}, source ${batch.harness.sourceSha256.slice(0, 12)}`,
    skillsRevision: `${batch.skills.commit?.slice(0, 12) ?? "uncommitted"}${batch.skills.dirty ? " (dirty)" : ""}`,
    attestation: { statement: options.attest ?? "", at: timestamp() },
    cases: await Promise.all(keys.map((key) => caseSnapshot(batch, key))),
    runs,
  };
  const serialized = JSON.stringify(dataset, null, 2);
  const leaks = findLeaks(serialized);
  const previewPath = join(batchDir(batchId), "export-preview.md");
  await writeFile(previewPath, preview(dataset));
  if (leaks.length) throw new Error(`Refusing to publish: found ${[...new Set(leaks)].join(", ")}. Inspect ${previewPath}.`);
  if (!options.attest) {
    console.log(`Wrote the private preview ${previewPath}.`);
    console.log(`Read it, then publish with --attest "<what you reviewed and why it is safe to publish>".`);
    return;
  }
  const destination = join(datasetsDir, `${batch.id}.json`);
  if (existsSync(destination)) console.log(`Replacing ${destination}.`);
  await writeJson(destination, dataset);
  console.log(`Published ${destination.replace(`${evalsRoot}/`, "evals/")}.`);
}
