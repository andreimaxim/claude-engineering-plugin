import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { readJson } from "./files.ts";
import { casesDir } from "./paths.ts";
import { CaseDefinition, caseKey, SkillName } from "./schema.ts";

export type LoadedCase = CaseDefinition & { key: string; dir: string };

export async function loadCases(): Promise<LoadedCase[]> {
  const cases: LoadedCase[] = [];
  for (const skill of SkillName.options) {
    const skillDir = join(casesDir, skill);
    for (const name of (await readdir(skillDir)).sort()) {
      const dir = join(skillDir, name);
      const definition = await readJson(join(dir, "case.json"), CaseDefinition);
      if (definition.skill !== skill || definition.name !== name) {
        throw new Error(`${dir}: skill/name must match its directory`);
      }
      cases.push({ ...definition, key: caseKey(definition), dir });
    }
  }
  return cases;
}

/**
 * Select cases by skill (`shaping`), case (`shaping/background-export`), exact
 * version (`shaping/background-export@v1`), or `all`.
 */
export function selectCases(cases: LoadedCase[], selectors: string[]): LoadedCase[] {
  if (selectors.length === 0) throw new Error("Select cases: all, <skill>, <skill>/<case>, or <skill>/<case>@v<n>");
  const selected = new Set<LoadedCase>();
  for (const selector of selectors) {
    const matches = cases.filter(
      (c) => selector === "all" || selector === c.skill || selector === `${c.skill}/${c.name}` || selector === c.key,
    );
    if (matches.length === 0) throw new Error(`No case matches ${selector}`);
    for (const match of matches) selected.add(match);
  }
  return cases.filter((c) => selected.has(c));
}
