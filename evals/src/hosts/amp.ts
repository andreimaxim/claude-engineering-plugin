import { existsSync } from "node:fs";
import { readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { writeJson } from "../files.ts";
import { exec } from "../process.ts";
import type { RequestedSettings } from "../schema.ts";
import { type Host, type HostContext, type HostObservation, isolatedEnvironment } from "./host.ts";
import type { ParsedStream } from "./stream.ts";

// Amp's visible shell tools dispatch internally as async_* tools. Enabling only the
// visible names makes every shell call fail with "is disabled: settings" (observed in
// the pilot), so the allowlist carries both spellings.
const publicTools = ["apply_patch", "shell_command", "shell_command_kill", "shell_command_status"];
const internalAliases = ["async_shell_command", "async_shell_command_kill", "async_shell_command_status"];

const settings = (tools: string[]) => ({
  "amp.tools.enable": [...tools, ...internalAliases],
  "amp.skills.disableClaudeCodeSkills": true,
  "amp.skills.disableGlobalAgentsSkills": true,
  "amp.mcpServers": {},
  "amp.updates.mode": "disabled",
  "amp.notifications.enabled": false,
});

const ThreadExport = z.looseObject({
  agentMode: z.string().optional(),
  messages: z.array(
    z.looseObject({
      usage: z
        .looseObject({ model: z.string().optional(), totalInputTokens: z.number().optional(), outputTokens: z.number().optional() })
        .nullish(),
    }),
  ),
});

const environment = (context: HostContext) =>
  isolatedEnvironment(context.homeDir, {
    AMP_API_KEY: process.env.AMP_API_KEY,
    AMP_URL: process.env.AMP_URL,
    ...context.runtimeEnv,
  });

const settingsFile = (context: HostContext) => join(context.runDir, "amp-settings.json");

/** Names of skills and plugins Amp synced from the account into the isolated cache. */
async function syncedGuidance(homeDir: string): Promise<string[]> {
  const found: string[] = [];
  for (const [kind, dir] of [["skill", "global-skills"], ["plugin", "global-plugins"]] as const) {
    const root = join(homeDir, ".cache", "amp", dir);
    if (!existsSync(root)) continue;
    for (const entry of await readdir(root, { recursive: true, withFileTypes: true })) {
      const depth = join(entry.parentPath, entry.name).slice(root.length + 1).split("/").length;
      if (entry.isDirectory() && depth === 3) found.push(`${kind}: ${entry.name.replace(/@[0-9a-f]+$/, "")}`);
    }
  }
  return found.sort();
}

export const amp: Host = {
  name: "amp",
  adapter: "exercised",
  executable: "amp",
  expectedTools: (requested: RequestedSettings) => requested.tools,

  async preflight() {
    if (!process.env.AMP_API_KEY) throw new Error("Amp runs need AMP_API_KEY (an Amp access token) in the environment.");
    const version = await exec(["amp", "--version"]).catch(() => null);
    if (version?.code !== 0) throw new Error("The amp CLI is not available on PATH.");
  },

  async prepare(context) {
    await writeJson(settingsFile(context), settings(context.requested.tools));
  },

  launch(context) {
    const argv = [
      "amp",
      "--settings-file", settingsFile(context),
      "--executor", "local",
      "--visibility", "private",
      "--no-ide",
      "--no-notifications",
      "--stream-json",
    ];
    if (context.requested.mode) argv.push("--mode", context.requested.mode);
    argv.push("-x", context.prompt);
    return { argv, env: environment(context) };
  },

  async observe(context, stream: ParsedStream): Promise<HostObservation> {
    const env = environment(context);
    const version = await exec(["amp", "--version"], { env });
    const sessionId = stream.init?.session_id ?? stream.result?.session_id ?? null;
    let models: string[] = [];
    let inputTokens: number | null = null;
    let outputTokens: number | null = null;
    let mode = stream.init?.agent_mode ?? null;
    let exportError: string | null = null;
    if (sessionId) {
      const exported = await exec(["amp", "--settings-file", settingsFile(context), "threads", "export", sessionId], { env });
      if (exported.code === 0) {
        await writeFile(join(context.runDir, "thread.json"), exported.stdout);
        const thread = ThreadExport.parse(JSON.parse(exported.stdout));
        const usages = thread.messages.flatMap((message) => (message.usage ? [message.usage] : []));
        models = [...new Set(usages.flatMap((usage) => (usage.model ? [usage.model] : [])))].sort();
        inputTokens = usages.reduce((sum, usage) => sum + (usage.totalInputTokens ?? 0), 0);
        outputTokens = usages.reduce((sum, usage) => sum + (usage.outputTokens ?? 0), 0);
        mode = thread.agentMode ?? mode;
      } else {
        exportError = `thread export failed: ${exported.stderr.trim().slice(0, 300)}`;
      }
    }
    const succeeded = stream.result?.subtype === "success" && stream.result.is_error === false;
    return {
      hostVersion: version.code === 0 ? version.stdout.trim().split(" ")[0] ?? null : null,
      sessionId,
      models,
      // Amp exposes the mode dial, not the underlying reasoning effort.
      effort: null,
      mode,
      tools: [...(stream.init?.tools ?? [])].sort(),
      inputTokens,
      outputTokens,
      mcpServers: (stream.init?.mcp_servers ?? []).map((server) => `${server.name} (${server.status ?? "unknown"})`),
      hostGuidance: await syncedGuidance(context.homeDir),
      response: stream.result?.result ?? (stream.lastAssistantText || null),
      error: succeeded ? exportError : `host reported ${stream.result?.subtype ?? "no result event"}`,
    };
  },
};

export const ampPublicTools = publicTools;
