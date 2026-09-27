<script lang="ts">
  import type { CheckResult } from "$lib/types";
  import Badge from "./Badge.svelte";

  let { checks }: { checks: CheckResult[] } = $props();
</script>

{#if !checks.length}
  <p class="muted">No harness checks for this case.</p>
{:else}
  <ul class="checks">
    {#each checks as check (check.id)}
      <li>
        <details>
          <summary>
            <Badge tone={check.passed ? "good" : "bad"}>{check.passed ? "pass" : "fail"}</Badge> <strong>{check.id}</strong>
            <span class="muted small">{check.description}</span>
          </summary>
          <code class="small block">{check.command.join(" ")}</code>
          <pre class="output">{check.output || "(no output)"}</pre>
        </details>
      </li>
    {/each}
  </ul>
{/if}
