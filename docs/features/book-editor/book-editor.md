# Book Editor (Writing Studio)

## Summary

The primary writing interface where authors edit scenes in a rich text editor, navigate the outline, manage characters and notes, interact with Olivia (Scene Design, editor chat, layering), view word counts, and access book cover generation.

## Scope

**In scope:** BookEditorPage UI, outline sidebar, scene modals, sidebar tabs (characters, notes, Scene Design), Olivia chat modal, word count bar, writing studio welcome.

**Out of scope:** Backend novel APIs (see novel-management), uploaded-manuscript viewer variant.
## Primary responsibilities

- Load and autosave novel/scene content via API.
- Present act/scene outline with reorder, rename, add, delete.
- Surface Ellis/Olivia data and character/notes panels.
- Host Olivia writing studio interactions (chat, layering, rich scene).

## Dependencies

- novel-management, olivia-writing-studio, olivia-scene-design APIs.
- NovelContext, RichTextEditor component.

## How to navigate the code

- Page: `src/Pages/BookEditor/BookEditorPage.jsx`
- Supporting: `OutlineSidebar.jsx`, `SidebarTabs.jsx`, `WordCountBar.jsx`, scene modals
- Components: `richTextEditor/`, `OliviaChatModal/`, `BookCoverModal/`
- API: `src/api/bookGeneration.js`

## Open questions / gaps

- `BookEditorPage_old.jsx` is a legacy copy; primary route uses current page.
