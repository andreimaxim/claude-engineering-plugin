// Typed evaluation data. Each schema is the single definition of its shape: the CLI
// validates files with it and the web app imports the derived types.
import { z } from "zod";

export const skillNames = [
  "naming-things",
  "shaping",
  "implementing",
  "explaining-code",
  "building-skills",
] as const;
export const SkillName = z.enum(skillNames);
export type SkillName = z.infer<typeof SkillName>;

/** `without-skill` still has the host's own system instructions; it only lacks the supplied skill. */
export const Condition = z.enum(["without-skill", "with-skill"]);
export type Condition = z.infer<typeof Condition>;

/**
 * `task`: required by the shared prompt or by correctness.
 * `process`: expected by the skill but not requested by the shared prompt.
 * `mixed`: a historical criterion that combined both; kept verbatim for its grades.
 */
export const CriterionKind = z.enum(["task", "process", "mixed"]);
export type CriterionKind = z.infer<typeof CriterionKind>;

export const Criterion = z.object({
  id: z.string(),
  kind: CriterionKind,
  text: z.string(),
});
export type Criterion = z.infer<typeof Criterion>;

// ---------------------------------------------------------------------------
// Case definitions (evals/cases/<skill>/<name>/case.json)

export const Check = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("repository-test"),
    id: z.string(),
    description: z.string(),
    /** Repository-relative test file, or `{case}/...` for a held-back check file. */
    path: z.string(),
  }),
  z.object({
    kind: z.literal("file-equals"),
    id: z.string(),
    description: z.string(),
    path: z.string(),
    /** Case-relative file with the exact expected bytes. */
    expected: z.string(),
  }),
]);
export type Check = z.infer<typeof Check>;

export const CaseInput = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("files"),
    /** Case-relative files copied to the workspace root under their base names. */
    files: z.array(z.string()).min(1),
  }),
  z.object({
    kind: z.literal("repository"),
    repository: z.string(),
    /** Case-relative patch applied before the agent starts; part of the case input. */
    overlay: z.string().optional(),
    /** Whether the repository's prepared runtime is supplied to the agent. */
    runtime: z.boolean().default(false),
  }),
]);
export type CaseInput = z.infer<typeof CaseInput>;

export const CaseDefinition = z.object({
  skill: SkillName,
  name: z.string().regex(/^[a-z0-9-]+$/),
  version: z.number().int().positive(),
  /** Identity in the historical pilot, such as `naming-things:1`. */
  historicalId: z.string(),
  status: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("runnable") }),
    z.object({ kind: z.literal("blocked"), reason: z.string() }),
  ]),
  prompt: z.string(),
  input: CaseInput,
  expected: z.string(),
  criteria: z.array(Criterion).min(1),
  checks: z.array(Check).default([]),
  historyPattern: z.string().optional(),
  /** Why this version differs from the previous one. */
  versionNotes: z.array(z.string()).default([]),
});
export type CaseDefinition = z.infer<typeof CaseDefinition>;

export const Repository = z.object({
  url: z.url(),
  commit: z.string().regex(/^[0-9a-f]{40}$/),
  ref: z.string(),
  license: z.string(),
  toolchain: z.object({
    description: z.string(),
    /** Commands that must succeed before a runtime-backed run is prepared. */
    probes: z.array(z.array(z.string()).min(1)),
    /** Repository-relative directory holding Gemfile/lockfile or equivalent. */
    runtimeDir: z.string(),
    install: z.array(z.string()).min(1),
    verify: z.array(z.string()).min(1),
    /** Environment for runtime commands; `{runtime}` and `{toolchainDir}` are substituted. */
    env: z.record(z.string(), z.string()),
    /** Prefix for focused test commands; the test file path is appended. */
    testCommand: z.array(z.string()).min(1),
    /** Agent-facing notes written to EVAL_ENVIRONMENT.md. */
    agentNotes: z.string(),
  }),
});
export type Repository = z.infer<typeof Repository>;
export const Repositories = z.record(z.string(), Repository);

// ---------------------------------------------------------------------------
// Batches and private run records ($EVALS_HOME/batches/<id>)

export const HostName = z.enum(["amp", "claude-code"]);
export type HostName = z.infer<typeof HostName>;

export const RequestedSettings = z.object({
  host: HostName,
  /** Amp mode (a dial that selects model, prompt, and tools) or Claude model alias. */
  mode: z.string().nullable(),
  model: z.string().nullable(),
  effort: z.string().nullable(),
  tools: z.array(z.string()),
});
export type RequestedSettings = z.infer<typeof RequestedSettings>;

export const CaseRef = z.object({
  skill: SkillName,
  name: z.string(),
  version: z.number().int(),
});
export type CaseRef = z.infer<typeof CaseRef>;

export const PlannedRun = z.object({
  id: z.string(),
  case: CaseRef,
  repetition: z.number().int().positive(),
  condition: Condition,
  pair: z.string(),
  /** Position of this condition within its pair's randomized order. */
  orderInPair: z.union([z.literal(1), z.literal(2)]),
});
export type PlannedRun = z.infer<typeof PlannedRun>;

