import { useEffect, useRef } from "react";
import { areQuillHtmlEquivalent } from "../../utils/quillHtmlNormalize.js";

export const SCENE_DRAFT_PERSIST_DEBOUNCE_MS = 400;

export const sceneDraftStorageKey = (novelId, sceneId) =>
  `bookEditor:sceneDraft:${novelId || "default"}:${sceneId || "none"}`;

export const readSceneDraft = (novelId, sceneId) => {
  if (typeof window === "undefined" || !novelId || !sceneId) return null;
  try {
    const raw = window.localStorage.getItem(sceneDraftStorageKey(novelId, sceneId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.text !== "string") return null;
    return {
      text: parsed.text,
      updatedAt:
        typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
      basedOnServerUpdatedAt:
        typeof parsed.basedOnServerUpdatedAt === "string"
          ? parsed.basedOnServerUpdatedAt
          : null,
    };
  } catch {
    return null;
  }
};

export const writeSceneDraft = (
  novelId,
  sceneId,
  text,
  basedOnServerUpdatedAt
) => {
  if (typeof window === "undefined" || !novelId || !sceneId) return;
  try {
    if (!text) {
      window.localStorage.removeItem(sceneDraftStorageKey(novelId, sceneId));
      return;
    }
    let basedOn =
      typeof basedOnServerUpdatedAt === "string"
        ? basedOnServerUpdatedAt
        : null;
    if (basedOn == null) {
      basedOn = readSceneDraft(novelId, sceneId)?.basedOnServerUpdatedAt ?? null;
    }
    window.localStorage.setItem(
      sceneDraftStorageKey(novelId, sceneId),
      JSON.stringify({
        text,
        updatedAt: Date.now(),
        basedOnServerUpdatedAt: basedOn,
      })
    );
  } catch {
    // localStorage may be unavailable (private mode, quota); fail silently.
  }
};

export const clearSceneDraft = (novelId, sceneId) => {
  if (typeof window === "undefined" || !novelId || !sceneId) return;
  try {
    window.localStorage.removeItem(sceneDraftStorageKey(novelId, sceneId));
  } catch {
    // fail silently
  }
};

const sameServerToken = (left, right) => {
  if (!left || !right) return false;
  return String(left) === String(right);
};

/**
 * Recover this device's unsaved draft only when it was based on the same
 * server version still on the server. If another device saved, use server text.
 */
export const resolveDraftForScene = (
  novelId,
  sceneId,
  serverText = "",
  serverUpdatedAt = null
) => {
  const server = serverText ?? "";
  const local = readSceneDraft(novelId, sceneId);
  if (!local) {
    return { text: server, recovered: false };
  }
  if (areQuillHtmlEquivalent(local.text, server)) {
    clearSceneDraft(novelId, sceneId);
    return { text: server, recovered: false };
  }
  if (
    serverUpdatedAt &&
    sameServerToken(local.basedOnServerUpdatedAt, serverUpdatedAt)
  ) {
    return { text: local.text, recovered: true };
  }
  clearSceneDraft(novelId, sceneId);
  return { text: server, recovered: false };
};

/**
 * Debounce draft writes to localStorage. Pending writes flush when the active
 * scene/novel changes or the hook unmounts — not on every keystroke (sync
 * writes of large HTML were blocking the main thread while typing).
 */
export const useDebouncedSceneDraftPersist = (
  novelId,
  sceneId,
  text,
  basedOnServerUpdatedAt = null,
  delayMs = SCENE_DRAFT_PERSIST_DEBOUNCE_MS
) => {
  const latestRef = useRef({ novelId, sceneId, text, basedOnServerUpdatedAt });
  latestRef.current = { novelId, sceneId, text, basedOnServerUpdatedAt };

  useEffect(() => {
    if (!novelId || !sceneId) return undefined;
    const timer = setTimeout(() => {
      writeSceneDraft(novelId, sceneId, text, basedOnServerUpdatedAt);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [novelId, sceneId, text, basedOnServerUpdatedAt, delayMs]);

  useEffect(() => {
    if (!novelId || !sceneId) return undefined;
    const activeNovelId = novelId;
    const activeSceneId = sceneId;
    return () => {
      const {
        novelId: n,
        sceneId: s,
        text: t,
        basedOnServerUpdatedAt: basedOn,
      } = latestRef.current;
      if (n === activeNovelId && s === activeSceneId && n && s) {
        writeSceneDraft(n, s, t, basedOn);
      }
    };
  }, [novelId, sceneId]);
};
