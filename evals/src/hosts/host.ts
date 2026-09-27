import type { RequestedSettings } from "../schema.ts";
import type { ParsedStream } from "./stream.ts";

export type HostContext = {
  runDir: string;
  workDir: string;
  homeDir: string;
  prompt: string;
  requested: RequestedSettings;
  /** Repository runtime variables, identical in both conditions. */
  runtimeEnv: Record<string, string>;
};

export type HostObservation = {
  hostVersion: string | null;
  sessionId: string | null;
  models: string[];
  effort: string | null;
  mode: string | null;
  tools: string[];
  inputTokens: number | null;
  outputTokens: number | null;
  mcpServers: string[];
  hostGuidance: string[];
  response: string | null;
  /** Host-reported failure, if the stream did not end in success. */
  error: string | null;
};

export interface Host {
  readonly name: RequestedSettings["host"];
  /** Whether this adapter has been run against real host output. */
  readonly adapter: "exercised" | "unexercised";
  readonly executable: string;
  /** Public tool names the host should report when isolation is configured correctly. */
  expectedTools(requested: RequestedSettings): string[];
  /** Fail early with an actionable message when credentials or the CLI are missing. */
  preflight(): Promise<void>;
  prepare(context: HostContext): Promise<void>;
  launch(context: HostContext): { argv: string[]; env: NodeJS.ProcessEnv };
  observe(context: HostContext, stream: ParsedStream): Promise<HostObservation>;
}

/** Minimal environment shared by all hosts: nothing from the operator's shell except PATH. */
export function isolatedEnvironment(homeDir: string, extra: Record<string, string | undefined>): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    PATH: process.env.PATH,
    LANG: "C.UTF-8",
    HOME: homeDir,
    XDG_CONFIG_HOME: `${homeDir}/.config`,
    XDG_CACHE_HOME: `${homeDir}/.cache`,
    XDG_DATA_HOME: `${homeDir}/.local/share`,
    XDG_STATE_HOME: `${homeDir}/.local/state`,
  };
  for (const [key, value] of Object.entries(extra)) if (value !== undefined) env[key] = value;
  return env;
}
