import type { ReactNode } from "react";
import type { CaseSnapshot, CheckResult, PublishedRun, Verdict } from "../../../src/schema.ts";
import { useDataset } from "../api.ts";
import { Badge, ContextItems, Failure, Loading, OutcomeBadges, type Tone } from "../components/Bits.tsx";
import { Diff } from "../components/Diff.tsx";
import { Markdown } from "../components/Markdown.tsx";
import { href } from "../router.ts";
import { conditionLabel, deltaLabel, formatSeconds, formatTokens, kindLabel, pairDelta } from "../summary.ts";
import { DatasetHeader, pairsFor } from "./DatasetPage.tsx";

const verdictTone: Record<Verdict, Tone> = { pass: "good", fail: "bad", unverified: "warn" };

function Row({ title, children }: { title: string; children: [ReactNode, ReactNode] }) {
  return (
    <section className="compare-row">
      <h2 className="compare-row-title">{title}</h2>
      <div className="compare-cells">
        <div className="compare-cell"><div className="cell-label">{conditionLabel["without-skill"]}</div>{children[0]}</div>
        <div className="compare-cell"><div className="cell-label">{conditionLabel["with-skill"]}</div>{children[1]}</div>
      </div>
    </section>
  );
}

function Settings({ run }: { run: PublishedRun }) {
  const o = run.observed;
  const list = (values: string[]) => (values.length ? values.join(", ") : "none recorded");
  return (
    <div>
      <OutcomeBadges outcome={run.outcome} />
      {run.outcome.detail && <p className="small">{run.outcome.detail}</p>}
      <dl className="meta compact">
        <div><dt>Observed model</dt><dd>{o.models.join(", ") || "unknown"} <span className="muted">({run.outcome.model})</span></dd></div>
        <div><dt>Mode</dt><dd>{o.mode ?? "—"}</dd></div>
        <div><dt>Effort</dt><dd>{o.effort ?? "not exposed"}</dd></div>
        <div><dt>Tools</dt><dd>{list(o.tools)} <span className="muted">({run.outcome.tools})</span></dd></div>
        <div><dt>Duration</dt><dd>{formatSeconds(o.seconds)}</dd></div>
        <div><dt>Tokens in / out</dt><dd>{formatTokens(o.inputTokens)} / {formatTokens(o.outputTokens)}</dd></div>
        <div><dt>Order in pair</dt><dd>{run.orderInPair ?? "not recorded"}</dd></div>
        {run.condition === "with-skill" && (
          <div><dt>Skill read</dt><dd>{o.skillRead === null ? "not recorded" : o.skillRead ? "observed in trace" : "not observed"}; files {run.outcome.skillIntact === null ? "integrity not recorded" : run.outcome.skillIntact ? "unchanged" : "CHANGED"}</dd></div>
        )}
        <div><dt>Outside access</dt><dd>{o.outsideAccess.length ? o.outsideAccess.join("; ") : "none flagged"}</dd></div>
        <div><dt>MCP servers</dt><dd>{list(o.mcpServers)}</dd></div>
        <div><dt>Synced host guidance</dt><dd>{list(o.hostGuidance)}</dd></div>
        <div><dt>Workspace guidance</dt><dd>{list(o.workspaceGuidance)}</dd></div>
      </dl>
      {run.outcome.missingEvidence.length > 0 && (
        <p className="small warn-text">Missing evidence: {run.outcome.missingEvidence.join("; ")}</p>
      )}
      <details>
        <summary className="small">Prompt sent</summary>
        <pre className="prompt">{run.prompt}</pre>
      </details>
    </div>
  );
}

function Checks({ checks }: { checks: CheckResult[] }) {
  if (!checks.length) return <p className="muted">No harness checks for this case.</p>;
  return (
    <ul className="checks">
      {checks.map((check) => (
        <li key={check.id}>
          <details>
            <summary>
              <Badge tone={check.passed ? "good" : "bad"}>{check.passed ? "pass" : "fail"}</Badge> <strong>{check.id}</strong>{" "}
              <span className="muted small">{check.description}</span>
            </summary>
            <code className="small block">{check.command.join(" ")}</code>
            <pre className="output">{check.output || "(no output)"}</pre>
          </details>
        </li>
      ))}
    </ul>
  );
}

function Actions({ run }: { run: PublishedRun }) {
  if (!run.actions) return <p className="muted">Tool trace not included in this export.</p>;
  if (!run.actions.length) return <p className="muted">No tool calls.</p>;
  return (
    <details>
      <summary>{run.actions.length} tool calls (summaries; raw traces stay private)</summary>
      <ol className="actions">
        {run.actions.map((action, index) => (
          <li key={index} className={action.error ? "error" : undefined}>
            {action.result ? (
              <details>
                <summary>
                  <code>{action.tool}</code> {action.summary}
                </summary>
                <pre className="output">{action.result}</pre>
              </details>
            ) : (
              <>
                <code>{action.tool}</code> {action.summary}
              </>
            )}
          </li>
        ))}
      </ol>
    </details>
  );
}

