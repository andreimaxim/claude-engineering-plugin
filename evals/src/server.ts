// Serves the built review app and reviewed evidence only: files in results/datasets
// and results/packets, looked up by validated id. Run directories, raw traces, and
// A/B keys live under $EVALS_HOME and are unreachable from here.
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { createServer, type ServerResponse } from "node:http";
import { extname, join, normalize } from "node:path";
import { z } from "zod";
import { sha256 } from "./files.ts";
import { datasetsDir, packetsDir, webDist } from "./paths.ts";
import type { ResultsIndex } from "./schema.ts";

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
};

const securityHeaders = {
  // Model output is untrusted: no external images, frames, or plugins. Scripts stay
  // unrestricted so the portal's injected review widget keeps working.
  "content-security-policy": "img-src 'self' data:; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
};

const Summary = z.looseObject({ id: z.string(), title: z.string(), kind: z.enum(["historical", "batch"]).optional(), runs: z.array(z.unknown()).optional(), items: z.array(z.unknown()).optional() });
const idPattern = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

async function listing(dir: string): Promise<Map<string, Buffer>> {
  const files = new Map<string, Buffer>();
  if (!existsSync(dir)) return files;
  for (const name of (await readdir(dir)).sort()) {
    if (name.endsWith(".json") && idPattern.test(name)) files.set(name.slice(0, -5), await readFile(join(dir, name)));
  }
  return files;
}

async function resultsIndex(): Promise<ResultsIndex> {
  const datasets = [...(await listing(datasetsDir)).values()].map((bytes) => Summary.parse(JSON.parse(bytes.toString("utf8"))));
  const packets = [...(await listing(packetsDir)).entries()].map(([, bytes]) => ({ bytes, packet: Summary.parse(JSON.parse(bytes.toString("utf8"))) }));
  return {
    datasets: datasets
      .map((d) => ({ id: d.id, title: d.title, kind: d.kind ?? "batch", runs: d.runs?.length ?? 0 }))
      .sort((a, b) => (a.kind === b.kind ? b.id.localeCompare(a.id) : a.kind === "batch" ? -1 : 1)),
    packets: packets.map(({ bytes, packet }) => ({ id: packet.id, title: packet.title, items: packet.items?.length ?? 0, sha256: sha256(bytes) })),
  };
}

function send(response: ServerResponse, status: number, body: string | Buffer, type: string, cache = "no-store"): void {
  response.writeHead(status, { ...securityHeaders, "content-type": type, "cache-control": cache });
  response.end(body);
}

export function serve(port: number): void {
  if (!existsSync(join(webDist, "index.html"))) throw new Error("The app is not built; run `pnpm build` in evals/ first.");
  const server = createServer(async (request, response) => {
    try {
      if (request.method !== "GET" && request.method !== "HEAD") return send(response, 405, "Method not allowed", "text/plain");
      const path = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
      if (path === "/healthz") return send(response, 200, "ok", "text/plain");
      if (path === "/api/index.json") return send(response, 200, JSON.stringify(await resultsIndex()), contentTypes[".json"]!);
      const api = /^\/api\/(datasets|packets)\/([^/]+)\.json$/.exec(path);
      if (api) {
        const [, kind, id] = api;
        const bytes = id && idPattern.test(id) ? (await listing(kind === "datasets" ? datasetsDir : packetsDir)).get(id) : undefined;
        return bytes ? send(response, 200, bytes, contentTypes[".json"]!) : send(response, 404, "Not found", "text/plain");
      }
      if (path.startsWith("/api/")) return send(response, 404, "Not found", "text/plain");
      const relative = normalize(path === "/" ? "/index.html" : path).replace(/^(\.\.[/\\])+/, "");
      const file = join(webDist, relative);
      if (!file.startsWith(webDist) || !existsSync(file) || extname(file) === "") {
        return send(response, 200, await readFile(join(webDist, "index.html")), contentTypes[".html"]!);
      }
      const immutable = relative.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache";
      return send(response, 200, await readFile(file), contentTypes[extname(file)] ?? "application/octet-stream", immutable);
    } catch (error) {
      console.error(error);
      send(response, 500, "Internal error", "text/plain");
    }
  });
  server.listen(port, "0.0.0.0", () => console.log(`Serving the evaluation app on port ${port}.`));
}
