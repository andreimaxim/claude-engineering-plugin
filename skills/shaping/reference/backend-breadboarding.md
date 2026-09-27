# Backend breadboarding

Reconstructed from the surviving shaping discussion and Shape Up's breadboarding technique, not
recovered from the original reference file. The export scenario is an illustration, not evidence
about the current system or a prescribed architecture.

Read this before choosing how to show a backend interaction. Follow the initiating person or
system through to a useful, observable outcome. A request and response may cover only one step.
If an API is the product, use its consumer's workflow; do not invent a UI. Showing the surrounding
interaction does not bring all of it into implementation scope.

## Breadboard from the consumer's point of view

Suppose a client needs a file containing selected records, but preparing it takes too long to keep
one request open. One candidate accepts an export request and lets the client retrieve the result
later. These are assumptions for this example, not a diagnosis of other export systems.

The key distinction is **accepted is not completed**. A response saying the request was accepted
does not yet give the consumer the report it needs.

In this interaction, the breadboard's vocabulary maps to what the client can observe and use:

- **Places:** client-visible resources and states, such as a preparing export, a ready export, or
  a failed export.
- **Affordances:** submitting a selection of records, checking status, reading the result, and
  retrieving the file when it is available.
- **Connections:** how those actions and the background work let the client reach the next step.
  Checking status reveals progress; it does not itself cause the export to become ready.

Walking through the candidate raises interaction questions before implementation details: what
happens if the client loses the initial response and its export identifier? How long can it
retrieve the file? Would notification fit the consumer better than repeated status checks? Explore
these choices before fixing endpoint paths, JSON fields, or a queue design.

## A compact flow shows the whole interaction

```diagram
┌──────────────────┐   request  ┌───────────────────┐
│ Client submits   │───────────▶│ Export preparing  │
│ record selection │◀───────────│                   │
└──────────────────┘ identifier └─────────┬─────────┘
                                          │ background preparation
                                 ┌────────┴────────┐
                                 ▼                 ▼
                           ┌───────────┐     ┌───────────┐
                           │ Ready     │     │ Failed    │
                           │ file link │     │ reason    │
                           └─────┬─────┘     └───────────┘
                                 │ client retrieves
                                 ▼
                           ┌───────────┐
                           │ File      │
                           └───────────┘
```

After receiving the identifier, the client can check status and observe preparing, ready, or
failed. Only background preparation changes preparing into ready or failed. The file link becomes
available when ready; the failure outcome tells the client that waiting will not produce a file.
The state labels are provisional, not a wire-format specification.

This exposes more than "API calls a job." It shows how acceptance leads to something the client
can actually use and where the path can stop. It also raises a feasibility question: can accepted
work be lost between accepting the request and beginning preparation? Investigate that handoff
before calling this candidate solved; drawing the arrow does not prove it works.

## Use another representation when it clarifies the question

Choose a representation, rather than producing all of these for every idea.

**A call tree** helps when the question is which action initiates which responsibility. Label
asynchronous boundaries so nesting does not imply that the original request waits for everything:

- Client submits a selection.
  - Accept the export and return an identifier with a way to check it.
- Background preparation, later and independently of status checks:
  - Prepare the file.
  - Make the result retrievable, or expose a failed outcome.
- Client checks the export.
  - Observe its current state and available next action.
- Client retrieves the ready file.

These are domain actions, not proposed functions or classes. A call tree that stops at scheduling
work still omits the result the consumer needs.

**Pseudocode** helps when a branch is the important part. For example, the status interaction can
be expressed as: if preparation continues, tell the client to check later; if it has failed, report
failure; if the file is ready, provide a way to retrieve it. Keep this at the behavior level unless
an exact technical contract is necessary to resolve a risk.

**A diff** helps when the reader already understands the baseline. A conceptual before/after for
this candidate would be:

- Before: the request waits for preparation and returns the file.
- After: the request returns an export identifier; the client observes preparation separately and
  retrieves the file when ready.

An actual code diff can show a small change to a known interaction, but it should not bury the
consumer's journey under implementation details or imply that the feature is ready to build.

## Keep the open questions visible

Missing-response recovery, result retention, and notification versus polling are choices to
explore, not requirements automatically inherited by every backend feature. Follow the scenarios
that could change this solution or its fit with the appetite. Preserve existing access rules and
other confirmed contracts when comparing candidates.

A small authorized experiment can settle a technical uncertainty. It does not authorize building
the whole feature or establish production readiness. Leave endpoint spelling, schema, class
structure, and infrastructure choices open unless evidence makes one necessary to close a real
rabbit hole.

Technique source: [Find the Elements](https://basecamp.com/shapeup/1.3-chapter-04).
