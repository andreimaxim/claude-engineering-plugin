---
name: naming-things
description: Chooses and evaluates names and terminology by clarifying meaning, behavior, and reader context. Use when naming or renaming variables, functions, types, fields, tables, endpoints, pages, products, or domain concepts, or when unclear, overloaded, or competing terms may conceal a modeling problem.
---

# Naming things

Treat a name as an opportunity to communicate understanding to the next reader—human or model.
Names become context for future changes, so approximate terminology can compound as later work
builds on it. Reconnect names to concrete behavior and domain intent rather than extending an
earlier approximation.
Name the thing's essence, not merely the immediate reason someone needed it.

Adapted from Koleman Nix's [How to name things](https://kolemannix.com/blog/how-to-name-things/).

## Understand before proposing names

Treat these considerations as prompts for understanding, not a checklist or scoring system.
Investigate and weigh the context that materially changes what the name communicates. Base the
recommendation on the decisive semantic distinction, not merely on compliance with a convention.
Scale investigation to the name's scope and semantic risk.

Read the relevant definition and its surrounding flow, then inspect representative writers,
readers, and call sites. Where relevant, use contracts, tests, schemas, documentation, and persisted
data as further evidence. Investigate disagreements rather than automatically privileging existing
terminology, historical intent, or current implementation. A contract may constrain what can
safely change without establishing that the underlying concept is coherent.
For a new design, work from concrete intended behavior and examples instead. Do not infer what
something means from its current name alone.

Establish what the thing is, what it does, where it comes from, and which distinctions matter.
Consider its domain meaning, lifecycle, units, absence, errors, and relationships where relevant.
Distinguish essential semantics from incidental implementation details and from the particular
use that prompted the name. Current uses are evidence, but no single use defines a general abstraction.
Write a brief plain-language definition if meaning is difficult to pin down. If two incompatible
definitions fit, investigate the conflict rather than selecting a word that conceals it.

Identify who will read the name and where. A local binding, a public API, a URL parameter, and a
product name have different contexts; some must serve both users and code. Read the surrounding
code or interface as that audience would, rather than evaluating isolated words.

## Choose names in context

- Express the actual concept or operation. Put a caller's particular purpose in its local names
  rather than baking that purpose into a general operation's name. Retain domain language when
  the behavior genuinely belongs to that domain; do not invent generality either.
- Look for an existing language or library idiom before giving an ordinary operation a custom
  name and wrapper. A wrapper that adds no meaning may not need to exist.
- Read related names together. Consider pairs and families, such as `src` and `dst`, whose
  symmetry makes relationships apparent. Ensure fields collectively tell one unambiguous story.
- Use established terminology when it carries the right meaning. Do not preserve a misleading
  term merely for uniformity, or introduce synonyms for the same concept without a reason.
- Weigh brevity, explicitness, abbreviations, and type information against the reader's context.
  Do not enforce blanket rules to always abbreviate, never abbreviate, use long names, or mark
  every optional value. Be consistent in the care and process, not mechanically in the output.
- Distinguish shared meaning from accidental similarity. Expressions of the same fact should
  refer back to an authoritative definition rather than independently defining it. Multiple
  representations or audience-specific terms may be appropriate, but their relationship should
  be explicit. Keep different facts separate even when their values or implementations match:
  a maximum name length and a default queue depth both equal to 64 are not one shared fact.

Recommend an outcome that accurately communicates the concept, without unnecessary change.
That may mean keeping the existing name, renaming it, consolidating competing terminology,
replacing a needless wrapper with an established idiom, or identifying a modeling decision
that must precede naming. Distinguish what needs to change from what the task authorizes you
to implement.

When a new name is appropriate, prefer one well-supported recommendation. Offer alternatives
only when they express a meaningful unresolved distinction, and explain that distinction rather
than producing a thesaurus list.
Try a candidate at its definition and representative uses: does it communicate the same
meaning at each site without requiring knowledge of why the original author wrote it?

## Follow naming discomfort into the model

Difficulty naming an incomplete design is normal; let the name develop with the understanding.
If a design is meant to be settled but still resists a clear name, investigate conflicting meanings,
mixed responsibilities, redundant states, or distinctions the model does not represent. A fitting
name emerging during refinement is evidence of increasing clarity, not proof that the design is
correct. Do not force a polished label onto an unresolved design.

For optional values, determine what absence means. Overrides are naturally sparse; a parse
failure is not just another kind of missing override. If an absent map and an empty map mean
the same thing everywhere, consider normalizing them at the boundary. If absence signifies an
error, consider handling it explicitly and early. Do not collapse states until their equivalence
is established, or assume every optional value needs `maybe_` or `_opt` in its name.

If a name hides inconsistent behavior or persisted meanings, report the conflict and the
required decision. Renaming alone does not repair semantics or historical data. Separate a
behavior-preserving rename from changes to behavior, representation, or migrations; carry out
only changes authorized by the task. A naming request is not permission for a system redesign.

## Examples to reason from

- **A rounding helper called `toPixels`:** inspect the arithmetic, rounding mode, valid range,
  and conversion behavior. If it performs only a general numeric operation, name that operation
  accurately and communicate pixels at the call site. Do not assume a rounding formula is
  equivalent to a standard `round` function for negative numbers or other edge cases.
- **`created_at` versus `uploaded_at`:** a synthetic configuration object may begin to exist
  when its row is inserted. A birth certificate existed before upload. Separate the upload
  timestamp from `record_date` and `last_reviewed_at`; distinguish a date from an instant.
  Choose the event the value actually records, not a universal timestamp suffix policy.
- **`documentDate`:** trace both assignment and consumption. If ingestion records arrival
  while the review screen and staleness rule expect the date on the document, no single rename
  makes those meanings consistent. Identify the semantic split and historical-data risk.
- **`mergeTargetValuesIntoSourceTemplate`:** if its entire behavior is the language's ordinary
  map union, prefer that idiom (such as Scala's `template ++ values`) over a purpose-specific
  wrapper. Confirm collision precedence and other behavior before replacing it.
- **`fallbackConfig`:** determine whether this is a complete configuration used when another
  fails or sparse overrides layered onto a baseline. Name the actual role; if different uses
  disagree, settle the model before settling the label.

## Finish at the right scale

For advice, give the recommended outcome and the key contextual reason. When that outcome
includes a name, state the name and its precise meaning. Include a short usage example when
it makes the recommendation clearer. State unresolved semantics and the evidence needed to
settle them. Do not impose a formal report on a small naming decision.

For an authorized rename, follow references through the affected code and relevant external
contracts, including serialized fields, schema, routes, and documentation. Preserve compatibility
where required; do not treat a public or persisted name as an internal identifier. Run checks
appropriate to the affected surface and distinguish a verified rename from a proposed model fix.
