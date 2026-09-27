import { useState } from "react";
import type { AnswerVerdict, Packet, PacketItem, Preference } from "../../../src/schema.ts";
import { usePacket } from "../api.ts";
import { Badge, ContextItems, Failure, Loading } from "../components/Bits.tsx";
import { Diff } from "../components/Diff.tsx";
import { Markdown } from "../components/Markdown.tsx";
import { type Draft, emptyDraft, isComplete, useDrafts } from "../drafts.ts";
import { href } from "../router.ts";

const verdicts: [AnswerVerdict, string][] = [
  ["accept", "Accept"],
  ["needs-correction", "Needs correction"],
  ["reject", "Reject"],
];
const preferences: [Preference, string][] = [
  ["a", "A"],
  ["b", "B"],
  ["tie", "Tie"],
  ["neither", "Neither"],
];

function Choice<T extends string>(props: { legend: string; name: string; options: [T, string][]; value: T | null; onChange: (value: T) => void }) {
  return (
    <fieldset className="choice">
      <legend>{props.legend}</legend>
      <div className="segmented">
        {props.options.map(([value, label]) => (
          <label key={value} className={props.value === value ? "selected" : undefined}>
            <input type="radio" name={props.name} value={value} checked={props.value === value} onChange={() => props.onChange(value)} />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ExportPanel({ drafts, packet }: { drafts: ReturnType<typeof useDrafts>; packet: Packet }) {
  const [message, setMessage] = useState<string | null>(null);
  const [fallback, setFallback] = useState<string | null>(null);
  const complete = packet.items.filter((item) => isComplete(drafts.drafts[item.id])).length;
  const json = () => `${JSON.stringify(drafts.exportJudgments(), null, 2)}\n`;
  const copy = async () => {
    const text = json();
    try {
      if (!navigator.clipboard) throw new Error("clipboard API unavailable");
      await navigator.clipboard.writeText(text);
      setFallback(null);
      setMessage(`Copied ${complete}/${packet.items.length} complete judgments to the clipboard.`);
    } catch (error) {
      setFallback(text);
      setMessage(`The browser refused clipboard access (${String(error)}). Select the text below and copy it manually.`);
    }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([json()], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${packet.id}-judgments.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Download started. Nothing was sent to a server.");
  };
  return (
    <section className="card export">
      <h2>Export judgments</h2>
      <p className="small">
        Nothing is submitted automatically. Drafts stay in this browser and are not synchronized. Export and send the file
        yourself; the operator unmasks it with the private key.
      </p>
      <label className="field">
        Reviewer name or initials
        <input type="text" value={drafts.reviewer} onChange={(event) => drafts.setReviewer(event.target.value)} autoComplete="off" />
      </label>
      <p className="small">
        {complete} of {packet.items.length} items complete{complete < packet.items.length ? "; incomplete items export with empty fields." : "."}
      </p>
      <div className="button-row">
        <button type="button" className="button" onClick={copy}>Copy JSON</button>
        <button type="button" className="button" onClick={download}>Download JSON</button>
        <button
          type="button"
          className="button subtle"
          onClick={() => window.confirm("Delete every local draft for this packet? This cannot be undone.") && drafts.clear()}
        >
          Clear local drafts
        </button>
      </div>
      {message && <p className="small" role="status">{message}</p>}
      {fallback && <textarea className="fallback" readOnly value={fallback} onFocus={(event) => event.currentTarget.select()} rows={8} aria-label="Judgments JSON" />}
    </section>
  );
}

function StorageNote({ drafts, sha256 }: { drafts: ReturnType<typeof useDrafts>; sha256: string | null }) {
  const state = drafts.state;
  return (
    <div className="storage-note small" role="status">
      {state.kind === "saved" && <>Draft saved in this browser at {state.at}.</>}
      {state.kind === "idle" && <>Drafts save automatically in this browser.</>}
      {state.kind === "unavailable" && <strong className="warn-text">{state.reason}</strong>}
      {sha256 ? <> Evidence fingerprint <code>{sha256.slice(0, 12)}</code>.</> : <strong className="warn-text"> Could not fingerprint the packet (insecure context); drafts are keyed as unverified.</strong>}
      {drafts.stale.length > 0 && <strong className="warn-text"> Drafts for {drafts.stale.join(", ")} were written against different evidence and are not applied.</strong>}
      {drafts.otherVersions > 0 && <> Drafts for another version of this packet exist and are not applied.</>}
    </div>
  );
}

function ItemView({ packet, item, draft, onChange }: { packet: Packet; item: PacketItem; draft: Draft; onChange: (change: Partial<Draft>) => void }) {
  const index = packet.items.findIndex((i) => i.id === item.id);
  const previous = packet.items[index - 1];
  const next = packet.items[index + 1];
  return (
    <>
      <section className="card">
        <div className="case-head">
          <h2>{item.title}</h2>
          <span className="muted small">Item {index + 1} of {packet.items.length}</span>
        </div>
        <Markdown text={item.prompt} />
        <details>
          <summary>Original context</summary>
          <ContextItems items={item.context} />
        </details>
      </section>
      <div className="compare-sticky compare-cells" aria-hidden="true">
        <div className="condition-label masked">Answer A</div>
        <div className="condition-label masked">Answer B</div>
      </div>
      <section className="compare-row">
        <h2 className="compare-row-title">Final answer</h2>
        <div className="compare-cells">
          <div className="compare-cell"><div className="cell-label">Answer A</div><Markdown text={item.a.response} /></div>
          <div className="compare-cell"><div className="cell-label">Answer B</div><Markdown text={item.b.response} /></div>
        </div>
      </section>
      <section className="compare-row">
        <h2 className="compare-row-title">Workspace changes</h2>
        <div className="compare-cells">
          <div className="compare-cell"><div className="cell-label">Answer A</div><Diff diff={item.a.diff} /></div>
          <div className="compare-cell"><div className="cell-label">Answer B</div><Diff diff={item.b.diff} /></div>
        </div>
      </section>
      <section className="card judgment">
        <h2>Your judgment</h2>
        <div className="compare-cells">
          <Choice legend="Answer A" name={`${item.id}-a`} options={verdicts} value={draft.a} onChange={(a) => onChange({ a })} />
          <Choice legend="Answer B" name={`${item.id}-b`} options={verdicts} value={draft.b} onChange={(b) => onChange({ b })} />
        </div>
        <Choice legend="Which would you rather receive?" name={`${item.id}-preference`} options={preferences} value={draft.preference} onChange={(preference) => onChange({ preference })} />
        <label className="field">
          The exact correction you would send
          <textarea rows={4} value={draft.correction} onChange={(event) => onChange({ correction: event.target.value })} placeholder="Write it as you would to the agent; leave empty if neither needs one." />
        </label>
        <label className="field">
          Notes (optional)
          <textarea rows={2} value={draft.notes} onChange={(event) => onChange({ notes: event.target.value })} />
        </label>
        <nav className="pair-nav">
          {previous ? <a href={href.packet(packet.id, previous.id)}>‹ Previous item</a> : <span />}
          {next ? <a className="button" href={href.packet(packet.id, next.id)}>Next item ›</a> : <a className="button" href={href.packet(packet.id)}>Finish and export</a>}
        </nav>
      </section>
    </>
  );
}

export function PacketPage({ id, itemId }: { id: string; itemId: string | null }) {
  const resource = usePacket(id);
  if (resource.status === "loading") return <Loading />;
  if (resource.status === "error") return <Failure message={resource.message} />;
  return <LoadedPacketPage packet={resource.value.packet} sha256={resource.value.sha256} itemId={itemId} />;
}

function LoadedPacketPage({ packet, sha256, itemId }: { packet: Packet; sha256: string | null; itemId: string | null }) {
  const drafts = useDrafts(packet, sha256);
  const item = itemId ? packet.items.find((i) => i.id === itemId) : undefined;
  return (
    <div className="page review">
      <header className="dataset-header">
        <div className="crumbs">
          <a href={href.home()}>Evaluations</a> / <a href={href.packet(packet.id)}>{packet.title}</a>
        </div>
        <div className="dataset-title">
          <h1>{packet.title}</h1>
          <Badge tone="neutral">Condition-masked</Badge>
        </div>
        <StorageNote drafts={drafts} sha256={sha256} />
      </header>
      <div className="review-layout">
        <nav className="item-list" aria-label="Items">
          <a href={href.packet(packet.id)} aria-current={!item ? "page" : undefined}>Overview and export</a>
          {packet.items.map((entry, index) => (
            <a key={entry.id} href={href.packet(packet.id, entry.id)} aria-current={entry.id === item?.id ? "page" : undefined}>
              <span className={isComplete(drafts.drafts[entry.id]) ? "dot done" : drafts.drafts[entry.id] ? "dot partial" : "dot"} aria-hidden="true" />
              {index + 1}. {entry.title}
              <span className="visually-hidden">{isComplete(drafts.drafts[entry.id]) ? " (complete)" : ""}</span>
            </a>
          ))}
        </nav>
        <div className="review-main">
          {item ? (
            <ItemView
              packet={packet}
              item={item}
              draft={drafts.drafts[item.id] ?? emptyDraft(item.sha256)}
              onChange={(change) => drafts.update(item.id, item.sha256, change)}
            />
          ) : (
            <>
              <section className="callout info">
                <p>{packet.disclosure}</p>
                <p className="small muted">Source: {packet.source}. Created {packet.createdAt.slice(0, 10)}.</p>
              </section>
              <section className="card">
                <h2>How to review</h2>
                <ol className="small">
                  <li>Judge each answer on its own: accept, needs correction, or reject.</li>
                  <li>Then choose which you would rather receive, or tie / neither.</li>
                  <li>Write the exact correction you would send the agent. These corrections shape the next, harder cases.</li>
                </ol>
                {packet.items[0] && <a className="button" href={href.packet(packet.id, packet.items[0].id)}>Start with item 1 →</a>}
              </section>
              <ExportPanel drafts={drafts} packet={packet} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
