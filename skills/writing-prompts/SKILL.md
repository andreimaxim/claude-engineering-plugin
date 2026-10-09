---
name: writing-prompts
description: "Writes and revises model instructions, including skill bodies and descriptions, system prompts, repository guidance, tool descriptions, and subagent briefs. Applies when drafting, editing, or reviewing these instructions."
---

# Writing Model Instructions

## What a model instruction is

A model instruction is any text a model reads to decide how to behave: a system prompt, a tool
name and description, a parameter description, the text a tool returns, a CLAUDE.md or AGENTS.md
guidance file, a skill description or body, or a prompt template. The model reads all of these
together with the conversation, and its attention is limited. Every line competes with every other
line. Text that does not change behavior still costs attention.

The goal is behavior, not prose. A good instruction reliably produces the intended behavior across
the whole range of situations it covers, using only the text needed to achieve that result.
Prioritize clarity for the model over other writing choices.

The `writing-for-readers` skill covers prose composition and revision. Apply its guidance
without changing the intended behavior, scope, or instruction strength.

## Principles

### Be clear and direct

Name the situation, the behavior, and the boundary. Define a term before you use it. Use concrete
nouns and verbs, short sentences, and one idea per sentence. The test: a new teammate with no
context should be able to follow the text without asking a question. If they would be confused,
the model will be too.

Weak: "Handle git operations carefully."
Clear: "Ask before any git command that rewrites published history, such as push --force or
amending a pushed commit. Run local, reversible commands without asking."

### Remove before you add

Before adding an instruction to address a problem, read the text that already covers the
situation and look for what can be removed: a rule the model already follows without it, two
rules that say the same thing, a special case an existing general rule already covers, or a line
the observed behavior shows the model ignores. Remove it if doing so does not change behavior
the text must preserve. Often the fix is to clarify or move an existing line, not to write another.

Adding: the model sometimes skips reading a config file, so a new bullet says to read config
files first.
Removing first: an existing bullet already says to read the defining file before answering. The
model skips it because a later bullet about "answering quickly" contradicts it. Delete the later
bullet.

### Target a general behavior, not one incident

An instruction describes a class of situations. When a bug or thread motivates a change, find the
general rule that would have prevented it and write that. Do not encode the specific symptom. The
test: if the triggering incident had never happened, would the rule still read as an obvious,
useful rule?

Overfit: "When the user asks about the Stripe webhook retry setting, read config/stripe.ts before
answering."
General: "Before answering a question about configuration, read the file that defines it instead
of answering from memory."

Overfitting also blocks legitimate uses. A rule written for one case will fire on cases it was
never meant for. Give the model the decision rule and let it apply it.

### Say what to do

State the desired behavior. Add what to avoid only when the model actually does it. A prohibition
alone leaves the model guessing what to do instead.

Negative only: "Do not use markdown."
Positive: "Write the response as plain paragraphs. Use inline code for identifiers."

### Give the reason when it helps the model generalize

A short reason lets the model handle cases the rule does not name. Cut a reason that does not
change behavior.

Rule only: "Never use ellipses."
With reason: "The response is read aloud by a text-to-speech engine, so never use ellipses; the
engine cannot pronounce them."

### Calibrate strength

Hedges ("prefer", "usually", "consider", "when appropriate") make an instruction optional. Use
them only when optional is intended. Reserve MUST, NEVER, and ALWAYS for real invariants and for
behavior the model has been shown to get wrong. Current models follow instructions literally and
respond strongly to emphasis. Capitalized warnings and "if in doubt, do X" cause models to apply
instructions more broadly than intended. When a behavior shows up too often, remove the emphasis
instead of adding a counter-rule.

Overtriggers: "CRITICAL: If in doubt, load the skill."
Calibrated: "Load the skill when the task matches its description."

### One home per instruction, no contradictions

Every rule lives in exactly one place. Before adding text, read the surrounding instructions and
clarify, merge, or replace an existing rule rather than adding another. Two rules that pull in
different directions cost the model reasoning on every turn as it tries to reconcile them, and
the outcome is unpredictable. Repeat an instruction only when an eval shows the model ignores the
single statement.

### Use examples deliberately

One concrete example often replaces paragraphs of abstract instruction, and it is the most
reliable way to steer format, tone, and structure. Make examples relevant to the real use, varied
enough that the model does not learn an accidental pattern, and clearly marked as examples. Cut an
example that does not measurably help.

### Organize for the reader

Order sections by what the model needs first: what the thing is, when to act, how to act, what to
set in which case, then examples. Group related rules under one heading. Use headings or tags with
consistent names so the model can find and reference a section. Put stable text before text that
changes per request.

## Where an instruction belongs

The artifacts form levels. Each level holds one kind of instruction, and an instruction at the
wrong level either costs attention on every turn or is missing when needed.

- System prompt: general behavior and rules that apply to every task in that session. It is always in
  context, so it is the most expensive place to add text.
- Skill: a capability the model needs only occasionally and would get wrong without help, such as
  a tool with non-obvious rules, a multi-step workflow, or a domain format. It loads only when the
  task matches, so it can afford detail and examples.
