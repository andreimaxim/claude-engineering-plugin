<script lang="ts">
  import { href } from "$lib/links";
  import type { Dataset } from "$lib/types";
  import CaseSection, { type Filter } from "./CaseSection.svelte";
  import DatasetHeader from "./DatasetHeader.svelte";
  import Markdown from "./Markdown.svelte";

  let { dataset, skill }: { dataset: Dataset; skill: string | null } = $props();

  const filters: Filter[] = ["all", "differences", "worse", "equal"];
  const filterLabel: Record<Filter, string> = { all: "All pairs", differences: "Differences", worse: "With skill worse", equal: "Equal" };
  let filter = $state<Filter>("all");

  const skills = $derived([...new Set(dataset.cases.map((c) => c.skill))]);
  const active = $derived(skill && skills.some((s) => s === skill) ? skill : skills[0]);
  const cases = $derived(dataset.cases.filter((c) => c.skill === active));
</script>

<svelte:head><title>{dataset.title} · Skill evaluations</title></svelte:head>

<div class="page">
  <DatasetHeader {dataset} />
  <div class="callout info">
    <Markdown text={dataset.summary} />
    <details>
      <summary>Limitations ({dataset.limitations.length})</summary>
      <ul>
        {#each dataset.limitations as limitation (limitation)}<li>{limitation}</li>{/each}
      </ul>
      <p class="muted small">
        Reviewed export: {dataset.attestation.statement || "no statement"} ({dataset.attestation.at.slice(0, 10)})
      </p>
    </details>
  </div>

  <nav class="tabs" aria-label="Skills">
    {#each skills as name (name)}
      <a href={href.dataset(dataset.id, name)} aria-current={name === active ? "page" : undefined}>{name}</a>
    {/each}
  </nav>

  <div class="filters" role="group" aria-label="Filter pairs">
    {#each filters as value (value)}
      <button type="button" class={value === filter ? "chip active" : "chip"} aria-pressed={value === filter} onclick={() => (filter = value)}>
        {filterLabel[value]}
      </button>
    {/each}
    <span class="muted small">
      Comparison uses executed checks, then task criteria. Process criteria and preference are shown separately, never
      folded into a score.
    </span>
  </div>

  {#each cases as snapshot (snapshot.key)}
    <CaseSection {dataset} {snapshot} {filter} />
  {/each}
</div>
