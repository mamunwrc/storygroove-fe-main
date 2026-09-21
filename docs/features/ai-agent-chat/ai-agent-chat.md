# AI Agent Chat (Frontend)

## Summary

Subscribed writers chat with AI agents (Simone, Olivia) via threaded conversations. Supports file uploads, thread rename/pin/delete, and linking Olivia threads to Simone sessions.

## Scope

**In scope:** AIAgentChatPage, Chat components, thread management UI, chat file upload, Simone thread limit modal.

**Out of scope:** Olivia in-editor chat (olivia-writing-studio), agent prompt admin, backend Responses API integration.

## Primary responsibilities

- Render agent chat threads with message history and streaming responses.
- Create, rename, pin, and delete threads per agent.
- Upload files in chat via FileUploadButton.
- Enforce Simone thread limits with modal feedback.

## Dependencies

- subscriptions-billing (subscription required).
- user-auth for authenticated requests.
- Backend `/api/v1/chat`, `/thread`, and related endpoints.

## How to navigate the code

- Page: `src/Pages/AIAgentChat/AIAgentChatPage.jsx`
- Components: `src/component/Chat/`
- Modal: `src/component/Modal/SimoneThreadLimitModal.jsx`
- API: `src/api/assistant.js`
- Routes: `/dashboard/agent-chat/:agentId`, `/dashboard/agent-chat/:agentId/novel/:novelId`

## Open questions / gaps

- Simone thread limits are enforced in both frontend modal and backend session constants.
- The SPA streams chat and does not build OpenAI payloads. Dashboard threads still pay for **full history** on the API. Cost/scale plan: `storygroove-be/architecture/staged-ai-architecture.md`.
