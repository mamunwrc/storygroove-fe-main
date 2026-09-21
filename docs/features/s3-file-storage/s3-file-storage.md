# S3 Asset Display and Upload (Frontend)

## Summary

The frontend consumes user assets stored in S3 via backend APIs and the public `/userData/*` proxy. Profile pictures, chat attachments, and book cover images are uploaded through API endpoints and displayed using returned URLs.

## Scope

**In scope:** Profile pic upload UI, chat file upload, book cover display, image API helpers, rendering `/userData/*` asset URLs.

**Out of scope:** S3 client configuration, multer presets, backend proxy implementation (storygroove-be).

## Primary responsibilities

- Upload profile pictures via user API.
- Upload chat attachments via assistant API.
- Display book covers and profile images from backend-returned URLs.
- Load assets from `REACT_APP_BASE_URL/userData/*` paths.

## Dependencies

- Backend s3-file-storage and related upload endpoints.
- `REACT_APP_BASE_URL` env var.

## How to navigate the code

- API: `src/api/user.js`, `src/api/assistant.js`, `src/api/images.js`
- Profile upload: `src/Pages/usertokendetails/Profile.jsx`
- Chat files: `src/component/Chat/FileUploadButton.jsx`, `ChatFileMessage.jsx`
- Book covers: `src/component/BookCoverModal/BookCoverModal.jsx`

## Open questions / gaps

- Asset URLs are opaque to the frontend; bucket and proxy details live in storygroove-be.