export const Revision = z.object({
  commit: z.string().nullable(),
  dirty: z.boolean(),
});

export const Batch = z.object({
  id: z.string(),
  createdAt: z.string(),
  requested: RequestedSettings,
  repetitions: z.number().int().positive(),
  /** Seeds condition order only; it is not a model-sampling seed. */
  orderSeed: z.number().int(),
  harness: Revision.extend({ sourceSha256: z.string() }),
  skills: Revision,
  runs: z.array(PlannedRun),
});
export type Batch = z.infer<typeof Batch>;

export const ExecutionState = z.enum([
  "prepared",
  "setup-failed",
  "launched",
  "finished",
]);

export const Execution = z.enum([
  "succeeded",
  "setup-failed",
  "launch-failed",
  "host-error",
  /** Launched, but the harness never recorded an exit; never relaunched implicitly. */
  "uncertain",
]);
export type Execution = z.infer<typeof Execution>;

export const Match = z.enum(["match", "mismatch", "unknown"]);
export type Match = z.infer<typeof Match>;

export const CheckResult = z.object({
  id: z.string(),
  description: z.string(),
  command: z.array(z.string()),
  exitCode: z.number().int().nullable(),
  passed: z.boolean(),
  /** Null for historical checks whose duration was not recorded. */
  seconds: z.number().nullable(),
  output: z.string(),
});
export type CheckResult = z.infer<typeof CheckResult>;

export const Action = z.object({
  tool: z.string(),
  summary: z.string(),
  error: z.boolean(),
  /** Observed result: exit status and the tail of the output, when the host reported one. */
  result: z.string().nullable().default(null),
});
export type Action = z.infer<typeof Action>;

export const Observed = z.object({
  hostVersion: z.string().nullable(),
  sessionId: z.string().nullable(),
  models: z.array(z.string()),
  /** Null when the host does not expose effort. */
  effort: z.string().nullable(),
  mode: z.string().nullable(),
  tools: z.array(z.string()),
  seconds: z.number().nullable(),
  inputTokens: z.number().nullable(),
  outputTokens: z.number().nullable(),
  /** Supplied skill read observed in the trace; null when not applicable or unknown. */
  skillRead: z.boolean().nullable(),
  /** Tool inputs referring to paths outside the task workspace (heuristic). */
  outsideAccess: z.array(z.string()),
  disabledToolErrors: z.number().int(),
  /** MCP servers the host reported connecting, even if none of their tools were enabled. */
  mcpServers: z.array(z.string()),
  /** Skills and plugins the host synced into the isolated home (not necessarily loaded). */
  hostGuidance: z.array(z.string()),
  /** AGENTS.md/CLAUDE.md/skill directories found in the workspace or its ancestors at preparation. */
  workspaceGuidance: z.array(z.string()),
});
export type Observed = z.infer<typeof Observed>;

export const Outcome = z.object({
  execution: Execution,
  detail: z.string().nullable(),
  model: Match,
  tools: Match,
  /** Supplied-skill files unchanged by the run; null without a supplied skill. */
  skillIntact: z.boolean().nullable(),
  missingEvidence: z.array(z.string()),
  checks: z.enum(["passed", "failed", "none", "not-run"]),
});
export type Outcome = z.infer<typeof Outcome>;

export const Verdict = z.enum(["pass", "fail", "unverified"]);
export type Verdict = z.infer<typeof Verdict>;

export const Grade = z.object({
  grader: z.string(),
  /** Which of the grader's inputs were masked, stated for readers. */
  method: z.string(),
  criteria: z.array(
    z.object({ id: z.string(), verdict: Verdict, evidence: z.string() }),
  ),
  note: z.string(),
});
export type Grade = z.infer<typeof Grade>;

export const RunRecord = z.object({
  run: PlannedRun,
  state: ExecutionState,
  preparedAt: z.string().optional(),
  launchedAt: z.string().optional(),
  finishedAt: z.string().optional(),
  exitCode: z.number().int().nullable().optional(),
  setupError: z.string().optional(),
  prompt: z.string().optional(),
  baseCommit: z.string().optional(),
  skillFiles: z.record(z.string(), z.string()).optional(),
  observedAtPreparation: z.object({ workspaceGuidance: z.array(z.string()) }).optional(),
  observed: Observed.optional(),
  outcome: Outcome.optional(),
  checks: z.array(CheckResult).optional(),
  changedPaths: z.array(z.string()).optional(),
  grade: Grade.optional(),
  /** Earlier attempts reset explicitly by an operator, with reasons. */
  resets: z.array(z.object({ at: z.string(), reason: z.string(), archivedAs: z.string() })).default([]),
});
export type RunRecord = z.infer<typeof RunRecord>;

// ---------------------------------------------------------------------------
// Reviewed, publishable datasets (evals/results/datasets/<id>.json)

