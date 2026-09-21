/**
 * Fallback catalog used by the Activity Log dashboard before facets are
 * fetched from the API. The server is the source of truth — these values
 * exist so the UI dropdowns are usable on first paint and during failures.
 */

export const ACTIVITY_MODULES = [
  "auth",
  "user",
  "novel",
  "chat",
  "assistant",
  "stripe",
  "apiUsage",
];

export const ACTIVITY_ACTIONS = [
  "create",
  "update",
  "delete",
  "login",
  "logout",
  "request_rejected",
  "warning_80_pct",
];

export const ACTIVITY_SOURCES = [
  "api",
  "model_middleware",
  "dashboard_projects_list",
  "system",
];
