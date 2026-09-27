import { useSyncExternalStore } from "react";

// Hash routes keep the server a plain static host with no route table.
export type Route =
  | { page: "home" }
  | { page: "dataset"; dataset: string; skill: string | null }
  | { page: "pair"; dataset: string; skill: string; pair: string }
  | { page: "packet"; packet: string; item: string | null }
  | { page: "missing" };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  const [kind, a, b, c] = parts;
  if (!kind) return { page: "home" };
  if (kind === "d" && a && b && c) return { page: "pair", dataset: a, skill: b, pair: c };
  if (kind === "d" && a) return { page: "dataset", dataset: a, skill: b ?? null };
  if (kind === "r" && a) return { page: "packet", packet: a, item: b ?? null };
  return { page: "missing" };
}

export const href = {
  home: () => "#/",
  dataset: (dataset: string, skill?: string) => `#/d/${encodeURIComponent(dataset)}${skill ? `/${encodeURIComponent(skill)}` : ""}`,
  pair: (dataset: string, skill: string, pair: string) =>
    `#/d/${encodeURIComponent(dataset)}/${encodeURIComponent(skill)}/${encodeURIComponent(pair)}`,
  packet: (packet: string, item?: string) => `#/r/${encodeURIComponent(packet)}${item ? `/${encodeURIComponent(item)}` : ""}`,
};

const subscribe = (callback: () => void) => {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
};

export const useRoute = (): Route => parseRoute(useSyncExternalStore(subscribe, () => window.location.hash));
