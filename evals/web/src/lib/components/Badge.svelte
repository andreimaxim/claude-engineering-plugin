<script lang="ts" module>
  export type Tone = "good" | "bad" | "warn" | "neutral" | "info";
</script>

<script lang="ts">
  import type { Snippet } from "svelte";

  let { tone, title, children }: { tone: Tone; title?: string; children: Snippet } = $props();
</script>

<span class="badge {tone}" {title}>{@render children()}</span>
