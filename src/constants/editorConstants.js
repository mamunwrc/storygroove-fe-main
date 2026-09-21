/** Pause after last keystroke before auto-saving draft prose (DB only — no Olivia memory worker). */
export const DRAFT_AUTOSAVE_DEBOUNCE_MS = 800;

/** How often an idle Book Editor tab re-reads the open scene from the server. */
export const DRAFT_REMOTE_POLL_MS = 20000;

/** Per-request ceiling for a chapter HTML POST. 3s was aborting large/slow saves. */
export const DRAFT_SAVE_TIMEOUT_MS = 20000;

/** Wait before retrying a failed draft save while the editor is still dirty. */
export const DRAFT_SAVE_RETRY_MS = 2000;

/** Initial tail page when opening Olivia chat (per thread). */
export const OLIVIA_HISTORY_INITIAL_LIMIT = 50;

/** Older messages loaded per "Show earlier" request (per thread). */
export const OLIVIA_HISTORY_PAGE_SIZE = 30;
