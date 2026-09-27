# Engineering Skills

Reusable skills for software development:

- [shaping](skills/shaping/SKILL.md): shapes rough, solved, bounded solutions before
  implementation.
- [implementing](skills/implementing/SKILL.md): implements agreed work through
  emergent scopes, architectural refinement, and independent verification.
- [naming-things](skills/naming-things/SKILL.md): chooses names and terminology by
  clarifying meaning, behavior, and reader context.
- [explaining-code](skills/explaining-code/SKILL.md): explains code and code changes
  using clear language, code examples, and diagrams.

Install with Claude Code:

```sh
claude plugin marketplace add andreimaxim/skills
claude plugin install engineering@andreimaxim
```

## Principles

The skills have been built with the following principles in mind:

### Skills are not commands

Describe when a skill applies so the agent can invoke it whenever needed (e.g.
during feedback loops) without requiring operator intervention.

### Outcomes, not workflows

Define the desired result, necessary constraints, and what success looks like.
Prescribe a sequence only when the order itself matters for correctness or safety.

### Assume expertise, not shared context

Name the practice (e.g., “prepare a handoff,” “red-team the feature”) rather than
spelling out its steps. Supply the scope, local context, and necessary constraints,
while leaving the agent room to choose appropriate tactics. Don’t teach concepts
the model already knows.

### Simplicity over ease

Favor orthogonal concerns and minimal incidental complexity (e.g keeping task intent
independent of incidental tool mechanics). More reasoning during authoring is preferable
to complexity in the resulting skill. Preserve the intended outcome and essential
constraints. Neither exhaustive coverage nor minimal word count is a goal in itself.

### Disclose context progressively

Keep activation cues, the outcome, and essential constraints readily available. Put
detailed documentation, examples, and templates in references, with clear cues for
when to load them.

### Build upon deterministic tools

Discover the relevant tools already available and build on their capabilities for
execution and verification. Look for opportunities to obtain feedback from checks
such as linters and test runners, rather than relying on the agent’s inspection
alone. Don’t reproduce their rulebooks in prose or default to bespoke enforcement
for contextual preferences.

### Design out mistakes

Prefer arrangements that prevent likely mistakes or make them immediately apparent,
rather than relying on the agent to remember warnings. Use the simplest effective
safeguard for the failure mode.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for local development and validation.
