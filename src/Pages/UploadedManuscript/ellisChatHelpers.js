import {
  normalizeChapterSuffix,
  parseEllisChapterRef,
} from "./utils.js";

/** Standalone / hybrid section names (mirrors BE manuscriptParser STANDALONE_SECTION_NAMES). */
export const ELLIS_STANDALONE_SECTION_NAMES = [
  "prologue",
  "epilogue",
  "interlude",
  "letter",
  "introduction",
  "afterword",
  "prelude",
  "coda",
];

const formatEllisSectionTitle = (name) =>
  String(name || "")
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

/** Front matter (0), narrative (1+), and back matter — any finite chapterNumber. */
export const isEllisManuscriptChapterNumber = (value) =>
  Number.isFinite(Number(value));

export const ELLIS_CHAPTER_REVIEW_TRIGGER_KIND = "ellis_chapter_review_trigger";
export const ELLIS_SCENE_WELCOME_KIND = "ellis_scene_welcome";
export const ELLIS_INSERT_CONFIRM_KIND = "ellis_insert_confirm";
export const ELLIS_CHAPTER_REVIEW_KIND = "ellis_chapter_review";
export const ELLIS_REVISION_REVIEW_KIND = "ellis_revision_review";
export const ELLIS_CONVERSATIONAL_KIND = "ellis_conversational";

/** Post-delivery footer on a first-pass chapter review (Insert still available). */
export const ELLIS_CHAPTER_REVIEW_FOOTER_TEXT =
  "*👉 Chapter feedback complete.* Do you have any questions for me? If I missed something important, tell me and we can talk it through. **If this revision direction feels right, click 👉 Insert to Revision Plan.** You can also add any extra notes or ideas in Chapter Notes. When you're ready, let me know and we'll move to the next chapter.";

/** Footer after the writer has inserted this chapter review into the Revision Plan. */
export const ELLIS_CHAPTER_REVIEW_POST_INSERT_FOOTER_TEXT =
  "*👉 Chapter feedback complete.* Do you have any questions for me? If I missed something important, tell me and we can talk it through. You can also add any extra notes or ideas in Chapter Notes. When you're ready, let me know and we'll move to the next chapter.";

/** Pick pre- vs post-insert footer copy for a chapter review row. */
export const getEllisChapterReviewFooterText = (alreadySaved) =>
  alreadySaved
    ? ELLIS_CHAPTER_REVIEW_POST_INSERT_FOOTER_TEXT
    : ELLIS_CHAPTER_REVIEW_FOOTER_TEXT;

export const getEllisInsertButtonLabel = () => "Insert to Revision Plan";

/** Whether the Insert to Revision Plan button should render for a review row. */
export const shouldShowEllisInsertButton = ({
  isReviewMessage = false,
  isAssistant = false,
  isStreamingRow = false,
  alreadySaved = false,
  isInserting = false,
  hasInsertHandler = false,
} = {}) =>
  Boolean(
    isReviewMessage &&
      isAssistant &&
      !isStreamingRow &&
      (!alreadySaved || isInserting) &&
      hasInsertHandler
  );

const isEllisOptimisticMessageId = (id) => {
  const s = String(id || "");
  return s.startsWith("user-") || s.startsWith("assistant-");
};

/**
 * Drop optimistic user rows once a persisted copy of *this* send is in the
 * list. History merges by id, so `user-${Date.now()}` otherwise sits next to
 * the server row after a refetch. A later optimistic row with the same text
 * as an *older* persisted message is kept (the writer repeated themselves).
 * Returns `messages` unchanged when nothing is dropped (scroll stability).
 */
