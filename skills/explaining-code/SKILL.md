---
name: explaining-code
description: Explains code and code changes using clear language, code examples, and diagrams. Use when asked how code works, for architecture or runtime walkthroughs, or to explain a diff.
metadata:
  credits:
    skill: show-me
    author: Dex Horthy
    organisation: Humanlayer
    url: "https://github.com/humanlayer/skills/blob/main/plugins/show-me/skills/show-me/SKILL.md"
---

# Explaining code

Helps the reader understand existing code, using clear language, code examples, and diagrams.

## Understand the behavior

Ground the explanation in enough implementation evidence to establish the relevant triggers,
observable outcomes, and ownership boundaries. Use tests and contracts where they establish material
invariants or edge cases. Investigate wherever uncertainty matters rather than following a fixed
starting point or sequence.

For a change, establish before-and-after behavior from the relevant diff and implementation. Consult
commit history when useful, but keep observed behavior distinct from stated intent and inference.
The conversation and commit messages are context, not proof.

State material uncertainty. Read only enough to answer the reader's question, and keep unrelated
implementation details out of the explanation.

## Explain the behavior first

Give the reader a useful mental model of the code, not merely a summary of commits. Explain one
coherent path at a time. Lead with the observable behavior, then explain how the implementation
produces it. Name the domain concepts, calls, state, and ownership boundaries that matter.

When explaining a change, state the most important behavior change and why it matters. Start with
the change itself, not implementation history or introductory framing. Mention technical decisions
that help the reader understand the diff, but do not narrate the diff or list modified files.

## Use controlled language

Use plain, precise English that a reader can scan without losing technical meaning:

- Use one consistent repository or domain term for each concept. Define an unfamiliar term once and
  briefly.
- Use active voice. Name the actor, action, condition, and result instead of relying on ambiguous
  pronouns.
- Give each sentence one main purpose and each paragraph one idea. Keep paragraphs to one to three
  sentences when practical.
- Preserve exact names, numbers, units, thresholds, scopes, and conditions. State which behavior
  remains unchanged when that boundary matters.
- Keep each prerequisite, caveat, risk, or operational consequence beside the statement it
  qualifies. These details take priority over brevity.
- Explain non-obvious decisions and gotchas. Omit mechanics that the code or diff already makes clear.
- State uncertainty directly. Separate facts observed in the code from assumptions or stated intent.
- Say the least that fully explains the behavior. Do not omit facts needed for a correct
  understanding, and do not repeat the same conclusion in different words.

For a fictional file formatter, state the actor, condition, result, and unaffected scope:

> The formatter now skips writing a file when formatting would leave its contents unchanged.
> Files whose contents change are still written to disk.

The summary "Improves formatting" loses the behavior, condition, and scope that the reader
needs.

## Show the code

When prose alone would hide the behavior, pick the smallest code-native view that makes the key
point clear. Place each view next to the short text it supports. Use one or occasionally several
views according to the explanation; this is a menu, not a template.

Use the codebase's language for code examples. Use pseudocode when language syntax would distract
from the behavior.

Use a short code example to explain rules or decision logic. For example, in Ruby:

```ruby
def format_file(path)
  original = File.read(path)
  formatted = original.strip + "\n"
  return if formatted == original

  File.write(path, formatted)
end
```

Use a call tree to show runtime order and ownership. For example, in a TypeScript module:

```text
formatFile(path: string): Promise<void>    src/formatter.ts
  await readFile(path, "utf8")            node:fs/promises
  formatText(original)                   src/text.ts
  if formatted !== original
    await writeFile(path, formatted)     node:fs/promises
```

Use a shallow file tree to show responsibility, including when a refactor changed the code's shape.
For example, in a Go project:

```text
.
├── cmd/format/main.go        # parses CLI arguments
├── internal/format/format.go # formats content and skips unchanged writes
└── internal/files/files.go   # reads and writes files
```

Use a focused diff when the surrounding shape already exists and the point is how it changed. The
diff can show code, decision logic, a call tree, or a file tree.
For example, this Rust diff skips unnecessary writes:

```diff
 fn format_file(path: &Path) -> io::Result<()> {
     let original = fs::read_to_string(path)?;
     let formatted = format!("{}\n", original.trim());
-    fs::write(path, formatted)
+    if formatted != original {
+        fs::write(path, formatted)?;
+    }
+    Ok(())
 }
```

Show the whole block when most of it is new or when omitted context would hide ownership or order.

Use a sequence diagram when the behavior is clearest as an ordered interaction across meaningful
components or systems.

Use real names, actions, labels, and data from the code. Include only calls, files, values, states,
and boundaries relevant to understanding it. Keep every view smaller than the behavior it explains.

## Finish at the right scale

Use headings only when they make the explanation easier to scan. Omit empty or irrelevant sections,
boilerplate checklists, generic assurances that conventions or quality standards were followed,
and a conclusion that only repeats the opening summary.

Before finishing, check that a reader who did not follow the implementation conversation can
understand the behavior and how the important code path works. For a change, also check that they can
understand why it exists and what behavior changed.
