/** Book Editor Olivia thread agents — hidden from dashboard project lists. */
const HIDDEN_OLIVIA_AGENT_NAMES = new Set([
  "olivia_editor",
  "olivia_scene_chat",
  "olivia_coaching",
]);

/** Ellis in-manuscript chat threads — tied to an uploaded novel, not dashboard projects. */
const HIDDEN_ELLIS_AGENT_NAMES = new Set([
  "ellis_editor",
  "ellis_editorial_letter",
]);

const BOOK_EDITOR_OLIVIA_THREAD_ID_RE =
  /^thread_olivia_(?:editor|scene|coaching)_/i;

const ELLIS_MANUSCRIPT_THREAD_ID_RE = /^thread_ellis_(?:editor|letter)_/i;

/**
 * True for in-editor Olivia threads (layering, scene chat, Office 3 coaching).
 * These are not dashboard "Olivia Story Bible" chat projects.
 */
export const isBookEditorOliviaThread = (item) => {
  if (!item) return false;
  const agent = String(item.agentName || "").trim().toLowerCase();
  if (HIDDEN_OLIVIA_AGENT_NAMES.has(agent)) return true;
  const tid = String(item.threadId || "").trim();
  if (tid && BOOK_EDITOR_OLIVIA_THREAD_ID_RE.test(tid)) return true;
  return false;
};

/**
 * True for Ellis per-manuscript threads (Ask Ellis / chapter follow-ups, editorial letter refine).
 * The uploaded manuscript Novel is the dashboard project — not these threads.
 */
export const isEllisManuscriptThread = (item) => {
  if (!item) return false;
  const agent = String(item.agentName || "").trim().toLowerCase();
  if (HIDDEN_ELLIS_AGENT_NAMES.has(agent)) return true;
  const tid = String(item.threadId || "").trim();
  if (tid && ELLIS_MANUSCRIPT_THREAD_ID_RE.test(tid)) return true;
  return false;
};

export const filterDashboardProjects = (items) =>
  (Array.isArray(items) ? items : []).filter(
    (item) => !isBookEditorOliviaThread(item) && !isEllisManuscriptThread(item)
  );
