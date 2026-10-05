---
name: building-skills
description: "Defines reusable skills, including their scope, activation conditions, SKILL.md structure, and references. Applies when creating a skill, revising its scope or organization, or turning an established practice into a skill."
---

# Building Skills

Write a skill prompt that defines a reusable capability, when to use it, and the context
needed to apply it. Preserve the intended behavior and essential constraints when revising
an existing skill.

The `writing-prompts` skill covers writing model instructions that produce the intended
behavior, including instructions within a skill.

For a substantial prose-editing pass, use the Editor tool when available. Supply
the draft, intended capability, and constraints. Assess its edits against those requirements.

## Principles

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

## Writing the skill prompt

### Entry point and metadata

Each skill is a directory containing `SKILL.md`. Begin that file with YAML frontmatter
containing `name` and `description`, followed by the Markdown body.

- **Name:** Use a descriptive, lowercase capability name, with hyphens between words,
  matching the directory name and at most 64 characters. Prefer gerunds, as in `shaping`,
  `implementing`, `naming-things`, and `explaining-code`. Gerund form is an authoring
  convention, not a requirement of the shared specification.
- **Description:** Write in third person and include both what the skill does and when it
  applies. Use specific discovery terms and focus on capability and activation conditions.
  The specification permits at most 1,024 characters. Quote values containing YAML punctuation,
  such as colons, so they parse as one string.
- **Optional metadata:** Include shared specification fields when they serve a concrete purpose.
  When adapting an existing skill, credit the source and preserve any license notices.

For example, `explaining-code` uses:

```yaml
name: explaining-code
description: Explains how code and software systems work and investigates the reasons behind design decisions. Use for code explanations, architecture walkthroughs, runtime and data flows, state transitions, ownership questions, or historical design rationale.
```

The name and description support discovery before the body loads. Put activation conditions
in the description rather than relying on instructions inside the body.

### Body

Start with a title and concise purpose. Organize the remaining guidance around the capability,
outcome, and essential constraints. Choose headings appropriate to the task. Include concrete
examples when they clarify a necessary distinction.

Sections can offer approaches without prescribing a sequence. For example:

> Use the approaches below as needed. They are not a required sequence or separate skills to load.

### References and supporting material

Keep the capability, activation conditions, and essential constraints in `SKILL.md`. Link
to detailed explanations, examples, or templates when they are needed only for part of the
work. Explain when to read or use each resource, and make file links relative to the skill
directory.

When the prompt references a script or tool, state its purpose and explain the inputs or
outputs the agent needs to understand. Keep short examples inline when a separate file
would add no value.

## Reviewing the prompt

Check that the description distinguishes requests the skill should handle from nearby tasks
it should not. Review the body for consistency with the intended outcome and constraints.
Remove conflicting, redundant, or unrelated instructions without losing the context the
model needs.

Use an available parser or validator to check frontmatter, naming, and required fields
against the [Agent Skills specification](https://agentskills.io/specification). Check that
referenced files exist. Format and link checks do not establish that the prompt produces
the intended behavior. Report what was checked without implying that a behavioral evaluation
was run.
