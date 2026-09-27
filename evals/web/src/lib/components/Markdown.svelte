<script lang="ts">
  import { renderMarkdown } from "$lib/markdown";

  let { text }: { text: string } = $props();
  // Generated from the syntax tree with raw HTML turned into text: safe for {@html}.
  const html = $derived(text.trim() ? renderMarkdown(text) : "");
</script>

{#if html}
  <div class="markdown">{@html html}</div>
{:else}
  <p class="muted">No text.</p>
{/if}
