<script lang="ts">
  import { href } from "$lib/links";
  import { pairsFor } from "$lib/pairs";
  import { conditionLabel, deltaLabel, pairDelta } from "$lib/summary";
  import type { Dataset, PublishedRun } from "$lib/types";
  import Actions from "./Actions.svelte";
  import Badge from "./Badge.svelte";
  import Checks from "./Checks.svelte";
  import CompareRow from "./CompareRow.svelte";
  import ContextItems from "./ContextItems.svelte";
  import Criteria from "./Criteria.svelte";
  import DatasetHeader from "./DatasetHeader.svelte";
  import Diff from "./Diff.svelte";
  import Markdown from "./Markdown.svelte";
  import RunSettings from "./RunSettings.svelte";

  let { dataset, skill, pairId }: { dataset: Dataset; skill: string; pairId: string } = $props();

  const labels: [string, string] = [conditionLabel["without-skill"], conditionLabel["with-skill"]];
  const all = $derived(
    dataset.cases.filter((c) => c.skill === skill).flatMap((snapshot) => pairsFor(dataset, snapshot.key).map((pair) => ({ snapshot, pair }))),
  );
  const index = $derived(all.findIndex((entry) => entry.pair.id === pairId));
  const entry = $derived(all[index]);
  const previous = $derived(all[index - 1]);
  const next = $derived(all[index + 1]);
</script>

{#snippet annotations(run: PublishedRun)}
  {#if run.annotations.length}
    <ul class="annotations">{#each run.annotations as a (a)}<li>{a}</li>{/each}</ul>
  {:else}
    <p class="muted">None.</p>
  {/if}
{/snippet}
{#snippet answer(run: PublishedRun)}<Markdown text={run.response} />{/snippet}
{#snippet changes(run: PublishedRun)}<Diff diff={run.diff} />{/snippet}
{#snippet checks(run: PublishedRun)}<Checks checks={run.checks} />{/snippet}
{#snippet settings(run: PublishedRun)}<RunSettings {run} />{/snippet}
{#snippet actions(run: PublishedRun)}<Actions {run} />{/snippet}

<svelte:head><title>{entry ? `${entry.snapshot.name} r${entry.pair.repetition}` : "Pair"} · {dataset.title}</title></svelte:head>

<div class="page">
  <DatasetHeader {dataset} />
  {#if !entry}
    <div class="callout bad pad" role="alert">Could not load: no pair {pairId}</div>
  {:else}
    {@const { snapshot, pair } = entry}
    <nav class="pair-nav" aria-label="Pairs">
      <a href={href.dataset(dataset.id, skill)}>← All {skill} cases</a>
      <span>
        {#if previous}<a href={href.pair(dataset.id, skill, previous.pair.id)}>‹ Previous</a>{/if}
        <span class="muted small"> {index + 1} of {all.length} </span>
        {#if next}<a href={href.pair(dataset.id, skill, next.pair.id)}>Next ›</a>{/if}
      </span>
    </nav>
    <section class="card">
      <div class="case-head">
        <h2>{snapshot.name} <span class="muted">v{snapshot.version} · repetition {pair.repetition}</span></h2>
        <Badge tone="neutral">{deltaLabel[pairDelta(pair.without, pair.withSkill, snapshot.criteria)]}</Badge>
      </div>
      <Markdown text={snapshot.prompt} />
      <p class="small"><strong>Expected outcome:</strong> {snapshot.expected}</p>
      {#if snapshot.historyPattern}<p class="small muted"><strong>Pattern:</strong> {snapshot.historyPattern}</p>{/if}
      <h3>Original context</h3>
      <ContextItems items={snapshot.context} />
    </section>

    <div class="compare-sticky compare-cells" aria-hidden="true">
      <div class="condition-label without">{labels[0]}</div>
      <div class="condition-label with">{labels[1]}</div>
    </div>

    {#if pair.without?.annotations.length || pair.withSkill?.annotations.length}
      <CompareRow title="Annotations" {labels} runs={[pair.without, pair.withSkill]} content={annotations} />
    {/if}
    <CompareRow title="Final answer" {labels} runs={[pair.without, pair.withSkill]} content={answer} />
    <CompareRow title="Workspace changes" {labels} runs={[pair.without, pair.withSkill]} content={changes} />
    <CompareRow title="Executed checks" {labels} runs={[pair.without, pair.withSkill]} content={checks} />
    <Criteria {snapshot} without={pair.without} withSkill={pair.withSkill} />
    <CompareRow title="Observed settings and evidence" {labels} runs={[pair.without, pair.withSkill]} content={settings} />
    <CompareRow title="Observed actions" {labels} runs={[pair.without, pair.withSkill]} content={actions} />
  {/if}
</div>
