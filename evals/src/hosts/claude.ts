// Claude Code adapter. Built from the official CLI reference (code.claude.com/docs,
// September 2026) and the stream-json shape shared with Amp. It has NOT been run
// against real Claude Code output: the orb has no Claude subscription login. Records
// from this adapter are marked unexercised until someone replays a batch with it.
import { join } from "node:path";
import { z } from "zod";
import { exec } from "../process.ts";
import type { RequestedSettings } from "../schema.ts";
import { type Host, type HostContext, type HostObservation, isolatedEnvironment } from "./host.ts";
import type { ParsedStream } from "./stream.ts";

export const claudeDefaultTools = ["Bash", "Edit", "Glob", "Grep", "Read", "Write"];

const Usage = z.looseObject({
  input_tokens: z.number().optional(),
  cache_creation_input_tokens: z.number().optional(),
  cache_read_input_tokens: z.number().optional(),
  output_tokens: z.number().optional(),
});

const environment = (context: HostContext) =>
  isolatedEnvironment(context.homeDir, {
    // Subscription login without API credits: `claude setup-token` prints this token.
    CLAUDE_CODE_OAUTH_TOKEN: process.env.CLAUDE_CODE_OAUTH_TOKEN,
    CLAUDE_CONFIG_DIR: join(context.homeDir, ".claude"),
    ...context.runtimeEnv,
  });

export const claudeCode: Host = {
  name: "claude-code",
  adapter: "unexercised",
  executable: "claude",
  expectedTools: (requested: RequestedSettings) => requested.tools,

  async preflight() {
    if (!process.env.CLAUDE_CODE_OAUTH_TOKEN) {
      throw new Error(
        "Claude Code replay uses a subscription token so each run can have an isolated config directory. " +
          "Run `claude setup-token`, then export CLAUDE_CODE_OAUTH_TOKEN. API keys are deliberately not forwarded.",
      );
    }
    const version = await exec(["claude", "--version"]).catch(() => null);
    if (version?.code !== 0) throw new Error("The claude CLI is not available on PATH.");
  },

  async prepare() {},

  launch(context) {
    const argv = [
      "claude",
      "-p", context.prompt,
      "--output-format", "stream-json",
      "--verbose",
      // Keeps the default system prompt but skips CLAUDE.md, skills, plugins, hooks,
      // MCP servers, and memory; the isolated CLAUDE_CONFIG_DIR removes user settings.
      "--safe-mode",
      "--strict-mcp-config",
      "--mcp-config", '{"mcpServers":{}}',
      "--tools", context.requested.tools.join(","),
      "--permission-mode", "bypassPermissions",
    ];
    if (context.requested.model) argv.push("--model", context.requested.model);
    if (context.requested.effort) argv.push("--effort", context.requested.effort);
    return { argv, env: environment(context) };
  },

  async observe(context, stream: ParsedStream): Promise<HostObservation> {
    const version = await exec(["claude", "--version"], { env: environment(context) }).catch(() => null);
    const usage = Usage.safeParse(stream.result?.usage ?? {});
    const modelUsage = Object.keys(stream.result?.modelUsage ?? {});
    const models = [...new Set([...(stream.init?.model ? [stream.init.model] : []), ...modelUsage])].sort();
    const init = (stream.init ?? {}) as Record<string, unknown>;
    const named = (value: unknown, kind: string) =>
      Array.isArray(value) ? value.map((item) => `${kind}: ${typeof item === "string" ? item : String((item as { name?: unknown }).name)}`) : [];
    const succeeded = stream.result?.subtype === "success" && stream.result.is_error === false;
    return {
      hostVersion: version?.code === 0 ? version.stdout.trim() : null,
      sessionId: stream.init?.session_id ?? stream.result?.session_id ?? null,
      models,
      // The requested --effort is recorded in the batch; the stream does not echo it.
      effort: null,
      mode: null,
      tools: [...(stream.init?.tools ?? [])].sort(),
      inputTokens: usage.success
        ? (usage.data.input_tokens ?? 0) + (usage.data.cache_creation_input_tokens ?? 0) + (usage.data.cache_read_input_tokens ?? 0)
        : null,
      outputTokens: usage.success ? (usage.data.output_tokens ?? null) : null,
      mcpServers: (stream.init?.mcp_servers ?? []).map((server) => `${server.name} (${server.status ?? "unknown"})`),
      hostGuidance: [...named(init.skills, "skill"), ...named(init.plugins, "plugin")],
      response: stream.result?.result ?? (stream.lastAssistantText || null),
      error: succeeded ? null : `host reported ${stream.result?.subtype ?? "no result event"}`,
    };
  },
};
