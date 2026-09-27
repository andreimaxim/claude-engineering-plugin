<script lang="ts">
  import type { PublishedRun } from "$lib/types";

  let { run }: { run: PublishedRun } = $props();
</script>

{#if !run.actions}
  <p class="muted">Tool trace not included in this export.</p>
{:else if !run.actions.length}
  <p class="muted">No tool calls.</p>
{:else}
  <details>
    <summary>{run.actions.length} tool calls (summaries; raw traces stay private)</summary>
    <ol class="actions">
      {#each run.actions as action, index (index)}
        <li class={action.error ? "error" : undefined}>
          {#if action.result}
            <details>
              <summary><code>{action.tool}</code> {action.summary}</summary>
              <pre class="output">{action.result}</pre>
            </details>
          {:else}
            <code>{action.tool}</code> {action.summary}
          {/if}
        </li>
      {/each}
    </ol>
  </details>
{/if}
