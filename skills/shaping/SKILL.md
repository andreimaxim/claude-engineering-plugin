---
name: shaping
description: Shapes rough, solved, bounded solutions. Use when asked to shape work or explore consequential scope, behavior, or architecture choices before implementation; not for routine coding changes.
---

# Shaping

Shaping takes a raw idea and turns it into a document that explains the problem, proposes a
solution, and sets boundaries on how much work we're willing to take on and what we're not doing.
This document is called a **pitch**.

Shaping makes the proposed work more specific and concrete, without producing a specification.
It leaves room for decisions and choices to be made later. It's more like setting the boundaries
and rules of the game while allowing it to unfold in multiple ways.

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
for risks and rabbit-holes before writing the pitch. What we learn along the way may send us back
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

In addition to setting the appetite, the problem needs to be narrowed down. The original request
should not be taken at face value. What was happening when somebody felt the need to ask for this?

- A request for permission roles was actually caused by somebody archiving a file without knowing
  it would disappear for the whole team.
- A request for adding a calendar was actually about seeing which dates were free.

If we can't tell what the specific pain point is, the appetite is useful for determining the amount
of research needed. We can stop or set the idea aside rather than manufacture a problem to solve.

"Redesign" or "refactoring" is a grab-bag, not a project. We need to figure out what it means,
where it starts, and where it ends.

Read the [dot calendar case study](reference/dot-calendar.md) for an example of narrowing a request
and fitting a solution to an appetite.

## Finding elements

The key aspect of this stage is moving fast so we can cover many ideas, with someone who has the
same background knowledge and can be frank with us as we jump between ideas. That's the model's
role here: a thinking partner, not just a recorder of the first proposed solution.

We are looking for the main elements of the solution and how they connect. We need enough detail
to play through the interaction, but not so much that we get stuck designing screens, database
schemas, or classes before we know whether the idea works.

When breadboarding, draw:

- **Places:** things you navigate to.
- **Affordances:** what the user can act on.
- **Connection lines:** how affordances take the user from place to place.

Read the [invoice autopay case study](reference/invoice-autopay.md) for an example.

For a JSON API, we can breadboard the interaction from the client's point of view. Suppose a client
needs to export records, but generating the file takes too long to keep a request open. One possible
solution is to request an export and retrieve the result later:

- The client submits its selection of records. The API returns an export identifier and a way to
  check progress.
- The client checks the export. While it's being prepared, the client can check again later.
- When the export is ready, the response gives the client a way to download it. If preparation
  fails, the response tells the client that it failed instead of leaving it waiting.

Here, the places are the client-visible resources and states, the affordances are the actions and
information available there, and the connections show how the client gets to the next step. Walking
through this raises questions: what happens if the client loses the response to its initial request?
How long can it retrieve the file? Does it really need to check progress, or would notification fit
better? We can explore these choices before fixing endpoint paths, JSON fields, or a queue design.
Read [backend breadboarding](reference/backend-breadboarding.md) for ways to show these interactions
with compact flows, call trees, pseudocode, or diffs.

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
needed; don't treat a plausible explanation as evidence. Resolve the risk, simplify the solution,
or explicitly leave the risky part out. If the core solution still depends on an unanswered
question, it isn't ready to pitch as solved.

For a difficult technical question that remains after investigation, a read-only advisory subagent
with strong reasoning and codebase-inspection capabilities can act as a technical expert. Give it
the proposed solution, the appetite, the relevant evidence, and the specific uncertainty to
challenge. Its role is to expose problems and advise, not to implement the feature or make the
decision for us.

Make clear what we're not doing and where the team should stop. Once the solution is rough,
solved, and bounded, write it up using the [pitch template](reference/pitch-template.md). The pitch
should make the work understandable to someone who wasn't part of the shaping conversation.
