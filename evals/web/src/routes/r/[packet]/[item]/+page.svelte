<script lang="ts">
  import { page } from "$app/state";
  import ItemView from "$lib/components/ItemView.svelte";
  import type { DraftStore } from "$lib/drafts.svelte";
  import { getContext } from "svelte";

  let { data } = $props();
  const drafts = getContext<() => DraftStore>("drafts");
  const item = $derived(data.packet.items.find((i) => i.id === page.params.item));
</script>

{#if item}
  <ItemView
    packet={data.packet}
    {item}
    draft={drafts().draftFor(item.id, item.sha256)}
    onchange={(change) => drafts().update(item.id, item.sha256, change)}
  />
{:else}
  <div class="callout bad pad" role="alert">No item {page.params.item} in this packet.</div>
{/if}
