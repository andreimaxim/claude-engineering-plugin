# Migration rehearsal practice

The main agent owns an agreed data migration through verification and supported
corrections. This practice is for substantial transformations whose preservation,
interruption, or rollout behavior is uncertain, not every routine schema edit.

Use a disposable, representative dataset with asymmetric values and boundary
cases. Before changing the implementation, add characterization tests for the old
observable contract and run them successfully on the old implementation. Tests
first written against the replacement cannot establish what the old code did.
Intentional changes need separate expected outcomes.

Choose a small end-to-end rehearsal that exposes the expensive uncertainty. A
record count is not proof of field preservation. Check ordering only where it is a
contract. A restarted migration and a repeated complete migration can have different
requirements: investigate resumability and idempotency where they matter.

An independent senior reviewer should receive the intended behavior, constraints,
actual patch, surrounding code, and verification evidence without the author's
conversation. The main agent assesses findings, obtains missing evidence, and
incorporates supported corrections. If no independent reviewer is available, say
that requirement is unmet; do not rename self-review as independent review.

Local rehearsal does not authorize production writes or deployment. Escalate a
contradiction in an agreed consequential contract, not each reversible local detail.
No particular agent host, database product, report template, file count, rollout
deadline, or fixed batch size is prescribed.
