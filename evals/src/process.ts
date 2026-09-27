import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";

export type ProcessResult = {
  code: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  seconds: number;
};

export type ProcessOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  /** Stream stdout to this file as it arrives (still returned in `stdout`). */
  stdoutFile?: string;
  stderrFile?: string;
};

/** Run a command without a shell. Rejects only when the process cannot be spawned. */
export function exec(argv: readonly string[], options: ProcessOptions = {}): Promise<ProcessResult> {
  const [command, ...args] = argv;
  if (command === undefined) throw new Error("exec: empty command");
  const started = performance.now();
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: options.timeoutMs,
    });
    const stdoutFile = options.stdoutFile ? createWriteStream(options.stdoutFile) : null;
    const stderrFile = options.stderrFile ? createWriteStream(options.stderrFile) : null;
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => {
      stdout.push(chunk);
      stdoutFile?.write(chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr.push(chunk);
      stderrFile?.write(chunk);
    });
    child.on("error", reject);
    child.on("close", (code, signal) => {
      stdoutFile?.end();
      stderrFile?.end();
      resolvePromise({
        code,
        signal,
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
        seconds: (performance.now() - started) / 1000,
      });
    });
  });
}

/** Run a command that must succeed; returns trimmed stdout. */
export async function must(argv: readonly string[], options: ProcessOptions = {}): Promise<string> {
  const result = await exec(argv, options);
  if (result.code !== 0) {
    throw new Error(`${argv.join(" ")} exited ${result.code}: ${result.stderr.trim() || result.stdout.trim()}`);
  }
  return result.stdout.trim();
}