export const dropEllisOptimisticDuplicates = (messages = []) => {
  if (!Array.isArray(messages) || messages.length < 2) return messages;

  const newestUserByText = new Map();
  for (const m of messages) {
    if (m?.role !== "user" || !m.id) continue;
    const text = String(m.text || "");
    const prev = newestUserByText.get(text);
    const ts = m.sortTs || 0;
    const prevTs = prev?.sortTs || 0;
    if (!prev || ts > prevTs) {
      newestUserByText.set(text, m);
      continue;
    }
    if (ts === prevTs && !isEllisOptimisticMessageId(m.id)) {
      newestUserByText.set(text, m);
    }
  }

  const keptOptimisticText = new Set();
  let dropped = false;
  const kept = [];
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m?.role === "user" && isEllisOptimisticMessageId(m.id)) {
      const text = String(m.text || "");
      const newest = newestUserByText.get(text);
      const newestIsPersisted =
        newest && !isEllisOptimisticMessageId(newest.id);
      if (newestIsPersisted || keptOptimisticText.has(text)) {
        dropped = true;
        continue;
      }
      keptOptimisticText.add(text);
    }
    kept.push(m);
  }
  if (!dropped) return messages;
  kept.reverse();
  return kept;
};

/** Oldest persisted row — used as the `before` cursor for earlier pages. */
export const oldestEllisServerHistoryRow = (messages = []) => {
  let oldest = null;
  for (const m of messages) {
    if (!m?.id || isEllisOptimisticMessageId(m.id)) continue;
    if (!oldest || (m.sortTs || 0) < (oldest.sortTs || 0)) oldest = m;
  }
  return oldest;
};

const ellisHistoryRowLooksSame = (prev, incoming) =>
  prev.text === incoming.text &&
  prev.sortTs === incoming.sortTs &&
  prev.role === incoming.role &&
  prev.timestamp === incoming.timestamp;

/**
 * Merge a history page into the open thread without dropping earlier pages
 * the writer already loaded. Incoming wins on the same id (fresher server
 * copy). Sort by sortTs so prepended older rows stay above.
 * Returns `existing` unchanged when the incoming page adds nothing — so a
 * latest-page refetch does not rebuild the list (and retrigger scroll).
 */
export const mergeEllisHistoryRows = (incoming = [], existing = []) => {
  const byId = new Map();
  for (const m of existing) {
    if (!m?.id) continue;
    byId.set(String(m.id), m);
  }
  let changed = false;
  for (const m of incoming) {
    if (!m?.id) continue;
    const id = String(m.id);
    const prev = byId.get(id);
    if (!prev) {
      byId.set(id, m);
      changed = true;
      continue;
    }
    if (ellisHistoryRowLooksSame(prev, m)) continue;
    byId.set(id, { ...prev, ...m });
    changed = true;
  }
  if (!changed) return dropEllisOptimisticDuplicates(existing);
  return dropEllisOptimisticDuplicates(
    [...byId.values()].sort((a, b) => (a.sortTs || 0) - (b.sortTs || 0))
  );
};

/** Union local + server saved review message ids (stale getABook cannot drop fresh inserts). */
export const mergeEllisSavedReviewMessageIds = (prev = [], fromServer = []) => {
  const local = (Array.isArray(prev) ? prev : []).map((x) => String(x));
  const server = (Array.isArray(fromServer) ? fromServer : []).map((x) =>
    String(x)
  );
  return [...new Set([...local, ...server])];
};

const LEGACY_CHAPTER_REVIEW_USER_PREFIX =
  "Produce the structured Scene Architect review for the following chapter only";

const MIN_REVIEW_TEXT_LENGTH = 400;

/**
 * Scene Architect section headers as they appear in a real Output Standard:
 * each block leads with the label on its own line (optionally prefixed by
 * markdown ### / ** or the section emoji). Prose that merely name-drops
 * "your Scene Analysis" mid-sentence is NOT a header and will not match, so
 * this separates a real pass from conversation that cites the label names.
 */
const ELLIS_REVIEW_HEADER_LINE_PREFIX =
  "^[ \\t]*(?:[-*•][ \\t]+)?(?:#{1,6}[ \\t]*)?\\*{0,2}[ \\t]*";

const ELLIS_REVIEW_HEADER_MARKERS = {
  functionInStory: new RegExp(
    `${ELLIS_REVIEW_HEADER_LINE_PREFIX}Function in Story\\b`,
    "im"
  ),
  genreBeatCheck: new RegExp(
    `${ELLIS_REVIEW_HEADER_LINE_PREFIX}Genre Beat Check\\b`,
    "im"
  ),
  sceneAnalysis: new RegExp(
    `${ELLIS_REVIEW_HEADER_LINE_PREFIX}(?:🔍[ \\t]*)?Scene Analysis\\b`,
    "im"
  ),
  creativeSuggestions: new RegExp(
    `${ELLIS_REVIEW_HEADER_LINE_PREFIX}(?:🎨[ \\t]*)?Creative Suggestions?\\b`,
    "im"
  ),
};

