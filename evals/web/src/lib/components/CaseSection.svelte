<script lang="ts" module>
  export type Filter = "all" | "differences" | "worse" | "equal";
</script>

<script lang="ts">
  import { href } from "$lib/links";
  import { pairsFor } from "$lib/pairs";
  import { type Delta, deltaLabel, pairDelta, tally } from "$lib/summary";
  import type { CaseSnapshot, Dataset } from "$lib/types";
  import Badge, { type Tone } from "./Badge.svelte";
  import Markdown from "./Markdown.svelte";
  import OutcomeBadges from "./OutcomeBadges.svelte";
  import TallyBadge from "./TallyBadge.svelte";

  let { dataset, snapshot, filter }: { dataset: Dataset; snapshot: CaseSnapshot; filter: Filter } = $props();

  const matches = (delta: Delta) =>
    filter === "all" || (filter === "differences" ? delta !== "equal" : filter === "worse" ? delta === "worse" : delta === "equal");
  const deltaTone = (delta: Delta): Tone =>
    delta === "better" ? "good" : delta === "worse" ? "bad" : delta === "equal" ? "neutral" : "warn";

  const pairs = $derived(pairsFor(dataset, snapshot.key).map((pair) => ({ pair, delta: pairDelta(pair.without, pair.withSkill, snapshot.criteria) })));
  const visible = $derived(pairs.filter(({ delta }) => matches(delta)));
  const kinds = $derived((["task", "process", "mixed"] as const).filter((kind) => snapshot.criteria.some((c) => c.kind === kind)));
</script>

<section class="case card">
  <div class="case-head">
    <h3>{snapshot.name} <span class="muted">v{snapshot.version}</span></h3>
    <span class="muted small">{snapshot.historicalId}</span>
  </div>
  <details class="case-prompt">
    <summary>Task prompt and expected outcome</summary>
    <Markdown text={snapshot.prompt} />
    <p class="muted small"><strong>Expected:</strong> {snapshot.expected}</p>
  </details>
  {#if visible.length === 0}
    <p class="muted small">No pairs match this filter.</p>
  {:else}
    <table class="pairs">
      <thead>
        <tr>
          <th scope="col">Pair</th>
          <th scope="col">Without supplied skill</th>
          <th scope="col">With supplied skill</th>
          <th scope="col">Comparison</th>
        </tr>
      </thead>
      <tbody>
        {#each visible as { pair, delta } (pair.id)}
          <tr>
            <th scope="row">r{pair.repetition}</th>
            {#each [pair.without, pair.withSkill] as run, i (i)}
              <td>
                {#if run}
                  <div class="cell">
                    <OutcomeBadges outcome={run.outcome} />
                    <span class="badges">
                      {#each kinds as kind (kind)}<TallyBadge label={kind} value={tally(run, snapshot.criteria, kind)} />{/each}
                      {#if !run.grade}<span class="muted small">ungraded</span>{/if}
                    </span>
                  </div>
                {:else}
                  <span class="muted">missing</span>
                {/if}
              </td>
            {/each}
            <td>
              <div class="cell">
                <Badge tone={deltaTone(delta)}>{deltaLabel[delta]}</Badge>
                <a class="button small" href={href.pair(dataset.id, snapshot.skill, pair.id)}>Compare →</a>
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</section>
