import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { extractCharacterNameFromDossier } from "./characterDossierName";
import { chunkMarkdownForRender } from "./markdownChunks";

export { extractCharacterNameFromDossier };

export const getStoryResponseMap = (storyResponses = []) => {
  const map = {};
  storyResponses?.forEach((resp) => {
    if (resp.promptKey) map[resp.promptKey] = resp.responseText;
  });
  return map;
};

export {
  computeActOffsets,
  getGlobalSceneNumber,
  resolveGlobalChapterNumber,
  formatActChapterHeading,
} from "./sceneNumbering.js";

/** Coerce act number to a finite 1–3 value (defaults to 1). */
export const normalizeActNumber = (act) => {
  const n = Number(act);
  if (Number.isFinite(n) && n >= 1 && n <= 3) return n;
  return 1;
};

const compareSceneRows = (a, b) => {
  const ai = Number(a.sceneIndex);
  const bi = Number(b.sceneIndex);
  const aValid = Number.isFinite(ai) && ai >= 1;
  const bValid = Number.isFinite(bi) && bi >= 1;
  if (aValid && bValid && ai !== bi) return ai - bi;
  if (aValid && !bValid) return -1;
  if (!aValid && bValid) return 1;
  return String(a._id || "").localeCompare(String(b._id || ""));
};

/** Scenes in one act, sorted by sceneIndex then _id (active / non-archived only). */
export const scenesInActSorted = (userContents = [], actNumber) => {
  const act = normalizeActNumber(actNumber);
  return (userContents || [])
    .filter(
      (c) =>
        normalizeActNumber(c.actNumber) === act && !Boolean(c?.archivedAt)
    )
    .sort(compareSceneRows);
};

/** Highest valid 1-based sceneIndex in an act, or 0 if none. */
export const maxSceneIndexInAct = (userContents = [], actNumber) => {
  const sorted = scenesInActSorted(userContents, actNumber);
  let max = 0;
  for (const row of sorted) {
    const si = Number(row.sceneIndex);
    if (Number.isFinite(si) && si >= 1 && si > max) max = si;
  }
  return max;
};

/** Next safe 1-based sceneIndex when appending to an act. */
export const nextSceneIndexForAct = (userContents = [], actNumber) => {
  const max = maxSceneIndexInAct(userContents, actNumber);
  return max > 0 ? max + 1 : 1;
};

// ---------------------------------------------------------------------------
// Inline formatter — kept only for short outline sidebar title labels
// (formatTitle, formatSceneTitle). Full blocks use ReactMarkdown instead.
// ---------------------------------------------------------------------------

const formatInline = (text, lineIndex) => {
  if (!text) return text;

  const inlineRegex =
    /\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|___(.+?)___|__(.+?)__|_([^_]+)_|~~(.+?)~~|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g;

  const segments = [];
  let lastIndex = 0;
  let match;

  while ((match = inlineRegex.exec(text)) !== null) {
    const matchStart = match.index;

    if (matchStart > lastIndex) {
      segments.push(text.slice(lastIndex, matchStart));
    }

    const k = `${lineIndex}-${segments.length}`;

    if (match[1] !== undefined) {
      segments.push(<strong key={k}><em>{match[1]}</em></strong>);
    } else if (match[2] !== undefined) {
      segments.push(<strong key={k}>{match[2]}</strong>);
    } else if (match[3] !== undefined) {
      segments.push(<em key={k}>{match[3]}</em>);
    } else if (match[4] !== undefined) {
      segments.push(<strong key={k}><em>{match[4]}</em></strong>);
    } else if (match[5] !== undefined) {
      segments.push(<strong key={k}>{match[5]}</strong>);
    } else if (match[6] !== undefined) {
      segments.push(<em key={k}>{match[6]}</em>);
    } else if (match[7] !== undefined) {
      segments.push(<del key={k}>{match[7]}</del>);
    } else if (match[8] !== undefined) {
      segments.push(<code key={k}>{match[8]}</code>);
    } else if (match[9] !== undefined && match[10] !== undefined) {
      segments.push(
        <a key={k} href={match[10]} target="_blank" rel="noopener noreferrer">
          {match[9]}
        </a>
      );
    }

    lastIndex = matchStart + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push(text.slice(lastIndex));
  }

  return segments.length === 0 ? text : segments;
};

/** Format a short string (e.g. book/scene title) so * and ** render as italic/bold */
export const formatTitle = (text) => {
  if (!text) return null;
  return <span>{formatInline(String(text), 0)}</span>;
};

// ---------------------------------------------------------------------------
// ReactMarkdown component overrides
// ---------------------------------------------------------------------------

const baseComponents = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
};

/** Flatten react-markdown paragraph children to plain text for pattern checks. */
const flattenMarkdownChildrenToText = (children) => {
  if (children == null) return "";
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children.map(flattenMarkdownChildrenToText).join("");
  }
  if (React.isValidElement(children)) {
    return flattenMarkdownChildrenToText(children.props.children);
  }
  return "";
};

/** Olivia post-scene CTA (`OLIVIA_SCENE_POST_SCENE_CTA`) — keep **bold** visible in scene coaching UI. */
const isPostSceneCtaParagraph = (children) => {
  const text = flattenMarkdownChildrenToText(children);
  return (
    text.includes("👉") &&
    /Love this direction\?/i.test(text) &&
    /Save (?:Scene|Chapter) to Outline/i.test(text)
  );
};

/** Leading Scene Title / POV lines shown at the top of Olivia rich scene blocks. */
const isSceneDesignHeaderParagraph = (children) => {
  const text = flattenMarkdownChildrenToText(children).trim();
  return /^Scene Title\s*:/i.test(text) || /^POV\s*:/i.test(text);
};