function Criteria({ snapshot, without, withSkill }: { snapshot: CaseSnapshot; without?: PublishedRun; withSkill?: PublishedRun }) {
  const kinds = (["task", "process", "mixed"] as const).filter((kind) => snapshot.criteria.some((c) => c.kind === kind));
  const verdict = (run: PublishedRun | undefined, id: string) => run?.grade?.criteria.find((c) => c.id === id);
  return (
    <section className="card">
      <h2>Grading evidence</h2>
      <p className="muted small">
        Task correctness and skill-process criteria are listed separately. Neither is a preference judgment; see the
        calibration packets for human review.
      </p>
      {kinds.map((kind) => (
        <div key={kind} className="criteria-group">
          <h3>{kindLabel[kind]}</h3>
          <table className="criteria">
            <thead>
              <tr>
                <th scope="col">Criterion</th>
                <th scope="col">{conditionLabel["without-skill"]}</th>
                <th scope="col">{conditionLabel["with-skill"]}</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.criteria
                .filter((c) => c.kind === kind)
                .map((criterion) => (
                  <tr key={criterion.id}>
                    <td>
                      <code className="small">{criterion.id}</code> {criterion.text}
                    </td>
                    {[without, withSkill].map((run, i) => {
                      const v = verdict(run, criterion.id);
                      return (
                        <td key={i}>
                          {v ? (
                            <details>
                              <summary><Badge tone={verdictTone[v.verdict]}>{v.verdict}</Badge></summary>
                              <p className="small">{v.evidence}</p>
                            </details>
                          ) : (
                            <span className="muted small">ungraded</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}
      <div className="compare-cells">
        {[without, withSkill].map((run, i) => (
          <div key={i} className="small">
            {run?.grade ? (
              <>
                <p><strong>Grader note:</strong> {run.grade.note}</p>
                <p className="muted">{run.grade.grader}. {run.grade.method}</p>
              </>
            ) : (
              <p className="muted">Not graded.</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export function PairPage({ datasetId, skill, pairId }: { datasetId: string; skill: string; pairId: string }) {
  const resource = useDataset(datasetId);
  if (resource.status === "loading") return <Loading />;
  if (resource.status === "error") return <Failure message={resource.message} />;
  const dataset = resource.value;
  const all = dataset.cases.filter((c) => c.skill === skill).flatMap((snapshot) => pairsFor(dataset, snapshot.key).map((pair) => ({ snapshot, pair })));
  const index = all.findIndex((entry) => entry.pair.id === pairId);
  const entry = all[index];
  if (!entry) return <Failure message={`No pair ${pairId}`} />;
  const { snapshot, pair } = entry;
  const runs = [pair.without, pair.withSkill] as const;
  const previous = all[index - 1];
  const next = all[index + 1];
  const either = (render: (run: PublishedRun) => ReactNode): [ReactNode, ReactNode] =>
    [runs[0] ? render(runs[0]) : <p className="muted">Missing run.</p>, runs[1] ? render(runs[1]) : <p className="muted">Missing run.</p>];
  return (
    <div className="page">
      <DatasetHeader dataset={dataset} />
      <nav className="pair-nav" aria-label="Pairs">
        <a href={href.dataset(dataset.id, skill)}>← All {skill} cases</a>
        <span>
          {previous && <a href={href.pair(dataset.id, skill, previous.pair.id)}>‹ Previous</a>}
          <span className="muted small"> {index + 1} of {all.length} </span>
          {next && <a href={href.pair(dataset.id, skill, next.pair.id)}>Next ›</a>}
        </span>
      </nav>
      <section className="card">
        <div className="case-head">
          <h2>
            {snapshot.name} <span className="muted">v{snapshot.version} · repetition {pair.repetition}</span>
          </h2>
          <Badge tone="neutral">{deltaLabel[pairDelta(pair.without, pair.withSkill, snapshot.criteria)]}</Badge>
        </div>
        <Markdown text={snapshot.prompt} />
        <p className="small"><strong>Expected outcome:</strong> {snapshot.expected}</p>
        {snapshot.historyPattern && <p className="small muted"><strong>Pattern:</strong> {snapshot.historyPattern}</p>}
        <h3>Original context</h3>
        <ContextItems items={snapshot.context} />
      </section>

      <div className="compare-sticky compare-cells" aria-hidden="true">
        <div className="condition-label without">{conditionLabel["without-skill"]}</div>
        <div className="condition-label with">{conditionLabel["with-skill"]}</div>
      </div>

      {runs.some((run) => run?.annotations.length) && (
        <Row title="Annotations">{either((run) => (run.annotations.length ? <ul className="annotations">{run.annotations.map((a) => <li key={a}>{a}</li>)}</ul> : <p className="muted">None.</p>))}</Row>
      )}
      <Row title="Final answer">{either((run) => <Markdown text={run.response} />)}</Row>
      <Row title="Workspace changes">{either((run) => <Diff diff={run.diff} />)}</Row>
      <Row title="Executed checks">{either((run) => <Checks checks={run.checks} />)}</Row>
      <Criteria snapshot={snapshot} without={pair.without} withSkill={pair.withSkill} />
      <Row title="Observed settings and evidence">{either((run) => <Settings run={run} />)}</Row>
      <Row title="Observed actions">{either((run) => <Actions run={run} />)}</Row>
    </div>
  );
}
