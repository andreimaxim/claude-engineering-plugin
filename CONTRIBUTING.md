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

Invoke a skill with `/andreimaxim-skills:<skill-name>`. After editing, start a new
session or run `/reload-plugins` in Claude Code to load the changes.

## Validate and update

Run these checks before submitting changes:

```sh
claude plugin validate --strict skills
claude plugin validate --strict .claude-plugin/plugin.json
claude plugin validate --strict .claude-plugin/marketplace.json
```

When preparing a release, bump `version` in `.claude-plugin/plugin.json`.