// Scene Design: render `---` as the styled section separator hr
const sceneComponents = {
  ...baseComponents,
  hr: () => <hr className="scene-section-separator" />,
  p: ({ children, ...props }) => {
    const className = [
      isPostSceneCtaParagraph(children) ? "scene-post-scene-cta" : "",
      isSceneDesignHeaderParagraph(children) ? "scene-design-header-line" : "",
    ]
      .filter(Boolean)
      .join(" ") || undefined;
    return (
      <p className={className} {...props}>
        {children}
      </p>
    );
  },
};

// ---------------------------------------------------------------------------
// Pre-processor: insert `---` before known Olivia scene section headers so
// react-markdown renders them as <hr class="scene-section-separator" />.
// Also ensures section header labels render bold via CSS targeting
// `hr.scene-section-separator + p`.
// ---------------------------------------------------------------------------

// Combined "Significant Actions & Emotional Reactions" must appear before single-label alternatives
// so a one-line header matches as a whole (not truncated at the first parenthetical).
const SECTION_COMBINED_SIG_EMO =
  "(?:⚡\\s*)?Significant Actions(?:\\s*\\([^)]*\\))?\\s*&\\s*(?:💔\\s*)?Emotional Reactions(?:\\s*\\([^)]*\\))?";

const SECTION_HEADER_RE = new RegExp(
  `^(\\s*(?:[-*•]\\s+)?\\**\\s*(?:📘\\s*Book Coaching for Scene|Book Coaching for Scene|🎭\\s*Genre-Specific Coaching Note(?:\\s*\\([^)]*\\))?|Genre-Specific Coaching Note(?:\\s*\\([^)]*\\))?|🧩\\s*Subplot Reminder|Subplot Reminder|📝\\s*Scene to Write|Scene to Write|🏰\\s*Setting|Setting|${SECTION_COMBINED_SIG_EMO}|⚡\\s*Significant Actions(?:\\s*\\([^)]*\\))?|Significant Actions(?:\\s*\\([^)]*\\))?|💔\\s*Emotional Reactions(?:\\s*\\([^)]*\\))?|Emotional Reactions(?:\\s*\\([^)]*\\))?|🔗\\s*Subplot Tie-In|Subplot Tie-In|📈\\s*Character Arc Movement|Character Arc Movement)\\s*\\**(?:\\s*[:-]\\s*|\\s+|$))`,
  "i"
);

const SECTION_SPLIT_RE = new RegExp(
  `^\\s*(?:[-*•]\\s+)?\\**\\s*((?:📘\\s*)?Book Coaching for Scene|(?:🎭\\s*)?Genre-Specific Coaching Note(?:\\s*\\([^)]*\\))?|(?:🧩\\s*)?Subplot Reminder|(?:📝\\s*)?Scene to Write|(?:🏰\\s*)?Setting|${SECTION_COMBINED_SIG_EMO}|(?:⚡\\s*)?Significant Actions(?:\\s*\\([^)]*\\))?|(?:💔\\s*)?Emotional Reactions(?:\\s*\\([^)]*\\))?|(?:🔗\\s*)?Subplot Tie-In|(?:📈\\s*)?Character Arc Movement)\\s*\\**(?:\\s*[:-]\\s*|\\s+)?(.*)$`,
  "i"
);

const SECTION_LABELS = [
  "Book Coaching for Scene",
  "Genre-Specific Coaching Note",
  "Subplot Reminder",
  "Scene to Write",
  "Setting",
  "Significant Actions",
  "Emotional Reactions",
  "Subplot Tie-In",
  "Character Arc Movement",
];

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const stripSectionHeaderBold = (line) =>
  String(line)
    .replace(/^\s*/, "")
    .replace(/^\s*(?:[-*•]\s+)?\*+\s*/, "")
    .replace(/\s*\*+\s*$/, "")
    .trim();

const isSignificantActionsHeader = (stripped) =>
  /^(?:⚡\s*)?Significant Actions(?:\s*\([^)]*\))?$/i.test(stripped);

const isEmotionalReactionsHeader = (stripped) =>
  /^(?:💔\s*)?Emotional Reactions(?:\s*\([^)]*\))?$/i.test(stripped);

/** "(Scene Beats):" or "(Scene Beats)" on its own line after the main title */
const isOrphanSceneBeatsLine = (stripped) => /^\(Scene Beats\)/i.test(stripped);

/** "(Character Interiority):" split onto the next line after "Emotional Reactions" */
const isOrphanCharacterInteriorityLine = (stripped) =>
  /^\(Character Interiority\)/i.test(stripped);

/**
 * Olivia often emits Significant Actions / Emotional Reactions on separate lines, or
 * splits "(Scene Beats)" or "(Character Interiority)" onto the next line. Merge those
 * into one bold header line so they render on a single line with one hr + one label paragraph.
 */
/** Same line: `**💔 Emotional Reactions** (Character Interiority):` → one bold span */
const mergeInlineEmotionalReactionsParenthetical = (text) =>
  String(text || "").replace(
    /\*\*((?:💔\s*)?Emotional Reactions)\*\*(\s*\(Character Interiority\)[^*\n\r]+)/giu,
    (_, title, rest) => `**${title} ${rest.trim()}**`
  );

const mergeAdjacentSceneSectionHeaders = (text) => {
  let t = mergeInlineEmotionalReactionsParenthetical(text);
  const lines = t.replace(/\r\n?/g, "\n").split("\n");
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") {
      out.push(line);
      continue;
    }
    if (/&\s*💔/.test(line)) {
      out.push(line);
      continue;
    }

    const next = lines[i + 1];
    const next2 = lines[i + 2];
    const s0 = stripSectionHeaderBold(line);
    const s1 = next ? stripSectionHeaderBold(next) : "";
    const s2 = next2 ? stripSectionHeaderBold(next2) : "";

    if (
      next &&
      next2 &&
      isSignificantActionsHeader(s0) &&
      !/\(Scene Beats\)/i.test(s0) &&
      isOrphanSceneBeatsLine(s1) &&
      isEmotionalReactionsHeader(s2)
    ) {
      out.push(`**${s0} ${s1} & ${s2}**`);
      i += 2;
      continue;
    }

    if (next && isSignificantActionsHeader(s0) && isEmotionalReactionsHeader(s1)) {
      out.push(`**${s0} & ${s1}**`);
      i += 1;
      continue;
    }

    if (
      next &&
      isSignificantActionsHeader(s0) &&
      !/\(Scene Beats\)/i.test(s0) &&
      isOrphanSceneBeatsLine(s1)
    ) {
      out.push(`**${s0} ${s1}**`);
      i += 1;
      continue;
    }

    if (
      next &&
      isEmotionalReactionsHeader(s0) &&
      !/\(Character Interiority\)/i.test(s0) &&
      isOrphanCharacterInteriorityLine(s1)
    ) {
      out.push(`**${s0} ${s1}**`);
      i += 1;
      continue;
    }

    out.push(line);
  }
  return out.join("\n");
};

