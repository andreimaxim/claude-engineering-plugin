import type { HostName } from "../schema.ts";
import { amp } from "./amp.ts";
import { claudeCode } from "./claude.ts";
import type { Host } from "./host.ts";

const hosts: Record<HostName, Host> = { amp, "claude-code": claudeCode };

export const hostFor = (name: HostName): Host => hosts[name];
