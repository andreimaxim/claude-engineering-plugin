<script lang="ts">
  import type { Tally } from "$lib/summary";
  import Badge from "./Badge.svelte";

  let { label, value }: { label: string; value: Tally | null } = $props();

  const detail = $derived(
    value ? [value.fail && `${value.fail} fail`, value.unverified && `${value.unverified} unverified`].filter(Boolean).join(", ") : "",
  );
</script>

{#if value}
  <Badge tone={value.fail ? "bad" : value.unverified ? "warn" : "good"} title={detail || "all pass"}>
    {label} {value.pass}/{value.total}
  </Badge>
{/if}