/**
 * Ensure a hard paragraph break after known section headers even when the model emits:
 * "**📘 Book Coaching for Scene** Body starts here..."
 * Combined "Significant Actions & 💔 Emotional Reactions" is handled first so we never
 * split between the two titles or before "(Scene Beats)" / "(Character Interiority)".
 */
const forceInlineSectionBreaks = (text) => {
  let out = String(text || "");
  const emoji = "[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}]";

  const combinedSigEmoRe = new RegExp(
    `(^|\\n)(\\s*(?:[-*•]\\s+)?(?:\\*\\*\\s*)?(?:${emoji}\\s*)?` +
      `Significant Actions(?:\\s*\\([^)]*\\))?\\s*&\\s*💔\\s*Emotional Reactions(?:\\s*\\([^)]*\\))?(?!\\s*\\()` +
      `(?:\\s*\\*\\*)?)(\\s+)([^\\n])`,
    "gimu"
  );
  out = out.replace(combinedSigEmoRe, (m, start, header, _space, bodyStart) => `${start}${header}\n\n${bodyStart}`);

  const significantActionsOnlyRe = new RegExp(
    `(^|\\n)(\\s*(?:[-*•]\\s+)?(?:\\*\\*\\s*)?(?:${emoji}\\s*)?` +
      `Significant Actions(?:\\s*\\([^)]*\\))?(?!\\s*\\()(?!\\s*&\\s*💔)` +
      `(?:\\s*\\*\\*)?)(\\s+)([^\\n])`,
    "gimu"
  );
  out = out.replace(significantActionsOnlyRe, (m, start, header, _space, bodyStart) => `${start}${header}\n\n${bodyStart}`);

  const emotionalReactionsOnlyRe = new RegExp(
    `(^|\\n)(\\s*(?:[-*•]\\s+)?(?:\\*\\*\\s*)?(?:${emoji}\\s*)?` +
      `Emotional Reactions(?:\\s*\\([^)]*\\))?(?!\\s*\\()` +
      `(?:\\s*\\*\\*)?)(\\s+)([^\\n])`,
    "gimu"
  );
  out = out.replace(emotionalReactionsOnlyRe, (m, start, header, _space, bodyStart) => `${start}${header}\n\n${bodyStart}`);

  for (const label of SECTION_LABELS) {
    if (label === "Significant Actions" || label === "Emotional Reactions") continue;
    const base = escapeRegex(label);
    const re = new RegExp(
      `(^|\\n)(\\s*(?:[-*•]\\s+)?(?:\\*\\*\\s*)?(?:${emoji}\\s*)?${base}(?:\\s*\\([^\\n)]*\\))?(?:\\s*\\*\\*)?)(\\s+)([^\\n])`,
      "gimu"
    );
    out = out.replace(re, (m, start, header, _space, bodyStart) => `${start}${header}\n\n${bodyStart}`);
  }
  return out;
};

const insertSectionDividers = (text) => {
  const lines = String(text || "").replace(/\r\n?/g, "\n").split("\n");
  const result = [];

  for (let i = 0; i < lines.length; i++) {
    if (SECTION_HEADER_RE.test(lines[i])) {
      const lastNonEmpty = [...result].reverse().find((l) => l.trim() !== "");
      if (lastNonEmpty !== "---") {
        // Blank line before --- prevents markdown setext heading interpretation
        // (text immediately followed by --- becomes <h2> instead of <p>+<hr>)
        const lastLine = result[result.length - 1];
        if (lastLine && lastLine.trim() !== "") {
          result.push("");
        }
        result.push("---");
      }

      const line = lines[i].trim();
      const splitMatch = line.match(SECTION_SPLIT_RE);
      if (splitMatch) {
        const rawLabel = splitMatch[1]
          .replace(/^\*+\s*/, "")
          .replace(/\s*\*+$/, "")
          .trim();
        const content = (splitMatch[2] || "").trim();
        result.push(`**${rawLabel}**`);
        // Always push a blank line after the heading so the next line (whether
        // inline or on the following line) starts a new paragraph in Markdown.
        result.push("");
        if (content) {
          result.push(content);
        }
      } else {
        const rawLabel = line.replace(/^\*+\s*/, "").replace(/\s*\*+$/, "").trim();
        result.push(`**${rawLabel}**`);
        // Always blank line so next line stays a separate paragraph.
        result.push("");
      }
    } else {
      result.push(lines[i]);
    }
  }

  return result.join("\n");
};

// ---------------------------------------------------------------------------
// Generic markdown renderer (used by formatSceneText and formatCharacterText)
// ---------------------------------------------------------------------------

const renderMarkdown = (text, components = baseComponents) => {
  if (!text) return null;
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {String(text)}
    </ReactMarkdown>
  );
};

// ---------------------------------------------------------------------------
// Scene Title helpers — shared by formatSceneText and getSceneTitleText
// ---------------------------------------------------------------------------

/**
 * Some AI responses omit the "Scene Title:" label and output the title as a
 * bare short line between "Target Word Count" and "Scene to Write".
 * This function detects and returns that line so callers can display or strip it.
 */
