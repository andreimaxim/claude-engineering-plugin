import { useEffect, useState } from "react";
import type { Dataset, Packet, ResultsIndex } from "../../src/schema.ts";

export type Resource<T> = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; value: T };

function useJson<T>(url: string, parse: (text: string) => Promise<T>): Resource<T> {
  const [resource, setResource] = useState<Resource<T>>({ status: "loading" });
  useEffect(() => {
    let current = true;
    setResource({ status: "loading" });
    fetch(url, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        return parse(await response.text());
      })
      .then((value) => current && setResource({ status: "ready", value }))
      .catch((error: unknown) => current && setResource({ status: "error", message: String(error) }));
    return () => {
      current = false;
    };
  }, [url]);
  return resource;
}

export const useIndex = () => useJson<ResultsIndex>("/api/index.json", async (text) => JSON.parse(text));

export const useDataset = (id: string) =>
  useJson<Dataset>(`/api/datasets/${encodeURIComponent(id)}.json`, async (text) => JSON.parse(text));

async function sha256Hex(text: string): Promise<string | null> {
  if (!globalThis.crypto?.subtle) return null;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** A packet plus the SHA-256 of the exact bytes served, which ties drafts to evidence. */
export type LoadedPacket = { packet: Packet; sha256: string | null };

export const usePacket = (id: string) =>
  useJson<LoadedPacket>(`/api/packets/${encodeURIComponent(id)}.json`, async (text) => ({
    packet: JSON.parse(text) as Packet,
    sha256: await sha256Hex(text),
  }));
