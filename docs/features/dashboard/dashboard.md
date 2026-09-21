# Dashboard and Project Hub

## Summary

The writer home screen lists novel projects, supports creating new books or Simone threads, navigating to book idea/details/editor flows, and accessing agent personas (Simone, Olivia, Ellis).

## Scope

**In scope:** Dashboard, book idea page, book details, project list/kanban views, create book/upload modals, persona cards, navigation to editor and agent chat.

**Out of scope:** Book editor internals, subscription checkout UI details.

## Primary responsibilities

- Display user's novels and recent activity.
- Provide entry points for new projects (from idea, upload, or agent chat).
- Route users to book editor, agent chat, and book details.

## Dependencies

- novel-management backend API (storygroove-be), ai-agent-chat, user-auth.
- Dashboard components and Layout shell.

## How to navigate the code

- Pages: `src/Pages/Dashboard/`, `BookIdea/`, `BookDetails/`
- Components: `component/Dashboard/`, `createBook/`, `layout/`
- Routing: `src/App.js` (`/dashboard/*`)
- API: `bookGeneration.js`, `assistant.js`

## Open questions / gaps

- Dashboard may show both list and persona/kanban views depending on UI state.
