// Shapes of the reviewed JSON the app reads. The Ruby CLI writes these files; the
// app only displays them. Keep in step with evals/lib/engineering_evals.

export type SkillName = "naming-things" | "shaping" | "implementing" | "explaining-code" | "building-skills";

/** `without-skill` still has the host's own instructions and account configuration. */
export type Condition = "without-skill" | "with-skill";

/** `task`: from the prompt or correctness; `process`: skill-only; `mixed`: historical combination. */
export type CriterionKind = "task" | "process" | "mixed";
export type Criterion = { id: string; kind: CriterionKind; text: string };

export type Match = "match" | "mismatch" | "unknown";
export type Verdict = "pass" | "fail" | "unverified";

export type CheckResult = {
  id: string;
  description: string;
  command: string[];
  exitCode: number | null;
  passed: boolean;
  seconds: number | null;
  output: string;
};

export type Action = { tool: string; summary: string; error: boolean; result?: string | null };

export type Observed = {
  hostVersion: string | null;
  sessionId: string | null;
  models: string[];
  effort: string | null;
  mode: string | null;
  tools: string[];
  seconds: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  skillRead: boolean | null;
  outsideAccess: string[];
  disabledToolErrors: number;
  mcpServers: string[];
  hostGuidance: string[];
  workspaceGuidance: string[];
};

export type Outcome = {
  execution: "succeeded" | "setup-failed" | "launch-failed" | "host-error" | "uncertain";
  detail: string | null;
  model: Match;
  tools: Match;
  skillIntact: boolean | null;
  missingEvidence: string[];
  checks: "passed" | "failed" | "none" | "not-run";
};

export type Grade = {
  grader: string;
  method: string;
  criteria: { id: string; verdict: Verdict; evidence: string }[];
  note: string;
};

export type ContextItem =
  | { kind: "file"; path: string; content: string; provenance: string }
  | { kind: "repository"; name: string; url: string; ref: string; commit: string; provenance: string }
  | { kind: "patch"; path: string; content: string; provenance: string }
  | { kind: "missing"; description: string };

export type CaseSnapshot = {
  key: string;
  skill: SkillName;
  name: string;
  version: number;
  historicalId: string;
  prompt: string;
  expected: string;
  criteria: Criterion[];
  historyPattern: string | null;
  context: ContextItem[];
};

export type PublishedRun = {
  id: string;
  caseKey: string;
  pair: string;
  repetition: number;
  condition: Condition;
  orderInPair: number | null;
  prompt: string;
  observed: Observed;
  outcome: Outcome;
  response: string;
  diff: string;
  changedPaths: string[];
  checks: CheckResult[];
  actions: Action[] | null;
  grade: Grade | null;
  skillSha256: string | null;
  annotations: string[];
};

export type RequestedSettings = {
  host: "amp" | "claude-code";
  mode: string | null;
  model: string | null;
  effort: string | null;
  tools: string[];
};

export type Dataset = {
  id: string;
  title: string;
  kind: "historical" | "batch";
  summary: string;
  limitations: string[];
  createdAt: string;
  requested: RequestedSettings;
  hostVersion: string | null;
  repetitions: number;
  orderSeed: number | null;
  harness: string;
  skillsRevision: string | null;
  attestation: { statement: string; at: string };
  cases: CaseSnapshot[];
  runs: PublishedRun[];
};

export type MaskedAnswer = { response: string; diff: string };

export type PacketItem = {
  id: string;
  sha256: string;
  skill: SkillName;
  title: string;
  prompt: string;
  context: ContextItem[];
  a: MaskedAnswer;
  b: MaskedAnswer;
};

export type Packet = {
  id: string;
  title: string;
  createdAt: string;
  source: string;
  disclosure: string;
  items: PacketItem[];
};

export type AnswerVerdict = "accept" | "needs-correction" | "reject";
export type Preference = "a" | "b" | "tie" | "neither";

export type Judgment = {
  item: string;
  itemSha256: string;
  a: AnswerVerdict | null;
  b: AnswerVerdict | null;
  preference: Preference | null;
  correction: string;
  notes: string;
};

export type JudgmentExport = {
  format: "engineering-evals.judgments.v1";
  packet: string;
  packetSha256: string;
  exportedAt: string;
  reviewer: string;
  judgments: Judgment[];
};

export type ResultsIndex = {
  datasets: { id: string; title: string; kind: "historical" | "batch"; runs: number }[];
  packets: { id: string; title: string; items: number; sha256: string }[];
};
