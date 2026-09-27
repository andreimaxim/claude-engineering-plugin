# Engineering skill evaluations: implementation plan

> Status: implemented in this directory; see [README.md](README.md) for usage. This plan is
> kept as the design record. Its references to removed files describe the handoff state.
> The owner later superseded the TypeScript requirement: the harness and CLI are now
> idiomatic Ruby, the review app is SvelteKit, and the root `mise.toml` pins the
> toolchain. The other requirements below still apply.

Build an idiomatic TypeScript evaluation suite and a polished portal web app that
answer: **what changes when an engineering agent receives these skills?** Claude
Code is the primary target; Amp is the first host we can exercise here. Compare
actual work and outputs, not just whether a skill was invoked.

The Python prototype, partial TypeScript port, executable fixtures, generated web
pages, and their dependencies have been removed. The JSON scenarios and prose
fixtures remain as design material, **not a runnable suite**. Some scenarios and
repository metadata still reference removed files. Rebuild those inputs deliberately
and version changed cases; do not recreate the old harness as a mechanical port.

## Fixed requirements and implementation freedom

- Write the harness, CLI, data handling, and web application in TypeScript. No
  Python-only dependency is needed. Public target repositories retain their native
  languages and toolchains; TypeScript can invoke their existing commands.
- Keep the design small and idiomatic: typed domain data, explicit asynchronous
  operations, ordinary modules and appropriate libraries. Choose the runtime,
  frontend framework, file layout, and dependencies during implementation. There
  is no requirement to preserve prototype filenames, APIs, or serialization.
- **No new test suite is requested for this implementation.** Typechecking,
  building, and directly exercising the CLI and rendered application are enough
  for the rewrite. Collecting target-project checks remains part of the evaluation
  product; it is not a request to recreate the deleted harness tests.
- Use subscription-friendly agent CLIs, not an API-only service. Model execution
  through Amp is authorized. Cost is not the limiting factor.
- Do not change the skills to improve their scores on these already-seen cases.

## The retained cases are a starting corpus

| Skill | Intended distinction | Draft cases |
| --- | --- | --- |
| `naming-things` | Clarify meaning before choosing a label; retain a good name | Conflicting events, attempts versus retries, Rails rotation callbacks |
| `shaping` | Preserve semantics and existing ownership; respect authorization | Background exports, a settled label edit, Rails completion records |
| `implementing` | Deliver bounded changes with discriminating evidence | Rails SVG support and a synthetic capture-state regression |
| `explaining-code` | Explain observable behavior and precise conditions | Rails capture versus return values and notification exception paths |
| `building-skills` | Write discoverable, portable, outcome-focused guidance | Query-plan review companion and migration rehearsal |

There are 12 scenarios: six use a full Rails checkout, four are small synthetic
controls, and two author skills from invented practice notes. These are not broad
engineering coverage. A full checkout alone does not make a task a large-system
evaluation. Keep small cases as controls while supporting cross-module tasks in
real public repositories.

Fetch repositories into an external cache at exact commits; `repositories.json`
retains a Rails v7.2.2.1 pin. Prepare fresh workspaces per run. Never vendor Rails,
Bun, or their dependencies into this repository. Each supported repository needs
a known toolchain and focused verification commands, not just a clone URL. Only
Rails has previously been exercised; another repository is a later extension.

## Paired execution must change only the supplied guidance

Use the same task inputs, host, model, requested effort, tools, permissions, and
repository revision in both conditions. One receives no project skill guidance;
the other receives the exact skill and its bundled resources. Keep rubrics and
expected outcomes out of both agent workspaces. Host system instructions remain
present and must not be described as a completely instruction-free baseline.

Prepare clean host configurations and fresh sessions so personal/global skills,
plugins, memory, and other runs cannot silently contaminate the comparison. Verify
the observed tool set and supplied-skill access. Configuration isolation is not an
operating-system security sandbox. Keep credentials and unrelated private material
outside the evaluated workspace and explain residual access limitations.

Provide a straightforward CLI to select cases, prepare inputs, execute repeated
pairs, collect evidence, and export reviewed results. Persist enough state to
inspect and resume interrupted work without relaunching a completed or uncertain
model invocation. Do not blindly retry failed launches. Randomize and record
condition order; an order seed is not a model-sampling seed.

Record case/input, repository, skill/resource, harness and host revisions alongside
requested settings and observed model identity. Record effort as unknown when the
host does not expose it. Separate setup/execution failures, model or tool mismatches,
missing evidence, behavioral failures, and successful checks. A CLI exit code of
zero is not an engineering-quality verdict.

Keep raw transcripts, original input snapshots, actual final responses, changes,
and independently executed checks outside served/public directories. Evidence
must distinguish what the agent claimed from what was observed. Preserve original
inputs rather than showing an agent-edited file as task context.

