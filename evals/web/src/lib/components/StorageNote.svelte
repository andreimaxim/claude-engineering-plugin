<script lang="ts">
  import type { DraftStore } from "$lib/drafts.svelte";

  let { drafts }: { drafts: DraftStore } = $props();
</script>

<div class="storage-note small" role="status">
  {#if drafts.state.kind === "saved"}Draft saved in this browser at {drafts.state.at}.
  {:else if drafts.state.kind === "idle"}Drafts save automatically in this browser.
  {:else}<strong class="warn-text">{drafts.state.reason}</strong>{/if}
  {#if drafts.sha256}
    Evidence fingerprint <code>{drafts.sha256.slice(0, 12)}</code>.
  {:else}
    <strong class="warn-text">Could not fingerprint the packet (insecure context); drafts are keyed as unverified.</strong>
  {/if}
  {#if drafts.stale.length > 0}
    <strong class="warn-text">Drafts for {drafts.stale.join(", ")} were written against different evidence and are not applied.</strong>
  {/if}
  {#if drafts.otherVersions > 0}Drafts for another version of this packet exist and are not applied.{/if}
</div>
