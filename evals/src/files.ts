import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import type { z } from "zod";

export const sha256 = (data: string | Buffer): string => createHash("sha256").update(data).digest("hex");

export async function readJson<T extends z.ZodType>(path: string, schema: T): Promise<z.infer<T>> {
  const text = await readFile(path, "utf8");
  const result = schema.safeParse(JSON.parse(text));
  if (!result.success) throw new Error(`${path}: ${result.error.message}`);
  return result.data;
}

/** Write JSON atomically so an interrupted process never leaves a torn state file. */
export async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temporary, path);
}

/** Relative paths of regular files below `root`, sorted. */
export async function listFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => relative(root, join(entry.parentPath, entry.name)))
    .sort();
}

export async function hashTree(root: string): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {};
  for (const file of await listFiles(root)) hashes[file] = sha256(await readFile(join(root, file)));
  return hashes;
}

export const timestamp = (): string => new Date().toISOString();
