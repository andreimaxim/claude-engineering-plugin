---
name: implementing
description: Implements agreed work through emergent scopes, architectural refinement, and independent verification. Use for shaped work or substantial implementation; not routine edits.
---

# Implementing

## Orienting and scoping

Establish enough contact with the real system to choose a responsible first scope. Follow the
relevant entry point through rule ownership and observable effects, grounded in repository guidance,
comparable flows, and behavior evidence. Distinguish intended direction from legacy accidents.

Prefer a small central end-to-end path that confronts a meaningful unknown. Surface evidence that
could invalidate the brief before committing to its shape; use the de-risking guidance in `shaping`
when a material assumption needs focused investigation.

Draw scopes around independently integrable and verifiable outcomes, not layers, files, or people.
Let boundaries and tasks emerge from real implementation. Split work with independent outcomes or
unknowns; combine fragments that produce nothing useful alone. Do not pretend the initial map is an
exhaustive task breakdown.

Track uncertainty: **unknown → understood → verified**. Understood means the approach has enough
evidence that remaining work is visible; verified means the integrated behavior works. New evidence
can move work backward. Activity, elapsed effort, and task counts are not substitutes for that
distinction; explicit state labels are optional.

Keep the map only as detailed as needed to choose the next scope, prioritizing costly uncertainty
and required behavior over polish. Share the relevant path, starting point, and uncertainties
concisely; report material changes rather than recreating the map after every routine edit.

This is not a repository audit, a complete architecture exercise, or a separate approval gate before
authorized implementation.

## Implementing and steering

Complete the smallest end-to-end path that produces the selected scope's observable result within
the agreed outcome. Let behavior and risk guide tests, not the proposed call graph.

During implementation, as soon as the affected flow is concrete enough to judge, step back and
examine the implementation and surrounding code as one system, before extending that design across
the remaining work. Act as a software designer examining the composition as a whole. Consider what
callers or operators must know, join, reconstruct, coordinate, and verify. Look for simplifications
through deletion, consolidation, clearer ownership, and fewer competing representations. Challenge
the proposed organization, not the agreed outcome.

Refine unimplemented parts of the design directly. For existing code, decide whether bounded,
behavior-preserving preparation materially simplifies or de-risks the next behavior change enough
to justify its cost. If so, complete and verify that preparation just before the change that needs
it. Leave unrelated or merely desirable cleanup outside the work.

Adapt local structure within agreed behavior, ownership, contracts, and constraints. Repeated
workarounds, type escapes, boundary leaks, or duplicated representations are evidence to investigate,
not automatic approval gates. Bring consequential departures from the agreement to the developer
before implementing them. Pause only the affected work when a decision is needed, showing the
evidence and recommendation rather than forcing the shape or redesigning it silently.

Use implementation evidence to distinguish newly required work from optional polish, pre-existing
problems, and excluded ideas. When work stalls, determine whether the scope's boundary is incoherent
or a material question remains unresolved, and revise the scope map and next move accordingly.
Reduce flexible breadth or generality before compromising required behavior, quality, security, or
data integrity.

## Verification

Use the repository's relevant existing checks to verify the integrated result. Scale verification
to the changed behavior and affected callers, and make the results and limitations available to
the independent reviewer.

Consult an oracle—a strong reasoning agent with senior engineering judgement that acts as an
independent technical advisor. Its role is to challenge assumptions, trace consequences beyond the
edited code, and assess whether the implementation delivers the intended outcome. Give it the agreed
outcome, required behavior, and constraints in a fresh context, without the implementation
conversation, and have it inspect the actual changes and surrounding code for itself. For an
intermediate review, distinguish the scope being assessed from work still planned.

Have the advisor assess correctness, repository guidance, fit with the surrounding design,
unnecessary complexity, and whether the tests and other evidence establish the required behavior.
Obtain additional evidence where its findings expose a gap.

A scope boundary need not trigger a separate oracle consultation; independent review must cover
the complete integrated result before reporting readiness. If an independent reviewer is
unavailable, report that requirement as unmet rather than substituting self-review.

Assess its findings rather than accepting them mechanically. Carry supported, material corrections
through implementation, verification, and focused follow-up review without waiting for the user to
prompt each correction.

Use the evidence, discoveries, and remaining uncertainty to choose the next scope. A scope result
feeds the next scope; it is not completion of the whole task. Continue toward the authorized outcome
unless the user requested this scope alone or an explicit review stop. Judge readiness against that
outcome, not an exhaustion of possible improvements.

Report decisive verification evidence and any remaining limitation or blocker. Readiness does not
authorize pushing, deployment, release, or production writes without explicit approval.
