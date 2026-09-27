---
name: query-investigation
description: Retrieves a concrete slow database query and traces it to the application operation. Use when a slow-query report lacks representative execution context.
---

# Query investigation

Obtain the query, bound parameters with sensitive values removed, database version,
code revision, representative workload, and available plan. Trace application
callers to establish the intended result and why the query runs. Distinguish
observations from hypotheses. Keep production queries read-only and authorized.
Supply that evidence to a query-plan reviewer when interpretation needs one.
