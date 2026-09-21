import { computeActOffsets, getGlobalSceneNumber } from "./sceneNumbering.js";
import { countWordsFromHtml } from "../../utils/countWordsFromHtml.js";

export { countWordsFromHtml };

export const isArchivedScene = (uc) => Boolean(uc?.archivedAt);

export const withoutArchivedScenes = (rows = []) =>
  (rows || []).filter((uc) => !isArchivedScene(uc));

/**
 * Always at least 3 acts × 5 scene slots so Acts 2–3 do not vanish when the API returns sparse userContents.
 * When an act has more than 5 scenes (user-added / reordered), extend rows to the max sceneIndex for that act.
 * Core grid uses promptKey scene1…scene15; extra slots use scene{act}_{sceneIndex} (matches reorder API) to avoid
 * colliding with the next act's legacy key (e.g. Act 1 Scene 6 vs Act 2 Scene 1 both were "scene6").
 */
export const buildFullActGridFromUserContents = (actGroups, novelIdFallback) => {
  const rows = [];
  for (let actNum = 1; actNum <= 3; actNum++) {
    const existing = actGroups[actNum] || [];
    const bySceneIndex = new Map();
    let maxSceneFromData = 0;
    for (const row of existing) {
      const si = Number(row.sceneIndex);
      if (Number.isFinite(si)) {
        bySceneIndex.set(si, row);
        if (si > maxSceneFromData) maxSceneFromData = si;
      }
    }
    const sceneCount = Math.max(5, maxSceneFromData);
    const actScenes = [];
    for (let sceneIndex = 1; sceneIndex <= sceneCount; sceneIndex++) {
      const slotIndex = (actNum - 1) * 5 + (sceneIndex - 1);
      const defaultPromptKey =
        sceneIndex <= 5
          ? `scene${slotIndex + 1}`
          : `scene${actNum}_${sceneIndex}`;
      const found = bySceneIndex.get(sceneIndex);
      if (found) {
        const resolvedPromptKey =
          found.promptKey ||
          (found._id ? `user_${found._id}` : `user_unkeyed_${actNum}_${sceneIndex}`);
        actScenes.push({
          ...found,
          promptKey: resolvedPromptKey,
          originalIndex:
            sceneIndex <= 5 ? slotIndex : found.originalIndex,
          outlinePlaceholder: false,
        });
      } else {
        actScenes.push({
          _id: `outline-ph-${novelIdFallback || "novel"}-${actNum}-${sceneIndex}`,
          outlinePlaceholder: true,
          actNumber: actNum,
          sceneIndex,
          promptKey: defaultPromptKey,
          originalIndex: sceneIndex <= 5 ? slotIndex : null,
        });
      }
    }
    rows.push({ actNum, actScenes });
  }
  return rows;
};

const groupUserContentsByAct = (userContents = []) => {
  const actGroups = {};
  for (const content of userContents) {
    const actNum = content.actNumber || 1;
    if (!actGroups[actNum]) actGroups[actNum] = [];
    actGroups[actNum].push(content);
  }
  return actGroups;
};

const resolveSceneTitle = (
  sceneData,
  storyResponseMap,
  getSceneTitleText,
  globalSceneNumber
) => {
      const fromResponse =
      sceneData.promptKey && storyResponseMap?.[sceneData.promptKey]
        ? getSceneTitleText?.(storyResponseMap[sceneData.promptKey])
        : "";
    const trimmed = (sceneData.sceneTitle || fromResponse || "").trim();
    if (trimmed) return trimmed.slice(0, 120);
    return `Chapter ${globalSceneNumber ?? sceneData.sceneIndex}`;
};

/**
 * Authoritative act/slot map for Olivia chat (matches OutlineSidebar grid).
 * Title rule: non-empty UserContent.sceneTitle wins (sidebar rename label), then
 * StoryResponse extraction, then slot fallback.
 */
