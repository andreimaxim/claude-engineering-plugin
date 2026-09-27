# Existing export behavior

- An authenticated workspace member requests a CSV of orders matching a filter.
- The request reads the rows in one database snapshot. Both the row set and field
  values reflect that point in the request, not a later moment.
- Orders can be edited or deleted afterward. There is no row-version history.
- Fetching the rows normally takes less than one second. CSV formatting and
  compression take up to 90 seconds; the HTTP gateway times out after 30 seconds.
- Completed files go to private object storage. The application checks the
  requesting user's identity and current workspace membership on every download.
  Other workspace members cannot download the file. A requester whose membership
  was revoked cannot download it either.
- CSV columns and filter semantics must remain unchanged.

# Existing infrastructure

- The application already has a database-backed JobRunner used by nightly reports.
- Enqueued jobs survive application restarts. Workers retry after crashes, so a
  handler can run more than once, including after its external effects succeeded.
- A worker can upload an object and crash before recording success in the database.
- Object storage supports replacing an object at a chosen key. Objects remain
  private unless the application explicitly grants access.
- Jobs can reference durable database rows. The job payload cannot retain an open
  request transaction or its database snapshot across a process restart.
- Redis is not currently deployed. No new infrastructure has been approved.

# Scope

This request is for a proposed solution, not implementation. No traffic target,
deadline, export-size policy, or new notification behavior has been agreed.
