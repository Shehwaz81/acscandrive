# Idempotent writes and interfaces as seams

Two ideas behind the volunteer workspace. Neither is specific to this app or framework.

## 1. The duplicate-save problem

A volunteer presses Save. The browser sends "add 12 cans for Maya" to the server, and one of three things happens:

1. The request never arrives. Nothing is written.
2. The request arrives, the row is written, and the reply comes back. Success.
3. The request arrives and the row is written, but **the reply is lost** (Wi-Fi drops, a timeout fires). The browser sees an error.

Cases 1 and 3 look identical from the browser. In both, the volunteer sees "not saved" and presses Save again. In case 3 that creates a second, duplicate donation.

Disabling the button while saving stops a double *click*, but it does nothing for case 3: the first request has finished, from the browser's point of view, and failed.

### The fix: an idempotency key

An operation is **idempotent** if doing it twice has the same effect as doing it once. "Set the total to 46" is idempotent; "add 12" is not. Make the "add" idempotent by giving it a name:

1. When the volunteer starts an entry, the browser generates a random UUID, the **submission id**.
2. Every attempt to save *that entry* sends the same id. A new entry gets a new id.
3. The database uses the id as the row's **primary key**. A primary key is unique, so the database itself refuses a second row with the same id, no matter how many requests arrive or in what order.

On a retry after case 3, the insert collides with the existing row. The server then compares the two: same student and amount means it's a retry, so it returns the existing row as success. A different payload under the same id means something is wrong, and it's rejected rather than guessed at.

The guarantee lives in the database (a uniqueness constraint), not in the UI. UI checks are advisory; constraints hold even with two tabs, a slow network, or a buggy client. The same principle is why payment APIs (Stripe's `Idempotency-Key` header, for example) work this way.

Also note: a UUID doesn't *prevent* duplicates by itself. It's only useful because the same one is **reused** on retry and the database **enforces uniqueness** on it.

## 2. Interfaces as seams

The workspace UI never talks to a database directly. It talks to an **interface**, a list of operations with their inputs and outputs:

```
searchStudents(query) → { exact, similar }
createLog(newLog)     → savedLog
updateLog(id, patch)  → savedLog
...
```

Two things implement it:

- a **mock** that keeps data in memory, with fake delays and a switch to make the next save fail;
- a **real** implementation that calls the server, which queries Postgres.

A configuration value picks one at startup. The UI can't tell the difference.

Seams can be split further. This app has a separate one for *students* (`StudentDirectory`: search, get). That's how the app first ran the **real** roster with **in-memory** logs: the log store stayed the mock, and only the student source was swapped. Smaller seams let you connect a real backend one piece at a time; the logs were connected later without touching a single component.

Why bother:

- **Build the UI before the backend exists.** The mock is enough to design every screen state.
- **Reach states on demand.** "The save failed" is hard to produce against a real server; with the mock it's a button. That's how the failure banner and retry were tested.
- **The contract is explicit.** Whoever writes the real implementation knows exactly what each method must return, including rules like "same submission id, same payload: return the original".
- **Tests stay fast and deterministic.** They run against the mock with zero latency.

The word **seam** (from Michael Feathers) means a place where you can swap behaviour without editing the code on either side. The interface is the seam. Keep it narrow and phrased in the UI's terms (`cashCents`, `homeroom`), and let the implementation translate to storage terms (`amount_cents`, `hr`). Then a schema change touches one file, not every component.

Grade Wars (the daily grade ranking) uses the same seam from the other direction. It was built **UI-first**: a `GradeWarsRepository` interface, a mock with the demo figures and URL switches to force loading, error and "in progress", and a real implementation that is only a **stub** whose methods throw "Not implemented". The stub isn't useless: it pins down the contract (the method names and return types) and carries a comment describing the data it will need. Whoever builds the backend implements two methods, and no component changes.

The cost: the mock can drift from reality. Where the rule matters, such as the idempotent create, the mock implements it for real and has tests, so the real implementation had a reference to match. The real one was then checked against the actual database: a reply dropped on purpose after the row was written, then a retry, left exactly one row.
