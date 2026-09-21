# Olivia Writing Studio (Frontend)

## Summary

In the Book Editor, writers interact with Olivia through editor chat, scene-by-scene chat modal, scene layering, rich scene generation (including streaming), and blurb/synopsis generation. This is the primary interactive Olivia writing UI.

## Scope

**In scope:** OliviaChatModal, editor chat panel, layering parse utilities, rich scene generation UI, blurb/synopsis triggers in BookEditorPage.

**Out of scope:** Batch scene design tab (olivia-scene-design), Simone agent chat (ai-agent-chat), backend memory pipeline.

## Primary responsibilities

- Stream and display Olivia responses in editor and scene modal.
- Parse layering directives and show next-target scene UI.
- Trigger rich scene generation and insert results into outline.
- Persist chat history display and saved scene output via API.

## Dependencies

- novel-management API client.
- book-editor page shell and NovelContext.
- Backend Olivia chat, layering, and rich-scene endpoints.

## How to navigate the code

- Page: `src/Pages/BookEditor/BookEditorPage.jsx`
- Modal: `src/component/OliviaChatModal/`
- Utils: `src/Pages/BookEditor/oliviaLayeringParse.js`
- API: `src/api/bookGeneration.js`

## Open questions / gaps

- Checkpoint rollback UI depends on backend feature flags.
