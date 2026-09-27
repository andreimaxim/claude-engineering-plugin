import { useCallback, useEffect, useState } from "react";
import type { AnswerVerdict, JudgmentExport, Packet, Preference } from "../../src/schema.ts";

// Drafts live only in this browser's localStorage. They are keyed by the packet's
// exact served bytes (SHA-256) and each item's evidence hash, so a draft is never
// applied to different evidence or a different A/B assignment.

export type Draft = {
  itemSha256: string;
  a: AnswerVerdict | null;
  b: AnswerVerdict | null;
  preference: Preference | null;
  correction: string;
  notes: string;
  updatedAt: string;
};

type Store = { reviewer: string; items: Record<string, Draft> };

export type StorageState = { kind: "saved"; at: string } | { kind: "idle" } | { kind: "unavailable"; reason: string };

const prefix = "engineering-evals:drafts:v1:";
const storageKey = (packet: string, sha256: string | null) => `${prefix}${packet}:${sha256 ?? "unverified"}`;

function storage(): Storage | null {
  try {
    const probe = `${prefix}probe`;
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

export const emptyDraft = (itemSha256: string): Draft => ({
  itemSha256, a: null, b: null, preference: null, correction: "", notes: "", updatedAt: "",
});

export const isComplete = (draft: Draft | undefined) => Boolean(draft?.a && draft.b && draft.preference);

export function useDrafts(packet: Packet, sha256: string | null) {
  const key = storageKey(packet.id, sha256);
  const [store, setStore] = useState<Store>(() => {
    try {
      const raw = storage()?.getItem(key);
      return raw ? (JSON.parse(raw) as Store) : { reviewer: "", items: {} };
    } catch {
      return { reviewer: "", items: {} };
    }
  });
  const [state, setState] = useState<StorageState>(() =>
    storage() ? { kind: "idle" } : { kind: "unavailable", reason: "This browser blocks local storage; drafts last only while this tab stays open." },
  );

  useEffect(() => {
    const target = storage();
    if (!target) return;
    try {
      target.setItem(key, JSON.stringify(store));
      if (Object.keys(store.items).length || store.reviewer) setState({ kind: "saved", at: new Date().toLocaleTimeString() });
    } catch (error) {
      setState({ kind: "unavailable", reason: `Saving failed (${String(error)}); export your judgments now.` });
    }
  }, [key, store]);

  const current = Object.fromEntries(
    packet.items.flatMap((item) => {
      const draft = store.items[item.id];
      return draft && draft.itemSha256 === item.sha256 ? [[item.id, draft]] : [];
    }),
  ) as Record<string, Draft>;
  const stale = packet.items.filter((item) => store.items[item.id] && store.items[item.id]!.itemSha256 !== item.sha256).map((i) => i.id);

  const update = useCallback(
    (itemId: string, itemSha256: string, change: Partial<Draft>) =>
      setStore((previous) => {
        const existing = previous.items[itemId];
        const base = existing && existing.itemSha256 === itemSha256 ? existing : emptyDraft(itemSha256);
        return { ...previous, items: { ...previous.items, [itemId]: { ...base, ...change, updatedAt: new Date().toISOString() } } };
      }),
    [],
  );
  const setReviewer = useCallback((reviewer: string) => setStore((previous) => ({ ...previous, reviewer })), []);
  const clear = useCallback(() => setStore({ reviewer: "", items: {} }), []);

  const otherVersions = (() => {
    try {
      const target = storage();
      if (!target) return 0;
      return Array.from({ length: target.length }, (_, i) => target.key(i)).filter(
        (k) => k?.startsWith(`${prefix}${packet.id}:`) && k !== key,
      ).length;
    } catch {
      return 0;
    }
  })();

  const exportJudgments = (): JudgmentExport => ({
    format: "engineering-evals.judgments.v1",
    packet: packet.id,
    packetSha256: sha256 ?? "unverified",
    exportedAt: new Date().toISOString(),
    reviewer: store.reviewer,
    judgments: packet.items.map((item) => {
      const draft = current[item.id] ?? emptyDraft(item.sha256);
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
  });

  return { drafts: current, stale, reviewer: store.reviewer, setReviewer, update, clear, state, otherVersions, exportJudgments };
}
