# One table, two kinds of row

The app was built for students. Then staff needed to donate too. This note is about the general question behind that change: when a second kind of thing shows up, where does it go?

## The three usual answers

1. **A second table** (`staff`, next to `students`). Each table has exactly the columns its kind needs. But everything that points at a person now has two possible targets: a donation row needs either a `student_id` or a `staff_id`, every total has to read both tables, and every query that ranks people has to merge them. The cost is paid in every feature, forever.
2. **One table plus a type column** (`kind = 'student' | 'staff'`). One target for foreign keys, one place to sum from. The cost is that some columns only make sense for one kind, so they must be allowed to be empty.
3. **One table, and let an existing column tell the kinds apart.** The same as 2, but without adding a column, when the data already carries the difference.

Which one is right depends on how alike the two kinds are *in the ways the app uses them*. Here a staff member is found by name, credited with cans or cash, summed and ranked: exactly what happens to a student. The only difference is that staff have no grade. That is one column, so a second table would duplicate a great deal to model very little. This project uses answer 3: staff are rows in the same table, in one homeroom, with no grade.

The rule of thumb: split tables when the kinds have different *relationships and behaviour*; keep one table when they differ by a column or two.

## NULL means "does not apply"

Staff have no grade. There are two ways to store that:

- **A made-up value** such as `0` or `99` (a *sentinel*). It fits the column's type, so nothing complains. That is the problem: arithmetic and comparisons treat it as a real grade. Sort by grade and the staff land first; average the grades and the answer is wrong; print it and someone is in "Grade 0".
- **NULL**, the database's own word for "no value here". It can't be mistaken for a grade, because every comparison with NULL is neither true nor false but *unknown*, and code that reads it is forced to decide what to show instead.

NULL is the honest choice, and the type system then carries the honesty into the application: the field's type becomes "a grade, or nothing", and the compiler points at every place that assumed a grade always exists. Each of those places has to answer "what do we show for someone without one?" That list of compile errors is the real to-do list of the change.

## A constraint that keeps the two facts in step

Allowing NULL opens a door: now a *student* could be saved without a grade by mistake. Two facts must always agree ("has no grade" and "is in the staff homeroom"), and nothing yet says so.

A **check constraint** is a rule the database tests on every insert and update, refusing the write if it is false. This one compares two yes/no answers and demands they match:

```sql
check ((grade is null) = (hr = 'Teachers'))
```

Read it as "the grade is missing *exactly when* the homeroom is the staff one". All four combinations:

| grade | homeroom | allowed? |
| --- | --- | --- |
| 10 | 10A | yes: a student |
| missing | Teachers | yes: staff |
| missing | 10A | no: a student must have a grade |
| 10 | Teachers | no: staff have none |

Why put the rule in the database when the app could check it? Because the app is not the only writer. Rows also arrive through imports and the SQL editor, and a rule that lives in one program protects only what passes through that program. A constraint protects the table itself, whoever writes to it.

One subtlety: a check constraint passes when its expression is true **or unknown**. That is why the older rule `grade between 9 and 12` keeps working untouched. For a staff row, `NULL between 9 and 12` is unknown, so the row passes it, and the new constraint is what decides whether a missing grade is acceptable.

## Adding a rule to a table that already has rows

When a constraint is added, the database checks every existing row against it, and the change fails if any row breaks the rule. So the order matters:

1. Loosen first (allow the grade to be missing).
2. Add the new rule. Every existing row has a grade and is not in the staff homeroom, so all of them pass.
3. Insert the new rows, which the rule now permits.

It is worth counting the rows that would break a rule *before* adding it. Zero means the migration will succeed; anything else is data to fix first, not a reason to weaken the rule.

## What "the same as a student" quietly includes

Reusing the table means staff inherit everything that reads it, wanted or not. Each consequence is a decision, and the cheap default (do nothing) is only right if someone chose it:

- **Totals.** Their donations count toward the school total, and their homeroom ranks among the others.
- **Per-grade figures.** Anything grouped by grade leaves them out, because they have none.
- **Rewards.** Rules written for students would have applied to staff automatically. Nobody had decided staff earn them, so those sections are hidden for a row with no grade.
- **Public pages.** Anywhere students can be searched, staff now can be too.

The general lesson: a shared table gives you shared behaviour for free, so list what "free" includes and confirm each item, instead of discovering it later.

## Schema in the repository, people out of it

A migration is code: it is committed, reviewed and public if the repository is. The *shape* of the data (allow a missing grade, add a rule) belongs there. The *contents* (real people's names) do not. So this change has two halves: a committed migration that changes the schema, and a one-off insert run directly against the database, the same way the roster was loaded. Anyone can rebuild the schema from the repository; nobody can read the staff list from it.
