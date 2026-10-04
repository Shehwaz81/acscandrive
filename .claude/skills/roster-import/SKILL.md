---
name: roster-import
description: "Rules for importing or re-importing the student roster CSV: file format, homeroom values, internal IDs, reconciliation, and validation. Use when writing or running any roster import, seeding students, or matching roster rows to existing students."
---

# Roster import

Moved from CLAUDE.md so it loads only when this work comes up. The prohibitions that must always apply are still in CLAUDE.md.

- Supplied CSV: `Can Drive 2026 2027.xlsx - All Students.csv`; 1,113 student rows with headers `Last Name`, `First Name`, `Grade`, `HR`, `HR Teacher`.
- Homerooms are text, including values such as `P13(B)`, `UW`, and `Office`. Preserve meaningful source values; do not assume numeric rooms or one teacher per homeroom.
- The supplied roster has no stable school student ID. Generate internal IDs on initial import and preserve them. A repeated import must have an explicit matching/reconciliation strategy; never blindly append or recreate students with donation history.
- Validate headers, required values, grade range (9–12), row counts, and suspected duplicates before import. Duplicate names may represent different students.
- Use synthetic students in committed fixtures, screenshots, and tests. Keep the real roster and identifiable donation records out of public repositories and logs.
- Staff share the table: homeroom `Teachers`, `grade` NULL, added by hand from the staff list (2026-10-04). A student roster import must leave those rows alone, and the 9–12 grade check applies to students only.
