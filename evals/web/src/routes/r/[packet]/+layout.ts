import { error } from "@sveltejs/kit";
import type { Packet } from "$lib/types";
import type { LayoutLoad } from "./$types";

// Review pages render only in the reviewer's browser: drafts come from that
// browser's localStorage and must never be rendered or shared by the server.
export const ssr = false;

async function sha256Hex(text: string): Promise<string | null> {
  if (!globalThis.crypto?.subtle) return null;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

// The fingerprint covers the exact bytes served, which ties drafts to evidence.
export const load: LayoutLoad = async ({ fetch, params }) => {
  const response = await fetch(`/api/packets/${encodeURIComponent(params.packet)}.json`);
  if (!response.ok) error(response.status, response.status === 404 ? "No such packet" : "Could not load the packet");
  const text = await response.text();
  return { packet: JSON.parse(text) as Packet, sha256: await sha256Hex(text) };
};
