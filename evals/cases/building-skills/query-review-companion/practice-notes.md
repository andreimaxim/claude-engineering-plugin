# Query-plan review practice

The input is a concrete slow query, its application purpose, the database/version,
representative parameter values, and any available plan. The query-investigation
skill already retrieves these and traces relevant application code.

Our review should distinguish an estimator mistake from work that is genuinely
large. Estimated rows are predictions; actual rows require execution evidence.
Compare proposed changes against the same query purpose and representative data.
An index suggestion is a hypothesis, not proof of a speedup or unchanged results.

A small example worth retaining: an estimate of 12 rows versus 18,000 actual rows
points at a different question from an accurate estimate of 18,000 expensive rows.
The numbers illustrate a distinction, not a threshold or an index recommendation.

Use the database's existing plan tools. EXPLAIN and EXPLAIN ANALYZE do not have the
same execution consequences. Production execution needs explicit permission;
rehearsal uses disposable data. Name remaining uncertainty and a bounded experiment
when the available evidence cannot settle it. Leave fixes as proposals unless
implementation was requested. No universal latency target or review schedule exists.