export const buildOutlineLayout = ({
  userContents = [],
  storyResponseMap = {},
  novelId = "novel",
  getSceneTitleText = () => "",
}) => {
  const actGroups = groupUserContentsByAct(withoutArchivedScenes(userContents));
  const fullActs = buildFullActGridFromUserContents(actGroups, novelId);
  const offsets = computeActOffsets(fullActs);
  const rows = [];

  for (const { actNum, actScenes } of fullActs) {
    for (const sceneData of actScenes) {
      if (sceneData.outlinePlaceholder) continue;
      const actNumber = Number(actNum);
      const sceneIndex = Number(sceneData.sceneIndex);
      const responseText = sceneData.promptKey
        ? storyResponseMap[sceneData.promptKey]
        : null;
      const globalSceneNumber = getGlobalSceneNumber(actNumber, sceneIndex, offsets);
      rows.push({
        sceneId: String(sceneData._id),
        actNumber,
        sceneIndex,
        globalSceneNumber,
        promptKey: sceneData.promptKey || null,
        title: resolveSceneTitle(
          sceneData,
          storyResponseMap,
          getSceneTitleText,
          globalSceneNumber
        ),
        hasContent: Boolean(
          (sceneData.userContent && String(sceneData.userContent).trim()) ||
            (responseText && String(responseText).trim())
        ),
        isUserAdded: Boolean(sceneData.isUserAdded),
      });
    }
  }

  rows.sort(
    (a, b) =>
      a.actNumber - b.actNumber ||
      a.sceneIndex - b.sceneIndex
  );
  return rows;
};

/**
 * Stable hash of scene positions (ignores titles) for detecting reorder vs rename-only edits.
 */
export const computeLayoutPositionHash = (layout = []) =>
  [...layout]
    .filter((r) => r.sceneId && !String(r.sceneId).startsWith("outline-ph-"))
    .sort((a, b) => String(a.sceneId).localeCompare(String(b.sceneId)))
    .map((r) => `${r.sceneId}:${r.actNumber}:${r.sceneIndex}`)
    .join("|");

/**
 * Re-resolve act/scene slot after reorder when target tracks sceneId.
 */
export const resolveTargetSceneFromLayout = (targetScene, layout = []) => {
  if (!targetScene) return null;
  const sceneId = targetScene.sceneId ? String(targetScene.sceneId) : null;
  if (!sceneId) return targetScene;

  const row = layout.find((r) => String(r.sceneId) === sceneId);
  if (!row) return null;

  return {
    actNumber: row.actNumber,
    sceneIndex: row.sceneIndex,
    sceneId: row.sceneId,
    promptKey: row.promptKey || targetScene.promptKey || null,
    globalSceneNumber: row.globalSceneNumber,
  };
};

/**
 * Enrich target scene with sceneId/promptKey from userContents when opening a slot.
 */
/**
 * Selected Book Editor scene as draft identity for avatar Olivia (not outline targetScene).
 * @param {{ id?: string, actNumber?: number, sceneIndex?: number, globalSceneNumber?: number, sceneTitle?: string } | null} selectedScene
 * @param {object[]} userContents
 * @returns {{ actNumber: number, sceneIndex: number, sceneId: string, globalSceneNumber?: number, sceneTitle?: string } | null}
 */