const ELLIS_REVIEW_SECTION_HEADER_NAMES =
  "(?:🔍\\s*|🎨\\s*|📌\\s*)?(?:Function in Story|Genre Beat Check|Scene Analysis|Creative Suggestions|Chapter Cumulative Editorial Note)";

/**
 * Long custom openers often glue the first section onto the same line
 * (`Epilogue - September 1936 – POV: Myla Function in Story: …`). Lift those
 * headers so detection sees real section lines, not one long prose paragraph.
 */
export const liftEllisReviewSectionHeaders = (text) => {
  let out = String(text || "");
  const afterPov = new RegExp(
    `([–—-]\\s*POV\\s*:\\s*[^\\n]*?\\S)[ \\t]+(\\*{0,2}(?:#{1,6}\\s+)?(?:[-*•]\\s+)?${ELLIS_REVIEW_SECTION_HEADER_NAMES}\\b)`,
    "gi"
  );
  out = out.replace(afterPov, "$1\n\n$2");

  const midHeader = new RegExp(
    `([^\\n])[ \\t]+(\\*{0,2}(?:#{1,6}\\s+)?(?:[-*•]\\s+)?${ELLIS_REVIEW_SECTION_HEADER_NAMES}\\b)(?=[ \\t]*:|[ \\t]+[A-Z])`,
    "g"
  );
  let prev = "";
  while (out !== prev) {
    prev = out;
    out = out.replace(midHeader, "$1\n\n$2");
  }
  return out;
};

/** How many distinct Output Standard section headers lead their own line. */
const countEllisReviewHeaders = (text) =>
  Object.values(ELLIS_REVIEW_HEADER_MARKERS).filter((re) => re.test(text))
    .length;

const ELLIS_CONTAINMENT_CLOSE_RE = /we've pressure-tested this chapter/i;

/** Remove legacy copy-to-Word workflow lines the model may still emit. */
export const stripEllisLegacyWorkflowCta = (text) =>
  String(text || "")
    .replace(
      /Scene complete! Click the copy icon[\s\S]*?ready for the next scene\.?\s*/gi,
      ""
    )
    .trim();

/** Negative signal: containment-close phrasing from follow-up protocol. */
export const isEllisConversationalCloseText = (text) =>
  ELLIS_CONTAINMENT_CLOSE_RE.test(String(text || ""));

/**
 * True when text is a Scene Architect kickoff (full or truncated).
 * Detection is structural: the two mandatory section headers (Function in
 * Story, Genre Beat Check) must each lead their own line, plus at least three
 * distinct section headers overall. This tolerates a review that stops before
 * the Chapter Cumulative Editorial Note, while rejecting conversation that only
 * name-drops the section labels in prose.
 */
export const isEllisDevelopmentalReviewText = (text) => {
  const t = liftEllisReviewSectionHeaders(stripEllisLegacyWorkflowCta(text));
  if (t.length < MIN_REVIEW_TEXT_LENGTH) return false;
  if (isEllisConversationalCloseText(t)) return false;
  if (!ELLIS_REVIEW_HEADER_MARKERS.functionInStory.test(t)) return false;
  if (!ELLIS_REVIEW_HEADER_MARKERS.genreBeatCheck.test(t)) return false;
  return countEllisReviewHeaders(t) >= 3;
};

/** Heuristic while a review is still streaming (early kickoff shape only). */
export const isPartialEllisDevelopmentalReview = (text) => {
  const t = liftEllisReviewSectionHeaders(String(text || "").trim());
  if (t.length < 120) return false;
  if (!ELLIS_REVIEW_HEADER_MARKERS.functionInStory.test(t)) return false;
  return countEllisReviewHeaders(t) >= 2;
};

