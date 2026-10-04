---
name: explaining-code
description: Explains how code and software systems work and investigates the reasons behind design decisions. Use for code explanations, architecture walkthroughs, runtime and data flows, state transitions, ownership questions, or historical design rationale.
---

# Explaining code

Help the user build an accurate mental model of existing code, system behavior, and the reasons
behind its design.

## Establish the behavior

Inspect the relevant code before explaining it. Start from the boundary that best matches the
question, such as a public method, command, request, event, job, or user interaction. Follow the
path through the calls, state, data, and integrations that produce the observable result.

Read only enough of the system to answer the question. Use tests and contracts to establish edge
cases and invariants when they matter. Distinguish behavior observed in the code from an inference.
State material uncertainty instead of presenting a plausible explanation as established behavior.

Explain one coherent path or decision at a time. Lead with the answer to the user's question, then
show the behavior or evidence that supports it. Name the functions, types, files, data, and ownership
boundaries the reader needs. Keep unrelated implementation detail out of the explanation.

Use the repository's domain terms consistently. Use its programming language for code sketches.
When a path crosses languages, show each boundary in its actual language. Use language-neutral
pseudocode when syntax would distract from the behavior.

## Explain the rationale

When the question concerns a design's origin or rationale, investigate the decision as well as the
current code. Questions about why execution produces a particular result may need only an explanation
of the current code.

For historical questions, trace the changes that introduced or materially reshaped the behavior
rather than treating the last commit to touch a line as its explanation. Consult relevant PR
discussions, tickets, design records, and incident evidence when available and useful for resolving
the question. Look for the constraints, alternatives, and tradeoffs that informed the choice. Keep
the investigation proportional to the question.

Distinguish what the code does, what the historical record explicitly says, and what you infer from
the evidence. A change from a limit of 50 to 100 establishes the new limit, not why 100 was chosen.
Explain the evidence supporting an inferred rationale without presenting it as recorded intent. A
benefit the code provides today does not establish its original motivation or show that the original
constraint still applies. Treat a rationale suggested by the user as a hypothesis to test, not a
conclusion to confirm.

Cite the sources supporting historical claims and explain material contradictions in the evidence.
When the reason remains unknown, say what the inspected sources establish and what remains
unresolved. Identify missing records, search gaps, or access limitations when they materially affect
the answer. Failure to find a reason is not evidence that no reason existed.

## Show the behavior

Prefer code-native explanations—snippets, signatures, pseudocode, call trees, diffs, and file
trees. Use diagrams when relationships, interactions, or state transitions are clearer spatially.
Diagrams should support the explanation, not become its default form.

Pick the smallest view that makes the answer clear:

- logic or an algorithm → pseudocode;
- runtime order → call tree;
- an exact contract, state shape, or ownership boundary → code;
- a change to an existing path → focused diff;
- file ownership → shallow file tree;
- relationships, interactions, or state transitions → diagram.

Place each view next to the text it supports. Keep only the calls, files, values, states, and
boundaries that matter to the question. Show a complete block when omitted context would hide
order or ownership.

For example, show decision logic with a short code example, here in Ruby:

```ruby
def format_file(path)
  original = File.read(path)
  formatted = original.strip + "\n"
  return if formatted == original

  File.write(path, formatted)
end
```

Show runtime order and ownership with a call tree, here in a TypeScript module:

```text
formatFile(path: string): Promise<void>    src/formatter.ts
  await readFile(path, "utf8")            node:fs/promises
  formatText(original)                   src/text.ts
  if formatted !== original
    await writeFile(path, formatted)     node:fs/promises
```

Show responsibility with a shallow file tree, here in a Go project:

```text
.
├── cmd/format/main.go        # parses CLI arguments
├── internal/format/format.go # formats content and skips unchanged writes
└── internal/files/files.go   # reads and writes files
```

When the question is about how a path changed, preserve context with a diff. This Rust diff skips
unnecessary writes:

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

## Write clearly

Use controlled-language discipline. Prefer short, direct sentences and active voice. Use one
consistent term for each concept. Give each sentence one main purpose. Name the actor, action,
conditions, and result explicitly. Keep qualifications that affect correctness.

For the same formatter, state the actor, condition, result, and unaffected scope:

> The formatter now skips writing a file when formatting would leave its contents unchanged.
> Files whose contents change are still written to disk.

The summary "Improves formatting" loses the behavior, condition, and scope that the reader
needs.

Define a technical term when the reader might not know it. Prefer concrete subjects over vague
references such as "it" or "this" when more than one referent is possible. Preserve necessary
detail, but cut preamble, repetition, and filler.

## Stay within the question

Explain the current system rather than silently redesigning it. If the user asks for an evaluation,
separate the factual walkthrough from the judgment. If the user asks about a proposed change,
separate current behavior from proposed behavior and use a diff when it makes the distinction clear.

Before finishing, check that the explanation answers the user's actual question, supports important
claims with inspected evidence, distinguishes findings from inference, uses consistent terms, and
includes no visual more complex than the behavior it clarifies.
