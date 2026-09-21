# Olivia Scene Design (Frontend)

## Summary

In the Book Editor, writers view and edit per-scene **Scene Design** coaching from Olivia. Shown in the sidebar as "Scene Design." Supports triggering batch scene design from manuscript upload and updating individual suggestions.

## Scope

**In scope:** Scene Design tab in Book Editor, suggestion display and edit UI, API calls for Olivia scene suggestions.

**Out of scope:** Olivia editor/scene chat, layering workflow, backend Olivia scenes pipeline.

## Primary responsibilities

- Display OliviaSceneSuggestion content per scene in the editor sidebar.
- Allow writers to update scene suggestion content inline.
- Trigger manuscript-based scene design generation from editor flows.

## Dependencies

- novel-management and bookGeneration API client.
- Backend `/api/novel/olivia/scenes` and `/olivia/suggestions/:novelId`.

## How to navigate the code

- Page: `src/Pages/BookEditor/SidebarTabs.jsx`, `BookEditorPage.jsx`
- API: `src/api/bookGeneration.js`

## Open questions / gaps

- Scene Design tab shares sidebar infrastructure with characters and notes panels.
