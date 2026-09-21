/**
 * Uploaded-manuscript sidebar helpers. Parsed chapters use (chapterNumber,
 * chapterSuffix) for navigation; actNumber from Ellis enrichment is map
 * metadata only and must not split the Manuscript Map into act accordions.
 */

import { countWordsFromHtml } from "../../utils/countWordsFromHtml.js";

export { countWordsFromHtml };

/** Normalize a chapter letter suffix to "" or uppercase A–Z. */
export const normalizeChapterSuffix = (suffix) => {
  const s = String(suffix || "").trim().toUpperCase();
  return /^[A-Z]$/.test(s) ? s : "";
};

/** Stable map/dedupe key for (chapterNumber, chapterSuffix). */
export const chapterIdentityKey = (chapterNumber, chapterSuffix) => {
  const num = Number(chapterNumber);
  if (!Number.isFinite(num)) return "";
  const suf = normalizeChapterSuffix(chapterSuffix);
  return suf ? `${num}:${suf}` : String(num);
};

/** Progress / review map key: "7" or "7A". */
export const chapterProgressKey = (chapterNumber, chapterSuffix) => {
  const num = Number(chapterNumber);
  if (!Number.isFinite(num)) return "";
  const suf = normalizeChapterSuffix(chapterSuffix);
  return suf ? `${num}${suf}` : String(num);
};

/** Stable progress lookup that survives chapter renumber (add / reorder). */
export const chapterProgressIdKey = (chapterId) => {
  const id = chapterId != null ? String(chapterId).trim() : "";
  return id ? `id:${id}` : "";
};

/**
 * Ellis review status for an outline row. Prefer the stable UserContent id so
 * a chapter that moved (6 → 8) still shows its existing review. Once the
 * progress map is id-indexed, a miss is authoritative — do not fall back to a
 * stale chapterNumber that now belongs to a different row.
 */
export const getChapterReviewStatus = (reviewProgress = {}, chapter = {}) => {
  const idKey = chapterProgressIdKey(chapter._id || chapter.chapterId);
  if (idKey && reviewProgress[idKey]?.status) {
    return reviewProgress[idKey].status;
  }
  if (
    idKey &&
    Object.keys(reviewProgress).some((key) => key.startsWith("id:"))
  ) {
    return undefined;
  }
  const key = chapterProgressKey(chapter.chapterNumber, chapter.chapterSuffix);
  if (key && reviewProgress[key]?.status) {
    return reviewProgress[key].status;
  }
  if (normalizeChapterSuffix(chapter.chapterSuffix)) return undefined;
  const num = Number(chapter.chapterNumber);
  if (Number.isFinite(num) && reviewProgress[String(num)]?.status) {
    return reviewProgress[String(num)].status;
  }
  return undefined;
};

/** Sort comparator: chapterNumber, then suffix ("" before A before B). */
export const compareChapterRows = (a, b) => {
  const na = Number(a?.chapterNumber ?? a?.sceneIndex ?? 0);
  const nb = Number(b?.chapterNumber ?? b?.sceneIndex ?? 0);
  if (na !== nb) return na - nb;
  const sa = normalizeChapterSuffix(a?.chapterSuffix);
  const sb = normalizeChapterSuffix(b?.chapterSuffix);
  if (sa === sb) {
    return Number(a?.sceneIndex || 0) - Number(b?.sceneIndex || 0);
  }
  if (!sa) return -1;
  if (!sb) return 1;
  return sa.localeCompare(sb);
};

const scoreUploadedChapterRow = (row) => {
  let score = 0;
  if (row.chapterSummary?.trim()) score += 8;
  if (row.actNumber != null) score += 4;
  if (row.userContent?.trim()) score += 2;
  if (row.chapterLabel || row.sceneTitle) score += 1;
  return score;
};

/**
 * Returns one UserContent row per (chapterNumber, chapterSuffix), sorted in
 * reading order — mirrors BE uploadedChapterRows.js.
 */
export const isArchivedChapter = (uc) => Boolean(uc?.archivedAt);