Implement the Amp path now. For Claude Code, inspect current official CLI behavior
and provide reproducible subscription-login replay with matching isolation and
evidence capture. Build an automated trace adapter only against observed output;
mark documentation-only or unexercised support honestly. Do not require the user to
buy API credits or replace the host system prompt to obtain a baseline.

## The app has two review modes

**Per-skill comparisons:** make cases, conditions, repetitions, skill revisions,
and model settings easy to navigate. Show the task and original context, rendered
answers, actual changes, executed checks, and grading evidence. Let the reader
inspect equal outcomes and regressions as easily as wins. Keep task correctness,
skill-specific process requirements, and subjective preference separate; do not
flatten them into an unexplained overall score.

**Condition-masked human calibration:** show A/B answers with a stable randomized
assignment per packet. Hide labels, grades, rubrics, identifying run metadata, and
timing/token clues. Keep the answer content and substantive claims intact. Store
the assignment key outside the served app and its assets, not merely behind a
hidden UI control. Disclose that writing style, explicit skill references, and
prior exposure may still reveal the condition: this is not guaranteed blinding.

For each answer collect accept / needs correction / reject independently, then
A / B / tie / neither preference and the exact correction the reviewer would send.
Save drafts locally in the browser, tied to the exact evidence and A/B assignment.
Offer explicit copy/download; do not silently submit judgments or imply browser
drafts are synchronized. Handle storage and clipboard restrictions honestly.

Use readable typography, clear navigation, accessible controls, responsive layouts,
and good rendering of Markdown and code. Treat model output as untrusted content:
no executable raw HTML or automatic external image fetching. Serve only reviewed,
allowlisted evidence, never a run directory or a directory containing the A/B key.
Expose the application through an Amp portal using a supervised orb service.

## Privacy is a publication boundary

The historical research screened 1,551 thread records in the fixed window
2026-08-28 15:29:28 UTC through 2026-09-27 15:29:28 UTC. It identified 177 threads
with actual Astra-message metadata, including 105 with follow-up user text; the
planning thread was excluded. Corrections were considered whether or not a skill
was invoked. Message-level evidence is stronger than the current thread mode.

Recurring patterns concerned ownership, scope, discriminating checks,
characterization before migration, carrying exclusions forward, precise names,
behavior-first explanations, and concise expert guidance. Use these patterns, not
the original private implementations or literal conversation excerpts. A new
requirement is not automatically a correction of an earlier mistake.

Raw history exports, private quotes, thread identifiers, customer data, and
provenance mappings stay outside this public repository, including ignored folders
and web artifacts. Anonymization requires independently rewritten domains,
structures, data, and situations, or already-public source—not renamed private code.
Inspect prompts, inputs, answers, diffs, and grader comments before export. An
explicit reviewed-export step is a human attestation, not automatic anonymization.

## Preserve the pilot without overstating its findings

The handoff includes a reviewed evidence export for 48 completed runs: 12 cases ×
two conditions × two repetitions, using actual `gpt-6-astra` with Amp's high dial.
Underlying reasoning effort was not independently exposed. The prior run recorded
28 passing evaluator commands and supplied-skill reads in every treatment.

The model-assisted rubric reported 19/24 baseline passes and 24/24 treatment passes.
**This does not establish coding uplift.** Four baseline failures were omissions of
independent-review disclosure even though the common prompts did not explicitly
request independent review; both conditions produced working code. One authoring
baseline incorrectly claimed a YAML parser was unavailable. The naming rubric also
missed the distinction between receipt arrival and physical delivery time.

Retain historical grades and annotate these limitations rather than silently
rewriting the scores. Normalize the reviewed export once if useful; do not burden
the new architecture with compatibility for the rejected implementation. Historical
runs retain their original identities even when new fixture versions differ.
Missing historical context must be labeled missing, not fabricated.

Earlier contaminated smoke runs and a failed tool-filter pilot are invalid for
comparison and must be excluded. No real human calibration judgments have been
collected. Browser automation drafts were synthetic and are not reviewer feedback.

## Deliver a usable first version, then calibrate

The first version is complete when the TypeScript CLI can prepare and
exercise a genuine pair, preserve evidence, and serve the readable comparison and
calibration app through a portal. Load the reviewed pilot as historical data, not
as newly executed results. Verify the rendered representative states and exercise
draft persistence and export; report build/typecheck and manual smoke outcomes
without inventing a test-suite requirement. Explain any unexercised Claude support.

Use human corrections from an initial small packet before designing three harder,
unseen multi-turn cases. Do not fabricate judgments to advance that phase. Future
skill changes should rerun frozen cases with revisioned evidence and baseline
controls. Evaluate automatic skill discovery separately from explicit guidance,
including negative triggers. Retain unseen public-project tasks to check whether
improvements generalize rather than tuning skills to this initial corpus.
