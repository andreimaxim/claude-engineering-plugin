import type { Dataset, PublishedRun } from "$lib/types";

export type Pair = { id: string; repetition: number; without?: PublishedRun; withSkill?: PublishedRun };

export function pairsFor(dataset: Dataset, caseKey: string): Pair[] {
  const runs = dataset.runs.filter((run) => run.caseKey === caseKey);
  return [...Map.groupBy(runs, (run) => run.pair).entries()]
    .map(([id, pair]) => ({
      id,
      repetition: pair[0]?.repetition ?? 0,
      without: pair.find((run) => run.condition === "without-skill"),
      withSkill: pair.find((run) => run.condition === "with-skill"),
    }))
    .sort((a, b) => a.repetition - b.repetition);
}
