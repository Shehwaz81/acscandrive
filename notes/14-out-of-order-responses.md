# Requests that finish out of order

## The race

A page asks the server for something, the user changes their mind, and the page asks for something else. Now two requests are in flight. Nothing guarantees they come back in the order they were sent: the first one might hit a slow database query, a cold server or a congested network.

Grade Wars is a simple example. The visitor is looking at Friday and clicks Monday:

```
t=0ms    request Friday's ranking   ───────────────────────────────┐ (slow)
t=50ms   click Monday → request Monday's ranking ─────┐            │
t=200ms                          Monday arrives → show Monday      │
t=600ms                                     Friday arrives → show Friday ✗
```

If every response simply replaces what's on screen, the page ends up showing **Friday's numbers under Monday's heading**. Nothing crashed and no error was logged, but the page is wrong. This bug is hard to spot in development, because a local server answers every request in about the same few milliseconds.

It's the same class of problem as a race condition between threads: two operations share one piece of state (what's on screen), and the result depends on timing you don't control.

## The fix: only accept an answer to the current question

Label each request with what it was asking for, and when a response arrives, check whether that's still the question:

1. **Cancel on change.** When the selected day changes, mark the old request as abandoned. When its response arrives later, it's dropped. (The hook does this with a `cancelled` flag in the effect's cleanup.)
2. **Stamp the result.** Store the response together with the key it answers (`"2026-10-19#0"`: the day plus the retry attempt). The page only shows a result whose stamp equals the current key; anything else counts as "still loading".
3. **Check the payload too.** The response carries its own `day.id`, and the hook ignores it if that doesn't match the selected day. This is cheap insurance against a mix-up further down.

Stamping also makes **retry** simple: bump the attempt number and the old error no longer matches the key, so the page shows "loading" and asks again.

## Why not just disable the controls while loading?

You could stop the user from clicking while a request is pending. But that makes the page feel stuck on a slow connection, and it doesn't cover requests the user didn't trigger, such as a background refresh landing on top of a newer one. Accepting only matching answers is correct whatever the timing, and it keeps the controls usable.

## Related ideas

- **Aborting.** Browsers can cancel an HTTP request outright (`AbortController`). That saves bandwidth, but you still need the "is this still the question?" check, because a response can already be on its way when you abort.
- **Latest-wins vs. queueing.** For reads, the latest request wins and older answers are thrown away. Writes are different: a save can't simply be discarded because another one started. That's why saves use a submission id and idempotency instead (see [note 08](08-idempotency-and-interfaces.md)).
- **Testing it.** Make the first response deliberately slow, switch days, let the fast one land, then release the slow one and check the page didn't change. The Grade Wars component tests do exactly this with a promise the test resolves by hand.
