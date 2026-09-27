import { randomInt } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { readJson, sha256, timestamp, writeJson } from "./files.ts";
import { datasetsDir, keysDir, packetsDir, resultsDir } from "./paths.ts";
import { relativizeWorkspacePaths } from "./privacy.ts";
import {
  type Condition,
  Dataset,
  JudgmentExport,
  type MaskedAnswer,
  Packet,
  type PacketItem,
  PacketKey,
  type PublishedRun,
} from "./schema.ts";

const disclosure =
  "Answers are labelled A and B with a random assignment per item; the key is stored outside this app. Labels, " +
  "grades, rubrics, run metadata, timing, and token counts are hidden. This is not guaranteed blinding: writing " +
  "style, explicit references to a supplied skill, and prior exposure to these cases can still reveal a condition. " +
  "Absolute workspace paths were rewritten as relative paths; the substance of each answer is unchanged.";

const mask = (run: PublishedRun): MaskedAnswer => ({ response: relativizeWorkspacePaths(run.response), diff: run.diff });

const shuffle = <T>(values: T[]): T[] => {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
};

export async function createPacket(options: {
  id: string;
  title: string;
  dataset: string;
  pairs: string[];
  perSkill: number | null;
}): Promise<void> {
  if (!/^[a-z0-9][a-z0-9.-]*$/.test(options.id)) throw new Error("Packet ids use lowercase letters, digits, dots, and hyphens.");
  const packetPath = join(packetsDir, `${options.id}.json`);
  const keyPath = join(keysDir, `${options.id}.json`);
  // Browser drafts are tied to a packet's exact bytes, so packets are immutable.
  if (existsSync(packetPath) || existsSync(keyPath)) throw new Error(`Packet ${options.id} already exists; choose a new id.`);
  const dataset = await readJson(join(datasetsDir, `${options.dataset}.json`), Dataset);

  const byPair = Map.groupBy(dataset.runs, (run) => run.pair);
  const eligible = [...byPair.entries()].flatMap(([pair, runs]) => {
    const without = runs.find((r) => r.condition === "without-skill");
    const withSkill = runs.find((r) => r.condition === "with-skill");
    const usable = (r: PublishedRun | undefined) => r && r.outcome.execution === "succeeded" && r.response.trim();
    return usable(without) && usable(withSkill) ? [{ pair, without: without!, withSkill: withSkill! }] : [];
  });
  let chosen: typeof eligible;
  if (options.pairs.length) {
    chosen = options.pairs.map((pair) => {
      const found = eligible.find((e) => e.pair === pair);
      if (!found) throw new Error(`${pair} is not an eligible pair in ${options.dataset}`);
      return found;
    });
  } else {
    const perSkill = options.perSkill ?? 1;
    const bySkill = Map.groupBy(eligible, (e) => dataset.cases.find((c) => c.key === e.without.caseKey)!.skill);
    chosen = [...bySkill.values()].flatMap((pairs) => shuffle(pairs).slice(0, perSkill));
  }

  const items: PacketItem[] = [];
  const keyItems: PacketKey["items"] = [];
  shuffle(chosen).forEach((entry, index) => {
    const snapshot = dataset.cases.find((c) => c.key === entry.without.caseKey)!;
    const withSkillIsA = randomInt(2) === 0;
    const [a, b] = withSkillIsA ? [entry.withSkill, entry.without] : [entry.without, entry.withSkill];
    const id = `item-${String(index + 1).padStart(2, "0")}`;
    const content = { id, skill: snapshot.skill, title: `${snapshot.skill}: ${snapshot.name}`, prompt: snapshot.prompt, context: snapshot.context, a: mask(a), b: mask(b) };
    items.push({ ...content, sha256: sha256(JSON.stringify(content)) });
    keyItems.push({
      id,
      dataset: dataset.id,
      caseKey: snapshot.key,
      pair: entry.pair,
      a: { run: a.id, condition: a.condition },
      b: { run: b.id, condition: b.condition },
    });
  });

  const packet: Packet = { id: options.id, title: options.title, createdAt: timestamp(), source: dataset.title, disclosure, items };
  await writeJson(packetPath, packet);
  const packetSha256 = sha256(await readFile(packetPath));
  await writeJson(keyPath, { packet: options.id, packetSha256, items: keyItems } satisfies PacketKey);
  console.log(`Wrote packet evals/results/packets/${options.id}.json (${items.length} items, sha256 ${packetSha256.slice(0, 12)}).`);
  console.log(`Wrote the private A/B key ${keyPath}. It is never served; do not copy it into the repository.`);
}

/** Join an exported set of judgments with the private key. Output stays private. */
export async function unmaskJudgments(exportPath: string, outPath: string | null): Promise<void> {
  const judgments = await readJson(exportPath, JudgmentExport);
  const key = await readJson(join(keysDir, `${judgments.packet}.json`), PacketKey);
  const packetPath = join(packetsDir, `${judgments.packet}.json`);
  const packetBytes = await readFile(packetPath);
  const packet = Packet.parse(JSON.parse(packetBytes.toString("utf8")));
  const problems: string[] = [];
  if (judgments.packetSha256 !== key.packetSha256 || sha256(packetBytes) !== key.packetSha256) {
    problems.push("the export, key, and served packet do not share one packet hash");
  }
  const conditionOf = (item: PacketKey["items"][number], side: "a" | "b"): Condition => item[side].condition;
  const rows = judgments.judgments.map((judgment) => {
    const item = key.items.find((i) => i.id === judgment.item);
    const served = packet.items.find((i) => i.id === judgment.item);
    if (!item || !served) throw new Error(`Unknown item ${judgment.item}`);
    if (served.sha256 !== judgment.itemSha256) problems.push(`${judgment.item}: judged evidence differs from the packet`);
    const verdict = (condition: Condition) => (conditionOf(item, "a") === condition ? judgment.a : judgment.b);
    const preferred =
      judgment.preference === "a" || judgment.preference === "b" ? conditionOf(item, judgment.preference) : judgment.preference;
    return {
      item: item.id,
      caseKey: item.caseKey,
      pair: item.pair,
      withSkill: verdict("with-skill"),
      withoutSkill: verdict("without-skill"),
      preferred,
      correction: judgment.correction,
      notes: judgment.notes,
    };
  });
  const result = { packet: judgments.packet, reviewer: judgments.reviewer, exportedAt: judgments.exportedAt, problems, rows };
  for (const problem of problems) console.error(`warning: ${problem}`);
  for (const row of rows) {
    console.error(`${row.item} ${row.caseKey}: with ${row.withSkill ?? "-"}, without ${row.withoutSkill ?? "-"}, preferred ${row.preferred ?? "-"}`);
  }
  if (!outPath) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (resolve(outPath).startsWith(resultsDir)) throw new Error("Unmasked judgments must not be written into the served results directory.");
  await writeFile(outPath, `${JSON.stringify(result, null, 2)}\n`);
  console.error(`Wrote ${outPath}.`);
}