export const ContextItem = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("file"),
    path: z.string(),
    content: z.string(),
    provenance: z.string(),
  }),
  z.object({
    kind: z.literal("repository"),
    name: z.string(),
    url: z.string(),
    ref: z.string(),
    commit: z.string(),
    provenance: z.string(),
  }),
  z.object({ kind: z.literal("patch"), path: z.string(), content: z.string(), provenance: z.string() }),
  z.object({ kind: z.literal("missing"), description: z.string() }),
]);
export type ContextItem = z.infer<typeof ContextItem>;

export const CaseSnapshot = z.object({
  key: z.string(),
  skill: SkillName,
  name: z.string(),
  version: z.number().int(),
  historicalId: z.string(),
  prompt: z.string(),
  expected: z.string(),
  criteria: z.array(Criterion),
  historyPattern: z.string().nullable(),
  context: z.array(ContextItem),
});
export type CaseSnapshot = z.infer<typeof CaseSnapshot>;

export const PublishedRun = z.object({
  id: z.string(),
  caseKey: z.string(),
  pair: z.string(),
  repetition: z.number().int(),
  condition: Condition,
  orderInPair: z.number().int().nullable(),
  prompt: z.string(),
  observed: Observed,
  outcome: Outcome,
  response: z.string(),
  diff: z.string(),
  changedPaths: z.array(z.string()),
  checks: z.array(CheckResult),
  actions: z.array(Action).nullable(),
  grade: Grade.nullable(),
  skillSha256: z.string().nullable(),
  annotations: z.array(z.string()),
});
export type PublishedRun = z.infer<typeof PublishedRun>;

export const Dataset = z.object({
  id: z.string(),
  title: z.string(),
  kind: z.enum(["historical", "batch"]),
  summary: z.string(),
  limitations: z.array(z.string()),
  createdAt: z.string(),
  requested: RequestedSettings,
  hostVersion: z.string().nullable(),
  repetitions: z.number().int(),
  orderSeed: z.number().int().nullable(),
  harness: z.string(),
  skillsRevision: z.string().nullable(),
  attestation: z.object({ statement: z.string(), at: z.string() }),
  cases: z.array(CaseSnapshot),
  runs: z.array(PublishedRun),
});
export type Dataset = z.infer<typeof Dataset>;

// ---------------------------------------------------------------------------
// Condition-masked calibration packets. Served packets never contain the key.

export const MaskedAnswer = z.object({
  response: z.string(),
  diff: z.string(),
});
export type MaskedAnswer = z.infer<typeof MaskedAnswer>;

export const PacketItem = z.object({
  id: z.string(),
  sha256: z.string(),
  skill: SkillName,
  title: z.string(),
  prompt: z.string(),
  context: z.array(ContextItem),
  a: MaskedAnswer,
  b: MaskedAnswer,
});
export type PacketItem = z.infer<typeof PacketItem>;

export const Packet = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.string(),
  source: z.string(),
  disclosure: z.string(),
  items: z.array(PacketItem),
});
export type Packet = z.infer<typeof Packet>;

/** Private: stored under $EVALS_HOME/keys, never beside served files. */
export const PacketKey = z.object({
  packet: z.string(),
  packetSha256: z.string(),
  items: z.array(
    z.object({
      id: z.string(),
      dataset: z.string(),
      caseKey: z.string(),
      pair: z.string(),
      a: z.object({ run: z.string(), condition: Condition }),
      b: z.object({ run: z.string(), condition: Condition }),
    }),
  ),
});
export type PacketKey = z.infer<typeof PacketKey>;

export const AnswerVerdict = z.enum(["accept", "needs-correction", "reject"]);
export type AnswerVerdict = z.infer<typeof AnswerVerdict>;
export const Preference = z.enum(["a", "b", "tie", "neither"]);
export type Preference = z.infer<typeof Preference>;

export const Judgment = z.object({
  item: z.string(),
  itemSha256: z.string(),
  a: AnswerVerdict.nullable(),
  b: AnswerVerdict.nullable(),
  preference: Preference.nullable(),
  correction: z.string(),
  notes: z.string(),
});
export type Judgment = z.infer<typeof Judgment>;

export const JudgmentExport = z.object({
  format: z.literal("engineering-evals.judgments.v1"),
  packet: z.string(),
  packetSha256: z.string(),
  exportedAt: z.string(),
  reviewer: z.string(),
  judgments: z.array(Judgment),
});
export type JudgmentExport = z.infer<typeof JudgmentExport>;

export const ResultsIndex = z.object({
  datasets: z.array(z.object({ id: z.string(), title: z.string(), kind: z.enum(["historical", "batch"]), runs: z.number() })),
  packets: z.array(z.object({ id: z.string(), title: z.string(), items: z.number(), sha256: z.string() })),
});
export type ResultsIndex = z.infer<typeof ResultsIndex>;

export const caseKey = (ref: CaseRef): string => `${ref.skill}/${ref.name}@v${ref.version}`;
