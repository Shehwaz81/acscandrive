---
name: street-reservations
description: "Rules for street claims on the collection map (owner decisions 2026-09-30): pick-your-name identity on trust, one claimer per street, no dates, claimer-only delete, public 'First L. (HR)', and known limits. Use when building or changing the collection map, street claims/reservations, or their database rules."
---

# Street claims (collection map)

Moved from CLAUDE.md so it loads only when this work comes up. The prohibitions that must always apply are still in CLAUDE.md. Built as described in `docs/architecture.md` → Collection map → Street claims (`lib/claims.ts`, `lib/claims.server.ts`, `app/api/claims/route.ts`, `components/home/collection-map.tsx`, table `public.street_claims`).

## Owner decisions (2026-09-30)

These replace the earlier open items (predefined segments, planned dates, Toronto-date expiry, private edit credentials) for now.

- **Area:** a whole street in Essex County, Ontario, not a highway, identified by its Google place ID (`checkCollectionStreet()` in `lib/collection-area.ts`). No predefined segments.
- **Identity (updated 2026-09-30, runs on community and user trust):** the student types part of their name and **picks themselves** from a server-side suggestion list (`GET /api/claims/students?q=`, 2+ letters, at most 8 results). Suggestions show only "First L." and homeroom and carry a sealed ref (AES-GCM of the student id, `lib/claims-ref.ts`); ids and surnames never reach the browser. No homeroom field. Nothing proves the picker is that student, by the owner's choice.
- **Public display:** the claimer is "First L. (homeroom)". No student IDs, surnames or other roster fields leave the server.
- **Rules:** one claimer per street (unique `place_id`); a student may claim any number of streets; **no dates** (a claim lasts the whole drive); **no editing**. The claiming student deletes by picking their own name; organizers delete in the SQL editor. Delete removes the row.
- **Retries:** the same student re-claiming the same street is a 200 with the existing claim (idempotent); a different student gets 409 with the public claimer. A repeated delete of a gone claim is 200. A delete by anyone else is 403 with one generic message.

## Known limits (accepted; don't build around them without a new owner decision)

- Anyone can pick any student's name, so anyone can claim or delete in a classmate's name. Organizers fix it in SQL.
- The public name search lets someone list the roster as "First L. (homeroom)" by trying letter pairs.
- The server trusts the browser's `placeId`, `address` and coordinates (it only checks the coordinates are inside the Essex County rectangle). A server-side Places check would need a server key. Follow-up.
- No rate limiting, CAPTCHA or spam protection.
- Deleted claims leave no history.

## If the rules change

- If dates return: store a local date, enforce the conflict rule atomically in the database (including simultaneous requests), and expire by `America/Toronto` date. Expiry is not evidence of completed collection or earned service hours.
- If anonymous editing or cancellation must resist impersonation: use an unguessable private edit credential; knowing a public ID or a name is not enough.
- Test concurrent conflicts, retries and unauthorized deletes against Postgres, not only with mocks.
