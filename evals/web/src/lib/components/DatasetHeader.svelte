<script lang="ts">
  import { href } from "$lib/links";
  import type { Dataset } from "$lib/types";
  import Badge from "./Badge.svelte";

  let { dataset }: { dataset: Dataset } = $props();
  const r = $derived(dataset.requested);
</script>

<header class="dataset-header">
  <div class="crumbs"><a href={href.home()}>Evaluations</a> / <a href={href.dataset(dataset.id)}>{dataset.title}</a></div>
  <div class="dataset-title">
    <h1>{dataset.title}</h1>
    {#if dataset.kind === "historical"}<Badge tone="info">Historical — not newly executed</Badge>{/if}
  </div>
  <dl class="meta">
    <div><dt>Host</dt><dd>{r.host}{dataset.hostVersion ? ` ${dataset.hostVersion}` : ""}</dd></div>
    {#if r.mode}<div><dt>Mode</dt><dd>{r.mode}</dd></div>{/if}
    <div><dt>Model</dt><dd>{r.model ?? "not specified"}</dd></div>
    <div><dt>Effort</dt><dd>{r.effort ?? "not exposed"}</dd></div>
    <div><dt>Tools</dt><dd>{r.tools.join(", ")}</dd></div>
    <div><dt>Repetitions</dt><dd>{dataset.repetitions}</dd></div>
    <div><dt>Order seed</dt><dd>{dataset.orderSeed ?? "—"}</dd></div>
    <div><dt>Skills</dt><dd>{dataset.skillsRevision ?? "—"}</dd></div>
    <div><dt>Harness</dt><dd>{dataset.harness}</dd></div>
  </dl>
</header>
