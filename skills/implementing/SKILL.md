---
name: implementing
description: Implements plans and agreed work through emergent scopes, architectural refinement, and independent verification. Use for substantial implementation or carrying out an agreed plan; not routine edits.
---

# Implementing

## Orienting and scoping

Start from the supplied plan or other agreed brief, whether it comes from `shaping`, another
workflow, or the user. Establish the intended outcome, boundaries, constraints, and unresolved
decisions from that agreement.

Inspect enough of the existing system to choose a responsible first scope. Follow the
relevant entry point to the code that owns the rules and produces observable effects. Use repository
guidance, comparable flows, and behavior evidence to distinguish intended direction from incidental
legacy behavior.

Prefer a small, central end-to-end path that helps resolve a meaningful unknown. Before committing
to the proposed approach, report evidence that could invalidate the plan. Check material assumptions
against relevant code, contracts, or focused experiments before relying on them. If the problem or
boundaries need reconsideration, use `shaping`.

Draw scopes around independently integrable and verifiable outcomes, not layers, files, or people.
Let boundaries and tasks emerge from real implementation. Split work into scopes when the outcomes
or unknowns are independent. Combine fragments that produce nothing useful alone. Do not treat the
initial map as an exhaustive task breakdown.

Track uncertainty: **unknown → understood → verified**. Understood means there is enough evidence
to identify how to complete the remaining work. Verified means the integrated behavior works.
New evidence can move work back to an earlier state. Activity, elapsed effort, and task counts
are not substitutes for that distinction. Explicit state labels are optional.

Keep the map only as detailed as needed to choose the next scope, prioritizing costly uncertainty
and required behavior over polish. Share the relevant path, starting point, and uncertainties
concisely. Report material changes rather than recreating the map after every routine edit.

This is not a repository audit, a complete architecture exercise, or a separate approval gate before
authorized implementation.

## Implementing and steering

Complete the smallest end-to-end path that produces the selected scope's observable result within
the agreed outcome. Let behavior and risk guide tests, not the proposed call graph. Build for current
requirements rather than adding speculative generality. Use small, verified refactorings to extend
the design as new requirements become concrete.

Run focused checks throughout implementation to detect failures before later work depends on the
change. For a behavior change, establish a test or executable check that distinguishes the required
result from the old behavior. Treat difficulty setting up or observing that behavior as evidence to
investigate responsibility and dependency boundaries, not as proof that the design is wrong.
Investigate those boundaries before compensating with elaborate mocks or fixtures.

During implementation, as soon as the affected flow is concrete enough to judge, step back and
examine the implementation and surrounding code as one system, before extending that design across
the remaining work. Act as a software designer examining the composition as a whole. Consider what
callers or operators must know, join, reconstruct, coordinate, and verify. Look for simplifications
through deletion, consolidation, clearer ownership, and fewer competing representations. Challenge
the proposed organization, not the agreed outcome.

Refine unimplemented parts of the design directly. Improve the affected existing design in small,
behavior-preserving steps throughout implementation. Before refactoring, identify the relevant
observable behavior and contracts to preserve and establish checks for them. Run those checks
between steps. Keep refactoring separate from intentional behavior changes so failures can be
traced to one or the other. When bounded preparatory refactoring reduces the effort or risk of the
next behavior change enough to justify its cost, complete and verify it just before that change.
Leave unrelated or merely desirable cleanup outside the work.

Keep the patch easy to scan. Remove comments that merely narrate the code, but retain explanations
of non-obvious rationale, constraints, and public contracts. Group closely related statements and
separate distinct steps with blank lines, following the surrounding code's conventions. Use existing
formatters and linters for mechanical style. Do not create enforcement rules for contextual
readability choices.

Adapt local structure within agreed behavior, ownership, contracts, and constraints. Repeated
workarounds, type escapes, boundary leaks, or duplicated representations warrant investigation,
but do not automatically require approval. Bring consequential departures from the agreement to
the developer before implementing them. When a decision is needed, pause only the affected work
and present the evidence and recommendation rather than forcing the implementation to fit the
proposed design or silently redesigning it.

Use implementation evidence to distinguish newly required work from optional polish, pre-existing
problems, and excluded ideas. When work stalls, determine whether the scope's boundary is incoherent
or a material question remains unresolved, and revise the scope map and next move accordingly.
Reduce flexible breadth or generality before compromising required behavior, quality, security, or
data integrity.

## Verification

Use the repository's relevant existing checks to verify the integrated result. Scale verification
to the changed behavior and affected callers, and make the results and limitations available to
the independent reviewer.

Use an independent reviewer with strong reasoning and senior engineering judgment. When available,
the Oracle subagent can fill this role. The reviewer challenges assumptions, traces consequences
beyond the edited code, and assesses whether the implementation delivers the intended outcome.
Give the reviewer the agreed outcome, required behavior, and constraints in a fresh context,
without the implementation conversation. Have the reviewer inspect the actual changes and
surrounding code. For an intermediate review, distinguish the scope being assessed from work
still planned.

Have the reviewer assess correctness, repository guidance, fit with the surrounding design,
unnecessary complexity, and whether the tests and other evidence establish the required behavior.
Obtain additional evidence where its findings expose a gap.

A scope boundary need not trigger a separate review. Independent review must cover
the complete integrated result before reporting readiness. If an independent reviewer is
unavailable, report that requirement as unmet rather than substituting self-review.

Assess its findings rather than accepting them mechanically. Carry supported, material corrections
through implementation, verification, and focused follow-up review without waiting for the user to
prompt each correction.

Use the evidence, discoveries, and remaining uncertainty to choose the next scope. Completing a
scope informs the next scope, but does not mean the whole task is complete. Continue toward the
authorized outcome unless the user requested this scope alone or an explicit review stop. Judge
readiness against that outcome, not an exhaustion of possible improvements.

Report decisive verification evidence and any remaining limitation or blocker. Readiness does not
authorize pushing, deployment, release, or production writes without explicit approval.
