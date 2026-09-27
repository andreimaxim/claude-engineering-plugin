---
name: building-skills
description: Authors new portable Agent Skills, including discovery metadata, instructions, and supporting resources. Use when creating a new skill or turning an established practice into one.
---

# Building Skills

Create a new skill that expresses the intended capability and satisfies the
[Agent Skills specification](https://agentskills.io/specification).

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

## Artifact conventions

### Entry point and metadata

Each skill is a directory containing `SKILL.md`. Begin that file with YAML frontmatter
containing `name` and `description`, followed by the Markdown body.

- **Name:** Use a descriptive, lowercase capability name, with hyphens between words,
  matching the directory name and at most 64 characters. Prefer gerunds, as in `shaping`,
  `implementing`, `naming-things`, and `explaining-code`. Gerund form is an authoring
  convention, not a requirement of the shared specification.
- **Description:** Write in third person and include both what the skill does and when it
  applies. Use specific discovery terms. The specification permits at most 1,024 characters;
  focus on capability and activation conditions.
- **Optional metadata:** Include shared specification fields when they serve a concrete purpose.

For example, `explaining-code` uses:

```yaml
name: explaining-code
description: Explains code and code changes using clear language, code examples, and diagrams. Use when asked how code works, for architecture or runtime walkthroughs, or to explain a diff.
```

The name and description support discovery before the body loads. Put activation conditions
in the description rather than relying on instructions inside the body.

### Body

Start with a title and concise purpose. Organize the remaining guidance around the capability,
outcome, and essential constraints. Choose headings appropriate to the task; include concrete
examples when they clarify a necessary distinction.

`shaping` gives its sections a role without prescribing a solution sequence:

> The sections below are available lenses, not a required sequence or separate skills to load.

### Supporting resources

Add resources when they serve the capability:

- `references/` for detailed context loaded when needed.
- `scripts/` for executable helpers.
- `assets/` for templates, fixtures, or other supporting materials.

Reference files relative to the skill directory. Give each reference a loading cue. Reference
scripts with execution intent and make their inputs, outputs, and dependencies clear.

Keep small examples inline when a separate file and loading step would add no value, as
`naming-things` does under “Examples to reason from.”

## Authoring workflow

1. **Establish the capability:** Identify the outcome, essential constraints, and applicability,
   grounded in supplied context, relevant examples, and available tools.
2. **Compose the artifact:** Choose the name and description, write the body, and add resources
   the capability needs, applying the principles and conventions.
3. **Validate and finish:** Perform applicable artifact checks, correct reported issues, and
   return the new skill and resources with a concise account of validation.

## Artifact checks

- **Format:** Validate `SKILL.md` against the
  [Agent Skills specification](https://agentskills.io/specification#validation), using an
  available validator. For the specification’s
  [skills-ref reference implementation](https://github.com/agentskills/agentskills/tree/main/skills-ref),
  read [Using skills-ref](references/skills-ref.md) before setting it up or running it.
- **Resources:** Confirm referenced local files and script paths exist and resolve from the
  skill directory.
- **Executables:** When scripts are bundled, exercise them with safe representative inputs
  and verify expected results.

Report which checks were automated, inspected, or could not be completed. Reuse existing tools;
do not manufacture custom lints for subjective principles.
