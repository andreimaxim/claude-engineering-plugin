import type { ReactNode } from "react";
import type { ContextItem, Outcome } from "../../../src/schema.ts";
import type { Tally } from "../summary.ts";
import { Diff } from "./Diff.tsx";
import { FileContent } from "./Markdown.tsx";

export type Tone = "good" | "bad" | "warn" | "neutral" | "info";

export const Badge = ({ tone, children, title }: { tone: Tone; children: ReactNode; title?: string }) => (
  <span className={`badge ${tone}`} title={title}>
    {children}
  </span>
);

export function OutcomeBadges({ outcome }: { outcome: Outcome }) {
  const checks: Record<Outcome["checks"], [Tone, string]> = {
    passed: ["good", "checks passed"],
    failed: ["bad", "checks failed"],
    none: ["neutral", "no checks"],
    "not-run": ["warn", "checks not run"],
  };
  const [checkTone, checkText] = checks[outcome.checks];
  return (
    <span className="badges">
      <Badge tone={outcome.execution === "succeeded" ? "good" : "bad"} title={outcome.detail ?? undefined}>
        {outcome.execution}
      </Badge>
      <Badge tone={checkTone}>{checkText}</Badge>
      {outcome.model === "mismatch" && <Badge tone="bad">model mismatch</Badge>}
      {outcome.tools === "mismatch" && <Badge tone="bad">tool mismatch</Badge>}
      {outcome.skillIntact === false && <Badge tone="bad">skill files changed</Badge>}
      {outcome.missingEvidence.length > 0 && (
        <Badge tone="warn" title={outcome.missingEvidence.join("\n")}>
          {outcome.missingEvidence.length} missing evidence
        </Badge>
      )}
    </span>
  );
}

export function TallyBadge({ label, value }: { label: string; value: Tally | null }) {
  if (!value) return null;
  const tone: Tone = value.fail ? "bad" : value.unverified ? "warn" : "good";
  const detail = [value.fail && `${value.fail} fail`, value.unverified && `${value.unverified} unverified`].filter(Boolean).join(", ");
  return (
    <Badge tone={tone} title={detail || "all pass"}>
      {label} {value.pass}/{value.total}
    </Badge>
  );
}

export function ContextItems({ items }: { items: ContextItem[] }) {
  if (!items.length) return <p className="muted">No additional context.</p>;
  return (
    <div className="context-items">
      {items.map((item, index) => {
        switch (item.kind) {
          case "file":
            return (
              <details key={index} className="context-item">
                <summary>
                  <code>{item.path}</code> <span className="muted small">{item.provenance}</span>
                </summary>
                <FileContent path={item.path} content={item.content} />
              </details>
            );
          case "patch":
            return (
              <details key={index} className="context-item">
                <summary>
                  <code>{item.path}</code> <span className="muted small">{item.provenance}</span>
                </summary>
                <Diff diff={item.content} />
              </details>
            );
          case "repository":
            return (
              <div key={index} className="context-item repository">
                <strong>{item.name}</strong> at <code>{item.ref}</code> (<code>{item.commit.slice(0, 12)}</code>) from{" "}
                <a href={item.url.replace(/\.git$/, "")} target="_blank" rel="noopener noreferrer">
                  {item.url.replace(/^https:\/\//, "").replace(/\.git$/, "")}
                </a>
                <div className="muted small">{item.provenance}</div>
              </div>
            );
          case "missing":
            return (
              <div key={index} className="context-item missing">
                <Badge tone="warn">missing</Badge> {item.description}
              </div>
            );
        }
      })}
    </div>
  );
}

export const Loading = () => <p className="muted pad">Loading…</p>;
export const Failure = ({ message }: { message: string }) => (
  <div className="callout bad pad" role="alert">
    Could not load: {message}
  </div>
);
