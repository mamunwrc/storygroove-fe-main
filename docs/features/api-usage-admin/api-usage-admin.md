# API Usage Administration (Frontend)

## Summary

Super admins monitor OpenAI API usage and costs, configure global rate limits, block/unblock users, recompute costs, and review rate-limit events via the ApiUsageDashboard.

## Scope

**In scope:** ApiUsageDashboard page and sub-panels, apiUsage API client, SuperAdminGuard route protection.

**Out of scope:** Backend usage logging, rate-limit middleware enforcement.

## Primary responsibilities

- Display usage summary stats and per-user cost tables.
- Allow super admins to block users and adjust per-user limits.
- Edit global rate-limit settings and trigger cost recompute jobs.
- Show rate-limit hit event log.

## Dependencies

- user-auth with super-admin role.
- Backend `/api/admin/usage/*`.

## How to navigate the code

- Page: `src/Pages/ApiUsageDashboard/ApiUsageDashboard.jsx`
- Components: `src/Pages/ApiUsageDashboard/components/`
- Guard: `src/component/guards/SuperAdminGuard.jsx`
- API: `src/api/apiUsage.js`
- Route: `/dashboard/admin/api-usage` in `src/App.js`

## Open questions / gaps

- Cost recompute job status is polled by job ID from the dashboard.
