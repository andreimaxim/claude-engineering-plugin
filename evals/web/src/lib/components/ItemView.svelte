<script lang="ts">
  import type { Draft } from "$lib/drafts.svelte";
  import { href } from "$lib/links";
  import type { AnswerVerdict, Packet, PacketItem, Preference } from "$lib/types";
  import Choice from "./Choice.svelte";
  import ContextItems from "./ContextItems.svelte";
  import Diff from "./Diff.svelte";
  import Markdown from "./Markdown.svelte";

  let { packet, item, draft, onchange }: { packet: Packet; item: PacketItem; draft: Draft; onchange: (change: Partial<Draft>) => void } = $props();

  const verdicts: [AnswerVerdict, string][] = [["accept", "Accept"], ["needs-correction", "Needs correction"], ["reject", "Reject"]];
  const preferences: [Preference, string][] = [["a", "A"], ["b", "B"], ["tie", "Tie"], ["neither", "Neither"]];
  const index = $derived(packet.items.findIndex((i) => i.id === item.id));
  const previous = $derived(packet.items[index - 1]);
  const next = $derived(packet.items[index + 1]);
</script>

<section class="card">
  <div class="case-head">
    <h2>{item.title}</h2>
    <span class="muted small">Item {index + 1} of {packet.items.length}</span>
  </div>
  <Markdown text={item.prompt} />
  <details>
    <summary>Original context</summary>
    <ContextItems items={item.context} />
  </details>
</section>
<div class="compare-sticky compare-cells" aria-hidden="true">
  <div class="condition-label masked">Answer A</div>
  <div class="condition-label masked">Answer B</div>
</div>
<section class="compare-row">
  <h2 class="compare-row-title">Final answer</h2>
  <div class="compare-cells">
    <div class="compare-cell"><div class="cell-label">Answer A</div><Markdown text={item.a.response} /></div>
    <div class="compare-cell"><div class="cell-label">Answer B</div><Markdown text={item.b.response} /></div>
  </div>
</section>
<section class="compare-row">
  <h2 class="compare-row-title">Workspace changes</h2>
  <div class="compare-cells">
    <div class="compare-cell"><div class="cell-label">Answer A</div><Diff diff={item.a.diff} /></div>
    <div class="compare-cell"><div class="cell-label">Answer B</div><Diff diff={item.b.diff} /></div>
  </div>
</section>
<section class="card judgment">
  <h2>Your judgment</h2>
  <div class="compare-cells">
    <Choice legend="Answer A" name="{item.id}-a" options={verdicts} value={draft.a} onchange={(a) => onchange({ a })} />
    <Choice legend="Answer B" name="{item.id}-b" options={verdicts} value={draft.b} onchange={(b) => onchange({ b })} />
  </div>
  <Choice legend="Which would you rather receive?" name="{item.id}-preference" options={preferences} value={draft.preference} onchange={(preference) => onchange({ preference })} />
  <label class="field">
    The exact correction you would send
    <textarea rows="4" value={draft.correction} oninput={(event) => onchange({ correction: event.currentTarget.value })} placeholder="Write it as you would to the agent; leave empty if neither needs one."></textarea>
  </label>
  <label class="field">
    Notes (optional)
    <textarea rows="2" value={draft.notes} oninput={(event) => onchange({ notes: event.currentTarget.value })}></textarea>
  </label>
  <nav class="pair-nav">
    {#if previous}<a href={href.packet(packet.id, previous.id)}>‹ Previous item</a>{:else}<span></span>{/if}
    {#if next}
      <a class="button" href={href.packet(packet.id, next.id)}>Next item ›</a>
    {:else}
      <a class="button" href={href.packet(packet.id)}>Finish and export</a>
    {/if}
  </nav>
</section>
