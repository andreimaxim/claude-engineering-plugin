// Parser for Claude Code's `--output-format stream-json`, which Amp's `--stream-json`
// also emits. Only fields observed in real Amp output (and documented for Claude Code)
// are read; everything else stays in the private raw transcript.
import { z } from "zod";
import type { Action } from "../schema.ts";

const ContentBlock = z.looseObject({
  type: z.string(),
  text: z.string().optional(),
  id: z.string().optional(),
  name: z.string().optional(),
  input: z.unknown().optional(),
  tool_use_id: z.string().optional(),
  is_error: z.boolean().optional(),
  content: z.unknown().optional(),
});

const Event = z.looseObject({
  type: z.string(),
  subtype: z.string().optional(),
  session_id: z.string().optional(),
  tools: z.array(z.string()).optional(),
  model: z.string().optional(),
  mcp_servers: z.array(z.looseObject({ name: z.string(), status: z.string().optional() })).optional(),
  agent_mode: z.string().optional(),
  claude_code_version: z.string().optional(),
  message: z.looseObject({ content: z.union([z.string(), z.array(ContentBlock)]).optional() }).optional(),
  is_error: z.boolean().optional(),
  result: z.string().optional(),
  duration_ms: z.number().optional(),
  usage: z.looseObject({}).optional(),
  modelUsage: z.record(z.string(), z.unknown()).optional(),
});
type Event = z.infer<typeof Event>;

export type ToolUse = { id: string | null; name: string; input: unknown; error: boolean; resultText: string };

export type ParsedStream = {
  init: Event | null;
  result: Event | null;
  toolUses: ToolUse[];
  lastAssistantText: string;
  malformedLines: number;
};

export function parseStream(text: string): ParsedStream {
  const parsed: ParsedStream = { init: null, result: null, toolUses: [], lastAssistantText: "", malformedLines: 0 };
  const byId = new Map<string, ToolUse>();
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    let event: Event;
    try {
      event = Event.parse(JSON.parse(line));
    } catch {
      parsed.malformedLines += 1;
      continue;
    }
    if (event.type === "system" && event.subtype === "init") parsed.init = event;
    if (event.type === "result") parsed.result = event;
    const content = event.message?.content;
    if (!Array.isArray(content)) continue;
    if (event.type === "assistant") {
      const texts = content.filter((block) => block.type === "text" && block.text).map((block) => block.text);
      if (texts.length > 0) parsed.lastAssistantText = texts.join("\n");
      for (const block of content.filter((b) => b.type === "tool_use")) {
        const use: ToolUse = { id: block.id ?? null, name: block.name ?? "unknown", input: block.input, error: false, resultText: "" };
        parsed.toolUses.push(use);
        if (block.id) byId.set(block.id, use);
      }
    }
    if (event.type === "user") {
      for (const block of content.filter((b) => b.type === "tool_result")) {
        const use = block.tool_use_id ? byId.get(block.tool_use_id) : undefined;
        if (!use) continue;
        use.error = block.is_error === true;
        use.resultText = typeof block.content === "string" ? block.content : JSON.stringify(block.content ?? "");
      }
    }
  }
  return parsed;
}

const inputText = (input: unknown): string => (typeof input === "string" ? input : JSON.stringify(input ?? {}));

/** A short, reviewable description of one tool call; the raw input stays private. */
export function summarizeToolUse(use: ToolUse, workDir: string): Action {
  const input = (use.input ?? {}) as Record<string, unknown>;
  const relative = (value: string) => value.replaceAll(`${workDir}/`, "").replaceAll(workDir, ".");
  let summary: string;
  if (typeof input.command === "string") summary = input.command;
  else if (typeof input.patchText === "string" || typeof input.patch === "string") {
    const patch = String(input.patchText ?? input.patch);
    const files = [...patch.matchAll(/^\*\*\* (Add|Update|Delete) File: (.+)$/gm)].map((m) => `${m[1]?.toLowerCase()} ${m[2]}`);
    summary = files.length ? files.join(", ") : "patch";
  } else if (typeof input.file_path === "string") summary = input.file_path;
  else if (typeof input.pattern === "string") summary = `pattern ${input.pattern}`;
  else summary = inputText(use.input);
  summary = relative(summary);
  return {
    tool: use.name,
    summary: summary.length > 400 ? `${summary.slice(0, 400)}…` : summary,
    error: use.error,
    result: summarizeResult(use.resultText, relative),
  };
}

/** Exit status and output tail from a tool result, e.g. Amp's {"output","exitCode"}. */
function summarizeResult(text: string, relative: (value: string) => string): string | null {
  if (!text) return null;
  const tail = (value: string, length: number) => (value.length > length ? `…${value.slice(-length)}` : value);
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    if (typeof parsed.exitCode === "number" || typeof parsed.output === "string") {
      const output = typeof parsed.output === "string" ? tail(parsed.output.trim(), 600) : "";
      return relative(`exit ${parsed.exitCode ?? "?"}${output ? `\n${output}` : ""}`);
    }
    if (typeof parsed.summary === "string") return relative(parsed.summary);
  } catch {
    // Not JSON: fall through to the raw text tail.
  }
  return relative(tail(text.trim(), 600));
}

/** Whether any tool call referred to the supplied skill file. */
export const readsSuppliedSkill = (uses: ToolUse[]): boolean =>
  uses.some((use) => inputText(use.input).includes("reference/SKILL.md"));

/** The parts of a tool input that name paths: commands and file targets, not file contents. */
function pathBearingText(input: unknown): string {
  const fields = (input ?? {}) as Record<string, unknown>;
  const patch = typeof fields.patchText === "string" ? fields.patchText : typeof fields.patch === "string" ? fields.patch : null;
  if (patch) return [...patch.matchAll(/^\*\*\* (?:Add|Update|Delete|Move to) File: (.+)$/gm)].map((m) => m[1]).join("\n");
  const named = ["command", "workdir", "file_path", "path", "cwd"].flatMap((key) => (typeof fields[key] === "string" ? [fields[key]] : []));
  return named.length ? named.join("\n") : inputText(input);
}

const allowedPrefixes = ["/usr/", "/bin/", "/etc/", "/dev/", "/proc/", "/lib/", "/lib64/", "/opt/", "/tmp/", "/var/lib/"];

/**
 * Heuristic: absolute paths outside the workspace (and outside ordinary system
 * locations) or parent-directory escapes in tool inputs. For human inspection only.
 */
export function outsideAccess(uses: ToolUse[], workDir: string, allowed: string[] = []): string[] {
  const found = new Set<string>();
  for (const use of uses) {
    const text = pathBearingText(use.input);
    for (const match of text.matchAll(/(?<![\w.])\/(?:[\w.@+-]+\/?)+/g)) {
      const path = match[0];
      if (path === "/" || path.startsWith(workDir)) continue;
      if ([...allowedPrefixes, ...allowed].some((prefix) => path.startsWith(prefix))) continue;
      found.add(`${use.name}: ${path}`);
    }
    if (/(^|[\s'"=;&|(])\.\.(\/|\s|$|["';&|)])/.test(text)) found.add(`${use.name}: parent-directory reference`);
  }
  return [...found].slice(0, 50);
}
