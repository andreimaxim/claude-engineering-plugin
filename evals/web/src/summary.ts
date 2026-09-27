import type { Condition, Criterion, CriterionKind, PublishedRun } from "../../src/schema.ts";

export const conditionLabel: Record<Condition, string> = {
  "without-skill": "Without supplied skill",
  "with-skill": "With supplied skill",
};

export const kindLabel: Record<CriterionKind, string> = {
  task: "Task correctness",
  process: "Skill process",
  mixed: "Mixed (historical)",
};

export type Tally = { pass: number; fail: number; unverified: number; total: number };

export function tally(run: PublishedRun | undefined, criteria: Criterion[], kind: CriterionKind): Tally | null {
  if (!run?.grade) return null;
  const ids = new Set(criteria.filter((c) => c.kind === kind).map((c) => c.id));
  const verdicts = run.grade.criteria.filter((c) => ids.has(c.id));
  if (!verdicts.length) return null;
  return {
    pass: verdicts.filter((v) => v.verdict === "pass").length,
    fail: verdicts.filter((v) => v.verdict === "fail").length,
    unverified: verdicts.filter((v) => v.verdict === "unverified").length,
    total: verdicts.length,
  };
}

/**
 * How the with-skill run compares on task evidence (checks, then task criteria).
 * Process criteria are reported separately; preference is left to human review.
 */
export type Delta = "better" | "worse" | "equal" | "process-only" | "unverified-only" | "incomplete";

export function pairDelta(without: PublishedRun | undefined, withSkill: PublishedRun | undefined, criteria: Criterion[]): Delta {
  if (!without || !withSkill) return "incomplete";
  const checkScore = (run: PublishedRun) => (run.outcome.checks === "passed" ? 1 : run.outcome.checks === "failed" ? 0 : null);
  const a = checkScore(without);
  const b = checkScore(withSkill);
  if (a !== null && b !== null && a !== b) return b > a ? "better" : "worse";
  const taskA = tally(without, criteria, "task");
  const taskB = tally(withSkill, criteria, "task");
  // Failures decide; a criterion the grader could not verify is not a failure.
  if (taskA && taskB && taskA.fail !== taskB.fail) return taskB.fail < taskA.fail ? "better" : "worse";
  if (taskA && taskB && taskA.unverified !== taskB.unverified) return "unverified-only";
  const other = (run: PublishedRun) =>
    (["process", "mixed"] as const).map((kind) => tally(run, criteria, kind)?.pass ?? null).join(",");
  if (!without.grade || !withSkill.grade) return a === null ? "incomplete" : "equal";
  return other(without) === other(withSkill) ? "equal" : "process-only";
}

export const deltaLabel: Record<Delta, string> = {
  better: "With skill better on task evidence",
  worse: "With skill worse on task evidence",
  equal: "Equal on graded evidence",
  "process-only": "Differs on process only",
  "unverified-only": "Differs only in unverified task criteria",
  incomplete: "Incomplete evidence",
};

export const formatSeconds = (seconds: number | null) =>
  seconds === null ? "—" : seconds < 90 ? `${seconds.toFixed(0)} s` : `${(seconds / 60).toFixed(1)} min`;

export const formatTokens = (tokens: number | null) =>
  tokens === null ? "—" : tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : String(tokens);
