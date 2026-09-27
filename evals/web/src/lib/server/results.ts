// Reads reviewed evidence only: JSON files directly inside results/datasets and
// results/packets, looked up by validated id. Run directories, raw traces, and A/B
// keys live under $EVALS_HOME and are unreachable from here. Bytes are served
// unchanged so browser fingerprints of packets match the files on disk.
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { env } from "$env/dynamic/private";
import type { ResultsIndex } from "$lib/types";

export type Collection = "datasets" | "packets";

const idPattern = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** EVALS_RESULTS_DIR, or evals/results relative to the web app directory. */
const resultsDir = () => resolve(env.EVALS_RESULTS_DIR ?? join(process.cwd(), "..", "results"));

async function listing(collection: Collection): Promise<Map<string, Buffer>> {
  const dir = join(resultsDir(), collection);
  const files = new Map<string, Buffer>();
  if (!existsSync(dir)) return files;
  for (const name of (await readdir(dir)).sort()) {
    const id = name.slice(0, -".json".length);
    if (name.endsWith(".json") && idPattern.test(id)) files.set(id, await readFile(join(dir, name)));
  }
  return files;
}

/** The exact bytes of an allowlisted file, or null for anything else. */
export async function reviewedFile(collection: Collection, id: string): Promise<Buffer | null> {
  if (!idPattern.test(id)) return null;
  return (await listing(collection)).get(id) ?? null;
}

type Summary = { id: string; title: string; kind?: "historical" | "batch"; runs?: unknown[]; items?: unknown[] };

export async function resultsIndex(): Promise<ResultsIndex> {
  const parse = (bytes: Buffer) => JSON.parse(bytes.toString("utf8")) as Summary;
  const datasets = [...(await listing("datasets")).values()].map(parse);
  const packets = [...(await listing("packets")).values()].map((bytes) => ({ bytes, packet: parse(bytes) }));
  return {
    datasets: datasets
      .map((d) => ({ id: d.id, title: d.title, kind: d.kind ?? "batch", runs: d.runs?.length ?? 0 }))
      .sort((a, b) => (a.kind === b.kind ? b.id.localeCompare(a.id) : a.kind === "batch" ? -1 : 1)),
    packets: packets.map(({ bytes, packet }) => ({
      id: packet.id,
      title: packet.title,
      items: packet.items?.length ?? 0,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    })),
  };
}
