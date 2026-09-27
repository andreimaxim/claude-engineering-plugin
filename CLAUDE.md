# Skills - Agent Guidance

This repository publishes reusable software-development skills as the `engineering`
Claude Code plugin. Skills live in `skills/<skill-name>/SKILL.md`, with supporting
files in each skill's directory. Plugin and marketplace metadata live in
`.claude-plugin/`.

## Project references

- Before authoring or reviewing a skill, read the [design principles](README.md#principles).
- Before changing skills or packaging, read [CONTRIBUTING.md](CONTRIBUTING.md) for
  structure, local development, validation, and updates.
- Read the affected skill's `SKILL.md` and its relevant bundled references.
  Inspect related skills when responsibilities overlap.

This file guides work on the repository; it is not loaded as context with the
installed plugin. Keep each skill's activation cues and essential constraints in
its own `SKILL.md`, with supporting context in its bundled references.
