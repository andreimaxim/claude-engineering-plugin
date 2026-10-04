# Custom system prompt

[SYSTEM.md](SYSTEM.md) is an optional, standalone replacement for Claude Code's
main-agent system prompt. The [engineering plugin](../README.md#installation) neither
loads nor requires it.

## What it asks Claude to do

- Distinguish questions from change requests. Answer questions without editing files,
  and carry requested changes through investigation, implementation, verification,
  and reporting.
- Follow the applicable skill's process for substantial work. Otherwise, propose an
  approach and wait for confirmation unless immediate implementation was requested.
  Use reasonable defaults for small, reversible decisions and state assumptions.
- Read the relevant sources, follow repository conventions, and favor clear
  responsibilities, a single source of truth, and small end-to-end changes.
- Verify results honestly and ask before destructive actions or changes to shared
  systems.
- Load relevant skills, give subagents self-contained assignments, and communicate
  concisely with supporting evidence.

These are instructions, not enforced guarantees or measured improvements over Claude
Code's default prompt.

## Load the prompt explicitly

**This replaces the entire default system prompt**, including Claude Code's built-in
tool-use, safety, memory-saving, and context-management instructions. `SYSTEM.md` does
not reproduce all of those instructions.

Tool definitions, runtime permission checks, `CLAUDE.md` instructions, and available
skill and agent listings are supplied separately.
Removing memory-saving instructions does not itself disable auto memory loading.

From this repository's root, run:

```sh
claude --system-prompt-file ./extra/SYSTEM.md
```

When working in another project, use the absolute path to this file. Claude Code reads
the file at CLI launch, so relaunch after editing it.

To restore Claude Code's default prompt, start a new conversation without the
replacement flag. A resumed conversation can retain its saved prompt until compaction.

See Claude Code's [system prompt flags](https://code.claude.com/docs/en/cli-reference#system-prompt-flags)
for replacement and append behavior.

## Companion settings

These optional settings are a curated subset of the author's `~/.claude/settings.json`.
Merge the entries you want into your own file rather than replacing it. They do not
load `SYSTEM.md` and are not required by the plugin. UI, telemetry, and
plugin-installation preferences are omitted.

### Model preferences

```json
{
  "model": "opus",
  "env": {
    "CLAUDE_CODE_SUBAGENT_MODEL": "opus"
  }
}
```

`opus` is a model alias, not a pinned version. Set reasoning effort with `/effort`
while using each model. Claude Code saves the per-model setting.
`CLAUDE_CODE_SUBAGENT_MODEL` supplies a fallback for native subagents. An Agent
`model` argument or an agent definition's `model` field overrides that fallback.
Named specialists therefore retain their configured models unless a forced override
applies. See
[model configuration](https://code.claude.com/docs/en/model-config).

### Manual context management and attribution

These settings make context management and file recovery your responsibility:

```json
{
  "autoMemoryEnabled": false,
  "autoCompactEnabled": false,
  "fileCheckpointingEnabled": false,
  "attribution": {
    "commit": "",
    "pr": ""
  }
}
```

- Auto memory reads and writes are disabled. Repository `CLAUDE.md` instructions
  still load.
- Automatic compaction is disabled. Use `/compact` or start a new conversation before
  context fills up.
- Interactive file checkpoints are disabled, so `/rewind` cannot restore files from
  those snapshots. Use version control and backups for recovery.
- The empty attribution strings remove Claude Code's built-in commit and PR attribution.

### Optional permission bypass

The author's setup also uses `bypassPermissions`, an optional high-risk preference.
**This skips ordinary tool permission prompts and can permit destructive commands
without approval.** The prompt's instruction to ask first is not runtime permission
enforcement. Keep the default permission mode unless you deliberately accept this
risk, preferably in a disposable environment with limited credentials.

```json
{
  "permissions": {
    "defaultMode": "bypassPermissions",
    "deny": ["AskUserQuestion"]
  }
}
```

Explicit deny rules and managed restrictions still apply. Denying `AskUserQuestion`
blocks the structured question UI, not questions in prose. This is a separate
interaction preference, not a requirement for bypass mode or this prompt.

See the [settings reference](https://code.claude.com/docs/en/settings-reference) for
exact behavior and precedence.

## Edit the prompt

After editing `SYSTEM.md`, relaunch Claude Code and start a new conversation. When
iterating across resumed launches, add `--system-prompt-snapshot off` to rebuild the
prompt on each request rather than reuse the conversation's saved prompt.
`/reload-plugins` does not reload this file.
