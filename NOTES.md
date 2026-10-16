# Notes

## Assumptions and rules I chose
- **Money** is stored as integer pesewas (1 GHS = 100 pesewas). Amounts are parsed
  from strings with a regex, never through floating point, so `0.10 + 0.20` is exactly `0.30`.
  Amounts must be positive and have at most 2 decimal places (`10.001`, `1e3`, `-5` are rejected).
- **Member names** are trimmed, must be non-empty, and are unique case-insensitively
  (`Ama` and `ama` are the same person). Lookups are case-insensitive too.
- **Joining late is not allowed:** members can only be added before any contribution
  in week 1. A late joiner would break the equal-contribution / one-payout-each fairness.
- **Payments are only accepted for the current week.** Paying ahead or back-paying a
  closed week is rejected (a closed week by definition had everyone paid in full).
- **Overpayment:** a payment larger than the remaining amount owed for the week is rejected
  with the amount still owed; paying anything once paid in full is rejected.
- **Closing a week** needs at least 2 members (a 1-person susu is pointless). If anyone
  owes, nothing changes and every debtor is listed. A failed close is not an error (exit 0);
  it is a normal outcome.
- **Pot** = weekly amount × number of members.
- **End of cycle:** after every member has received the pot once, the group is complete;
  further payments and closes are rejected. The report shows the full history.
- **One group per state file.** `create` refuses to overwrite unless `--force` is given.

## Design decisions
- Domain logic (`group.js`) is pure and has no I/O, so it is easy to test; the CLI is a thin
  wrapper and `run()` returns strings so it can be tested without spawning processes.
- Custom error classes let the CLI tell rule violations (friendly message, exit 1) apart
  from real bugs (stack trace).
- No dependencies: built-in `node:test`, `node:assert`, `node:fs`.
- State is written to a temp file then renamed, so a crash cannot leave half-written JSON.

## What I would improve with more time
- Multiple cycles / restarting a finished group, and multiple groups.
- Paying in advance or handling defaults (fines, skipping a member, swapping payout order).
- Audit log of every individual payment with timestamps, not just per-week totals.
- File locking for concurrent use, and schema validation/versioning of the state file.
- A small HTTP API on top of the same domain model.
