import { parseArgs } from "node:util";
import { listBatches, loadBatch, loadRecord } from "./batch.ts";
import { createBatch } from "./batch.ts";
import { loadCases, selectCases } from "./cases.ts";
import { executeBatch, recollectBatch, resetRun } from "./execute.ts";
import { gradeBatch } from "./grade.ts";
import { ampPublicTools } from "./hosts/amp.ts";
import { claudeDefaultTools } from "./hosts/claude.ts";
import { hostFor } from "./hosts/index.ts";
import { createPacket, unmaskJudgments } from "./packets.ts";
import { stateHome } from "./paths.ts";
import { publishBatch } from "./publish.ts";
import { ensureRepository, ensureToolchain, loadRepository } from "./repositories.ts";
import { HostName } from "./schema.ts";
import { serve } from "./server.ts";

const usage = `Engineering skill evaluations

Usage: pnpm evals <command> [options]

  cases                                  List cases, versions, inputs, and status
  fetch <repository...>                  Fetch pinned repositories and install their runtimes
  prepare <selector...>                  Plan paired runs and prepare isolated workspaces
      --host amp|claude-code             Agent host (default amp)
      --mode <dial>                      Amp mode (default high)
      --model <id>                       Claude model to request, or the model an Amp mode is expected to use
      --effort <level>                   Claude effort to request (Amp does not expose effort)
      --repetitions <n>                  Pairs per case (default 1)
      --seed <n>                         Condition-order seed (default random; recorded)
  run <batch> [--jobs <n>]               Execute prepared runs; never relaunches launched runs
  recollect <batch>                      Re-derive evidence from preserved traces (no relaunch)
  status [batch]                         List batches, or show one batch's runs
  reset <batch> <run> --reason <text>    Archive an attempt and prepare a fresh one (explicit)
  grade <batch> [--mode high] [--run <id>] [--force]
                                         Model-assisted rubric grading of finished runs
  publish <batch> [--attest <statement>] [--title <text>]
                                         Write a private preview; with --attest, publish it
  packet <id> --dataset <id> --title <text> [--pair <pair>...] [--per-skill <n>]
                                         Create a condition-masked calibration packet
  unmask <judgments.json> [--out <file>] Join exported judgments with the private A/B key
  serve [--port <n>]                     Serve the review app (PORT or 4173)

Selectors: all, <skill>, <skill>/<case>, or <skill>/<case>@v<n>.
Private state lives in ${stateHome}.`;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    host: { type: "string", default: "amp" },
    mode: { type: "string" },
    model: { type: "string" },
    effort: { type: "string" },
    repetitions: { type: "string", default: "1" },
    seed: { type: "string" },
    jobs: { type: "string", default: "2" },
    reason: { type: "string" },
    run: { type: "string" },
    force: { type: "boolean", default: false },
    attest: { type: "string" },
    title: { type: "string" },
    dataset: { type: "string" },
    pair: { type: "string", multiple: true, default: [] },
    "per-skill": { type: "string" },
    out: { type: "string" },
    port: { type: "string" },
    help: { type: "boolean", short: "h", default: false },
  },
});

const required = (value: string | undefined, name: string): string => {
  if (!value) throw new Error(`Missing ${name}.\n\n${usage}`);
  return value;
};
const integer = (value: string, name: string): number => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`${name} must be a non-negative integer`);
  return parsed;
};

async function main(): Promise<void> {
  const [command, ...args] = positionals;
  if (!command || values.help) return console.log(usage);
  switch (command) {
    case "cases": {
      for (const c of await loadCases()) {
        const input = c.input.kind === "files" ? c.input.files.join(", ") : `${c.input.repository}${c.input.overlay ? " + overlay" : ""}${c.input.runtime ? " + runtime" : ""}`;
        const status = c.status.kind === "runnable" ? "runnable" : `blocked: ${c.status.reason}`;
        console.log(`${c.key.padEnd(48)} ${c.historicalId.padEnd(18)} ${input.padEnd(36)} ${c.checks.length} check(s)  ${status}`);
      }
      return;
    }
    case "fetch": {
      for (const name of args.length ? args : ["rails"]) {
        const repository = await loadRepository(name);
        await ensureRepository(repository);
        await ensureToolchain(repository);
        console.log(`${name}: ${repository.ref} (${repository.commit}) and its runtime are ready.`);
      }
      return;
    }
    case "prepare": {
      const host = HostName.parse(values.host);
      const cases = selectCases(await loadCases(), args);
      const batch = await createBatch({
        cases,
        repetitions: Math.max(1, integer(values.repetitions, "--repetitions")),
        seed: values.seed ? integer(values.seed, "--seed") : undefined,
        requested: {
          host,
          mode: host === "amp" ? (values.mode ?? "high") : null,
          model: values.model ?? null,
          effort: host === "amp" ? null : (values.effort ?? null),
          tools: host === "amp" ? ampPublicTools : claudeDefaultTools,
        },
      });
      const failed = (await Promise.all(batch.runs.map((run) => loadRecord(batch.id, run.id)))).filter((r) => r.state === "setup-failed");
      for (const record of failed) console.log(`setup failed  ${record.run.id}: ${record.setupError}`);
      console.log(`Prepared batch ${batch.id}: ${batch.runs.length} runs, order seed ${batch.orderSeed}.`);
      console.log(`Next: pnpm evals run ${batch.id}`);
      return;
    }
    case "run":
      return executeBatch(required(args[0], "batch id"), Math.max(1, integer(values.jobs, "--jobs")));
    case "recollect":
      return recollectBatch(required(args[0], "batch id"));
    case "status": {
      if (!args[0]) {
        for (const id of await listBatches()) console.log(id);
        return;
      }
      const batch = await loadBatch(args[0]);
      console.log(`${batch.id}: ${batch.requested.host} mode=${batch.requested.mode ?? "-"} model=${batch.requested.model ?? "-"} seed=${batch.orderSeed} (${hostFor(batch.requested.host).adapter} adapter)`);
      for (const run of batch.runs) {
        const record = await loadRecord(batch.id, run.id);
        const outcome = record.outcome
          ? `${record.outcome.execution}; model ${record.outcome.model} (${record.observed?.models.join(",") || "?"}); tools ${record.outcome.tools}; checks ${record.outcome.checks}${record.grade ? `; graded` : ""}`
          : record.state === "launched" ? "uncertain: launched without a recorded exit" : record.setupError ?? "";
        console.log(`  ${run.id.padEnd(62)} ${record.state.padEnd(12)} ${outcome}`);
      }
      return;
    }
    case "reset":
      return resetRun(required(args[0], "batch id"), required(args[1], "run id"), required(values.reason, "--reason"));
    case "grade":
      return gradeBatch(required(args[0], "batch id"), { mode: values.mode ?? "high", force: values.force, only: values.run });
    case "publish":
      return publishBatch(required(args[0], "batch id"), { attest: values.attest ?? null, title: values.title ?? null });
    case "packet":
      return createPacket({
        id: required(args[0], "packet id"),
        title: required(values.title, "--title"),
        dataset: required(values.dataset, "--dataset"),
        pairs: values.pair,
        perSkill: values["per-skill"] ? integer(values["per-skill"], "--per-skill") : null,
      });
    case "unmask":
      return unmaskJudgments(required(args[0], "judgments file"), values.out ?? null);
    case "serve":
      return serve(integer(values.port ?? process.env.PORT ?? "4173", "--port"));
    default:
      throw new Error(`Unknown command ${command}.\n\n${usage}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
