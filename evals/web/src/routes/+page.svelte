<script lang="ts">
  import Badge from "$lib/components/Badge.svelte";
  import { href } from "$lib/links";

  let { data } = $props();
  const datasets = $derived(data.index.datasets);
  const packets = $derived(data.index.packets);
</script>

<svelte:head><title>Engineering skill evaluations</title></svelte:head>

<div class="page">
  <section class="intro">
    <h1>What changes when an agent receives these skills?</h1>
    <p>
      Each case runs twice with the same prompt, host, model settings, tools, and inputs. One run also receives the
      skill's files; the other receives no skill from this suite, though host instructions and account configuration can
      still reach both. Compare what each actually produced: answers, workspace changes, and checks the harness executed
      afterwards.
    </p>
  </section>

  <section>
    <h2>Comparisons</h2>
    <div class="cards">
      {#each datasets as dataset (dataset.id)}
        <a class="card link-card" href={href.dataset(dataset.id)}>
          <div class="card-head">
            <Badge tone={dataset.kind === "historical" ? "info" : "neutral"}>{dataset.kind === "historical" ? "Historical" : "Batch"}</Badge>
            <span class="muted small">{dataset.runs} runs</span>
          </div>
          <h3>{dataset.title}</h3>
          <code class="muted small">{dataset.id}</code>
        </a>
      {:else}
        <p class="muted">No reviewed datasets have been published yet.</p>
      {/each}
    </div>
  </section>

  <section>
    <h2>Human calibration</h2>
    <p class="muted">Condition-masked A/B packets. Judgments are saved as drafts in this browser only; export them explicitly.</p>
    <div class="cards">
      {#each packets as packet (packet.id)}
        <a class="card link-card" href={href.packet(packet.id)}>
          <div class="card-head">
            <Badge tone="neutral">{packet.items} items</Badge>
            <code class="muted small">{packet.sha256.slice(0, 12)}</code>
          </div>
          <h3>{packet.title}</h3>
          <code class="muted small">{packet.id}</code>
        </a>
      {:else}
        <p class="muted">No calibration packets yet.</p>
      {/each}
    </div>
  </section>
</div>
