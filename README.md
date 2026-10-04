# Engineering plugin

A Claude Code plugin with eight skills and five subagents for software development.
It is based on agents and skills from
[Amp](https://github.com/ampcode/official-plugins),
[pstack](https://github.com/cursor/plugins/tree/main/pstack),
[HumanLayer](https://github.com/humanlayer/skills), and
[Matt Pocock's skills](https://github.com/mattpocock/skills).
The repository also includes an optional, standalone main-agent system prompt,
described under [Extras](#extras).

## Installation

Add the marketplace and install the plugin:

```sh
claude plugin marketplace add andreimaxim/claude-engineering-plugin
claude plugin install engineering@andreimaxim
```

## How to use

Describe the task in natural language instead of invoking slash commands. The model
decides which skills to load and which subagents to consult. One prompt can combine
research, review, and document writing:

> read the Jira ticket JIRA-123, see how it's implemented in Rails and run it by Oracle to see if the solution fits our shape then create a document for me to review

The sections below describe common workflows. For a summary of each skill and agent,
see [Skills](#skills) and [Agents](#agents).

### Plan the work

Use `shaping` when work involves consequential choices about scope, behavior, or
architecture. The skill is based on the shaping phase of
[37signals' Shape Up](https://basecamp.com/shapeup/1.1-chapter-02).

1. Bring a raw idea, such as a feature request, a difficult bug report, or an
   architectural problem.
2. Agree on the specific problem and how much change and complexity you are willing
   to take on.
3. Develop the main solution elements and resolve feasibility questions that would
   block the work. The Librarian subagent can research existing code, and the Oracle
   subagent can help examine difficult technical choices.
4. Write a bounded plan, called a [pitch](https://basecamp.com/shapeup/1.5-chapter-06)
   in Shape Up, that explains the problem, solution, boundaries, and exclusions. The
   plan leaves implementation choices open instead of listing every task.

### Implement an agreed plan

Use `implementing` to build the plan as small, end-to-end changes, verifying each one.
The skill draws on
[37signals' Shape Up building phase](https://basecamp.com/shapeup/3.3-chapter-12).
It accepts a plan from `shaping`, from another workflow, or written by you. After a
long shaping session, you can start a fresh conversation with the plan.

An independent reviewer must review the integrated result, and the Oracle subagent can
provide that review. If no independent reviewer is available, the agent reports that
the review is missing instead of treating self-review as a substitute.

These skills do not change Claude Code's native Plan mode or permissions.

### Improve existing code

Use `improving-code` to improve the design of existing code. When the design needs
substantial investigation, the Gardener subagent investigates it and proposes concrete
improvements, and the Scout subagent can assess how a proposal affects behavior and
consumers. The main agent chooses which improvements to make, implements and verifies
them, and obtains an independent review. For substantial changes, the main agent can
use `implementing`, with the Oracle subagent reviewing the integrated result.

### Write technical documents

Use `technical-writing` for plans, documentation, ticket solutions, and PR
descriptions. The skill starts from the reader's needs. When the Editor subagent is
available, it revises the draft's structure and wording, and the main agent decides
which revisions to accept and applies them. You can also use the Editor subagent for
model instructions and other substantial drafts.

### Other tasks

- Use `naming-things` to choose names and terminology.
- Use `explaining-code` to understand how code behaves and why it was designed that way.
- Use `writing-prompts` to write clearer model instructions and subagent briefs.
- Use `building-skills` to create custom skills for reusable capabilities.

## Skills

- [shaping](skills/shaping/SKILL.md): produces a bounded plan that defines a solution's
  main elements and resolves major risks while leaving implementation choices open.
- [implementing](skills/implementing/SKILL.md): implements agreed plans in independently
  verifiable scopes defined during implementation, with architectural refinement
  and independent verification.
- [improving-code](skills/improving-code/SKILL.md): improves existing code's design,
  maintainability, and testability. Uses the Gardener subagent for substantial design
  investigation, then implements and verifies the chosen changes.
- [naming-things](skills/naming-things/SKILL.md): chooses names and terminology by
  clarifying meaning, behavior, and reader context.
- [explaining-code](skills/explaining-code/SKILL.md): explains how code and software
  systems work and investigates the reasons behind design decisions. Inspired by
  HumanLayer's [show-me](https://github.com/humanlayer/skills/blob/main/plugins/show-me/skills/show-me/SKILL.md) skill.
- [technical-writing](skills/technical-writing/SKILL.md): writes developer documentation
  and passes the completed draft to the Editor subagent, when available, to improve
  clarity and flow.
- [building-skills](skills/building-skills/SKILL.md): writes and revises skill prompts,
  including activation descriptions, instructions, and references.
- [writing-prompts](skills/writing-prompts/SKILL.md): writes and revises model
  instructions in system prompts, skills, repository guidance, and tool descriptions.

## Agents

[Oracle](agents/oracle.md) (Fable high) reviews code, investigates difficult bugs,
and advises on consequential architecture decisions. It examines the relevant code,
callers, and tests and reports findings or recommendations with supporting evidence.
It is read-only and does not implement changes. Inspired by
[Amp's Oracle](https://ampcode.com/docs/tools#oracle).

[Librarian](agents/librarian.md) (Sonnet high) researches local and external code,
including behavior, architecture, dependencies, and commit history, across multiple
investigation steps. It returns concise, self-contained answers that explain the
relevant code and cite sources. It leaves the working checkout unchanged and does
not execute the code it researches. Inspired by
[Amp's Librarian](https://ampcode.com/docs/tools#librarian).

[Editor](agents/editor.md) (Opus low) improves a draft's clarity and flow while
preserving its meaning. It can rebuild sentences, reorder paragraphs, and remove AI
writing patterns.

[Scout](agents/scout.md) (Sonnet high) investigates proposed changes to identify
affected behavior and consumers, compatibility risks, and unresolved questions.
It may run focused experiments in disposable environments, leaving the working
checkout and shared resources unchanged. It returns findings, not an implementation
or plan.

[Gardener](agents/gardener.md) (Sonnet high) investigates existing code and proposes
concrete improvements based on design analysis, refactoring techniques, and available
tools. It may run disposable experiments to test assumptions or compare designs. The
main agent evaluates and implements the proposals.

## Extras

[extra/SYSTEM.md](extra/SYSTEM.md) is an optional, standalone replacement for Claude
Code's main-agent system prompt. The plugin neither loads nor requires it. Using it
replaces the entire default prompt, including built-in tool guidance and safety
instructions. See the [extra README](extra/README.md) for its intended behavior,
loading instructions, companion settings, and limitations.
