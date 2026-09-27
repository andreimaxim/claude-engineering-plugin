// Review drafts live only in this browser's localStorage. They are keyed by the
// packet's exact served bytes (SHA-256) and each item's evidence hash, so a draft is
// never applied to different evidence or a different A/B assignment. The key format
// and export format are unchanged from the first version of the app, so existing
// drafts and exports keep working. Construct a DraftStore only in the browser.
import type { AnswerVerdict, JudgmentExport, Packet, Preference } from "$lib/types";

export type Draft = {
  itemSha256: string;
  a: AnswerVerdict | null;
  b: AnswerVerdict | null;
  preference: Preference | null;
  correction: string;
  notes: string;
  updatedAt: string;
};

type Stored = { reviewer: string; items: Record<string, Draft> };

export type StorageState = { kind: "saved"; at: string } | { kind: "idle" } | { kind: "unavailable"; reason: string };

export const draftPrefix = "engineering-evals:drafts:v1:";
export const draftKey = (packet: string, sha256: string | null) => `${draftPrefix}${packet}:${sha256 ?? "unverified"}`;

export const emptyDraft = (itemSha256: string): Draft => ({
  itemSha256, a: null, b: null, preference: null, correction: "", notes: "", updatedAt: "",
});

export const isComplete = (draft: Draft | undefined) => Boolean(draft?.a && draft.b && draft.preference);

function storage(): Storage | null {
  try {
    const probe = `${draftPrefix}probe`;
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

export class DraftStore {
  readonly key: string;
  readonly otherVersions: number;
  #stored = $state<Stored>({ reviewer: "", items: {} });
  state = $state<StorageState>({ kind: "idle" });

  constructor(
    readonly packet: Packet,
    readonly sha256: string | null,
  ) {
    this.key = draftKey(packet.id, sha256);
    const target = storage();
    if (!target) {
      this.state = { kind: "unavailable", reason: "This browser blocks local storage; drafts last only while this tab stays open." };
      this.otherVersions = 0;
      return;
    }
    try {
      const raw = target.getItem(this.key);
      if (raw) this.#stored = JSON.parse(raw) as Stored;
    } catch {
      this.#stored = { reviewer: "", items: {} };
    }
    if (Object.keys(this.#stored.items).length || this.#stored.reviewer) {
      this.state = { kind: "saved", at: new Date().toLocaleTimeString() };
    }
    this.otherVersions = Array.from({ length: target.length }, (_, i) => target.key(i)).filter(
      (key) => key?.startsWith(`${draftPrefix}${packet.id}:`) && key !== this.key,
    ).length;
  }

  get reviewer() {
    return this.#stored.reviewer;
  }

  /** Drafts whose evidence hash matches the served item. */
  get drafts(): Record<string, Draft> {
    return Object.fromEntries(
      this.packet.items.flatMap((item) => {
        const draft = this.#stored.items[item.id];
        return draft && draft.itemSha256 === item.sha256 ? [[item.id, draft]] : [];
      }),
    );
  }

  /** Items with a draft written against different evidence; never applied. */
  get stale(): string[] {
    return this.packet.items
      .filter((item) => this.#stored.items[item.id] && this.#stored.items[item.id]!.itemSha256 !== item.sha256)
      .map((item) => item.id);
  }

  draftFor(itemId: string, itemSha256: string): Draft {
    return this.drafts[itemId] ?? emptyDraft(itemSha256);
  }

  update(itemId: string, itemSha256: string, change: Partial<Draft>) {
    const existing = this.#stored.items[itemId];
    const base = existing && existing.itemSha256 === itemSha256 ? existing : emptyDraft(itemSha256);
    this.#stored.items[itemId] = { ...base, ...change, updatedAt: new Date().toISOString() };
    this.#persist();
  }

  setReviewer(reviewer: string) {
    this.#stored.reviewer = reviewer;
    this.#persist();
  }

  clear() {
    this.#stored = { reviewer: "", items: {} };
    this.#persist();
  }

  #persist() {
    const target = storage();
    if (!target) return;
    try {
      target.setItem(this.key, JSON.stringify($state.snapshot(this.#stored)));
      this.state = { kind: "saved", at: new Date().toLocaleTimeString() };
    } catch (error) {
      this.state = { kind: "unavailable", reason: `Saving failed (${String(error)}); export your judgments now.` };
    }
  }

  exportJudgments(): JudgmentExport {
    const drafts = this.drafts;
    return {
      format: "engineering-evals.judgments.v1",
      packet: this.packet.id,
      packetSha256: this.sha256 ?? "unverified",
      exportedAt: new Date().toISOString(),
      reviewer: this.#stored.reviewer,
      judgments: this.packet.items.map((item) => {
        const draft = drafts[item.id] ?? emptyDraft(item.sha256);
        return {
          item: item.id,
          itemSha256: item.sha256,
          a: draft.a,
          b: draft.b,
          preference: draft.preference,
          correction: draft.correction,
          notes: draft.notes,
        };
      }),
    };
  }
}
