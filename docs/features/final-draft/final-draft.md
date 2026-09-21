# Final Draft Review

## Summary

After drafting, writers use the Final Draft page to review their manuscript with Ellis feedback, navigate a review-oriented outline, and finalize the draft before export or completion.

## Scope

**In scope:** FinalDriftPage UI, review outline sidebar, Ellis review display, finalize draft confirmation.

**Out of scope:** Full book editor writing flow, Olivia scene design editing.

## Primary responsibilities

- Present read/review-focused view of novel content.
- Surface Ellis scene reviews in outline context.
- Support draft finalization workflow.

## Dependencies

- ellis-scene-review and novel-management APIs.
- FinalizeDraftConfirmationModal component.

## How to navigate the code

- Page: `src/Pages/FinalDrift/FinalDriftPage.jsx`
- Sidebar: `ReviewOutlineSidebar.jsx`
- Modal: `src/component/Modal/FinalizeDraftConfirmationModal.jsx`
- Route: `/dashboard/finaldraft/:id`

## Open questions / gaps

- Route slug uses `finaldraft` while folder is named `FinalDrift`.
