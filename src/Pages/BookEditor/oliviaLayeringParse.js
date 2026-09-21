/**
 * Shared parsing for Olivia editor layering tables (NEW Scene rows).
 * Used by OliviaChatModal. Server uses storygroove-be/utils/oliviaLayeringParse.js (keep in sync).
 */

import { getSceneTitleTextStrict, getSceneTitleText } from "./utils";

// Bounded LRU-ish cache keyed by raw message text. Olivia's bubbles can be
// long (thousands of chars), and during streaming this parser is invoked from
// every MessageBubble render via inferAutoLayeringInsert / inferAutoInsertFromLayeringTable
// / hasDetectedNewScenes. Once a message is finalized its text is immutable,
// so subsequent calls can hit the cache instead of re-running the regex pass.
const PARSE_CACHE_MAX = 128;
const parseCache = new Map();
const cacheGet = (cache, key) => {
  if (!cache.has(key)) return undefined;
  const value = cache.get(key);
  // Refresh recency by re-inserting at the tail.
  cache.delete(key);
  cache.set(key, value);
  return value;
};
const cacheSet = (cache, key, value, max) => {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, value);
  if (cache.size > max) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
};

const parseAllNewScenesUncached = (text) => {
  const clean = text.replace(/\*+/g, "").replace(/[_~`#]+/g, "");
  const lines = clean.split("\n");
  const results = new Map();
  let currentAct = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) {
      const hm = trimmed.match(/\bAct\s*([1-3])\b/i);
      if (hm) currentAct = parseInt(hm[1], 10);
    }

    if (!/NEW/i.test(line) || !/(?:Scene|Chapter)/i.test(line)) continue;

    const sceneMatch = line.match(/NEW\s+(?:Scene|Chapter)\s+(\d+(?:\.\d+)?)/i);
    if (!sceneMatch) continue;

    const sceneRef = `NEW Scene ${sceneMatch[1]}`;
    const isTableRow = trimmed.startsWith("|");
    let actNum = currentAct;
    let title = "";
    let pov = "";
    let summary = "";

    if (isTableRow) {
      const lineActMatch = line.match(/\bAct\s*([1-3])\b/i);
      if (lineActMatch) actNum = parseInt(lineActMatch[1], 10);

      const cells = trimmed
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean);

      if (!lineActMatch && cells.length > 1 && /^[1-3]$/.test(cells[1])) {
        actNum = parseInt(cells[1], 10);
      }

      const sceneIdx = cells.findIndex((c) => /NEW\s+(?:Scene|Chapter)/i.test(c));
      const actIdx = cells.findIndex(
        (c) => /\bAct\s*[1-3]\b/i.test(c) || /^[1-3]$/.test(c.trim())
      );
      const dataStart = Math.max(sceneIdx, actIdx >= 0 ? actIdx : sceneIdx) + 1;
      const dataCells = cells.slice(dataStart);
      title = dataCells[0] || "";
      pov = dataCells[1] || "";
      // 6-column table: | Scene # | Act | Title | POV | Scene Purpose | Summary |
      // 5-column table (legacy): | Scene # | Act | Title | POV | Summary |
      if (dataCells.length >= 4) {
        summary = dataCells[3] || "";
      } else {
        summary = dataCells[2] || "";
      }
    } else {
      const after = line.slice(
        sceneMatch.index + sceneMatch[0].length,
        sceneMatch.index + sceneMatch[0].length + 120
      );
      const tm = after.match(/^[\s:–\-—]+([^\n,;]{3,80})/);
      if (tm) title = tm[1].trim();
      const freeActMatch = line.match(/\bAct\s*([1-3])\b/i);
      if (freeActMatch) actNum = parseInt(freeActMatch[1], 10);
    }

    const key = sceneRef.toLowerCase() + `-act${actNum}`;
    if (results.has(key)) continue;

    const displayRef = `${sceneRef} - Act ${actNum}`;

    results.set(key, {
      id: `${sceneRef}-act${actNum}-${title}`,
      stableKey: key,
      rawSceneRef: sceneRef,
      sceneRef: displayRef,
      act: `Act ${actNum}`,
      actNumber: actNum,
      title,
      pov,
      summary,
    });
  }

  return Array.from(results.values());
};

export const parseAllNewScenes = (text) => {
  if (!text) return [];
  const cached = cacheGet(parseCache, text);
  if (cached) return cached;
  const result = parseAllNewScenesUncached(text);
  cacheSet(parseCache, text, result, PARSE_CACHE_MAX);
  return result;
};

export const hasDetectedNewScenes = (text) =>
  text ? parseAllNewScenes(text).length > 0 : false;

/**
 * Stricter than hasDetectedNewScenes: requires at least one markdown TABLE row
 * (a line starting with `|`) whose Scene # cell contains `NEW Scene X.Y`.
 * Prose messages that merely mention "NEW Scene 1.5" inline (serial cues,
 * post-insert confirmations) do NOT qualify as a layering table.
 * Mirrors backend util at storygroove-be/utils/oliviaLayeringParse.js.
 */
const tableRowCache = new Map();
export const hasDetectedNewScenesTableRow = (text) => {
  if (!text) return false;
  const cached = cacheGet(tableRowCache, text);
  if (cached !== undefined) return cached;
  const clean = text.replace(/\*+/g, "").replace(/[_~`#]+/g, "");
  const lines = clean.split("\n");
  let result = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    if (/NEW\s+(?:Scene|Chapter)\s+\d+(?:\.\d+)?/i.test(line)) {
      result = true;
      break;
    }
  }
  cacheSet(tableRowCache, text, result, PARSE_CACHE_MAX);
  return result;
};

/** e.g. "NEW Scene 2.5" → insert after scene 2 */
export const getAfterSceneIndexFromRef = (sceneRef) => {
  const m = (sceneRef || "").match(/(\d+)(?:\.\d+)?/);
  if (!m) return 0;
  return parseInt(m[1], 10);
};

const NEW_SCENE_GLOBAL_RE = /\bNEW\s+(?:Scene|Chapter)\s+(\d+(?:\.\d+)?)\b/gi;

/**
 * Scan the full message for NEW Scene X.Y (not just the head). Phase-2 coaching blocks are long;
 * the reference often appears below the fold, past any old 1200-char window.
 * Picks the last match that has an Act 1–3 hint in a local window; otherwise the last match.
 */
const newSceneRefCache = new Map();
export const findNewSceneRefInText = (text) => {
  if (!text || !String(text).trim()) return null;
  const cached = cacheGet(newSceneRefCache, text);
  if (cached !== undefined) return cached;
  const matches = [];
  NEW_SCENE_GLOBAL_RE.lastIndex = 0;
  let m;
  while ((m = NEW_SCENE_GLOBAL_RE.exec(text)) !== null) {
    const rawRef = `NEW Scene ${m[1]}`;
    const idx = m.index;
    const start = Math.max(0, idx - 500);
    const end = Math.min(text.length, idx + m[0].length + 500);
    const window = text.slice(start, end);
    const actMatch = window.match(/\bAct\s*([1-3])\b/i);
    const actNumber = actMatch ? parseInt(actMatch[1], 10) : undefined;
    matches.push({
      rawRef,
      afterSceneIndex: getAfterSceneIndexFromRef(rawRef),
      actNumber,
      hasActHint: actNumber != null && [1, 2, 3].includes(actNumber),
    });
  }
  if (matches.length === 0) {
    cacheSet(newSceneRefCache, text, null, PARSE_CACHE_MAX);
    return null;
  }
  const withAct = matches.filter((x) => x.hasActHint);
  const chosen = (withAct.length ? withAct : matches)[
    (withAct.length ? withAct : matches).length - 1
  ];
  const layeringStableKey = chosen.hasActHint
    ? `${chosen.rawRef.toLowerCase()}-act${chosen.actNumber}`
    : undefined;
  const result = {
    rawRef: chosen.rawRef,
    afterSceneIndex: chosen.afterSceneIndex,
    actNumber: chosen.hasActHint ? chosen.actNumber : undefined,
    layeringStableKey,
  };
  cacheSet(newSceneRefCache, text, result, PARSE_CACHE_MAX);
  return result;
};

/**
 * Hints for the manual insert form. Uses full-text NEW Scene detection.
 * Returns {} when no NEW Scene reference is found.
 */
export const inferLayeringInsertHints = (text) => {
  const a = findNewSceneRefInText(text);
  if (!a) return {};
  return {
    actNumber: a.actNumber,
    afterSceneIndex: a.afterSceneIndex,
    layeringStableKey: a.layeringStableKey,
    rawRef: a.rawRef,
  };
};

const sceneIndicesByAct = (userContents) => {
  const grouped = { 1: [], 2: [], 3: [] };
  (userContents || []).forEach((scene) => {
    const act = Number(scene.actNumber);
    if ([1, 2, 3].includes(act)) grouped[act].push(Number(scene.sceneIndex));
  });
  for (const k of [1, 2, 3]) {
    grouped[k] = Array.from(new Set(grouped[k])).sort((a, b) => a - b);
  }
  return grouped;
};

const clampAfterToValidAct = (actNumber, inferredAfter, byAct) => {
  const opts = [0, ...(byAct[actNumber] || [])].sort((a, b) => a - b);
  if (opts.includes(inferredAfter)) return inferredAfter;
  return opts[opts.length - 1] ?? 0;
};

const matchRowByTitle = (parsed, title) => {
  const st = (title || "").trim().toLowerCase();
  if (!st) return null;
  for (const row of parsed) {
    const t = (row.title || "").trim().toLowerCase();
    if (!t) continue;
    const headLen = Math.min(24, t.length);
    if (st.includes(t.slice(0, headLen)) || t.includes(st.slice(0, 12))) {
      return row;
    }
  }
  return null;
};

const extractRichSceneTitle = (text) => {
  const strict = getSceneTitleTextStrict(text);
  const loose = getSceneTitleText(text);
  return strict || (loose && loose !== "Scene" ? loose : "") || "";
};

const pickParsedRowForInsert = (parsed, text) => {
  if (parsed.length === 1) return parsed[0];
  const title = extractRichSceneTitle(text);
  if (!title) return parsed[parsed.length - 1];
  return matchRowByTitle(parsed, title) || parsed[parsed.length - 1];
};

/**
 * Resolves act / insert-after for one-click outline insert from Olivia’s layering content.
 * Uses the same table-aware parser as the layering UI when possible; falls back to full-text NEW Scene + Act hints.
 */
export const inferAutoLayeringInsert = (text, userContents) => {
  if (!text) return null;
  const byAct = sceneIndicesByAct(userContents);
  const parsed = parseAllNewScenes(text);

  if (parsed.length > 0) {
    const row = pickParsedRowForInsert(parsed, text);
    const actNumber = Number(row.actNumber);
    const rawRef = row.rawSceneRef;
    const afterSceneIndex = getAfterSceneIndexFromRef(rawRef);
    const layeringStableKey = row.stableKey;
    const clamped = clampAfterToValidAct(actNumber, afterSceneIndex, byAct);
    return { actNumber, afterSceneIndex: clamped, layeringStableKey };
  }

  const anchor = findNewSceneRefInText(text);
  if (!anchor?.rawRef) return null;

  const { rawRef, afterSceneIndex } = anchor;
  let actNumber =
    anchor.actNumber != null && [1, 2, 3].includes(Number(anchor.actNumber))
      ? Number(anchor.actNumber)
      : null;

  if (actNumber != null) {
    const layeringStableKey =
      anchor.layeringStableKey || `${rawRef.toLowerCase()}-act${actNumber}`;
    const clamped = clampAfterToValidAct(actNumber, afterSceneIndex, byAct);
    return { actNumber, afterSceneIndex: clamped, layeringStableKey };
  }

  if (afterSceneIndex === 0) {
    actNumber = 1;
    const layeringStableKey = `${rawRef.toLowerCase()}-act1`;
    const clamped = clampAfterToValidAct(1, 0, byAct);
    return { actNumber: 1, afterSceneIndex: clamped, layeringStableKey };
  }

  const actsWithAnchor = [1, 2, 3].filter((act) =>
    (byAct[act] || []).includes(afterSceneIndex)
  );

  if (actsWithAnchor.length === 1) {
    actNumber = actsWithAnchor[0];
  } else if (actsWithAnchor.length > 1) {
    // Same scene index exists in multiple acts (e.g. Act 1 Scene 2 and Act 2 Scene 2): prefer lower act (typical queue order).
    actNumber = Math.min(...actsWithAnchor);
  } else {
    const nonEmptyActs = [1, 2, 3].filter((a) => (byAct[a] || []).length > 0);
    actNumber = nonEmptyActs.length === 1 ? nonEmptyActs[0] : 1;
  }

  const layeringStableKey = `${rawRef.toLowerCase()}-act${actNumber}`;
  const clamped = clampAfterToValidAct(actNumber, afterSceneIndex, byAct);
  return { actNumber, afterSceneIndex: clamped, layeringStableKey };
};

/**
 * Scan `messages` backward for the latest assistant message whose text contains
 * a parseable layering table (NEW Scene rows). Optional `beforeIdx` excludes
 * the rich scene message itself (and anything after it).
 * Mirrors backend util at storygroove-be/utils/oliviaLayeringParse.js.
 */
export const findLatestLayeringTableTextFromMessages = (messages, beforeIdx) => {
  if (!Array.isArray(messages)) return null;
  const start =
    typeof beforeIdx === "number" && beforeIdx >= 0
      ? Math.min(beforeIdx, messages.length) - 1
      : messages.length - 1;
  for (let i = start; i >= 0; i--) {
    const m = messages[i];
    if (
      m?.role === "assistant" &&
      m.text &&
      hasDetectedNewScenesTableRow(m.text)
    ) {
      return m.text;
    }
  }
  return null;
};

/**
 * Tier-0 resolver backed by the server's authoritative layering state.
 * Given `layeringState` (see backend computeLayeringState) and the rich scene's
 * text, returns a deterministic insert target or null.
 *
 * Resolution order:
 *  1. Title-match the rich scene against any row (inserted or not) — handles
 *     revision re-deliveries of an already-inserted row by returning that
 *     row's target (server will splice the existing stableKey entry).
 *  2. Fall back to the server's next-unfilled target.
 *  3. Null if the server has no layering rows at all.
 */
export const inferAutoInsertFromLayeringState = (layeringState, richSceneText) => {
  if (!layeringState?.layeringRows?.length) return null;

  const title = extractRichSceneTitle(richSceneText);
  const byTitle = matchRowByTitle(layeringState.layeringRows, title);
  if (byTitle) {
    return {
      actNumber: byTitle.actNumber,
      afterSceneIndex: byTitle.afterSceneIndex,
      layeringStableKey: byTitle.layeringStableKey,
    };
  }

  const next = layeringState.nextLayeringTarget;
  if (next && !layeringState.allDone) {
    return {
      actNumber: next.actNumber,
      afterSceneIndex: next.afterSceneIndex,
      layeringStableKey: next.layeringStableKey,
    };
  }
  return null;
};

/**
 * Resolve the layering-insert target by matching a rich scene against the
 * NEW Scene rows of a previously delivered layering table. Used as a
 * last-resort fallback when neither the rich scene's own text nor nearby
 * cue messages contain a usable NEW Scene reference.
 */
export const inferAutoInsertFromLayeringTable = (
  tableText,
  richSceneText,
  userContents
) => {
  if (!tableText || !richSceneText) return null;
  const parsed = parseAllNewScenes(tableText);
  if (!parsed.length) return null;

  const title = extractRichSceneTitle(richSceneText);
  const row = matchRowByTitle(parsed, title);
  if (!row) return null;

  const actNumber = Number(row.actNumber);
  if (![1, 2, 3].includes(actNumber)) return null;
  const afterSceneIndex = getAfterSceneIndexFromRef(row.rawSceneRef);
  const byAct = sceneIndicesByAct(userContents);
  const clamped = clampAfterToValidAct(actNumber, afterSceneIndex, byAct);
  return {
    actNumber,
    afterSceneIndex: clamped,
    layeringStableKey: row.stableKey,
  };
};
