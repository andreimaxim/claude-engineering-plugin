<script lang="ts">
  import type { Outcome } from "$lib/types";
  import Badge, { type Tone } from "./Badge.svelte";

  let { outcome }: { outcome: Outcome } = $props();

  const checks: Record<Outcome["checks"], [Tone, string]> = {
    passed: ["good", "checks passed"],
    failed: ["bad", "checks failed"],
    none: ["neutral", "no checks"],
    "not-run": ["warn", "checks not run"],
  };
  const check = $derived(checks[outcome.checks]);
</script>

<span class="badges">
  <Badge tone={outcome.execution === "succeeded" ? "good" : "bad"} title={outcome.detail ?? undefined}>{outcome.execution}</Badge>
  <Badge tone={check[0]}>{check[1]}</Badge>
  {#if outcome.model === "mismatch"}<Badge tone="bad">model mismatch</Badge>{/if}
  {#if outcome.tools === "mismatch"}<Badge tone="bad">tool mismatch</Badge>{/if}
  {#if outcome.skillIntact === false}<Badge tone="bad">skill files changed</Badge>{/if}
  {#if outcome.missingEvidence.length > 0}
    <Badge tone="warn" title={outcome.missingEvidence.join("\n")}>{outcome.missingEvidence.length} missing evidence</Badge>
  {/if}
</span>
