import { useEffect } from "react";

const DRAFT_PERSIST_DEBOUNCE_MS = 400;

/**
 * Build the localStorage key for the per-novel draft. Falls back to a shared
 * key when novelId isn't available so we still recover from a refresh in the
 * unscoped case (rare — modal renders below useParams() in BookEditorPage).
 */
export const draftStorageKey = (novelId) =>
  `olivia-chat-draft:${novelId || "default"}`;

export const readPersistedDraft = (novelId) => {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(draftStorageKey(novelId)) || "";
  } catch {
    return "";
  }
};

export const writePersistedDraft = (novelId, value) => {
  if (typeof window === "undefined") return;
  try {
    if (value) {
      window.localStorage.setItem(draftStorageKey(novelId), value);
    } else {
      window.localStorage.removeItem(draftStorageKey(novelId));
    }
  } catch {
    // localStorage may be unavailable (private mode, quota); fail silently.
  }
};

/**
 * Debounce draft writes so keystrokes don't sync localStorage on every key.
 * Flushes pending value on unmount or when novelId/draft changes (cleanup).
 */
export const useDebouncedDraftPersist = (
  novelId,
  draft,
  delayMs = DRAFT_PERSIST_DEBOUNCE_MS
) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      writePersistedDraft(novelId, draft);
    }, delayMs);
    return () => {
      clearTimeout(timer);
      writePersistedDraft(novelId, draft);
    };
  }, [novelId, draft, delayMs]);
};
