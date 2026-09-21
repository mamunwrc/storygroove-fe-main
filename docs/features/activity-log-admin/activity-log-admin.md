# Activity Log Administration (Frontend)

## Summary

Super admins view a searchable, paginated activity log of significant user and system events via the ActivityLogDashboard.

## Scope

**In scope:** ActivityLogDashboard page, activity logs API client, SuperAdminGuard route.

**Out of scope:** Backend event emission, API usage metrics dashboard.

## Primary responsibilities

- Fetch and display paginated activity log entries.
- Support filtering/search in the dashboard UI.
- Restrict access to super-admin users only.

## Dependencies

- user-auth with super-admin role.
- Backend `/api/admin/activity-logs`.

## How to navigate the code

- Page: `src/Pages/ActivityLogDashboard/ActivityLogDashboard.jsx`
- Guard: `src/component/guards/SuperAdminGuard.jsx`
- API: `src/api/activityLogs.js`
- Route: `/dashboard/admin/activity-logs` in `src/App.js`

## Open questions / gaps

- Event emission coverage varies by feature; not all user actions appear in the log.
