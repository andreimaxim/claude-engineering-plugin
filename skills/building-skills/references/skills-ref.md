# Using skills-ref

[skills-ref](https://github.com/agentskills/agentskills/tree/main/skills-ref) is the reference
validator linked by the [Agent Skills specification](https://agentskills.io/specification#validation).
It runs independently of the authoring agent. Upstream describes it as a demonstration reference
implementation, not intended for production; use it as an optional validator.

## Availability and fallback

Reuse an existing installation when available. Setting up the reference implementation requires
Python 3.11+. If the required runtime is unavailable, stop this setup path and choose another
validation method rather than installing or upgrading Python solely for this check.

Prefer another available Agent Skills validator. If none is available, use an existing
YAML/frontmatter parser for structural checks and inspect the remaining requirements directly
against the specification. Report each method’s coverage. This stop condition ends `skills-ref`
setup, not authoring or validation.

## Installation

Obtain the [official repository](https://github.com/agentskills/agentskills) and work from its
`skills-ref/` directory. With an available Python 3.11+ executable (`python` below), create and
activate a virtual environment, then install the project:

```sh
python -m venv .venv
source .venv/bin/activate
pip install -e .
```

These are the upstream documented checkout-based instructions. The activation command above
is for Bash or Zsh; the upstream README gives Windows commands. Keep the environment active
when invoking `skills-ref`.

## Validation

Pass the directory containing the new `SKILL.md`:

```sh
skills-ref validate <skill-directory>
```

- Success prints `Valid skill: <path>` and exits 0.
- Validation failure prints `Validation failed for <path>:` followed by problems and exits 1.

Distinguish artifact validation problems from setup or invocation failures; report the latter
separately rather than treating them as a verdict on the skill.

## Coverage

The reference validator checks frontmatter syntax, required and allowed fields, selected field
constraints, naming rules, and agreement between the skill name and directory name. It does not
validate all optional-field types or inspect body quality, resource links, or executables.

Keep resource and executable checks separate. Report which requirements were checked automatically,
inspected directly, or could not be checked.
