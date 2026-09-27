import { useMemo, useState } from "react";
import type { CaseSnapshot, Dataset, PublishedRun } from "../../../src/schema.ts";
import { useDataset } from "../api.ts";
import { Badge, Failure, Loading, OutcomeBadges, TallyBadge } from "../components/Bits.tsx";
import { Markdown } from "../components/Markdown.tsx";
import { href } from "../router.ts";
import { type Delta, deltaLabel, pairDelta, tally } from "../summary.ts";

export type Pair = { id: string; repetition: number; without?: PublishedRun; withSkill?: PublishedRun };

export function pairsFor(dataset: Dataset, caseKey: string): Pair[] {
  const runs = dataset.runs.filter((run) => run.caseKey === caseKey);
  return [...Map.groupBy(runs, (run) => run.pair).entries()]
    .map(([id, pair]) => ({
      id,
      repetition: pair[0]?.repetition ?? 0,
      without: pair.find((run) => run.condition === "without-skill"),
      withSkill: pair.find((run) => run.condition === "with-skill"),
    }))
    .sort((a, b) => a.repetition - b.repetition);
}

const filters = ["all", "differences", "worse", "equal"] as const;
type Filter = (typeof filters)[number];
const filterLabel: Record<Filter, string> = { all: "All pairs", differences: "Differences", worse: "With skill worse", equal: "Equal" };
const matches = (filter: Filter, delta: Delta) =>
  filter === "all" || (filter === "differences" ? delta !== "equal" : filter === "worse" ? delta === "worse" : delta === "equal");
const deltaTone = (delta: Delta) => (delta === "better" ? "good" : delta === "worse" ? "bad" : delta === "equal" ? "neutral" : "warn");

export function DatasetHeader({ dataset }: { dataset: Dataset }) {
  const r = dataset.requested;
  return (
    <header className="dataset-header">
      <div className="crumbs">
        <a href={href.home()}>Evaluations</a> / <a href={href.dataset(dataset.id)}>{dataset.title}</a>
      </div>
      <div className="dataset-title">
        <h1>{dataset.title}</h1>
        {dataset.kind === "historical" && <Badge tone="info">Historical — not newly executed</Badge>}
      </div>
      <dl className="meta">
        <div><dt>Host</dt><dd>{r.host}{dataset.hostVersion ? ` ${dataset.hostVersion}` : ""}</dd></div>
        {r.mode && <div><dt>Mode</dt><dd>{r.mode}</dd></div>}
        <div><dt>Model</dt><dd>{r.model ?? "not specified"}</dd></div>
        <div><dt>Effort</dt><dd>{r.effort ?? "not exposed"}</dd></div>
        <div><dt>Tools</dt><dd>{r.tools.join(", ")}</dd></div>
        <div><dt>Repetitions</dt><dd>{dataset.repetitions}</dd></div>
        <div><dt>Order seed</dt><dd>{dataset.orderSeed ?? "—"}</dd></div>
        <div><dt>Skills</dt><dd>{dataset.skillsRevision ?? "—"}</dd></div>
        <div><dt>Harness</dt><dd>{dataset.harness}</dd></div>
      </dl>
    </header>
  );
}

function CaseSection({ dataset, snapshot, filter }: { dataset: Dataset; snapshot: CaseSnapshot; filter: Filter }) {
  const pairs = pairsFor(dataset, snapshot.key).map((pair) => ({ pair, delta: pairDelta(pair.without, pair.withSkill, snapshot.criteria) }));
  const visible = pairs.filter(({ delta }) => matches(filter, delta));
  const kinds = (["task", "process", "mixed"] as const).filter((kind) => snapshot.criteria.some((c) => c.kind === kind));
  return (
    <section className="case card">
      <div className="case-head">
        <h3>
          {snapshot.name} <span className="muted">v{snapshot.version}</span>
        </h3>
        <span className="muted small">{snapshot.historicalId}</span>
      </div>
      <details className="case-prompt">
        <summary>Task prompt and expected outcome</summary>
        <Markdown text={snapshot.prompt} />
        <p className="muted small"><strong>Expected:</strong> {snapshot.expected}</p>
      </details>
      {visible.length === 0 ? (
        <p className="muted small">No pairs match this filter.</p>
      ) : (
        <table className="pairs">
          <thead>
            <tr>
              <th scope="col">Pair</th>
              <th scope="col">Without supplied skill</th>
              <th scope="col">With supplied skill</th>
              <th scope="col">Comparison</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(({ pair, delta }) => (
              <tr key={pair.id}>
                <th scope="row">r{pair.repetition}</th>
                {[pair.without, pair.withSkill].map((run, i) => (
                  <td key={i}>
                    {run ? (
                      <div className="cell">
                        <OutcomeBadges outcome={run.outcome} />
                        <span className="badges">
                          {kinds.map((kind) => (
                            <TallyBadge key={kind} label={kind} value={tally(run, snapshot.criteria, kind)} />
                          ))}
                          {!run.grade && <span className="muted small">ungraded</span>}
                        </span>
                      </div>
                    ) : (
                      <span className="muted">missing</span>
                    )}
                  </td>
                ))}
                <td>
                  <div className="cell">
                    <Badge tone={deltaTone(delta)}>{deltaLabel[delta]}</Badge>
                    <a className="button small" href={href.pair(dataset.id, snapshot.skill, pair.id)}>
                      Compare →
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export function DatasetPage({ id, skill }: { id: string; skill: string | null }) {
  const resource = useDataset(id);
  const [filter, setFilter] = useState<Filter>("all");
  const skills = useMemo(
    () => (resource.status === "ready" ? [...new Set(resource.value.cases.map((c) => c.skill))] : []),
    [resource],
  );
  if (resource.status === "loading") return <Loading />;
  if (resource.status === "error") return <Failure message={resource.message} />;
  const dataset = resource.value;
  const active = skill && skills.includes(skill as never) ? skill : skills[0];
  const cases = dataset.cases.filter((c) => c.skill === active);
  return (
    <div className="page">
      <DatasetHeader dataset={dataset} />
      <div className="callout info">
        <Markdown text={dataset.summary} />
        <details>
          <summary>Limitations ({dataset.limitations.length})</summary>
          <ul>
            {dataset.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
          <p className="muted small">
            Reviewed export: {dataset.attestation.statement || "no statement"} ({dataset.attestation.at.slice(0, 10)})
          </p>
        </details>
      </div>

      <nav className="tabs" aria-label="Skills">
        {skills.map((name) => (
          <a key={name} href={href.dataset(dataset.id, name)} aria-current={name === active ? "page" : undefined}>
            {name}
          </a>
        ))}
      </nav>

      <div className="filters" role="group" aria-label="Filter pairs">
        {filters.map((value) => (
          <button key={value} type="button" className={value === filter ? "chip active" : "chip"} aria-pressed={value === filter} onClick={() => setFilter(value)}>
            {filterLabel[value]}
          </button>
        ))}
        <span className="muted small">
          Comparison uses executed checks, then task criteria. Process criteria and preference are shown separately, never
          folded into a score.
        </span>
      </div>

      {cases.map((snapshot) => (
        <CaseSection key={snapshot.key} dataset={dataset} snapshot={snapshot} filter={filter} />
      ))}
    </div>
  );
}
