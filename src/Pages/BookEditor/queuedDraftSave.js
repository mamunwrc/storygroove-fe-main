/**
 * Serializes manuscript draft POSTs so overlapping autosaves cannot drop
 * the latest keystrokes. Latest text wins per scene; other scenes still flush.
 */
export const isRetryableDraftSaveError = (error) => {
  if (!error || error.code === "OFFLINE") return false;
  if (!error.response) return true;
  const status = error.response.status;
  return status >= 500 || status === 429;
};

export function createDraftSaveQueue({
  persist,
  onSavingChange,
  retryMs = 2000,
  scheduleRetry = setTimeout,
} = {}) {
  const pending = new Map();
  let inflight = false;
  let drainPromise = null;
  let retryTimer = null;

  const clearRetry = () => {
    if (retryTimer == null) return;
    clearTimeout(retryTimer);
    retryTimer = null;
  };

  const armRetry = () => {
    if (retryTimer != null || !pending.size) return;
    retryTimer = scheduleRetry(() => {
      retryTimer = null;
      if (pending.size) drain();
    }, retryMs);
    if (typeof retryTimer === "object" && retryTimer?.unref) {
      retryTimer.unref();
    }
  };

  const drain = async () => {
    if (inflight) return drainPromise;
    inflight = true;
    clearRetry();
    onSavingChange?.(true);
    drainPromise = (async () => {
      let lastError = null;
      const failedThisPass = new Set();
      try {
        while (pending.size) {
          let next = null;
          for (const [sceneId, text] of pending) {
            if (!failedThisPass.has(sceneId)) {
              next = [sceneId, text];
              break;
            }
          }
          if (!next) break;

          const [sceneId, text] = next;
          pending.delete(sceneId);
          try {
            await persist(sceneId, text);
          } catch (error) {
            if (isRetryableDraftSaveError(error)) {
              if (!pending.has(sceneId)) pending.set(sceneId, text);
              failedThisPass.add(sceneId);
            }
            lastError = error;
          }
        }
        if (lastError) throw lastError;
      } finally {
        inflight = false;
        drainPromise = null;
        onSavingChange?.(pending.size > 0);
        if (pending.size) armRetry();
      }
    })();
    return drainPromise;
  };

  return {
    enqueue(sceneId, text) {
      if (!sceneId) return Promise.resolve();
      pending.set(String(sceneId), text ?? "");
      return drain();
    },
    get pendingCount() {
      return pending.size;
    },
    get inflight() {
      return inflight;
    },
    kick() {
      if (!pending.size && !inflight) return Promise.resolve();
      return drain();
    },
  };
}
