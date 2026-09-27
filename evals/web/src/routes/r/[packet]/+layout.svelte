<script lang="ts">
  import { page } from "$app/state";
  import Badge from "$lib/components/Badge.svelte";
  import StorageNote from "$lib/components/StorageNote.svelte";
  import { DraftStore, isComplete } from "$lib/drafts.svelte";
  import { href } from "$lib/links";
  import { setContext } from "svelte";

  let { data, children } = $props();

  // One store per mounted packet, created in the browser (this route never renders on the server).
  const drafts = $derived(new DraftStore(data.packet, data.sha256));
  setContext("drafts", () => drafts);
  const packet = $derived(data.packet);
  const current = $derived(page.params.item);
</script>

<svelte:head><title>{packet.title} · Skill evaluations</title></svelte:head>

<div class="page review">
  <header class="dataset-header">
    <div class="crumbs"><a href={href.home()}>Evaluations</a> / <a href={href.packet(packet.id)}>{packet.title}</a></div>
    <div class="dataset-title">
      <h1>{packet.title}</h1>
      <Badge tone="neutral">Condition-masked</Badge>
    </div>
    <StorageNote {drafts} />
  </header>
  <div class="review-layout">
    <nav class="item-list" aria-label="Items">
      <a href={href.packet(packet.id)} aria-current={!current ? "page" : undefined}>Overview and export</a>
      {#each packet.items as entry, index (entry.id)}
        {@const draft = drafts.drafts[entry.id]}
        <a href={href.packet(packet.id, entry.id)} aria-current={entry.id === current ? "page" : undefined}>
          <span class={isComplete(draft) ? "dot done" : draft ? "dot partial" : "dot"} aria-hidden="true"></span>
          {index + 1}. {entry.title}
          <span class="visually-hidden">{isComplete(draft) ? " (complete)" : ""}</span>
        </a>
      {/each}
    </nav>
    <div class="review-main">{@render children()}</div>
  </div>
</div>
