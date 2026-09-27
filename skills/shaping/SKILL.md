---
name: shaping
description: Shapes rough, solved, bounded solutions. Use when consequential scope, behavior, or architecture choices need exploration or reconsideration, before or during implementation; not for routine, settled changes.
---

# Shaping

Shape toward **rough, solved, bounded** work: a concrete direction with room for implementation
judgment, foreseeable rabbit holes resolved or fenced off, and a clear stopping point. Keep the
required outcome and fixed constraints distinct from flexible edges and emergent implementation
scopes. Do not invent deadlines or resource limits.

## Use the lens that resolves the uncertainty

The sections below are available lenses, not a required sequence or separate skills to load.
Reuse existing evidence and decisions rather than producing another artifact.

For small, settled work, use the ordinary workflow appropriate to the request; do not manufacture
alternatives or stages.

**Bring possibilities, not just objections.** Draw on broader programming knowledge to offer
approaches the current sketch or repository may not suggest. An approach need not be broken for an
alternative to be worth proposing. Explain the concrete local benefit and cost, not just the
pattern's name. Knowledge supplies candidates, not proof of fit.

### Frame the problem

Establish the experienced problem and baseline, externally meaningful improvement, required core,
flexible edges, fixed constraints, exclusions, and stopping point. This is the boundary for the
work, not its implementation task list. Ground current behavior in the smallest useful evidence;
distinguish observations, source claims, and assumptions. Do not invent business impact or metrics.

Lead with the most plausible frame. Ask when the answer materially changes the outcome or boundary,
not when inspection can settle a fact. A proposed mechanism is not the problem unless the request
makes it a binding contract or technical outcome. Leave solution design open; missing headings
are not missing requirements.

### Breadboard the interactions

Sketch the smallest coherent path from trigger to observable outcome. For UI work, think places,
affordances, and connections; for backend work, triggers, domain actions, state, integrations, and
effects. Use domain language and keep names provisional.

Contrast genuine alternatives when it reveals a consequential choice. Trace the same required
scenario, holding binding requirements fixed. Show what changes the consequences—durable state,
decision ownership, or when an effect commits—and distinguish evidence from reversible judgment.

Keep the clay wet: a compact flow, state transition, or rough pseudocode should make the shape
challengeable without freezing a class hierarchy, schema, or task list. Exact details belong here
only when externally binding or needed to expose a feasibility risk. Avoid straw-man alternatives,
comparison quotas, and elements for hypothetical reuse.

### Clarify behavior

Derive required behavior from the frame, not the breadboard's proposed mechanisms. Choose examples
for materially distinct outcomes and boundary or failure cases that distinguish plausible
interpretations. Make the starting situation, action, observable result, unchanged behavior, and
evidence of success clear. Use the format that clarifies meaning, not an example quota.

Distinguish requirements from illustrations and expose unresolved semantics. Avoid exhaustive edge
cases and tests coupled to a proposed call graph. An explicitly required technical contract is
valid behavior: an audit record with required fields may be the outcome, without requiring a
particular helper or mock.

### Compare architecture

Ground consequential ownership choices in the current flow, repository guidance, and comparable
owners. Distinguish intended direction from legacy structure and cite the evidence that matters,
including when no applicable guidance or exemplar exists.

Consider caller burden, whose rule or lifecycle changes, and how control, data, and effects move.
Look for manual joins, split ownership, duplicated representations, and effects without a clear
commitment or outcome owner. Compare alternatives through the same required scenario, considering
the smallest change to existing owners before introducing an abstraction. Reuse the breadboard's
comparison when it already explains the decision.

A domain subject remains meaningful without its transport or framework. An abstraction should own
a coherent responsibility or remove a demonstrated burden or invalid state—not rename a workflow
step or promise hypothetical reuse. Recommend a direction and identify invalidating assumptions;
do not autonomously converge on an unsettled consequential choice.

### De-risk assumptions

Investigate named assumptions that could invalidate the shape or materially change implementation.
Ground conclusions in relevant code, tests, external contracts, dependency behavior, or production
evidence. Restating a proposal is not evidence; architectural comparison is not a prerequisite.

When an assumption is mechanically testable, use the relevant existing tools or checks to obtain
evidence.

Trace trigger to result, considering failure, concurrency, interruption, migration, security, or
operational scenarios where they could change the conclusion—not as an audit checklist. Prescribe
an exact technical contract only when evidence makes it necessary to close a rabbit hole.

Explain what is supported, uncertain, or needs a developer decision. A no-change conclusion is valid.
Do not manufacture findings, repeatedly revisit choices without a material new reason, or broaden
into general review.
Investigation is not production implementation.

### Brief the agreed shape

Make agreed decisions usable for implementation without introducing new ones. Reconcile what exists;
expose conflicts rather than requesting ceremonial artifacts or silently resolving them. Compression
must not turn assumptions into facts or erase high-cost uncertainty.

Carry the problem and outcome, required core and flexible edges, exclusions, ownership and public
boundaries, required and unchanged behavior, evidence-backed contracts, and remaining risks. Include
observations that would invalidate the shape or boundary. Use only the structure that makes these
clear; leave file inventories, speculative signatures, and detailed tasks to implementation.

## Decision authority and continuation

The request authorizes the activity. A shaping-only request ends with the shape, not implementation;
authorization for a prototype does not authorize the feature. When implementation is requested and
consequential choices are settled, continue into `implementing` without redundant confirmation.

**Agreement can settle the next step without fixing the final design.** Distinguish binding
requirements from working choices and experiments by their intent and context. Preserve that
distinction when summarizing the work; do not turn a trial into a permanent requirement.

Working decisions guide authorized work until revised. Bring forward a worthwhile alternative or
newly understood tradeoff without waiting for the current design to fail. Proposing reconsideration
is not permission to implement a consequential departure. Ask before making that departure, and
pause the affected work only when progress depends on the decision. Local details remain
implementation judgment.

For example: “Expiry behavior is settled; responsibility for it is not. Both options satisfy the
expired-link scenario. Keeping the rule in the existing owner avoids caller coordination; moving
it changes the agreed boundary…” Make that decision visible, rather than filling an option quota
or treating the recommendation as approval.

Keep the result in the conversation unless a file is requested. A brief preserves uncertainty;
it is neither an exhaustive task list nor permission to expand the work.
