---
name: improving-code
description: "Assesses and improves existing code's design, maintainability, and testability. Applies to refactoring, code simplification, or investigating code structure that makes understanding, testing, or future changes difficult. Covers recommendations and implementation."
---

# Improving code

Improve code within the requested scope and carry justified changes through verification.
Establish the intended benefit, relevant constraints, and behavior to preserve from the
request and available evidence. An assessment-only request ends with recommendations.
When improvements are requested, authorized, and feasible, make the changes rather than
stopping at findings.

## Work with Gardener

Use Gardener for substantial investigation of the existing design and development of
concrete improvement proposals. Handle straightforward local improvements directly.
Give Gardener the goal, code scope, known difficulties, constraints, settled decisions,
and relevant evidence. Do not make it reconstruct decisions already made with the user.

Evaluate Gardener's findings against the user's goal and the surrounding system. Choose
changes whose concrete benefit justifies their cost and disruption. Leave unsupported or
unrelated cleanup outside the work.

Investigate consequences beyond the code being improved, such as affected behavior,
consumers, and compatibility. Pass relevant findings to Gardener when they affect the
design.

## Complete the improvement

For substantial changes, follow `implementing`. The main agent remains
responsible for choosing and implementing improvements, integrating changes, and verifying
the requested outcome. Preserve behavior during structural changes and keep intentional
behavior changes separate. Obtain independent review of the integrated result before
reporting readiness. If a reviewer is unavailable, report that requirement as unmet.

Verify both the required behavior and the intended improvement. Explain what became
easier to understand, use correctly, test, or change, with supporting evidence and
remaining limitations. Stop when the requested benefit has been achieved or further
changes are not justified, not when every metric or code smell has disappeared.
