# Engineering plugin

A Claude Code plugin with eight skills and five subagents for software development.
It is based on agents and skills from
[Amp](https://github.com/ampcode/official-plugins),
[pstack](https://github.com/cursor/plugins/tree/main/pstack),
[HumanLayer](https://github.com/humanlayer/skills), and
[Matt Pocock's skills](https://github.com/mattpocock/skills).
The repository also includes an optional, standalone main-agent system prompt.

## Installation

Add the marketplace and install the plugin:

```sh
claude plugin marketplace add andreimaxim/skills
claude plugin install engineering@andreimaxim
```

## How to use

Make requests in natural language rather than slash commands, and let the model
decide which skills to load and which specialists to consult. One prompt can combine
research, review, and document writing:

> read the Jira ticket JIRA-123, see how it's implemented in Rails and run it by Oracle to see if the solution fits our shape then create a document for me to review

### Plan the work

Use `shaping` when work involves consequential choices about scope, behavior, or
architecture. The skill is based on the shaping phase of
[37signals' Shape Up](https://basecamp.com/shapeup/1.1-chapter-02). Bring a raw idea, such
as a feature request, a difficult bug report, or an architectural problem. Agree on
the specific problem and how much change and complexity you are willing to take on.

Develop the main solution elements and resolve blocking feasibility questions.
Write a bounded plan, called a [pitch](https://basecamp.com/shapeup/1.5-chapter-06) in
Shape Up, that explains the problem, solution, boundaries, and exclusions. Leave
implementation choices open rather than producing an exhaustive task list.

The Librarian subagent can research existing code, and the Oracle subagent can help
examine difficult technical choices.

### Implement an agreed plan

Use `implementing` to build and verify small, end-to-end changes. After lengthy
shaping, you can start a fresh conversation with the plan. The skill draws on
[37signals' Shape Up building phase](https://basecamp.com/shapeup/3.3-chapter-12).
It accepts a plan from `shaping`, another workflow, or the user. These skills do not
change Claude Code's native Plan mode or permissions.

An independent reviewer must review the integrated result. The Oracle subagent can
provide that review. If no independent reviewer is available, report the missing review
rather than treating self-review as a substitute.

### Improve existing code

Use `improving-code` to improve existing code. When substantial design investigation
is needed, the Gardener subagent investigates the design and proposes concrete
improvements. The Scout subagent can assess a proposal's consequences for behavior
and consumers.

The main agent chooses and implements improvements, then verifies them and obtains
an independent review. The `implementing` skill supports substantial changes, and the
Oracle subagent can review the integrated result.

### Write technical documents

Use `technical-writing` for plans, documentation, ticket solutions, and PR descriptions.
Start with the reader's needs. When available, the Editor subagent revises the draft's
structure and wording. The main agent decides which revisions to accept and applies
them. Editor also edits model instructions and other substantial drafts.

### Choose names and understand code

Use `naming-things` for names and terminology. Use `explaining-code` to understand
behavior and design rationale.

### Write prompts and create skills

Use `writing-prompts` to help the agent write clearer model instructions and subagent
briefs. Use `building-skills` to create custom skills for reusable capabilities.

## Skills

- [shaping](skills/shaping/SKILL.md): produces a bounded plan that defines a solution's
  main elements and resolves major risks while leaving implementation choices open.
- [implementing](skills/implementing/SKILL.md): implements agreed plans in independently
  verifiable scopes defined during implementation, with architectural refinement
  and independent verification.
- [improving-code](skills/improving-code/SKILL.md): improves existing code's design,
  maintainability, and testability. Uses Gardener for substantial design investigation,
  then implements and verifies the chosen changes.
- [naming-things](skills/naming-things/SKILL.md): chooses names and terminology by
  clarifying meaning, behavior, and reader context.
- [explaining-code](skills/explaining-code/SKILL.md): explains how code and software
  systems work and investigates the reasons behind design decisions. Inspired by
  HumanLayer's [show-me](https://github.com/humanlayer/skills/blob/main/plugins/show-me/skills/show-me/SKILL.md) skill.
- [technical-writing](skills/technical-writing/SKILL.md): writes developer documentation
  and passes the completed draft to Editor, when available, to improve clarity and flow.
- [building-skills](skills/building-skills/SKILL.md): writes and revises skill prompts,
  including activation descriptions, instructions, and references.
- [writing-prompts](skills/writing-prompts/SKILL.md): writes and revises model instructions
  in system prompts, skills, repository guidance, and tool descriptions.

## Agents

[Oracle](agents/oracle.md) (Fable high) reviews code, investigates difficult bugs,
and advises on consequential architecture decisions. It examines relevant code,
callers, and tests to provide evidence-backed findings or recommendations. It is
read-only and does not implement changes. Inspired by
[Amp's Oracle](https://ampcode.com/docs/tools#oracle).

[Librarian](agents/librarian.md) (Sonnet high) researches local and external code
through multi-step investigations of behavior, architecture, dependencies, and
commit history. It returns concise, self-contained answers that explain the relevant
code and cite supporting sources. It leaves the working checkout unchanged and does
not execute the code it researches. Inspired by
[Amp's Librarian](https://ampcode.com/docs/tools#librarian).

[Editor](agents/editor.md) (Opus low) improves a draft's clarity and flow while
preserving its meaning. It can rebuild sentences, reorder paragraphs, and remove AI
writing patterns.

[Scout](agents/scout.md) (Sonnet high) investigates proposed changes to identify
affected behavior and consumers, compatibility risks, and unresolved questions.
It may run focused experiments in disposable environments while leaving the working
checkout and shared resources unchanged. It returns findings, not an implementation
or plan.

[Gardener](agents/gardener.md) (Sonnet high) investigates existing code and develops
concrete improvement proposals based on design analysis, refactoring techniques,
and available tools. It may use disposable experiments to test assumptions or compare
designs. The main agent evaluates and implements the proposals.

## Extras

[extra/SYSTEM.md](extra/SYSTEM.md) is an optional, standalone replacement for Claude
Code's main-agent system prompt. The plugin neither loads nor requires it. It replaces
the default prompt, including built-in tool guidance and safety instructions. See the
[extra README](extra/README.md) for its intended behavior, loading instructions,
companion settings, and limitations.
