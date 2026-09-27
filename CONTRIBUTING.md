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

## Validate and update

Run these checks before submitting changes:

```sh
claude plugin validate --strict skills
claude plugin validate .claude-plugin/plugin.json
claude plugin validate .claude-plugin/marketplace.json
```

The plugin intentionally omits `version` so updates track Git commits. Both manifest
checks report an expected missing-version warning.

The plugin check also reports that the root `CLAUDE.md` is not loaded as context
with the installed plugin. This is expected: `CLAUDE.md` guides work on this
repository. Fix any other warnings.
