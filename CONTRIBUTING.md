# Contributing

## Add or update a skill or agent

Keep each skill in `skills/<skill-name>/SKILL.md`, with `name` and `description`
in its YAML frontmatter. The name must match the directory. Keep supporting files
inside the skill's directory and check that relative links resolve.

`hooks/register.ts` registers the subagents and the Editor tool. Each subagent's
configuration is in `hooks/agents/<name>.ts`, and its system prompt is
`prompts/<name>.md`. To add a subagent, create both files and add it to the `AGENTS`
list in `hooks/register.ts`. The Editor tool's definition and handler are in
`hooks/tools/editor.ts`, and its prompt is `prompts/editor.md`.
Follow the [skill-writing principles](skills/building-skills/SKILL.md#principles)
when editing prompts. Update the README's skills, agents, and tools lists when adding,
removing, or renaming a skill, agent, or tool.

The standalone main-agent prompt is in `extra/SYSTEM.md`. Its [README](extra/README.md)
explains how to load it. Plugin installation does not load that file.

## Try changes locally

From the repository root, load the working copy:

```sh
claude --plugin-dir .
```

After editing, start a new session or run `/reload-plugins` to load the changes.
Then make a natural-language request relevant to the skill or agent you changed.
Changes to `extra/SYSTEM.md` require relaunching with that file, as described in
its README.

## Check the manifests

Before submitting changes, run:

```sh
claude plugin validate .claude-plugin/plugin.json
claude plugin validate .claude-plugin/marketplace.json
```

These commands validate manifests, not prompt behavior. To check the hooks module
and run its tests, which do not call a model, run:

```sh
claude plugin validate .
claude plugin test .
```

[TESTING.md](TESTING.md) explains how the tests work, how to write them, and how to
check the Editor tool end to end.

The plugin intentionally omits `version` so updates track Git commits. The
missing-version warning is expected. The plugin check also warns that root
`CLAUDE.md` is not loaded with the installed plugin. This is expected because
that file guides work on this repository. Investigate any other warnings.
