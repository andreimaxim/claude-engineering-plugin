<script lang="ts">
  import ExportPanel from "$lib/components/ExportPanel.svelte";
  import type { DraftStore } from "$lib/drafts.svelte";
  import { href } from "$lib/links";
  import { getContext } from "svelte";

  let { data } = $props();
  const drafts = getContext<() => DraftStore>("drafts");
  const packet = $derived(data.packet);
</script>

<section class="callout info">
  <p>{packet.disclosure}</p>
  <p class="small muted">Source: {packet.source}. Created {packet.createdAt.slice(0, 10)}.</p>
</section>
<section class="card">
  <h2>How to review</h2>
  <ol class="small">
    <li>Judge each answer on its own: accept, needs correction, or reject.</li>
    <li>Then choose which you would rather receive, or tie / neither.</li>
    <li>Write the exact correction you would send the agent. These corrections shape the next, harder cases.</li>
  </ol>
  {#if packet.items[0]}<a class="button" href={href.packet(packet.id, packet.items[0].id)}>Start with item 1 →</a>{/if}
</section>
<ExportPanel drafts={drafts()} />