export const buildDraftSceneFromSelected = (
  selectedScene,
  userContents = []
) => {
  if (!selectedScene?.id) return null;
  const sceneId = String(selectedScene.id);
  if (sceneId.startsWith("outline-ph-")) return null;

  const row = (userContents || []).find((c) => String(c._id) === sceneId);
  const actNumber = Number(selectedScene.actNumber ?? row?.actNumber);
  const sceneIndex = Number(selectedScene.sceneIndex ?? row?.sceneIndex);
  if (!Number.isFinite(actNumber) || !Number.isFinite(sceneIndex)) return null;

  const sceneTitle = String(row?.sceneTitle || selectedScene.sceneTitle || "")
    .trim()
    .slice(0, 120);
  const globalFromSelected = Number(selectedScene.globalSceneNumber);
  const globalSceneNumber = Number.isFinite(globalFromSelected)
    ? globalFromSelected
    : row
      ? getGlobalSceneNumber(
          row.actNumber,
          row.sceneIndex,
          computeActOffsets(userContents)
        )
      : NaN;

  return {
    actNumber,
    sceneIndex,
    sceneId,
    ...(Number.isFinite(Number(globalSceneNumber))
      ? { globalSceneNumber: Number(globalSceneNumber) }
      : {}),
    ...(sceneTitle ? { sceneTitle } : {}),
  };
};

/**
 * Manuscript prose for Coach Scene — live editor buffer or saved userContent row.
 * @param {string} sceneId
 * @param {{ selectedSceneId?: string | null, editorContent?: string, userContents?: object[] }} ctx
 * @returns {string}
 */
export const resolveManuscriptDraftForScene = (
  sceneId,
  { selectedSceneId = null, editorContent = "", userContents = [] } = {}
) => {
  if (!sceneId) return "";
  if (
    selectedSceneId != null &&
    String(selectedSceneId) === String(sceneId) &&
    String(editorContent || "").trim()
  ) {
    return String(editorContent).trim();
  }
  const row = (userContents || []).find((c) => String(c._id) === String(sceneId));
  return String(row?.userContent || "").trim();
};

/**
 * Whether a scene has manuscript prose (saved userContent or live editor buffer).
 * Used by OutlineSidebar coach affordance without passing full editor HTML.
 */
export const sceneHasManuscriptDraft = (
  sceneId,
  {
    selectedSceneId = null,
    selectedSceneHasLiveDraft = false,
    userContents = [],
  } = {}
) => {
  if (!sceneId) return false;
  if (
    selectedSceneId != null &&
    String(selectedSceneId) === String(sceneId) &&
    selectedSceneHasLiveDraft
  ) {
    return true;
  }
  const row = (userContents || []).find((c) => String(c._id) === String(sceneId));
  return Boolean(String(row?.userContent || "").trim());
};

/**
 * Per-scene manuscript word count — uses live editor HTML when synced to the row.
 */
export const countSceneManuscriptWords = (
  sceneData,
  {
    liveContent = null,
    contentSceneId = null,
    selectedSceneId = null,
  } = {}
) => {
  const sceneId = sceneData?._id ?? null;
  const contentSynced =
    contentSceneId != null &&
    selectedSceneId != null &&
    String(contentSceneId) === String(selectedSceneId) &&
    String(selectedSceneId) === String(sceneId);

  const html =
    contentSynced && liveContent != null
      ? liveContent
      : sceneData?.userContent || "";

  return countWordsFromHtml(html);
};

/** Outline sidebar mutations forwarded to Olivia on the next chat send. */
export const OUTLINE_CHANGE_TYPES = new Set([
  "reorder",
  "add",
  "delete",
  "rename",
  "archive",
  "restore",
]);

/**
 * @param {{ type?: string } | null} change
 * @returns {object | null}
 */
export const getOutlineChangeForSend = (change) =>
  change?.type && OUTLINE_CHANGE_TYPES.has(change.type) ? change : null;

export const enrichTargetSceneFromUserContents = (targetScene, userContents = []) => {
  if (!targetScene?.actNumber || targetScene?.sceneIndex == null) return targetScene;
  const row = (userContents || []).find(
    (uc) =>
      Number(uc.actNumber) === Number(targetScene.actNumber) &&
      Number(uc.sceneIndex) === Number(targetScene.sceneIndex)
  );
  if (!row?._id) return targetScene;
  return {
    ...targetScene,
    sceneId: String(row._id),
    promptKey: row.promptKey || targetScene.promptKey || null,
  };
};
