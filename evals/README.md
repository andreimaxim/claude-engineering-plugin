# Engineering skill evaluations

This suite answers one question: **what changes when an engineering agent receives
these skills?** Each case runs as a pair with the same prompt, host, model settings,
tools, permissions, and inputs. The `with-skill` run also receives the skill directory
under `reference/` plus one line asking it to read `reference/SKILL.md`; the
`without-skill` run receives no skill from this suite. Host instructions and account
configuration can still affect both conditions (see isolation below). This is a
no-supplied-skill comparison, not a verified skill-free or instruction-free baseline.

The design and its fixed requirements are in [PLAN.md](PLAN.md). This file covers how
to use the implementation.

## Layout

| Path | Contents |
| --- | --- |
| `cases/<skill>/<case>/case.json` | Versioned case: prompt, inputs, expected outcome, criteria (`task` or `process`), held-back checks |
| `cases/<skill>/<case>/…` | Case inputs, expected files, and held-back check scripts (never copied into agent workspaces) |
| `repositories.json`, `repositories/` | Pinned public repositories, their toolchains, and focused runtimes |
| `src/` | TypeScript CLI, host adapters, evidence collection, grading, publication, and server |
| `web/` | React review app (built with Vite) |
| `results/datasets/`, `results/packets/` | Reviewed, publishable evidence: the only data the app serves |

Private state lives outside the repository in `$EVALS_HOME` (default
`~/.local/state/engineering-evals`): repository caches, installed runtimes, run
workspaces, raw transcripts, thread exports, export previews, and calibration keys.
Nothing there is served.

## Requirements

Node 24 or newer and pnpm. Repository cases also need that repository's toolchain;
Rails needs Ruby 3.1+ with Bundler. Amp runs need `AMP_API_KEY`; Claude Code runs need
`CLAUDE_CODE_OAUTH_TOKEN` (see below).

```sh
cd evals
pnpm install
pnpm evals cases           # list cases, versions, inputs, and checks
pnpm evals fetch rails     # fetch the pinned commit and install its runtime (idempotent)
```

## Run a paired comparison

```sh
pnpm evals prepare shaping/background-export implementing --repetitions 2 --model gpt-6-astra
pnpm evals run <batch> --jobs 4
pnpm evals status <batch>
pnpm evals grade <batch>                 # optional model-assisted rubric grading
pnpm evals publish <batch>               # writes a private preview; read it
pnpm evals publish <batch> --attest "Reviewed prompts, inputs, answers, diffs, and grades; synthetic and public inputs only."
```

`prepare` snapshots each selected case, plans one pair per repetition, randomizes
the condition order with a recorded seed (not a model-sampling seed), and builds
fresh workspaces: files cases become a small Git repository; repository cases are
independent checkouts of the pinned commit with any seeded overlay committed as the
input. For Amp, `--model` states which model the mode is expected to use; the
observed model comes from the thread export.

`run` records each launch before spawning the agent. An interrupted batch resumes
with `run` again: finished runs are skipped, and a run left `launched` is reported
as uncertain and never relaunched implicitly. `reset <batch> <run> --reason …`
archives an attempt and prepares a fresh one when you decide to retry.
`recollect <batch>` re-derives evidence from preserved transcripts and workspaces
after an adapter fix, without launching agents.

Each run records, separately:

- **Execution:** succeeded, setup-failed, launch-failed, host-error, or uncertain.
- **Configuration:** observed model and tools against the request, whether the
  supplied skill was read and left intact, MCP servers the host connected, and
  account skills or plugins the host synced into the isolated home.
- **Missing evidence:** anything the harness expected but could not observe.
- **Checks:** held-back and upstream tests the harness executed after the agent
  finished, plus exact-byte comparisons for files that must not change.
- **Grades:** optional, model-assisted, per criterion (`pass`, `fail`, `unverified`)
  with cited evidence. The grader sees the shared prompt without the skill line and
  a trace with supplied-reference reads removed.

A zero exit code only means the host finished; it is not a quality verdict.

## Isolation and its limits

Each run gets a fresh `HOME` and XDG directories, a whitelisted environment (PATH,
the host credential, the repository runtime variables), a host settings file, and
a fresh private session. For Amp the tool allowlist is `apply_patch` and the shell
tools, including the internal `async_*` aliases that the visible shell tool needs;
Claude Code and global-agents skill directories and local MCP servers are disabled.

