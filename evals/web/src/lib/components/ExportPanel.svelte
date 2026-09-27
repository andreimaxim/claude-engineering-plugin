<script lang="ts">
  import { type DraftStore, isComplete } from "$lib/drafts.svelte";

  let { drafts }: { drafts: DraftStore } = $props();
  let message = $state<string | null>(null);
  let fallback = $state<string | null>(null);

  const packet = $derived(drafts.packet);
  const complete = $derived(packet.items.filter((item) => isComplete(drafts.drafts[item.id])).length);
  const json = () => `${JSON.stringify(drafts.exportJudgments(), null, 2)}\n`;

  async function copy() {
    const text = json();
    try {
      if (!navigator.clipboard) throw new Error("clipboard API unavailable");
      await navigator.clipboard.writeText(text);
      fallback = null;
      message = `Copied ${complete}/${packet.items.length} complete judgments to the clipboard.`;
    } catch (error) {
      fallback = text;
      message = `The browser refused clipboard access (${String(error)}). Select the text below and copy it manually.`;
    }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([json()], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${packet.id}-judgments.json`;
    link.click();
    URL.revokeObjectURL(url);
    message = "Download started. Nothing was sent to a server.";
  }

  function clear() {
    if (window.confirm("Delete every local draft for this packet? This cannot be undone.")) drafts.clear();
  }
</script>

<section class="card export">
  <h2>Export judgments</h2>
  <p class="small">
    Nothing is submitted automatically. Drafts stay in this browser and are not synchronized. Export and send the file
    yourself; the operator unmasks it with the private key.
  </p>
  <label class="field">
    Reviewer name or initials
    <input type="text" value={drafts.reviewer} oninput={(event) => drafts.setReviewer(event.currentTarget.value)} autocomplete="off" />
  </label>
  <p class="small">
    {complete} of {packet.items.length} items complete{complete < packet.items.length ? "; incomplete items export with empty fields." : "."}
  </p>
  <div class="button-row">
    <button type="button" class="button" onclick={copy}>Copy JSON</button>
    <button type="button" class="button" onclick={download}>Download JSON</button>
    <button type="button" class="button subtle" onclick={clear}>Clear local drafts</button>
  </div>
  {#if message}<p class="small" role="status">{message}</p>{/if}
  {#if fallback}
    <textarea class="fallback" readonly value={fallback} onfocus={(event) => event.currentTarget.select()} rows="8" aria-label="Judgments JSON"></textarea>
  {/if}
</section>