/** True for assistant messages that are full chapter reviews (not follow-ups). */
export const isEllisDevelopmentalReviewMessage = (msg) => {
  if (!msg || msg.role !== "assistant") return false;
  const kind = msg.metadata?.kind;
  if (
    kind === ELLIS_INSERT_CONFIRM_KIND ||
    kind === ELLIS_SCENE_WELCOME_KIND ||
    kind === ELLIS_REVISION_REVIEW_KIND
  ) {
    return false;
  }
  const text = msg.text || msg.content || "";
  if (kind === ELLIS_CHAPTER_REVIEW_KIND) {
    return (
      isEllisDevelopmentalReviewText(text) ||
      isPartialEllisDevelopmentalReview(text)
    );
  }
  return isEllisDevelopmentalReviewText(text);
};

/** Insert CTAs only — tagged first-pass rows, never revision-check or Q&A. */
export const isEllisTaggedReviewMessage = (msg) => {
  if (!msg || msg.role !== "assistant") return false;
  return msg.metadata?.kind === ELLIS_CHAPTER_REVIEW_KIND;
};

/** User rows hidden from Ellis' chat UI (coach triggers + legacy bundled chapter text). */
export const isEllisHiddenUserMessage = (msg) => {
  if (!msg || msg.role !== "user") return false;
  if (msg.hiddenFromUi) return true;
  if (msg.metadata?.kind === ELLIS_CHAPTER_REVIEW_TRIGGER_KIND) return true;
  const text = String(msg.text || msg.content || "").trim();
  if (/^Review .+ — developmental edit pass$/i.test(text)) return true;
  if (text.includes(LEGACY_CHAPTER_REVIEW_USER_PREFIX)) return true;
  return false;
};

/** @deprecated Legacy JSON reviews — use isEllisDevelopmentalReviewText instead. */
export const isEllisChapterReview = (text) =>
  isEllisDevelopmentalReviewText(text);

export const formatEllisMessageTime = (ts) =>
  ts
    ? new Date(ts).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

export const mapEllisApiMessageToRow = (msg) => {
  const row = {
    id: String(msg._id || msg.id || msg.timestamp || ""),
    role: msg.role,
    text: msg.content || msg.text || "",
    timestamp: formatEllisMessageTime(msg.timestamp || msg.created_at),
    sortTs: msg.timestamp
      ? new Date(msg.timestamp).getTime()
      : msg.created_at
        ? new Date(msg.created_at).getTime()
        : 0,
    metadata: msg.metadata || null,
  };
  if (Array.isArray(msg.attachments) && msg.attachments.length > 0) {
    row.attachments = msg.attachments;
  }
  if (isEllisHiddenUserMessage(row)) {
    row.hiddenFromUi = true;
  }
  if (row.metadata?.kind === ELLIS_SCENE_WELCOME_KIND) {
    row.isWelcome = true;
  }
  return row;
};

export const isEllisWelcomeMessage = (message) =>
  message?.metadata?.kind === ELLIS_SCENE_WELCOME_KIND || Boolean(message?.isWelcome);

/**
 * Parse the base chapter number from a Scene Architect review header.
 * Scene labels like "Chapter Ten A" map to base chapter 10 only (suffix ignored).
 * @returns {{ chapterNumber: number, chapterSuffix: string } | null}
 */
export const parseEllisReviewBaseChapterFromContent = (text) => {
  const lines = String(text || "")
    .trim()
    .split(/\r?\n/)
    .slice(0, 6)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const ref = parseEllisChapterRef(line);
    if (Number.isFinite(ref?.chapterNumber)) {
      return { chapterNumber: ref.chapterNumber, chapterSuffix: "" };
    }
  }

  if (lines.length > 0) {
    const ref = parseEllisChapterRef(lines.join("\n"));
    if (Number.isFinite(ref?.chapterNumber)) {
      return { chapterNumber: ref.chapterNumber, chapterSuffix: "" };
    }
  }

  return null;
};

/**
 * Parse a standalone section label (Prologue, Epilogue, etc.) from a review header.
 * @returns {string | null}
 */