This is configuration isolation, not an operating-system sandbox. Observed in this
orb: Amp still syncs the account's Personal Skills and plugins into the isolated
cache and connects account-level MCP servers. The `skill` tool and MCP tools are not
enabled, so the agent cannot load them through Amp, but a shell command could read
them. Every run records what was synced and flags tool inputs that reference paths
outside the workspace. A disposable machine or container protects unrelated files;
it does not prevent the same authenticated account from syncing guidance again.
A verified skill-free baseline also needs host/account configuration that prevents
that guidance from becoming available. The current Amp runs do not establish this.

## Claude Code replay

Claude Code is the primary target. The adapter in `src/hosts/claude.ts` follows the
official CLI reference and the stream-json format Amp shares, but **it has not been
run against real Claude Code output**; datasets from it state that. To replay a
selection with a subscription instead of API credits:

```sh
claude setup-token                       # prints a long-lived subscription token
export CLAUDE_CODE_OAUTH_TOKEN=…         # API keys are deliberately not forwarded
pnpm evals prepare all --host claude-code --model opus --effort high --seed <seed of the Amp batch>
pnpm evals run <batch>
```

Each run uses an isolated `CLAUDE_CONFIG_DIR` and `HOME`, and runs `claude -p` with
`--safe-mode` (no CLAUDE.md, skills, plugins, hooks, or memory), `--strict-mcp-config`
with no servers, `--tools Bash,Edit,Glob,Grep,Read,Write`, and
`--permission-mode bypassPermissions`, keeping Claude Code's default system prompt.
After the first real replay, compare `transcript.jsonl` with the adapter's parsing of
the `system/init` and `result` events before trusting model, tool, and token fields.

## Human calibration

```sh
pnpm evals packet pilot-calibration-2 --dataset <dataset> --per-skill 1 --title "…"
pnpm evals unmask ~/Downloads/pilot-calibration-2-judgments.json --out /private/path.json
```

A packet holds one item per selected pair with a random A/B assignment. The served
packet contains only the task, original context, and each answer's response and diff;
the assignment key goes to `$EVALS_HOME/keys/`. Packets are immutable because browser
drafts are tied to the packet's exact bytes and each item's evidence hash. Reviewers
save drafts in their browser, then copy or download a JSON export; nothing is
submitted automatically. `unmask` verifies the hashes and joins the export with the
key; keep its output private.

Keep the original judgment export and the unmasked result outside the repository,
for example under `$EVALS_HOME/judgments/`. Back up that directory and `keys/`
privately before retiring an orb. An exported review is not a privacy attestation
for the underlying dataset. Check that `problems` is empty before interpreting an
unmasked result; the CLI currently warns about hash mismatches rather than failing.

## Use the app for future skill revisions

1. Freeze the case inputs and criteria, then run repeated pairs on the current
   skill revision. Record the host, observed model, requested effort, and isolation
   limitations. Keep infrastructure failures and missing evidence visible.
2. Review a condition-masked packet before revealing its key. Preserve each answer's
   acceptability, the separate pair preference, and the reviewer's exact correction.
   A preferred answer can still need correction; a tie can still contain useful
   feedback. Keep human judgments separate from model-assisted grades.
3. Turn specific corrections into proposed criteria or new, unseen cases. Do not
   change historical grades, rewrite the reviewed answers, or turn a contextual
   preference into a universal formatting rule. Clarify vague feedback before using
   it as an automated grading rule.
4. After an agreed skill change, repeat the frozen comparisons with the same host,
   model settings, inputs, and tools, retaining no-supplied-skill controls. Use the
   app's evidence views and separate review packets for both revisions. Include
   unseen public-project and multi-turn tasks before claiming generalization.

The first five-item human calibration has been completed. It informs rubric design,
not a reliability estimate or proof of coding uplift. The original packet remains
unchanged; personal judgments and its A/B key are not part of the public corpus.

## The review app

```sh
pnpm build && pnpm serve                 # http://localhost:4173
```

In an orb, `amp orb services ensure` starts the declared `evals` service and prints
its portal URL. The server serves the built app, a derived index, and JSON files from
`results/datasets` and `results/packets` by validated id, with a content security
policy that blocks external images. Model output renders as Markdown without raw HTML
or image fetching.

## Historical pilot

`results/datasets/2026-09-27-amp-pilot.json` is the reviewed 48-run pilot export,
normalized once into the current format. It is labelled historical: the runs keep
their original identities and grades, limitations are annotated, and inputs that were
not retained are marked missing. Three cases are unchanged (v1, inputs verified by
Git tree hash); the other nine are rebuilt as v2, so their new results are not
input-for-input comparable with the pilot.

## Checks for this package

```sh
pnpm typecheck
pnpm build
```

There is no unit test suite; exercise the CLI and the rendered app directly.