export const getUploadedChapterRows = (userContents = []) => {
  const byChapter = new Map();

  userContents.forEach((uc, index) => {
    if (isArchivedChapter(uc)) return;
    if (uc.chapterNumber == null) return;
    const num = Number(uc.chapterNumber);
    if (!Number.isFinite(num)) return;

    const key = chapterIdentityKey(num, uc.chapterSuffix);
    const candidate = {
      ...uc,
      chapterSuffix: normalizeChapterSuffix(uc.chapterSuffix) || null,
      originalIndex: index,
    };
    const existing = byChapter.get(key);
    if (
      !existing ||
      scoreUploadedChapterRow(candidate) > scoreUploadedChapterRow(existing)
    ) {
      byChapter.set(key, candidate);
    }
  });

  return [...byChapter.values()].sort(compareChapterRows);
};

/**
 * One row per base chapterNumber (prefers bare over lettered) — used where
 * Ellis developmental-pass progress still tracks base chapters.
 */
export const getDistinctBaseChapterRows = (userContents = []) => {
  const byNumber = new Map();

  getUploadedChapterRows(userContents).forEach((uc) => {
    const num = Number(uc.chapterNumber);
    if (!Number.isFinite(num)) return;
    const existing = byNumber.get(num);
    if (
      !existing ||
      (!normalizeChapterSuffix(uc.chapterSuffix) &&
        normalizeChapterSuffix(existing.chapterSuffix))
    ) {
      byNumber.set(num, {
        ...uc,
        chapterSuffix: normalizeChapterSuffix(uc.chapterSuffix) || null,
      });
    }
  });

  return [...byNumber.values()].sort(
    (a, b) => Number(a.chapterNumber) - Number(b.chapterNumber)
  );
};

export const isUploadedManuscriptBook = (bookData) =>
  Boolean(bookData?.uploaded);

const isChapterReviewReady = (reviewProgress = {}, chapter) =>
  getChapterReviewStatus(reviewProgress, chapter) === "ready";

/**
 * Next chapter Ellis recommends for scene-by-scene review, or null if none.
 * @param {object} reviewProgress
 * @param {Array<{ chapterNumber: number, chapterSuffix?: string }>} chapters
 */
export const getNextRecommendedChapter = (
  reviewProgress = {},
  chapters = []
) => {
  const ordered = [...chapters]
    .filter((c) => Number.isFinite(Number(c.chapterNumber)))
    .sort(compareChapterRows);
  for (const c of ordered) {
    if (!isChapterReviewReady(reviewProgress, c)) return c;
  }
  return null;
};

/** @deprecated Prefer getNextRecommendedChapter; returns base chapter number only. */
export const getNextRecommendedChapterNum = (reviewProgress = {}, chapters = []) => {
  const next = getNextRecommendedChapter(reviewProgress, chapters);
  return next ? Number(next.chapterNumber) : null;
};

/** Chapter row immediately after the given base chapter number, or null. */
export const getNextChapterAfter = (
  chapters = [],
  chapterNumber,
  _chapterSuffix = null
) => {
  const ordered = getDistinctBaseChapterRows(chapters);
  const idx = ordered.findIndex(
    (c) => Number(c.chapterNumber) === Number(chapterNumber)
  );
  if (idx === -1 || idx === ordered.length - 1) return null;
  return ordered[idx + 1];
};