export const parseEllisReviewSectionLabelFromContent = (text) => {
  const lines = String(text || "")
    .trim()
    .split(/\r?\n/)
    .slice(0, 6)
    .map((line) => line.trim())
    .filter(Boolean);

  const namePattern = ELLIS_STANDALONE_SECTION_NAMES.map((n) =>
    n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  ).join("|");
  const standaloneRe = new RegExp(
    `^\\s*(${namePattern})\\s*[:\\-.]?\\s*$`,
    "i"
  );
  const customTitleRe = new RegExp(
    `^(${namePattern})(?:\\b|[\\s–—\\-:,]|$)`,
    "i"
  );

  for (const line of lines) {
    const cleaned = String(line)
      .replace(/^\s*#{1,6}\s+/, "")
      .replace(/\*+/g, "")
      .replace(
        /\s+\*{0,2}(?:Function in Story|Genre Beat Check|Scene Analysis|Creative Suggestions)\b.*$/i,
        ""
      )
      .trim();
    const withPov = cleaned.match(/^(.+?)\s*[–—-]\s*POV\s*:/i);
    const title = (withPov ? withPov[1] : cleaned).trim();
    if (title && customTitleRe.test(title) && !/^chapter\s+/i.test(title)) {
      return title;
    }
    const m = cleaned.match(standaloneRe);
    if (m) return formatEllisSectionTitle(m[1]);
  }
  return null;
};

const findChapterRefByLabel = (chapters = [], label) => {
  const norm = String(label || "").trim().toLowerCase();
  if (!norm || !chapters.length) return null;

  const candidatesOf = (c) =>
    [c.chapterLabel, c.label, c.sceneTitle]
      .filter(Boolean)
      .map((x) => String(x).trim().toLowerCase());

  const exact = chapters.find((c) => candidatesOf(c).includes(norm));
  const prefixHits =
    !exact && norm.length >= 3
      ? chapters.filter((c) =>
          candidatesOf(c).some(
            (key) =>
              key.startsWith(`${norm} -`) ||
              key.startsWith(`${norm} –`) ||
              key.startsWith(`${norm} —`) ||
              key.startsWith(`${norm}:`)
          )
        )
      : [];
  const row = exact || (prefixHits.length === 1 ? prefixHits[0] : null);
  if (!row || !isEllisManuscriptChapterNumber(row.chapterNumber)) return null;

  return {
    chapterNumber: Number(row.chapterNumber),
    chapterSuffix: normalizeChapterSuffix(row.chapterSuffix) || "",
  };
};

/**
 * Chapter ref to use when saving a review via Insert to Revision Plan.
 * Prefers the review header text, then kickoff metadata, then UI focus fallbacks.
 * @returns {{ chapterNumber: number, chapterSuffix: string } | null}
 */
export const resolveEllisInsertChapterRef = (
  message,
  {
    selectedChapterNumber,
    selectedChapterSuffix: _selectedChapterSuffix,
    selectedChapterLabel,
    targetChapterNumber,
    targetChapterSuffix: _targetChapterSuffix,
    chapters = [],
  } = {}
) => {
  const reviewText = message?.text || message?.content || "";
  const contentRef = parseEllisReviewBaseChapterFromContent(reviewText);
  if (contentRef) {
    return contentRef;
  }

  const sectionLabel = parseEllisReviewSectionLabelFromContent(reviewText);
  if (sectionLabel) {
    const bySection = findChapterRefByLabel(chapters, sectionLabel);
    if (bySection) return bySection;
  }

  const metaNum = Number(message?.metadata?.chapterNumber);
  if (
    message?.metadata?.kind === ELLIS_CHAPTER_REVIEW_KIND &&
    isEllisManuscriptChapterNumber(metaNum)
  ) {
    return {
      chapterNumber: metaNum,
      chapterSuffix: "",
    };
  }

  const selectedNum = Number(selectedChapterNumber);
  if (isEllisManuscriptChapterNumber(selectedNum)) {
    return {
      chapterNumber: selectedNum,
      chapterSuffix: "",
    };
  }

  if (selectedChapterLabel) {
    const bySelectedLabel = findChapterRefByLabel(
      chapters,
      selectedChapterLabel
    );
    if (bySelectedLabel) return bySelectedLabel;
  }

  const targetNum = Number(targetChapterNumber);
  if (isEllisManuscriptChapterNumber(targetNum)) {
    return {
      chapterNumber: targetNum,
      chapterSuffix: "",
    };
  }

  return null;
};

export const resolveEllisInsertChapterNumber = (message, options = {}) =>
  resolveEllisInsertChapterRef(message, options)?.chapterNumber ?? null;

/**
 * Title from a Scene Architect opener ("Bridge Scene – POV: Name").
 * Added chapters often use a custom label, not "Chapter N".
 */
export const parseEllisReviewOpenerTitle = (text) => {
  const first = String(text || "")
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  if (!first) return null;
  const stripped = first
    .replace(/\*+/g, "")
    .replace(
      /\s+\*{0,2}(?:Function in Story|Genre Beat Check|Scene Analysis|Creative Suggestions)\b.*$/i,
      ""
    )
    .trim();
  const withPov = stripped.match(/^(.+?)\s*[–—-]\s*POV\s*:/i);
  const title = (withPov ? withPov[1] : stripped).trim();
  return title || null;
};

/**
 * Kind + chapter identity to stamp on the streaming placeholder from SSE
 * turnNavigation, so Insert grouping does not wait on the (large) done event.
 */
export const buildEllisKickoffPlaceholderMetadata = (nav) => {
  if (!nav?.kickoff || !nav.chapterId) return null;
  const isRevision =
    nav.action === "revision_review" ||
    nav.source === "revision_history_intent";
  const chapterNumber = Number(nav.chapterNumber);
  return {
    kind: isRevision ? ELLIS_REVISION_REVIEW_KIND : ELLIS_CHAPTER_REVIEW_KIND,
    chapterId: String(nav.chapterId),
    ...(isEllisManuscriptChapterNumber(chapterNumber)
      ? { chapterNumber }
      : {}),
    chapterSuffix: nav.chapterSuffix || "",
  };
};

/**
 * Stable grouping key for a review message's chapter, used to dedupe repeated
 * reviews of the same chapter (only the latest should be insertable, and once a
 * chapter is saved every review of it renders as saved). Prefers metadata
 * (chapterId, then chapterNumber), then the review header text. Deliberately
 * does NOT fall back to the UI-selected chapter, which would misgroup rows.
 * @returns {string | null}
 */
export const resolveEllisReviewMessageChapterKey = (message, chapters = []) => {
  const meta = message?.metadata;
  if (meta?.chapterId) return `id:${String(meta.chapterId)}`;
  const metaNum = Number(meta?.chapterNumber);
  if (isEllisManuscriptChapterNumber(metaNum)) return `num:${metaNum}`;

  const text = message?.text || message?.content || "";
  const openerTitle = parseEllisReviewOpenerTitle(text);
  if (openerTitle) {
    const byOpener = findChapterRefByLabel(chapters, openerTitle);
    if (byOpener) return `num:${byOpener.chapterNumber}`;
  }
  const contentRef = parseEllisReviewBaseChapterFromContent(text);
  if (contentRef) return `num:${contentRef.chapterNumber}`;

  const label = parseEllisReviewSectionLabelFromContent(text);
  if (label) {
    const byLabel = findChapterRefByLabel(chapters, label);
    if (byLabel) return `num:${byLabel.chapterNumber}`;
  }
  return null;
};

/**
 * Message ids whose review row should show an active Insert CTA.
 * First-pass reviews are insertable only when that chapter is not already in
 * the original Revision Plan. Conversational revision checks are never insertable.
 * @returns {string[]}
 */
export const computeEllisInsertableReviewMessageIds = (
  messages = [],
  savedReviewMessageIds = [],
  chapters = [],
  { readyChapterNumbers = new Set() } = {}
) => {
  const latestFirstPassByKey = new Map();
  const savedFirstPassKeys = new Set();
  const savedIdSet = new Set(
    (Array.isArray(savedReviewMessageIds) ? savedReviewMessageIds : []).map((x) =>
      String(x)
    )
  );
  const readySet =
    readyChapterNumbers instanceof Set
      ? readyChapterNumbers
      : new Set(readyChapterNumbers);

  for (const m of messages) {
    if (!m || m.role !== "assistant") continue;
    const kind = m.metadata?.kind;
    if (
      kind === ELLIS_REVISION_REVIEW_KIND ||
      kind === ELLIS_INSERT_CONFIRM_KIND ||
      kind === ELLIS_SCENE_WELCOME_KIND
    ) {
      continue;
    }
    const text = m.text || m.content || "";
    const tagged = kind === ELLIS_CHAPTER_REVIEW_KIND;
    if (tagged) {
      if (
        !isEllisDevelopmentalReviewText(text) &&
        !isPartialEllisDevelopmentalReview(text)
      ) {
        continue;
      }
    } else if (!isEllisDevelopmentalReviewText(text)) {
      continue;
    }
    const key = resolveEllisReviewMessageChapterKey(m, chapters);
    if (!key) continue;
    latestFirstPassByKey.set(key, String(m.id));
    if (savedIdSet.has(String(m.id))) savedFirstPassKeys.add(key);
    const metaNum = Number(m.metadata?.chapterNumber);
    if (Number.isFinite(metaNum) && readySet.has(metaNum)) {
      savedFirstPassKeys.add(key);
    }
  }

  const insertable = [];
  for (const [key, msgId] of latestFirstPassByKey.entries()) {
    if (savedFirstPassKeys.has(key)) continue;
    if (savedIdSet.has(msgId)) continue;
    insertable.push(msgId);
  }
  return insertable;
};

export const resolveEllisChapterLabel = (uc) => {
  if (uc?.chapterLabel) return uc.chapterLabel;
  if (uc?.sceneTitle) return uc.sceneTitle;
  const num = Number(uc?.chapterNumber);
  if (!Number.isFinite(num) || num < 1) return "Chapter";
  const suf = uc?.chapterSuffix ? String(uc.chapterSuffix).toUpperCase() : "";
  return `Chapter ${num}${suf ? ` ${suf}` : ""}`;
};


/** Strip HTML chapter draft to plain text (matches backend review payload check). */
export const stripEllisChapterHtmlToText = (html = "") =>
  String(html)
    .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

export const chapterHasEllisDraftContent = (userContent) =>
  stripEllisChapterHtmlToText(userContent).length > 0;

export const buildEllisEmptyChapterMessage = (chapterLabel = "This chapter") =>
  `**${chapterLabel}** doesn't have any draft content yet. Write or paste your chapter in the editor, then ask me to review it again.`;

/** Parse one SSE `data:` line from Ellis chat stream. */
export const parseEllisChatSsePayload = (line) => {
  const trimmed = String(line || "").trim();
  if (!trimmed.startsWith("data:")) return null;
  const payload = trimmed.slice(5).trim();
  if (!payload) return null;
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
};

/**
 * Split an SSE chunk into complete events; keep the trailing incomplete line.
 * The done payload includes the full review JSON, so it often sits in `rest`
 * until the next chunk — or until the stream closes without a trailing newline.
 */
export const consumeEllisChatSseChunk = (chunk) => {
  const lines = String(chunk || "").split("\n");
  const rest = lines.pop() || "";
  const events = [];
  for (const line of lines) {
    const data = parseEllisChatSsePayload(line);
    if (data) events.push(data);
  }
  return { events, rest };
};

/** Parse a leftover SSE buffer after the reader signals done. */
export const flushEllisChatSseRest = (rest) => {
  const trimmed = String(rest || "").trim();
  if (!trimmed) return null;
  return parseEllisChatSsePayload(
    trimmed.startsWith("data:") ? trimmed : `data: ${trimmed}`
  );
};

/**
 * Append a streamed token chunk onto the placeholder row without mapping
 * every prior message into a new object (keeps React.memo rows stable).
 */
export const appendEllisPlaceholderChunk = (
  messages = [],
  placeholderId,
  chunk
) => {
  if (!placeholderId || !chunk || !messages.length) return messages;
  const last = messages[messages.length - 1];
  if (last?.id === placeholderId) {
    const next = messages.slice();
    next[next.length - 1] = { ...last, text: `${last.text || ""}${chunk}` };
    return next;
  }
  let matched = false;
  const mapped = messages.map((m) => {
    if (m.id !== placeholderId) return m;
    matched = true;
    return { ...m, text: `${m.text || ""}${chunk}` };
  });
  return matched ? mapped : messages;
};
