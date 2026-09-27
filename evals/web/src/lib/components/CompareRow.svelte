<script lang="ts">
  import type { Snippet } from "svelte";
  import type { PublishedRun } from "$lib/types";

  type Props = {
    title: string;
    labels: [string, string];
    runs: [PublishedRun | undefined, PublishedRun | undefined];
    content: Snippet<[PublishedRun]>;
  };
  let { title, labels, runs, content }: Props = $props();
</script>

<section class="compare-row">
  <h2 class="compare-row-title">{title}</h2>
  <div class="compare-cells">
    {#each runs as run, i (i)}
      <div class="compare-cell">
        <div class="cell-label">{labels[i]}</div>
        {#if run}{@render content(run)}{:else}<p class="muted">Missing run.</p>{/if}
      </div>
    {/each}
  </div>
</section>
