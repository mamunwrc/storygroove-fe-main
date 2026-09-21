# Story AI Generation (Frontend)

## Summary

UI flows for AI-powered story generation, novel review, character development, and creating novels from Olivia chat responses. Used during book idea setup and early drafting workflows.

## Scope

**In scope:** Book generation wizard components, generation API client, character development UI.

**Out of scope:** Ellis/Olivia review UIs, agent chat threads, backend OpenAI integration.

## Primary responsibilities

- Present story blueprint and character development steps.
- Call backend generate/review/character endpoints via API modules.
- Surface loading states and generated content in book creation flows.
- Support creating a novel from an Olivia agent conversation response.

## Dependencies

- subscriptions-billing (subscription required modal).
- novel-management API client.
- Backend `/api/novel/generate`, `/review`, `/character`, `/create-from-olivia`.

## How to navigate the code

- Components: `src/component/bookGeneration/`
- API: `src/api/generation.js`, `src/api/bookGeneration.js`
- Used from: `src/Pages/BookIdea/`, `src/Pages/BookDetails/`, dashboard create flows

## Open questions / gaps

- Generation UI is split across book idea, details, and dashboard modals.
