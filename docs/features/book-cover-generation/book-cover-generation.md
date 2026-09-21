# Book Cover Generation (Frontend)

## Summary

Writers open the Book Cover modal from the Book Editor or Upload Manuscript viewer to chat with Olivia about cover direction, generate versioned cover images, browse the gallery, and set an active cover.

## Scope

**In scope:** BookCoverModal workspace, cover session/chat/render/activate API calls, quota display, gallery UI.

## How to navigate the code

- `src/component/BookCoverModal/BookCoverModal.jsx` — main workspace
- `src/component/BookCoverModal/BookCoverGallery.jsx` — version thumbnails
- `src/component/BookCoverModal/BookCoverChatPanel.jsx` — Olivia chat
- `src/api/bookGeneration.js` — `getCoverSession`, `sendCoverChat`, `renderBookCover`, `getCoverVersions`
