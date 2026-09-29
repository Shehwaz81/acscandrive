# Derived totals, and turning database errors into HTTP answers

Two ideas from connecting donation logs to the database.

## 1. Compute totals from rows; don't store them

A student's total could be kept two ways:

- **Stored counter.** A `total_cans` column on the student, bumped on every save.
- **Derived.** No total anywhere. Each time someone asks, add up that student's donation rows.

The counter looks cheaper, but it's a second copy of the same fact, and copies drift:

- An edit has to change the log *and* adjust the counter by the difference. Miss one code path, or have one of the two writes fail, and they disagree forever.
- Two volunteers saving at once both read 40, both write 40 + their amount, and one addition is lost (a *lost update*), unless every write takes care with locking.
- Once they disagree, nothing says which one is right.

A derived total has one source of truth: the rows. Edit a row and every total that includes it is correct on the next read, with no extra code. This is the same idea as *normalization* in database design: store each fact once and compute the rest.

The cost is doing the arithmetic on every read. For this app that's summing a handful of rows per student, which is nothing. Where it does get expensive (millions of rows, a busy dashboard), the usual next steps are a database **view** or an index, and only then a cached or *materialized* copy that is rebuilt from the rows, never edited by hand. The rows stay the truth; the copy is just a speed-up you can throw away.

## 2. Database errors are answers, not just failures

When an insert fails, Postgres says why with a five-character **SQLSTATE** code. A few matter here:

| Code | Name | Meaning here | HTTP answer |
| --- | --- | --- | --- |
| `23505` | unique_violation | This submission id is already saved | Look at the saved row: same donation → 200 (a retry); different → **409 Conflict** |
| `23503` | foreign_key_violation | The student id doesn't exist | **400 Bad Request** |
| `23514` | check_violation | Amount is zero, negative, or in the wrong column | 400 (the server's own check normally catches it first) |
| anything else | | Database down, bug | **502**, and log it on the server |

The status code tells the browser what to do next. `400` means "fix the request; retrying won't help". `409` means "this conflicts with something that already exists". `5xx` means "our side failed; trying again may work". Collapsing everything into "error" would make a retryable network blip look the same as a bad amount.

Note the order of defences. The server validates the request body first, because it can give a clear message and skip a pointless round trip. The database constraint is still there, because it is the only check that holds for *every* writer: a future script, the SQL editor, or a bug in the server's validation. Validation in the application is for good error messages; constraints in the database are for correctness.

Finally, `23505` is how the "create once" rule survives a race. If five identical saves arrive at the same instant, the database lets exactly one insert win and the other four get `23505`. The server doesn't need a lock or an "is it there yet?" check first, which would itself be racy (two requests can both check, both see nothing, and both insert). Let the uniqueness constraint decide, then handle its answer.
