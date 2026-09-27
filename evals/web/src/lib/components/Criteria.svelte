<script lang="ts">
  import { conditionLabel, kindLabel } from "$lib/summary";
  import type { CaseSnapshot, PublishedRun, Verdict } from "$lib/types";
  import Badge, { type Tone } from "./Badge.svelte";

  let { snapshot, without, withSkill }: { snapshot: CaseSnapshot; without?: PublishedRun; withSkill?: PublishedRun } = $props();

  const verdictTone: Record<Verdict, Tone> = { pass: "good", fail: "bad", unverified: "warn" };
  const kinds = $derived((["task", "process", "mixed"] as const).filter((kind) => snapshot.criteria.some((c) => c.kind === kind)));
  const verdict = (run: PublishedRun | undefined, id: string) => run?.grade?.criteria.find((c) => c.id === id);
</script>

<section class="card">
  <h2>Grading evidence</h2>
  <p class="muted small">
    Task correctness and skill-process criteria are listed separately. Neither is a preference judgment; see the
    calibration packets for human review.
  </p>
  {#each kinds as kind (kind)}
    <div class="criteria-group">
      <h3>{kindLabel[kind]}</h3>
      <table class="criteria">
        <thead>
          <tr>
            <th scope="col">Criterion</th>
            <th scope="col">{conditionLabel["without-skill"]}</th>
            <th scope="col">{conditionLabel["with-skill"]}</th>
          </tr>
        </thead>
        <tbody>
          {#each snapshot.criteria.filter((c) => c.kind === kind) as criterion (criterion.id)}
            <tr>
              <td><code class="small">{criterion.id}</code> {criterion.text}</td>
              {#each [without, withSkill] as run, i (i)}
                {@const v = verdict(run, criterion.id)}
                <td>
                  {#if v}
                    <details>
                      <summary><Badge tone={verdictTone[v.verdict]}>{v.verdict}</Badge></summary>
                      <p class="small">{v.evidence}</p>
                    </details>
                  {:else}
                    <span class="muted small">ungraded</span>
                  {/if}
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/each}
  <div class="compare-cells">
    {#each [without, withSkill] as run, i (i)}
      <div class="small">
        {#if run?.grade}
          <p><strong>Grader note:</strong> {run.grade.note}</p>
          <p class="muted">{run.grade.grader}. {run.grade.method}</p>
        {:else}
          <p class="muted">Not graded.</p>
        {/if}
      </div>
    {/each}
  </div>
</section>
