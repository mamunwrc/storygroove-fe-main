# Methodology Administration (Frontend)

## Summary

Admin users configure Olivia's methodology layer—rules, prompt templates, and genre overlays—via a dedicated admin page with audit, export, and import actions.

## Scope

**In scope:** MethodologyAdmin page, CRUD forms for rules/templates/overlays, bundle export/import UI.

**Out of scope:** Agent persona prompts (agent-prompts-admin), runtime Olivia context assembly.

## Primary responsibilities

- Present methodology rules, templates, and genre overlay editors.
- Call backend methodology admin CRUD endpoints.
- Trigger audit, export, and import of methodology bundles.

## Dependencies

- user-auth with admin role.
- Backend `/api/assistant/methodology/*`.

## How to navigate the code

- Page: `src/Pages/usertokendetails/MethodologyAdmin.jsx`
- API: `src/api/assistant.js`

## Open questions / gaps

- Methodology audit displays results but does not auto-fix inconsistencies.
