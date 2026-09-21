# Agent Prompts Administration (Frontend)

## Summary

Admin users edit AI agent system prompts (Simone, Olivia, Ellis, etc.), export/import prompt bundles, and configure the Simone API key via the profile admin UI.

## Scope

**In scope:** AgentPrompts admin page, prompt template context, assistant admin API client.

**Out of scope:** Methodology admin UI, runtime chat, backend prompt storage.

## Primary responsibilities

- Render editable agent prompt forms for each agent type.
- Sync prompt changes to backend via admin API.
- Support export/import of prompt bundles for migration.
- Manage Simone API key display and update (super admin).

## Dependencies

- user-auth with admin role.
- Backend `/api/assistant/agent/*` and `/simone/key`.

## How to navigate the code

- Page: `src/Pages/usertokendetails/AgentPrompts.jsx`
- Context: `src/contexts/PromptTemplateContext.js`
- API: `src/api/assistant.js`

## Open questions / gaps

- Agent prompts page lives under user profile admin tabs alongside methodology admin.
