<script lang="ts">
  import type { ContextItem } from "$lib/types";
  import Badge from "./Badge.svelte";
  import Diff from "./Diff.svelte";
  import FileContent from "./FileContent.svelte";

  let { items }: { items: ContextItem[] } = $props();
</script>

{#if !items.length}
  <p class="muted">No additional context.</p>
{:else}
  <div class="context-items">
    {#each items as item, index (index)}
      {#if item.kind === "file"}
        <details class="context-item">
          <summary><code>{item.path}</code> <span class="muted small">{item.provenance}</span></summary>
          <FileContent path={item.path} content={item.content} />
        </details>
      {:else if item.kind === "patch"}
        <details class="context-item">
          <summary><code>{item.path}</code> <span class="muted small">{item.provenance}</span></summary>
          <Diff diff={item.content} />
        </details>
      {:else if item.kind === "repository"}
        <div class="context-item repository">
          <strong>{item.name}</strong> at <code>{item.ref}</code> (<code>{item.commit.slice(0, 12)}</code>) from
          <a href={item.url.replace(/\.git$/, "")} target="_blank" rel="noopener noreferrer">
            {item.url.replace(/^https:\/\//, "").replace(/\.git$/, "")}
          </a>
          <div class="muted small">{item.provenance}</div>
        </div>
      {:else}
        <div class="context-item missing"><Badge tone="warn">missing</Badge> {item.description}</div>
      {/if}
    {/each}
  </div>
{/if}
