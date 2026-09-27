# Contributing

## Add or update a skill

Keep each skill in `skills/<skill-name>/SKILL.md`, with `name` and `description`
in its YAML frontmatter. The name must match the directory. Keep any supporting
files inside the skill's directory, and update the skill list in the README.

## Try changes locally

From the repository root, load the working copy for a Claude Code session:

```sh
claude --plugin-dir .
```

Invoke a skill with `/engineering:<skill-name>`. After editing, start a new
session or run `/reload-plugins` in Claude Code to load the changes.

## Evaluate behavior

The [evaluation suite](evals/README.md) runs paired skill/no-supplied-skill
comparisons on versioned cases, including tasks in pinned public repositories, and
serves a comparison and condition-masked review app. Its design and fixed
requirements are in [the plan](evals/PLAN.md). Amp is the exercised host; Claude Code
is the primary target, with a subscription-login replay path that has not yet been
exercised. Don't change a skill to improve its score on cases it has already seen.
Behavioral evaluations complement the packaging checks below; they do not replace
them.

## Work in an Amp orb

The executable `.agents/setup` prepares the evaluation environment. It installs mise
if needed, then the Ruby, Node, and pnpm versions pinned in the root `mise.toml`, native
build prerequisites, and the stable Claude Code CLI; caches the pinned Rails source and
runtime outside this repository; and builds the review app with its locked
dependencies. It is safe to rerun from the repository root:

```sh
.agents/setup
amp orb services ensure
```

The second command starts the supervised app declared in `.amp/services.yaml` and
prints its portal URL. No database or resume hook is needed. Setup does not log in
to agent hosts, run model evaluations, or copy private judgments and A/B keys into
snapshots. Supply runtime credentials separately, following the
[evaluation guide](evals/README.md#claude-code-replay).

Setup changes take effect in future orbs after they reach the project's default
branch. Existing orbs can run the script directly.

## Validate and update

Run these checks before submitting changes:

```sh
mise run check   # when the evaluation suite changed
claude plugin validate --strict skills
claude plugin validate .claude-plugin/plugin.json
claude plugin validate .claude-plugin/marketplace.json
```

The plugin intentionally omits `version` so updates track Git commits. Both manifest
checks report an expected missing-version warning.

The plugin check also reports that the root `CLAUDE.md` is not loaded as context
with the installed plugin. This is expected: `CLAUDE.md` guides work on this
repository. Fix any other warnings.
