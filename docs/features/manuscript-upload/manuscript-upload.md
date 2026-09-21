# Manuscript Upload and Viewer

## Summary

Writers upload an existing manuscript to create or populate a novel project, then view and edit imported content in a dedicated upload viewer parallel to the standard book editor.

## Scope

**In scope:** UploadManuscriptModal, UploadBookViewerPage, file upload components, upload-specific outline/sidebar UI.

**Out of scope:** Ellis/Olivia review flows, greenfield book editor (`/dashboard/bookeditor/:id`).

## Primary responsibilities

- Present manuscript upload modal from dashboard create flows.
- POST uploaded file to backend and navigate to upload viewer on success.
- Allow editing imported content in upload-specific editor layout.

## Dependencies

- novel-management API client.
- Backend `POST /api/novel/uploadmanuscript`.

## How to navigate the code

- Modal: `src/component/createBook/UploadManuscriptModal.jsx`
- Viewer: `src/Pages/UploadedManuscript/UploadBookViewerPage.jsx`
- Upload UI: `src/component/FileUpload/`
- Route: `/dashboard/upload/bookeditor/:id` in `src/App.js`

## Open questions / gaps

- Upload viewer shares patterns with BookEditor but is a separate page tree.