- Project CLAUDE.md: facts and rules specific to one repository or one directory. The model cannot infer
  them from the code, and they do not apply anywhere else.
- Tool description: when to call this tool, how to call it, and what comes back. Nothing about the
  broader task.

To place an instruction, ask two questions. Does it apply to every task in the session? If not, it is
not a system prompt rule. Does it apply outside this repository? If not, it belongs in project CLAUDE.md.
What remains is either a tool's own contract or an occasional capability, which is a skill.

Misplaced: a system prompt paragraph on how to write RRULE strings for schedules. Most turns never
schedule anything, and the model gets the syntax wrong without examples, so this is a skill.
Misplaced: a project CLAUDE.md bullet repeating "ask before destructive git commands" when the
effective system prompt already supplies that rule. Check the loaded instructions before cutting it.

## By artifact

### System prompts

- A system prompt sets the role, the decision rules, and the boundaries. It is not a task recipe
  and not a reference manual.
- Prefer general instructions over prescriptive step lists. The model's own plan is usually better
  than a hand-written one.
- Every line must change useful behavior on most tasks. Background, motivation that does not
  generalize, restated default behavior, and occasional-use detail are cuts or moves to a skill.
- Name a tool only when the session has it. Make tool-specific instructions conditional on the
  tool's availability. Replacing Claude Code's system prompt changes instructions, not the
  available tool schemas.
- Put long-lived instructions first and per-request facts last so the stable part can be cached.

### Skills

- The `building-skills` skill covers capability definition, activation conditions,
  `SKILL.md` structure, and supporting references.
- The description says what the skill does and when to use it, in third person, with the key
  terms a model would match on. It is the only part the model sees before loading, so it decides
  whether the skill loads at all.
- The body teaches the capability in full: what the concept is, when to act, how, what to set in
  which case, examples. Define every term before its first use.
- A skill body may be long. It still must not restate system prompt rules.

### CLAUDE.md and other guidance files

- Record what the model cannot infer from the code: commands, invariants, decision rules,
  non-obvious environment steps, and product constraints. Remove general engineering advice.
- Write bullets, not paragraphs. State what to do. State why only when it changes the decision.
- Prefer durable rules over current implementation details.
- Keep one concern per file and link to the source of truth instead of copying procedures.
- Scope guidance to the directory it governs. Put a rule for one subtree in that subtree's file.
- Claude Code loads CLAUDE.md natively. Do not assume it loads AGENTS.md automatically. Preserve
  the project's explicit import or reading instructions when adapting existing guidance.

### Tool descriptions

- The first sentence says what the tool does and when to use it. Write it as you would explain
  the tool to a new teammate: make implicit context explicit, such as query formats, niche terms,
  and how this tool relates to sibling tools.
- Add "Do not use for X" only for false positives that actually occur, and name the tool to use
  instead.
- Name parameters unambiguously (`user_id`, not `user`). Describe each parameter's format with
  one example value.

## Process

1. Start from observed behavior. One case is an anecdote, two are a signal, three are a pattern.
   Write down the cases before writing any text.
2. Read the existing instructions that cover the situation. First look for text to remove or
   clarify without changing behavior the text must preserve. Only then decide whether anything
   must be added, and where it belongs.
3. Write the smallest change that produces the behavior on the observed cases.
4. Review the change against the principles above. Check that it is clear, addresses a general
   behavior, states what to do, and uses the intended instruction strength. Each instruction
   should appear in one place, examples should help produce the intended behavior, and the
   material should be ordered for the reader. Check that removing existing text would not have
   solved the problem without additions.
5. Offer an eval. Do not run it without explicit approval. The plan names the motivating positive
   case, one negative control (a case the change must not affect), the model, the session count
   (default at most 12), and what it does not cover. Run it through the real agent with the real
   system prompt and tools, use fresh isolated eval sessions, and report per-case pass rates for
   old and new text. "Reads better" is not a result.

## Examples

Tool description, before:

    Search tool. Use this to find things in the codebase. Very powerful. ALWAYS use it before
    editing.

After:

    Searches file contents with a regular expression and returns matching lines with paths and
    line numbers. Use for exact strings or symbols. For questions about behavior or flows that
    span files, use Agent with an available code-discovery agent, such as Explore. Parameter
    `pattern`: a regular expression such as `handleAuth\(`.

CLAUDE.md entry, before:

    We had an incident where the agent ran the test suite without the timeout and it looked like
    it hung, so please remember that tests can take a long time in this repo and be patient.

After:

    - Run `pnpm test` as a background Bash task; the suite takes about 3 minutes. Read its output
      file to check progress and results instead of rerunning it.

System prompt rule, before:

    NEVER ask the user clarifying questions. Always make assumptions and proceed.

After:

    For small, well-defined tasks, pick sensible defaults and proceed; state the defaults you
    chose. Ask before acting only when a wrong guess would be expensive to reverse, such as a
    schema migration or a destructive command.
