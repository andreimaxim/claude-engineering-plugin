---
name: shaping
description: Shapes raw ideas into rough, solved, bounded plans. Use when asked to shape or plan work, or explore consequential scope, behavior, or architecture choices before implementation; not for routine coding changes.
---

# Shaping

Shaping turns a raw idea into a plan that explains the problem, proposes a solution, and sets
boundaries on how much work we're willing to take on and what we're not doing. This workflow is
based on 37signals' Shape Up, which calls the document a **pitch**. Here, we call it a **plan**.

The plan makes the proposed work concrete enough to evaluate without becoming a detailed
specification or an exhaustive task list. It sets boundaries while leaving designers and
programmers room to make implementation decisions later.

Shaped work has three properties:

- **It's rough**, and obviously so. Everyone can see the open spaces where their contributions
  will go. Designers and programmers need room to apply their judgment and expertise.
- **It's solved**, in the sense that it's been thought through. The main elements of the solution
  are there at the macro level and there is a clear idea of what to do, without open questions or
  rabbit holes that could undermine the solution. This doesn't mean every implementation decision
  has been made.
- **It's bounded.** It indicates what not to do and tells the team where to stop.

Shaping moves through three activities: setting boundaries around the problem and how much change
we're willing to take on, finding the elements of a solution within those boundaries, and looking
for risks and rabbit-holes before writing the plan. What we learn along the way may send us back
to narrow the problem or try a different solution.

## Setting boundaries

We start with a raw idea—a user request, a Jira ticket, a GitHub issue, or an observability signal.
To set boundaries, we need an appetite and a narrow problem definition.

The appetite is a constraint on how much change we're willing to take on to solve this problem.
Are we looking for a small improvement within the way things work today, or are we willing to
rethink an existing workflow? How much additional complexity are we willing to introduce for
people using and maintaining the system? Establish this with the user, without choosing the
implementation in advance.

For example, is it enough to let someone leave a note, or is the problem worth introducing
structured information that people can validate, filter, and report on? The point isn't to choose
database columns or a text area yet. It's to distinguish a solution we're willing to take on from
one that's too much for this problem. When a promising idea exceeds that appetite, narrow the
solution or revisit the appetite explicitly rather than quietly expanding the work.

In addition to setting the appetite, narrow the problem. Do not take the original request at face
value. What was happening when somebody felt the need to ask for this?

- A request for permission roles was actually caused by somebody archiving a file without knowing
  it would disappear for the whole team.
- A request for adding a calendar was actually about seeing which dates were free.

If we can't tell what the specific pain point is, the appetite is useful for determining the amount
of research needed. We can stop or set the idea aside rather than manufacture a problem to solve.

Push back on open-ended improvement requests that name an area or activity without a single problem
or use case. Without that focus, we cannot tell which changes belong or what “done” means. Explain
this limitation and help the user identify and choose a specific problem to address. What is not
working, and in what context? Which parts of the existing design can stay the same, and which need
to change? Agree on the problem and appetite before defining the solution's elements.

When a request needs narrowing or the appropriate level of visual detail is unclear, use the
[dot calendar case study](reference/dot-calendar.md).

## Finding elements

At this stage, we move quickly through many ideas with a thinking partner who shares our background
knowledge and can give frank feedback. That's the model's role here, not just recording the first
proposed solution.

We are looking for the main elements of the solution and how they connect. We need enough detail
to play through the interaction, but not so much that we get stuck designing screens, database
schemas, or classes before we know whether the idea works.

When breadboarding, draw:

- **Places:** things you navigate to.
- **Affordances:** what the user can act on.
- **Connection lines:** how affordances take the user from place to place.

When breadboarding a user flow, use the [invoice autopay case study](reference/invoice-autopay.md)
to see how places, affordances, and connections reveal behavioral choices.

For a backend or JSON API interaction, use [backend breadboarding](reference/backend-breadboarding.md)
to follow the consumer from an initiating request to a useful outcome. It includes an asynchronous
export example and guidance on flows, call trees, pseudocode, and diffs.

When the spatial arrangement is part of the idea, use a fat-marker sketch: broad strokes that
leave out fine detail. The dot calendar is an example. The medium is less important than staying
rough enough to explore alternatives and leave room for designers and programmers.

At the end of this stage, we should be able to walk through a concrete solution. It is still an
idea to examine, not a commitment to build.

## Risks and rabbit-holes

This stage is about slowing down and looking critically at the work done so far. One approach is
to walk through a complete user journey. Additional questions to answer:

- Does this require technical work we've never done before?
- Are we making assumptions about how the parts fit together?
- Are we assuming a design solution exists?
- Is there a hard decision we could settle in advance?

Investigate the assumptions that could derail the project. Read relevant code or contracts when
needed. Don't treat a plausible explanation as evidence. Resolve the risk, simplify the solution,
or explicitly leave the risky part out. If the core solution still depends on an unanswered
question, it isn't ready to present as solved.

For a difficult technical question that remains after investigation, consult the Oracle subagent
when available. Give it the proposed solution, appetite, relevant evidence, and specific uncertainty.
Its role is to identify problems and advise, not to implement the feature or make the decision for us.

Make clear what we're not doing and where the team should stop. Once the solution is rough,
solved, and bounded, write it up using the [plan template](reference/plan-template.md). Keep
the template's structure and the agreed shape. The plan should make the work understandable
to someone who wasn't part of the shaping conversation.
