# Ellis Scene Review (Frontend)

## Summary

Surfaces Ellis per-scene structural and character feedback in the Book Editor and Final Draft review pages. Writers trigger manuscript review uploads and view stored review results per scene.

## Scope

**In scope:** Ellis review display in Book Editor and FinalDriftPage, review API calls via bookGeneration client.

**Out of scope:** Olivia scene design, backend Ellis pipeline, general novel review UI.

## Primary responsibilities

- Trigger Ellis manuscript review from editor/final draft flows.
- Fetch and display per-scene Ellis reviews in outline context.
- Present structure, character, and suggestion feedback to writers.

## Dependencies

- novel-management API client.
- Backend `/api/novel/ellis/review` and `/ellis/reviews/:novelId`.

## How to navigate the code

- Pages: `src/Pages/FinalDrift/`, `src/Pages/BookEditor/`
- API: `src/api/bookGeneration.js`
- Route: `/dashboard/finaldraft/:id`

## Open questions / gaps

- UI labeling may vary between Book Editor sidebar and Final Draft page.