export const extractBareSceneTitle = (text) => {
  if (!text) return "";
  const twcIdx = text.search(/📏\s*Target Word Count/i);
  const stwIdx = text.search(/📝\s*Scene to Write/i);
  if (twcIdx === -1 || stwIdx === -1 || twcIdx >= stwIdx) return "";

  const window = text.slice(twcIdx, stwIdx);
  for (const raw of window.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (/📏|Target Word Count|\d+\s*words/i.test(line)) continue;
    if (/^[*#\-_>|]/.test(line)) continue; // markdown / separator
    if (/[*_`#]/.test(line)) continue; // inline markdown
    const words = line.split(/\s+/).filter(Boolean).length;
    if (words >= 1 && words <= 12 && !line.includes(":")) {
      return line;
    }
  }
  return "";
};

/**
 * Ensure Scene Title and POV render on separate lines in chat/sidebar.
 * Models sometimes emit `Scene Title: … POV: …` on one line; markdown also
 * collapses single newlines between plain-text lines into one paragraph.
 */
export const normalizeSceneHeaderLines = (text) => {
  let out = String(text || "").trim();
  if (!out) return out;

  // Split inline "Scene Title: … POV: …" onto two physical lines.
  out = out.replace(
    /(Scene Title\s*:\s*)(.+?)\s+(POV\s*:)/gi,
    (_, label, title, pov) => `${label}${title.trim()}\n${pov}`
  );

  // Markdown needs a blank line between plain-text paragraphs.
  out = out.replace(
    /^(Scene Title\s*:[^\n]+)\n(?!\n)(POV\s*:[^\n]+)/im,
    "$1\n\n$2"
  );

  return out;
};

/** Bold only the `Scene Title:` / `POV:` labels (Olivia chat header block). */
const boldSceneDesignHeaderLabels = (text) => {
  let out = String(text || "");
  out = out.replace(
    /^(\s*)(?!\*\*)Scene Title\s*:\s*/gim,
    (_, indent) => `${indent}**Scene Title:** `
  );
  out = out.replace(
    /^(\s*)(?!\*\*)POV\s*:\s*/gim,
    (_, indent) => `${indent}**POV:** `
  );
  return out;
};

/**
 * Olivia scene delivery ends with a lone `.` line before the 👉 post-scene CTA
 * (see olivia-scene.txt). Strip it for display only — backend insert still uses raw text.
 */
const stripPostScenePeriodDelimiter = (text) => {
  let out = String(text || "");
  out = out.replace(
    /\n\s*(?:\*\*)?\.\s*(?:\*\*)?\s*(?:\n\s*)+(?=👉[^\n]*Love this direction\?)/i,
    "\n\n"
  );
  return out;
};

/** Insert the same section divider hr used elsewhere, immediately before the 👉 CTA. */
const insertPostSceneCtaDivider = (text) => {
  const lines = String(text || "").replace(/\r\n?/g, "\n").split("\n");
  const result = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isPostSceneCta =
      /^\s*👉/.test(line) && /Love this direction\?/i.test(line);

    if (isPostSceneCta) {
      const lastNonEmpty = [...result].reverse().find((l) => l.trim() !== "");
      if (lastNonEmpty !== "---") {
        const lastLine = result[result.length - 1];
        if (lastLine && lastLine.trim() !== "") {
          result.push("");
        }
        result.push("---");
      }
    }
    result.push(line);
  }

  return result.join("\n");
};

const preparePostSceneCtaDisplay = (text) =>
  insertPostSceneCtaDivider(stripPostScenePeriodDelimiter(text));

/**
 * Single place for Scene Design markdown cleanup before render.
 * Removes duplicate title leakage; does not use global String.replace on the title
 * (avoids wrong match if the same phrase appears elsewhere).
 *
 * @param {string} sceneText
 * @param {{ preserveHeaderSceneTitle?: boolean }} [options]
 *   When true (Olivia chat), keep the leading `Scene Title:` / `POV:` header
 *   block visible. When false (Scene Design sidebar), strip `Scene Title:` because
 *   the accordion heading already shows it.
 */
export const normalizeSceneSuggestionMarkdown = (sceneText, options = {}) => {
  const { preserveHeaderSceneTitle = false } = options;
  let out = normalizeSceneHeaderLines(sceneText);

  if (!preserveHeaderSceneTitle) {
    // Strip "Scene Title:" lines (already shown in sidebar heading)
    out = out.replace(/^\s*[-•]?\s*Scene Title\s*:[^\n]*\n?/gim, "").trim();
  }

  // Strip "📏 Target Word Count" lines — word count is backend-only; not shown to user
  out = out.replace(/^\s*\*?\*?📏\s*Target Word Count\s*\*?\*?\s*:?[^\n]*\n?/gim, "").trim();
  out = out.replace(/^\s*\*?\*?Target Word Count\s*\*?\*?\s*:?[^\n]*\n?/gim, "").trim();

  // Deduplicate: AI sometimes emits a compact inline summary of all sections followed by
  // the full block-format version. If "Book Coaching for Scene" appears ≥ 2 times, trim
  // everything before the second occurrence so only the full version is rendered.
  const dedupRe = /(?:^|\n)[ \t]*(?:[-*•][ \t]+)?\*{0,2}[ \t]*(?:📘[ \t]*)?Book Coaching for Scene/giu;
  const dedupMatches = [...out.matchAll(dedupRe)];
  if (dedupMatches.length >= 2) {
    out = out.slice(dedupMatches[1].index).replace(/^\n+/, "").trim();
  }

  const bareTitle = extractBareSceneTitle(out);
  if (!bareTitle) return out;

  const twcIdx = out.search(/📏\s*Target Word Count/i);
  const stwIdx = out.search(/📝\s*Scene to Write/i);
  if (twcIdx === -1 || stwIdx === -1 || twcIdx >= stwIdx) return out;

  const before = out.slice(0, twcIdx);
  const window = out.slice(twcIdx, stwIdx);
  const after = out.slice(stwIdx);

  const lines = window.split("\n");
  const next = [];
  let removed = false;
  for (const line of lines) {
    if (!removed && line.trim() === bareTitle) {
      removed = true;
      continue;
    }
    next.push(line);
  }
  if (!removed) return out;

  return `${before}${next.join("\n")}${after}`.trim();
};

// ---------------------------------------------------------------------------
// Scene & character formatters
// ---------------------------------------------------------------------------

export const formatSceneText = (sceneText, _selectedPromptKey, options = {}) => {
  if (!sceneText) return null;

  let out = normalizeSceneSuggestionMarkdown(sceneText, options);

  if (options.preserveHeaderSceneTitle) {
    out = boldSceneDesignHeaderLabels(out);
  }

  out = mergeAdjacentSceneSectionHeaders(out);

  // Enforce header/content separation for inline-emitted rich section headers.
  out = forceInlineSectionBreaks(out);

  // Insert --- before known Olivia section headers to produce styled dividers
  out = insertSectionDividers(out);

  out = preparePostSceneCtaDisplay(out);

  return (
    <div className="sidebar-markdown-body sidebar-markdown-body--scene-coaching">
      {renderMarkdown(out, sceneComponents)}
    </div>
  );
};

/**
 * Remove Olivia's closing "bridge" after the Story Bible body (prompt copy, not part of the doc).
 * Newer prompts emit several short lines (heartbeat → Writing Studio → dossiers CTA); older was one line.
 */
function tailLooksLikeStoryBibleBridge(tailText) {
  if (!tailText || typeof tailText !== "string") return false;
  const t = tailText;
  if (!/\bThis is the heartbeat of your novel\b/i.test(t)) return false;
  return (
    /\bWriting Studio\b/i.test(t) ||
    /\b17[\s-]*point\s+character\s+dossiers\b/i.test(t) ||
    /\b17[\s-]*Point\s+Dossiers\b/i.test(t) ||
    /\bReady for those\??\b/i.test(t) ||
    /\bReady for the character\b/i.test(t) ||
    /\bcharacter dossiers\b/i.test(t) ||
    /\bBig moment\b/i.test(t)
  );
}

function stripStoryBibleBridgingFooter(text) {
  let lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
  while (lines.length && lines[lines.length - 1].trim() === "") {
    lines.pop();
  }
  if (!lines.length) return "";

  // Multi-line bridge: cut from first "heartbeat" line when the remainder matches Olivia CTA copy.
  let cutAt = -1;
  for (let i = 0; i < lines.length; i++) {
    if (!/\bThis is the heartbeat of your novel\b/i.test(lines[i])) continue;
    const tail = lines.slice(i).join("\n");
    if (tailLooksLikeStoryBibleBridge(tail)) {
      cutAt = i;
      break;
    }
  }

  if (cutAt >= 0) {
    lines = lines.slice(0, cutAt);
  } else {
    // Legacy: entire bridge was one paragraph on the last line
    const last = lines[lines.length - 1];
    const isBridging =
      /\bThis is the heartbeat of your novel\b/i.test(last) &&
      (/\bcharacter dossiers\b/i.test(last) || /\bReady for the character\b/i.test(last));
    if (isBridging) {
      lines.pop();
    }
  }

  while (lines.length && lines[lines.length - 1].trim() === "") {
    lines.pop();
  }
  if (lines.length && /^\s*---\s*$/.test(lines[lines.length - 1])) {
    lines.pop();
    while (lines.length && lines[lines.length - 1].trim() === "") {
      lines.pop();
    }
  }
  return lines.join("\n").trimEnd();
}

/**
 * Story Bible: show only the 📘 Story Bible document body — skip Olivia chat above the title line,
 * and exclude "CHARACTER DOSSIERS — 17-Point Dossiers" onward (Characters tab owns dossiers).
 */
export const sliceStoryBibleMasterPromptForDisplay = (text) => {
  const full = String(text || "").replace(/\r\n/g, "\n");
  if (!full.trim()) return "";

  const lines = full.split("\n");
  const titleLine = (line) =>
    /📘\s*Story\s+Bible/i.test(line) ||
    /📘\s*StoryGroove\.ai(?:™|TM|\u2122)?\s*Master\s+Prompt\s+for\s+Novel\s+Architecture/i.test(
      line
    );
  const dossiersHeadingLine = (line) =>
    /CHARACTER\s+DOSSIERS/i.test(line) && /17[\s-]*Point\s*Dossiers/i.test(line);

  let startLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (titleLine(lines[i])) {
      startLine = i;
      break;
    }
  }
  if (startLine === -1) return full.trim();

  let endLine = lines.length;
  for (let i = startLine; i < lines.length; i++) {
    if (dossiersHeadingLine(lines[i])) {
      endLine = i;
      break;
    }
  }

  const sliced = lines.slice(startLine, endLine).join("\n").trim();
  return stripStoryBibleBridgingFooter(sliced);
};

const TRAILING_WORD_COUNT_RE =
  /^(.*?)\s+((?:approx\.?|approximately|~)\s*[:\s]*\d[\d,]*\s*words?|\d[\d,]*\s*words?)\s*$/i;

const lightStripMd = (s) =>
  String(s || "")
    .replace(/\*{1,3}/g, "")
    .trim();

const isApproxWordCountLine = (plain) =>
  /^(?:approx\.?|approximately|~)\s*[:\s]*\d[\d,]*\s*words?\b/i.test(plain) ||
  /^\d[\d,]*\s*words?\b/i.test(plain);

/**
 * If the title and "Approx. N words" were saved on one line, split them so
 * markdown shows Approx on the next line.
 */
export const ensureStoryBibleApproxOnOwnLine = (text) => {
  if (!text || typeof text !== "string") return text;
  const amp = "(?:&|and|＆)";
  const headerRe = new RegExp(
    `(?:^|[\\r\\n])\\s*(?:#{1,6}\\s*)?(?:\\*\\*)?\\s*Title\\s*${amp}\\s*Word\\s*Count\\s*(?:\\*\\*)?\\s*(?:\\r?\\n|$)`,
    "i"
  );
  const m = headerRe.exec(text);
  if (!m) return text;
  const headerEnd = m.index + m[0].length;
  const rest = text.slice(headerEnd);
  const stops = [
    rest.search(/\r?\n-{3,}\s*\r?\n/),
    rest.search(/\r?\n_{3,}\s*\r?\n/),
    rest.search(/\r?\n\*{3,}\s*\r?\n/),
    rest.search(/\r?\n(?=\s*(?:#{1,6}\s|\*{0,2}\s*📚|Story\s+Context|Market\s+Positioning|CHARACTER\s+DOSSIERS))/i),
  ].filter((i) => i >= 0);
  const end = stops.length ? Math.min(...stops) : rest.length;
  const block = rest.slice(0, end);
  const after = rest.slice(end);

  const withHardBreak = (line) => `${String(line).replace(/\s+$/, "")}  `;
  const out = [];
  for (const line of block.replace(/\r\n/g, "\n").split("\n")) {
    const plain = lightStripMd(line);
    const glued = !isApproxWordCountLine(plain) && plain.match(TRAILING_WORD_COUNT_RE);
    if (glued && glued[1].trim()) {
      out.push(withHardBreak(glued[1].trim()));
      out.push(glued[2].trim());
      continue;
    }
    if (isApproxWordCountLine(plain)) {
      while (out.length && out[out.length - 1] === "") out.pop();
      if (out.length) {
        out[out.length - 1] = withHardBreak(out[out.length - 1]);
      }
      out.push(line);
      continue;
    }
    out.push(line);
  }

  return text.slice(0, headerEnd) + out.join("\n") + after;
};

/**
 * Title line under Title & Word Count — same rules as the backend helper.
 * Used so the Word Count bar can update on save without a reload.
 */
export const extractStoryBibleTitle = (text) => {
  if (!text || typeof text !== "string") return "";
  const amp = "(?:&|and|＆)";
  const headerRe = new RegExp(
    `(?:^|[\\r\\n])\\s*(?:#{1,6}\\s*)?(?:\\*\\*)?\\s*Title\\s*${amp}\\s*Word\\s*Count\\s*(?:\\*\\*)?\\s*(?:\\r?\\n|$)`,
    "i"
  );
  const m = headerRe.exec(text);
  if (!m) return "";
  const rest = text.slice(m.index + m[0].length);
  const stops = [
    rest.search(/\r?\n-{3,}\s*\r?\n/),
    rest.search(/\r?\n_{3,}\s*\r?\n/),
    rest.search(/\r?\n\*{3,}\s*\r?\n/),
    rest.search(/\r?\n(?=\s*(?:#{1,6}\s|\*{0,2}\s*📚|Story\s+Context|Market\s+Positioning|CHARACTER\s+DOSSIERS))/i),
  ].filter((i) => i >= 0);
  const end = stops.length ? Math.min(...stops) : rest.length;
  const block = rest.slice(0, end);
  for (const rawLine of block.split(/\r?\n/)) {
    const plain = lightStripMd(rawLine);
    if (!plain || isApproxWordCountLine(plain)) continue;
    if (/^author\s*[:：]/i.test(plain)) continue;
    if (/^word\s*count\s*[:：]/i.test(plain)) continue;
    const glued = plain.match(TRAILING_WORD_COUNT_RE);
    const title = (glued && glued[1].trim() ? glued[1].trim() : plain)
      .replace(/^\s*title\s*[:：]\s*/i, "")
      .trim();
    if (!title || isApproxWordCountLine(title)) continue;
    return title.slice(0, 200);
  }
  return "";
};

/**
 * Full Story Bible document in the Story Bible tab — markdown only (no character-dossier transforms).
 */
export const formatStoryBibleMasterPrompt = (text) => {
  if (!text || !String(text).trim()) return null;
  const sliced = sliceStoryBibleMasterPromptForDisplay(String(text));
  const out = ensureStoryBibleApproxOnOwnLine(sliced);
  if (!out.trim()) return null;
  return (
    <div className="sidebar-markdown-body story-bible-master-prompt">
      {renderMarkdown(out, sceneComponents)}
    </div>
  );
};

/**
 * Returns the string to display for a character (responseText or fallback from other fields).
 */
export const getCharacterDisplayText = (responseText, character) => {
  if (responseText && typeof responseText === "string" && responseText.trim()) {
    return responseText;
  }
  if (!character || typeof character !== "object") return "";
  const parts = [];
  if (character.role) parts.push(`**Role:** ${character.role}`);
  if (character.traits) parts.push(`**Traits:** ${character.traits}`);
  if (character.appearance) parts.push(`**Appearance:** ${character.appearance}`);
  if (character.occupation) parts.push(`**Occupation:** ${character.occupation}`);
  if (character.archetype) parts.push(`**Archetype:** ${character.archetype}`);
  if (parts.length) return parts.join("\n\n");
  return character.name ? `${character.character || "Character"}: ${character.name}` : "";
};

/** Accordion header: extract only the core role label (e.g. "Protagonist", "Supporting character"). */
export const shortCharacterRoleForAccordion = (role) => {
  if (!role || typeof role !== "string") return "";
  const trimmed = role.trim();
  if (!trimmed) return "";
  const beforeSemicolon = trimmed.split(";")[0].trim();
  const label = beforeSemicolon.split(/\b(?:whose|who|that|which|and|with)\b/i)[0].trim();
  return label.replace(/[,\s]+$/, "") || beforeSemicolon.split(/\s+/).slice(0, 2).join(" ");
};

/** List/export heading when `role` is missing — fall back to cast type. */
export const castTypeLabelForCharacter = (characterType) => {
  if (characterType === "protagonist") return "Protagonist";
  if (characterType === "antagonist") return "Antagonist";
  if (characterType === "supporting character") return "Supporting character";
  return "";
};

export const characterAccordionHeaderLabel = (character) => {
  const name =
    extractCharacterNameFromDossier(character?.responseText) ||
    character?.name ||
    "Character";
  const roleSource =
    String(character?.role || "").trim() ||
    castTypeLabelForCharacter(character?.character);
  if (roleSource) {
    return `${name} — ${shortCharacterRoleForAccordion(roleSource)}`;
  }
  return `Character Profile: ${name}`;
};

export const formatCharacterText = (characterText) => {
  if (!characterText || typeof characterText !== "string") return <div />;
  let cleaned = String(characterText);

  // Remove horizontal rule separators used between dossier blocks.
  cleaned = cleaned.replace(/^\s*---\s*$/gm, "");

  // Drop the top-level dossier section label if included in the stored text.
  cleaned = cleaned.replace(/^\s*\*\*👤\s*CHARACTER\s*DOSSIERS[\s\S]*?\*\*\s*\n+/i, "");

  // Strip Olivia's closing bridge/CTA text that leaks into the last dossier.
  cleaned = cleaned.replace(/\n*🎭\s*Here are your full[\s\S]*/i, "");
  cleaned = cleaned.replace(/\n*📘\s*Keep a copy for yourself[\s\S]*/i, "");

  // Model output often runs "…end of §17. 📖 Summary Note…" on one line — force a new paragraph.
  // Do not break inside already-bold headings (`**📖`); `[^\n\r*]` avoids splitting markdown.
  cleaned = cleaned.replace(
    /([^\n\r*])([\t \u00a0]*)(📖\s*(?:\*\*\s*)?Summary Note of Character\b)/giu,
    "$1\n\n$3"
  );

  // "**📖 Summary Note of Character**" + "**" + body becomes "Character****" in the UI — split correctly.
  cleaned = cleaned.replace(
    /\*\*(📖\s*Summary Note of Character)\*\*\*\*/giu,
    "**$1**\n\n**"
  );
  cleaned = cleaned.replace(
    /(📖\s*Summary Note of Character)\*\*\*\*/giu,
    "$1**\n\n**"
  );

  // List continuation / wrapped line: heading at line start, prose on same line — keep indent on the body line.
  cleaned = cleaned.replace(
    /^([\t \u00a0]*)(\*\*📖\s+Summary Note of Character\*\*)([ \t\u00a0]+)(?=[A-Za-z“"(])/gmu,
    "$1$2\n$1"
  );
  cleaned = cleaned.replace(
    /^([\t \u00a0]*)(📖\s+Summary Note of Character\b)([ \t\u00a0]+)(?=[A-Za-z“"(])/gmu,
    "$1$2\n$1"
  );

  // "…look. **📖 Summary…**" — punctuation before bold heading (inside a long list line).
  cleaned = cleaned.replace(
    /([.!?;])([ \t\u00a0]*)(\*\*📖\s+Summary Note of Character\*\*)/giu,
    "$1$2\n\n$3"
  );

  // Same line mid-paragraph: "**…** David…" but not at line start (line-start rules above already handled).
  cleaned = cleaned.replace(
    /([^\n\r])([ \t\u00a0]*)(\*\*📖\s+Summary Note of Character\*\*)([ \t\u00a0]+)(?=[A-Za-z“"(])/giu,
    "$1$2\n\n$3\n\n"
  );

  // Any remaining "**…** David" on one line (e.g. after punctuation rule stopped at closing **).
  cleaned = cleaned.replace(
    /(\*\*📖\s+Summary Note of Character\*\*)([ \t\u00a0]+)(?=[A-Za-z“"(])/giu,
    "$1\n$2"
  );

  // Bold numbered dossier section headers.
  cleaned = cleaned.replace(/^(\d+)\.\s+(.+)$/gm, (match, sectionNumber, sectionTitle) => {
    const line = `${sectionNumber}. ${sectionTitle.trim()}`;
    return line.startsWith("**") ? line : `**${line}**`;
  });

  // Bold standalone emoji-led section headers like "📖 Summary Note of Character"
  cleaned = cleaned.replace(/^([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}][^\n*]+)$/gmu, (match) => {
    const t = match.trim();
    return t.startsWith("**") ? match : `**${t}**`;
  });

  // Convert "• Label: value" lines to markdown list items with bold label
  cleaned = cleaned.replace(
    /^[ \t]*•[ \t]+([^:\n]+):[ \t]*(.*)$/gm,
    (match, label, value) => `- **${label.trim()}:** ${value.trim()}`
  );

  // Convert remaining "• text" lines (no colon) to plain markdown list items
  cleaned = cleaned.replace(/^[ \t]*•[ \t]+/gm, "- ");

  // Bold the label part of existing "- Label: value" list items (not already bold)
  cleaned = cleaned.replace(
    /^([ \t]*-[ \t]+)(?!\*\*)([^:\n*[]+):[ \t]*(.*)$/gm,
    (match, prefix, label, value) => `${prefix}**${label.trim()}:** ${value.trim()}`
  );

  // Ensure summary header is bold (emoji, if present in backend text, is preserved).
  cleaned = cleaned.replace(
    /^\s*(?:\*\*)?\s*(?:📖\s*)?Summary Note of Character\s*(?:\*\*)?\s*$/gim,
    (match) => {
      const trimmed = match.replace(/^\*+|\*+$/g, "").trim();
      return `**${trimmed}**`;
    }
  );

  // Horizontal rule before "Summary Note of Character" so it is not glued to §17 (same list item).
  // Insert once; `---` on its own line renders as <hr> (styled via sceneComponents).
  {
    let insertedDivider = false;
    cleaned = cleaned.replace(
      /(\*\*📖\s+Summary Note of Character\*\*|📖\s+Summary Note of Character\b)/giu,
      (match, _p, offset, full) => {
        if (insertedDivider) return match;
        const before = full.slice(0, offset);
        if (/\n---\s*\n\s*$/s.test(before)) return match;
        insertedDivider = true;
        return `\n\n---\n\n${match}`;
      }
    );
  }

  // Orphan `**` left before the divider (model opens bold for summary but line breaks first).
  cleaned = cleaned.replace(/[ \t]+\*\*(?=\s*\n+\s*---)/g, "");
  cleaned = cleaned.replace(/^\s*\*\*\s*$/gm, "");
  cleaned = cleaned.replace(/\n\*\*\s*\n(?=\s*---)/g, "\n\n");
  // Duplicate `**` right after "**…Summary Note of Character**" before the summary body.
  cleaned = cleaned.replace(
    /(\*\*📖\s+Summary Note of Character\*\*)\s*\*\*(?=\s*[A-Za-z“"(])/giu,
    "$1 "
  );

  // Heading and summary paragraph on one line — force a new paragraph after the label.
  cleaned = cleaned.replace(
    /(\*\*📖\s+Summary Note of Character\*\*)\s+(?=[A-Za-z“"(])/giu,
    "$1\n\n"
  );
  cleaned = cleaned.replace(
    /(📖\s*\*\*Summary Note of Character\*\*)\s+(?=[A-Za-z“"(])/giu,
    "$1\n\n"
  );

  return (
    <div className="sidebar-markdown-body">
      {chunkMarkdownForRender(cleaned).map((chunk, i) => (
        <React.Fragment key={i}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkBreaks]}
            components={sceneComponents}
          >
            {chunk}
          </ReactMarkdown>
        </React.Fragment>
      ))}
    </div>
  );
};

/**
 * Returns the full scene title string from generated scene text (no truncation).
 * Prefers "Scene Title:" when present, else bare line between Target Word Count and Scene to Write.
 * Does not use "Scene to Write:" as the outline title (sidebar label).
 */
export const getSceneTitleText = (sceneText) => {
  if (!sceneText) return "";

  // Use raw text so "Scene Title:" / bare-title lines are still present for extraction.
  const text = String(sceneText).trim();
  let preview = "";

  // Prefer "Scene Title:" (sidebar label from Olivia format)
  const sceneTitleLabel = "Scene Title";
  const titleIdx = text.indexOf(sceneTitleLabel);
  if (titleIdx !== -1) {
    const afterTitle = text.slice(titleIdx + sceneTitleLabel.length).replace(/^\s*:\s*/, "").trim();
    const firstLine = afterTitle.split("\n")[0].trim();
    if (firstLine) preview = firstLine.slice(0, 120);
  }

  // Fallback: bare title line emitted without "Scene Title:" prefix
  if (!preview) {
    preview = extractBareSceneTitle(text);
  }

  // Legacy: parse "- **Section**" style sections and use first section content
  if (!preview && text.includes("- **")) {
    const sections = {};
    let currentSection = "";

    text.split("\n\n").forEach((line) => {
      const match = line.match(/^- \*\*(.*?)\*\*/);
      if (match) {
        currentSection = match[1];
        let content = line.replace(match[0], "").trim();
        if (content.startsWith(":")) content = content.slice(1).trim();
        sections[currentSection] = content;
      } else if (currentSection) {
        let trimmedLine = line.trim();
        if (trimmedLine.startsWith(":"))
          trimmedLine = trimmedLine.slice(1).trim();
        sections[currentSection] += "\n" + trimmedLine;
      }
    });

    const firstSectionKey = Object.keys(sections)[0];
    preview = sections[firstSectionKey] || "";
  }

  // Fallback: first non-empty line (skip blank lines)
  if (!preview) {
    const firstNonEmpty = text.split("\n").find((line) => line.trim().length > 0);
    preview = firstNonEmpty ? firstNonEmpty.trim() : "";
  }

  return preview || "Scene";
};

/**
 * Structured scene title only (Scene Title / bare line between TWC and Scene to Write).
 * No Scene to Write as title, no legacy section parse or "first non-empty line".
 */
export const getSceneTitleTextStrict = (sceneText) => {
  if (!sceneText) return "";
  const text = String(sceneText).trim();
  let preview = "";

  const sceneTitleLabel = "Scene Title";
  const titleIdx = text.indexOf(sceneTitleLabel);
  if (titleIdx !== -1) {
    const afterTitle = text.slice(titleIdx + sceneTitleLabel.length).replace(/^\s*:\s*/, "").trim();
    const firstLine = afterTitle.split("\n")[0].trim();
    if (firstLine) preview = firstLine.slice(0, 120);
  }

  if (!preview) {
    preview = extractBareSceneTitle(text);
  }

  return preview.trim();
};

/** Max characters to show in the outline sidebar; longer titles are truncated with "..." (full text in tooltip). */
const SCENE_TITLE_MAX_LENGTH = 72;

/**
 * Renders the scene title for the outline sidebar (short, readable label).
 * Full text is available via getSceneTitleText() for tooltips.
 */
export const formatSceneTitle = (sceneText) => {
  const full = getSceneTitleText(sceneText);
  const display =
    full.length > SCENE_TITLE_MAX_LENGTH
      ? full.slice(0, SCENE_TITLE_MAX_LENGTH).trim() + "…"
      : full;
  return <span>{formatInline(display, 0)}</span>;
};

/**
 * Like formatSceneTitle but uses getSceneTitleTextStrict; returns null if no structured title yet.
 */
export const formatSceneTitleStrict = (sceneText) => {
  const full = getSceneTitleTextStrict(sceneText);
  if (!full) return null;
  const display =
    full.length > SCENE_TITLE_MAX_LENGTH
      ? full.slice(0, SCENE_TITLE_MAX_LENGTH).trim() + "…"
      : full;
  return <span>{formatInline(display, 0)}</span>;
};

export const formatReview = (text) => {
  if (!text) return null;
  return text
    .replace(/^###\s?(.*)$/gm, "<strong>$1</strong>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>")
    .trim();
};
