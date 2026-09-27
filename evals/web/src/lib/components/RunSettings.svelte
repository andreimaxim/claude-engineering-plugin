<script lang="ts">
  import { formatSeconds, formatTokens } from "$lib/summary";
  import type { PublishedRun } from "$lib/types";
  import OutcomeBadges from "./OutcomeBadges.svelte";

  let { run }: { run: PublishedRun } = $props();
  const o = $derived(run.observed);
  const list = (values: string[]) => (values.length ? values.join(", ") : "none recorded");
</script>

<div>
  <OutcomeBadges outcome={run.outcome} />
  {#if run.outcome.detail}<p class="small">{run.outcome.detail}</p>{/if}
  <dl class="meta compact">
    <div><dt>Observed model</dt><dd>{o.models.join(", ") || "unknown"} <span class="muted">({run.outcome.model})</span></dd></div>
    <div><dt>Mode</dt><dd>{o.mode ?? "—"}</dd></div>
    <div><dt>Effort</dt><dd>{o.effort ?? "not exposed"}</dd></div>
    <div><dt>Tools</dt><dd>{list(o.tools)} <span class="muted">({run.outcome.tools})</span></dd></div>
    <div><dt>Duration</dt><dd>{formatSeconds(o.seconds)}</dd></div>
    <div><dt>Tokens in / out</dt><dd>{formatTokens(o.inputTokens)} / {formatTokens(o.outputTokens)}</dd></div>
    <div><dt>Order in pair</dt><dd>{run.orderInPair ?? "not recorded"}</dd></div>
    {#if run.condition === "with-skill"}
      <div>
        <dt>Skill read</dt>
        <dd>
          {o.skillRead === null ? "not recorded" : o.skillRead ? "observed in trace" : "not observed"}; files
          {run.outcome.skillIntact === null ? "integrity not recorded" : run.outcome.skillIntact ? "unchanged" : "CHANGED"}
        </dd>
      </div>
    {/if}
    <div><dt>Outside access</dt><dd>{o.outsideAccess.length ? o.outsideAccess.join("; ") : "none flagged"}</dd></div>
    <div><dt>MCP servers</dt><dd>{list(o.mcpServers)}</dd></div>
    <div><dt>Synced host guidance</dt><dd>{list(o.hostGuidance)}</dd></div>
    <div><dt>Workspace guidance</dt><dd>{list(o.workspaceGuidance)}</dd></div>
  </dl>
  {#if run.outcome.missingEvidence.length > 0}
    <p class="small warn-text">Missing evidence: {run.outcome.missingEvidence.join("; ")}</p>
  {/if}
  <details>
    <summary class="small">Prompt sent</summary>
    <pre class="prompt">{run.prompt}</pre>
  </details>
</div>
