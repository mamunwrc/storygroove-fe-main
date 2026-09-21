# Novel Management (Frontend)

## Summary

React state and API client layer for novel CRUD, scenes, notes, characters, user content, master prompt, story bible, and manuscript download. Shared across dashboard, book editor, and upload viewer flows.

## Scope

**In scope:** `bookGeneration` API module, `NovelContext`, novel/scene/character/notes client calls, including manual Add Character in the Book Editor.

**Out of scope:** AI generation UI (story-ai-generation), Olivia/Ellis panels (separate features), backend persistence logic.

## Primary responsibilities

- Fetch and cache novel details, scenes, characters, and notes.
- Add characters manually with a seeded 17-point dossier (`createManualCharacter`); multiple protagonists/antagonists allowed.
- Provide API helpers for scene CRUD, reorder, rename, and user content save.
- Share novel state across editor and dashboard via `NovelContext`.
- Trigger manuscript download and novel completion from UI actions.

## Dependencies

- user-auth for authenticated requests.
- Backend `/api/novel` endpoints.

## How to navigate the code

- API: `src/api/bookGeneration.js`
- Context: `src/contexts/NovelContext.js`
- Consumers: `src/Pages/BookEditor/`, `src/Pages/Dashboard/`, `src/Pages/UploadedManuscript/`

## Open questions / gaps

- NovelContext scope is app-wide; not all pages require full novel state.