/** Detect "Start Chapter N" review kickoff in chat (digits or word numbers). */
const START_CHAPTER_PREFIX =
  /^(?:(?:can|could|would)\s+you\s+|please\s+)?(?:start\s+(?:with\s+)?|let'?s\s+(?:start|review)\s+)chapter\s+/i;

/** Broader chapter focus phrasing (Q&A, out-of-order navigation, redelivery). */
const FOCUS_CHAPTER_PREFIX =
  /^(?:review|look at|work on|focus on|tell me about|deliver|give me|show me|re-?deliver|edit)\s+(?:(?:again|please)\s+)*(?:the\s+)?chapter\s+/i;

/**
 * Same kickoff verbs as FOCUS_CHAPTER_PREFIX minus "tell me about" (which
 * stays Q&A-only even said bluntly), wrapped in an optional polite lead-in.
 * Keeps "Can you show me chapter 8" / "Please look at chapter 1.5" in sync
 * with their bare-verb form instead of only covering review/deliver/edit.
 */
const POLITE_KICKOFF_VERBS =
  "review|look at|work on|focus on|deliver|give me|show me|re-?deliver|edit|start";
const POLITE_REVIEW_CHAPTER_PREFIX = new RegExp(
  `^(?:(?:can|could|would)\\s+you\\s+|please\\s+)(?:${POLITE_KICKOFF_VERBS})\\s+(?:(?:again|please)\\s+)*(?:the\\s+)?chapter\\s+`,
  "i"
);

/** Common misspellings / shorthand for "chapter" before a number. */
const FUZZY_CHAPTER_WORD =
  /(?:chapter|hapter|chpater|charpter|chaptre|chpter|chp?\.?)\s*/i;

const CHANGE_REQUEST_RE =
  /\b(?:different\s+lens|recalibrat\w*|revise|revised|revising|revision|change|changed|changing|changes|update|updated|updating|updates|adjust|adjusted|adjusting|adjustment|rewrite|rewrote|rewriting|rewrites|through\s+a\s+different|new\s+(?:angle|take|version)|make\s+(?:it\s+)?different)\b/i;

const AFFIRMATION_RE =
  /^(?:okay|ok|k|yes|yeah|yep|yup|sure|sounds\s+good|go\s+ahead|let'?s\s+do\s+(?:that|it)|please\s+do|do\s+it|absolutely|definitely|of\s+course|right|correct|affirmative|that\s+works|perfect|great)(?:[.!]?)$/i;

const ADVANCE_INTENT_RE =
  /^(?:next\s+(?:chapter|scene)[.!?]?)$|\b(?:(?:let'?s\s+)?move\s+(?:on\s+to|to)\s+(?:the\s+)?next(?:\s+(?:chapter|scene))?|(?:let'?s\s+)?(?:do|start|review)\s+(?:the\s+)?next\s+(?:chapter|scene)|ready\s+for\s+(?:the\s+)?next(?:\s+(?:chapter|scene))?|next\s+(?:chapter|scene)\s+please|continue(?:\s+to\s+the\s+next(?:\s+(?:chapter|scene))?)?|let'?s\s+continue)\b/i;

const ONES = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];

const TENS = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

const ONES_MAP = ONES.reduce((acc, word, i) => {
  acc[word] = i;
  return acc;
}, {});

const parseWordChapterNumber = (rest) => {
  let remaining = String(rest || "").trim();
  let value = 0;
  let sawNumber = false;

  while (remaining) {
    const wm = remaining.match(/^([a-z]+)([^a-z]*)/i);
    if (!wm) break;
    const word = wm[1].toLowerCase();
    if (word in ONES_MAP) {
      value += ONES_MAP[word];
    } else if (word in TENS) {
      value += TENS[word];
    } else {
      break;
    }
    sawNumber = true;
    remaining = remaining.slice(wm[0].length);
  }

  return sawNumber && value > 0
    ? { number: value, remainder: remaining.trim() }
    : null;
};

const parseChapterLetterSuffix = (remainder) => {
  const trimmed = String(remainder || "").trim();
  if (!trimmed) return { suffix: "", remainder: "" };
  if (/^(POV|Timeline)\b/i.test(trimmed)) {
    return { suffix: "", remainder: trimmed };
  }
  const m = trimmed.match(/^[-–—\s]*([A-Za-z])(?![A-Za-z])(.*)$/);
  if (!m) return { suffix: "", remainder: trimmed };
  return {
    suffix: m[1].toUpperCase(),
    remainder: String(m[2] || "").trim(),
  };
};

/** Parse chapter number + optional letter suffix from text after "chapter ". */
export const parseChapterRefFromRest = (rest) => {
  const trimmed = String(rest || "").trim();
  const digitMatch = trimmed.match(/^(\d{1,3}(?:\.\d+)?)(.*)$/);
  if (digitMatch && /^\d/.test(trimmed)) {
    const num = Number(digitMatch[1]);
    if (!Number.isFinite(num) || num < 1) return null;
    const { suffix } = parseChapterLetterSuffix(digitMatch[2]);
    return { chapterNumber: num, chapterSuffix: suffix };
  }
  const wordParsed = parseWordChapterNumber(trimmed);
  if (!wordParsed) return null;
  const { suffix } = parseChapterLetterSuffix(wordParsed.remainder);
  return { chapterNumber: wordParsed.number, chapterSuffix: suffix };
};

/**
 * Parse chapter number + optional letter suffix from Ellis chat phrasing.
 * Accepts common misspellings (hapter, chpater) and shorthand (ch 8).
 * @returns {{ chapterNumber: number, chapterSuffix: string } | null}
 */
export const parseEllisChapterRef = (text) => {
  const raw = String(text || "").trim();
  if (!raw) return null;

  for (const prefix of [
    START_CHAPTER_PREFIX,
    FOCUS_CHAPTER_PREFIX,
    POLITE_REVIEW_CHAPTER_PREFIX,
  ]) {
    const prefixMatch = raw.match(prefix);
    if (prefixMatch) {
      const ref = parseChapterRefFromRest(raw.slice(prefixMatch[0].length));
      if (ref) return ref;
    }
  }

  const fuzzyDigit = raw.match(
    new RegExp(`\\b${FUZZY_CHAPTER_WORD.source}(\\d{1,3}(?:\\.\\d+)?)([A-Za-z])?\\b`, "i")
  );
  if (fuzzyDigit) {
    const num = Number(fuzzyDigit[1]);
    if (Number.isFinite(num) && num > 0) {
      return {
        chapterNumber: num,
        chapterSuffix: normalizeChapterSuffix(fuzzyDigit[2]),
      };
    }
  }

  const fuzzyWord = raw.match(
    new RegExp(`\\b${FUZZY_CHAPTER_WORD.source}([a-z][a-z\\s-]*)`, "i")
  );
  if (fuzzyWord) {
    return parseChapterRefFromRest(fuzzyWord[1]);
  }

  return parseEllisBareChapterRef(raw);
};

/**
 * Whole-message chapter shorthand (e.g. "Eleven", "11", "seven").
 * @returns {{ chapterNumber: number, chapterSuffix: string } | null}
 */
export const parseEllisBareChapterRef = (message) => {
  const raw = String(message || "").trim();
  if (!raw || raw.length > 32) return null;
  if (AFFIRMATION_RE.test(raw)) return null;
  if (ADVANCE_INTENT_RE.test(raw)) return null;
  if (CHANGE_REQUEST_RE.test(raw)) return null;
  if (
    START_CHAPTER_PREFIX.test(raw) ||
    FOCUS_CHAPTER_PREFIX.test(raw) ||
    POLITE_REVIEW_CHAPTER_PREFIX.test(raw)
  ) {
    return null;
  }
  if (new RegExp(`^${FUZZY_CHAPTER_WORD.source}`, "i").test(raw)) return null;

  if (/^(\d{1,3}(?:\.\d+)?)([A-Za-z])?$/.test(raw)) {
    return parseChapterRefFromRest(raw);
  }

  const wordParsed = parseWordChapterNumber(raw);
  if (wordParsed && !wordParsed.remainder) {
    return parseChapterRefFromRest(raw);
  }

  return null;
};

export const parseEllisChapterNumber = (text) =>
  parseEllisChapterRef(text)?.chapterNumber ?? null;

const CHAPTER_HEADER_RE = /^\s*chapter\b/i;

const OLIVIA_COACHING_MARKERS =
  /(?:Scene Title\s*:|📘|📝|📏|Target Word Count|Scene to Write|Book Coaching for Scene)/i;

export const isSceneBreakOrnamentLine = (line) => {
  const text = String(line || "").trim();
  if (!text) return false;

  const normalized = text.replace(/\s+/g, " ");

  if (/^[\*\s]+$/.test(normalized)) {
    const count = (normalized.match(/\*/g) || []).length;
    if (count >= 2) return true;
  }

  if (/^[\#\s]+$/.test(normalized)) {
    const count = (normalized.match(/#/g) || []).length;
    if (count >= 2) return true;
  }

  const dashOnly = normalized.replace(/\s/g, "");
  if (/^[-–—]+$/.test(dashOnly) && dashOnly.length >= 3) return true;

  if (/^[•·\s]+$/.test(normalized)) {
    const count = (normalized.match(/[•·]/g) || []).length;
    if (count >= 2) return true;
  }

  return false;
};

const looksLikeSceneTitleLine = (line) => {
  const text = String(line || "").trim();
  if (!text) return false;
  if (isSceneBreakOrnamentLine(text)) return false;
  if (CHAPTER_HEADER_RE.test(text)) return false;
  if (OLIVIA_COACHING_MARKERS.test(text)) return false;
  if (/^["'“‘]/.test(text)) return false;
  if (/[.!?]["'”’]?\s*$/.test(text)) return false;

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 1 || words.length > 12) return false;
  if (text.includes(":")) return false;

  return true;
};

const normalizeComparableText = (value = "") =>
  String(value).replace(/\s+/g, " ").trim();

const firstParagraphMatchesStoredTitle = (firstText, { sceneTitle, chapterLabel } = {}) => {
  const needle = normalizeComparableText(firstText);
  if (!needle) return false;
  return [sceneTitle, chapterLabel]
    .map((value) => normalizeComparableText(value))
    .filter(Boolean)
    .some(
      (title) =>
        title.localeCompare(needle, undefined, { sensitivity: "accent" }) === 0
    );
};

/**
 * Display-only: strip a leading scene-title paragraph from stored chapter HTML.
 * The live editor must use `matchExactTitleOnly` so a writer's first sentence
 * (short, no period yet) is not peeled off as if it were a scene title.
 */
export const stripLeadingSceneTitleFromHtml = (
  html = "",
  { sceneTitle, chapterLabel, matchExactTitleOnly = false } = {}
) => {
  const source = String(html || "");
  if (!source.trim()) return source;

  const blockMatch = source.match(/^\s*(<p[^>]*>[\s\S]*?<\/p>)\s*/i);
  if (!blockMatch) return source;

  const firstText = normalizeComparableText(
    blockMatch[1].replace(/<[^>]+>/g, " ")
  );
  if (!firstText) return source;

  const titleMatch = firstParagraphMatchesStoredTitle(firstText, {
    sceneTitle,
    chapterLabel,
  });
  if (titleMatch) {
    return source.slice(blockMatch[0].length).trimStart();
  }
  if (matchExactTitleOnly || !looksLikeSceneTitleLine(firstText)) {
    return source;
  }

  return source.slice(blockMatch[0].length).trimStart();
};

/** Remove scene-break ornament paragraphs from stored chapter HTML. */
export const stripSceneBreakOrnamentsFromHtml = (html = "") => {
  const source = String(html || "");
  if (!source.trim()) return source;

  return source
    .replace(/<p[^>]*>[\s\S]*?<\/p>\s*/gi, (block) => {
      const text = normalizeComparableText(block.replace(/<[^>]+>/g, " "));
      return isSceneBreakOrnamentLine(text) ? "" : block;
    })
    .trim();
};

/** Remove empty Quill paragraphs (<p><br></p>, etc.) that double-stack with paragraph spacing. */
export const trimDeadParagraphBreaks = (html = "") => {
  const source = String(html || "");
  if (!source.trim()) return source;

  return source.replace(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/gi, (block, inner) => {
    const normalized = inner
      .replace(/<br\s*\/?>/gi, "")
      .replace(/&nbsp;/gi, "")
      .replace(/\u00a0/g, "")
      .trim();
    return normalized === "" ? "" : block;
  });
};

export { preserveLeadingIndentation } from "../../utils/preserveLeadingIndentation.js";

/** Display-only: strip scene titles and scene-break ornaments from chapter HTML. */
export const stripUploadedManuscriptDisplayHtml = (
  html = "",
  {
    sceneTitle,
    chapterLabel,
    preserveBlankParagraphs = false,
    matchExactTitleOnly = false,
    stripLeadingTitle = true,
  } = {}
) => {
  const withoutTitle = stripLeadingTitle
    ? stripLeadingSceneTitleFromHtml(html, {
        sceneTitle,
        chapterLabel,
        matchExactTitleOnly,
      })
    : html;
  const stripped = stripSceneBreakOrnamentsFromHtml(withoutTitle);
  return preserveBlankParagraphs ? stripped : trimDeadParagraphBreaks(stripped);
};

/**
 * HTML to use for per-chapter word counts — same ornament cleanup as display,
 * but the first paragraph is kept so counts match the editor.
 * When the editor is synced for this chapter, uses live content even if empty
 * (does not fall back to stored userContent).
 */
export const getChapterHtmlForWordCount = (
  sceneData,
  {
    isUploadedManuscript = false,
    liveContent = null,
    contentSceneId = null,
    selectedSceneId = null,
    storyResponseFallback = "",
  } = {}
) => {
  const sceneId = sceneData?._id ?? null;
  const contentSynced =
    contentSceneId != null &&
    selectedSceneId != null &&
    contentSceneId === sceneId &&
    selectedSceneId === sceneId;

  let html;
  if (contentSynced && liveContent != null) {
    html = liveContent;
  } else {
    html = sceneData?.userContent || storyResponseFallback || "";
  }

  if (isUploadedManuscript) {
    html = stripUploadedManuscriptDisplayHtml(html, {
      sceneTitle: sceneData?.sceneTitle,
      stripLeadingTitle: false,
    });
  }

  return html;
};

export const countChapterWords = (sceneData, options) =>
  countWordsFromHtml(getChapterHtmlForWordCount(sceneData, options));
