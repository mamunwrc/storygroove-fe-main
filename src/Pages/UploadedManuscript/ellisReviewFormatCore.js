import {
  buildEllisChapterNumberRegex,
  canMergeTeenSuffixWithLabelParts,
  combineTeenPrefixWord,
  formatEllisChapterOpener,
  isChapterNumberWordToken,
  isCompleteEllisChapterOpener,
  isEllisChapterOpenerStart,
  isPovContinuationLine,
  isPovOnlyLine,
  isSceneLetterSuffixToken,
  isTeenSuffixToken,
  parseEllisChapterOpener,
  parseEllisCustomTitlePovContinuation,
  stripEllisInlineMarkdownEmphasis,
} from "./ellisChapterOpenerParse.js";
import { liftEllisReviewSectionHeaders } from "./ellisChatHelpers.js";

const ELLIS_CHAPTER_NUMBER_RE = buildEllisChapterNumberRegex();

/** "Example 1" or "Application Example 1" creative sub-label (Ellis prompt v3). */
const ELLIS_CREATIVE_EXAMPLE_LABEL = "(?:Application\\s+)?Example\\s*\\d+";

/** "Editorial Logic" or legacy "Description" creative theory sub-label. */
const ELLIS_CREATIVE_EDITORIAL_LABEL = "(?:Editorial Logic|Description)";

export const isEllisCreativeExampleLineText = (text) =>
  new RegExp(`^${ELLIS_CREATIVE_EXAMPLE_LABEL}\\s*:`, "i").test(
    String(text || "")
      .trim()
      .replace(/^\*\*|\*\*$/g, "")
      .trim()
  );

export const isEllisCreativeEditorialLogicLineText = (text) =>
  new RegExp(`^${ELLIS_CREATIVE_EDITORIAL_LABEL}\\s*:`, "i").test(
    String(text || "")
      .trim()
      .replace(/^\*\*|\*\*$/g, "")
      .trim()
  );

const ELLIS_PRIMARY_SECTION_LABELS = [
  "Function in Story",
  "Genre Beat Check",
  "🔍 Scene Analysis — Editorial Review",
  "🔍 Scene Analysis (Editorial Review)",
  "🔍 Scene Analysis",
  "Scene Analysis",
  "🎨 Creative Suggestions",
  "Creative Suggestions",
];

/** Sub-labels under Creative Suggestions — stay on one line with `: value`. */
const ELLIS_CREATIVE_SUB_LABELS = [
  "Structural Weakness",
  "Character Weakness",
  "Creative Suggestion Name",
];

/** Display-only marker rendered as a light hairline between suggestion blocks. */
export const ELLIS_SUGGESTION_SEP_MARKER = "⟦ellis-suggestion-sep⟧";

const ELLIS_WEAKNESS_START_RE =
  /^\s*\*{0,2}\s*(Structural Weakness|Character Weakness)\s*\*{0,2}\s*:/i;

const isCreativeSuggestionsHeaderLine = (line) => {
  const t = String(line || "")
    .trim()
    .replace(/^\*\*|\*\*$/g, "")
    .trim();
  return /^(?:🎨\s*)?Creative Suggestions$/i.test(t);
};

const exitsCreativeSuggestionsBlock = (line) => {
  if (!ELLIS_SECTION_HEADER_RE.test(line)) return false;
  if (ELLIS_WEAKNESS_START_RE.test(line)) return false;
  return !isCreativeSuggestionsHeaderLine(line);
};

const ELLIS_SECTION_LINE_PREFIX = "(?:#{1,6}\\s+)?";

const ELLIS_SECTION_HEADER_RE = new RegExp(
  "^\\s*" +
    ELLIS_SECTION_LINE_PREFIX +
    "(?:[-*•]\\s+)?\\**\\s*(?:" +
    `Chapter\\s+${ELLIS_CHAPTER_NUMBER_RE}(?:\\s*[–—-]\\s*POV\\s*:|\\b)|` +
    "POV\\s*:|" +
    "Function in Story|" +
    "Genre Beat Check|" +
    "🔍\\s*Scene Analysis(?:\\s*\\([^)]*\\)|\\s*[—–-]\\s*Editorial Review)?|" +
    "Scene Analysis(?:\\s*\\([^)]*\\)|\\s*[—–-]\\s*Editorial Review)?|" +
    "🎨\\s*Creative Suggestions(?:\\s*\\([^)]*\\))?|" +
    "Creative Suggestions(?:\\s*\\([^)]*\\))?|" +
    "📌\\s*Chapter Cumulative Editorial Note" +
    ")\\s*\\**(?:\\s*[:-]\\s*|\\s+|$)",
  "i"
);

const ELLIS_SECTION_SPLIT_RE = new RegExp(
  "^\\s*" +
    ELLIS_SECTION_LINE_PREFIX +
    "(?:[-*•]\\s+)?\\**\\s*(" +
    `Chapter\\s+${ELLIS_CHAPTER_NUMBER_RE}(?:\\s*[–—-]\\s*POV\\s*:[^\\n]*|)|` +
    "POV\\s*:[^\\n]*|" +
    "Function in Story|" +
    "Genre Beat Check|" +
    "🔍\\s*Scene Analysis(?:\\s*\\([^)]*\\)|\\s*[—–-]\\s*Editorial Review)?|" +
    "Scene Analysis(?:\\s*\\([^)]*\\)|\\s*[—–-]\\s*Editorial Review)?|" +
    "🎨\\s*Creative Suggestions(?:\\s*\\([^)]*\\))?|" +
    "Creative Suggestions(?:\\s*\\([^)]*\\))?|" +
    "📌\\s*Chapter Cumulative Editorial Note" +
    ")\\s*\\**(?:\\s*[:-]\\s*|\\s+)?(.*)$",
  "i"
);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const capitalizeWordToken = (token) => {
  const s = String(token || "").trim();
  return s.length ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;
};

/**
 * Merge split scene openers onto one line:
 * - `Chapter One` + `POV: Name`
 * - `Chapter Seven` + `A – POV: Name` (lettered chapter / scene tag wrap)
 * - `Chapter Seven` + `A` + `POV: Name`
 * - `Chapter Twenty` + `One – POV: Name` (compound word numbers 21–99)
 * - `Chapter Four` + `teen – POV: Name` (syllable splits for 14–19)
 */
export const mergeEllisChapterPovTitleLines = (text) => {
  const lines = String(text || "").replace(/\r\n?/g, "\n").split("\n");
  const result = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!isEllisChapterOpenerStart(line)) {
      result.push(line);
      continue;
    }

    const stripped = stripEllisInlineMarkdownEmphasis(line);

    if (isCompleteEllisChapterOpener(line)) {
      result.push(stripped);
      continue;
    }

    const parsed = parseEllisChapterOpener(stripped);
    const labelParts = [];

    if (parsed.digitPart) {
      labelParts.push(parsed.digitPart + (parsed.letterSuffix || ""));
    } else {
      labelParts.push(...parsed.numberWords);
      if (parsed.letterSuffix) labelParts.push(parsed.letterSuffix);
    }
    if (parsed.remainder) {
      labelParts.push(...parsed.remainder.split(/\s+/).filter(Boolean));
    }

    let pov = parsed.pov;
    let j = i + 1;

    while (true) {
      while (j < lines.length && lines[j].trim() === "") j += 1;
      if (j >= lines.length) break;

      const nextRaw = lines[j];
      const next = stripEllisInlineMarkdownEmphasis(nextRaw);

      if (isPovOnlyLine(nextRaw)) {
        const povMatch = next.match(/^POV\s*:\s*(.+)$/i);
        if (povMatch) {
          pov = povMatch[1].trim();
          i = j;
        }
        break;
      }

      if (isPovContinuationLine(nextRaw)) {
        const continuationMatch = next.match(/^(.+?)\s*[–—-]\s*POV\s*:\s*(.+)$/i);
        if (continuationMatch) {
          const token = continuationMatch[1].trim();
          let merged = false;
          if (/^teen$/i.test(token) && canMergeTeenSuffixWithLabelParts(labelParts)) {
            labelParts[0] = combineTeenPrefixWord(labelParts[0]);
            merged = true;
          } else if (isChapterNumberWordToken(token)) {
            labelParts.push(capitalizeWordToken(token));
            merged = true;
          } else if (isSceneLetterSuffixToken(token)) {
            labelParts.push(token.toUpperCase());
            merged = true;
          }
          if (merged) {
            pov = continuationMatch[2].trim();
            i = j;
            break;
          }
        }
      }

      if (isTeenSuffixToken(nextRaw) && canMergeTeenSuffixWithLabelParts(labelParts)) {
        labelParts[0] = combineTeenPrefixWord(labelParts[0]);
        j += 1;
        continue;
      }

      if (isChapterNumberWordToken(nextRaw)) {
        labelParts.push(capitalizeWordToken(next));
        j += 1;
        continue;
      }

      if (isSceneLetterSuffixToken(nextRaw)) {
        labelParts.push(next.toUpperCase());
        j += 1;
        continue;
      }

      const customCont = parseEllisCustomTitlePovContinuation(nextRaw);
      if (customCont && !pov && labelParts.length > 0) {
        const { titlePart, pov: customPov } = customCont;
        if (
          labelParts.length >= 1 &&
          labelParts[labelParts.length - 1].length === 1 &&
          /^[a-z]/.test(titlePart)
        ) {
          const last = labelParts.pop();
          labelParts.push(last + titlePart);
        } else if (
          !isChapterNumberWordToken(titlePart) &&
          !isSceneLetterSuffixToken(titlePart) &&
          !/^teen$/i.test(titlePart)
        ) {
          labelParts.push(...titlePart.split(/\s+/));
        } else {
          break;
        }
        pov = customPov;
        i = j;
        break;
      }

      break;
    }

    const labelBody = labelParts.join(" ");
    if (pov) {
      result.push(formatEllisChapterOpener({ labelBody, pov }));
    } else if (labelBody) {
      result.push(`Chapter ${labelBody}`);
    } else {
      result.push(line);
    }
  }

  return result.join("\n");
};

/** Chapter / POV scene opener — styled as title, not a section divider block. */
const isEllisSceneTitleHeaderLine = (line) => {
  const trimmed = stripEllisInlineMarkdownEmphasis(line);
  if (!trimmed) return false;
  if (/Chapter Cumulative Editorial Note/i.test(trimmed)) return false;
  if (/^(?:Function in Story|Genre Beat Check|Scene Analysis|Creative Suggestions)/i.test(trimmed)) {
    return false;
  }
  if (/^(?:🔍|🎨|📌)/.test(trimmed)) return false;
  return (
    isCompleteEllisChapterOpener(line) ||
    new RegExp(`^Chapter\\s+${ELLIS_CHAPTER_NUMBER_RE}(?:\\s|$)`, "i").test(trimmed) ||
    /^POV\s*:/i.test(trimmed)
  );
};

/** Required display labels per ellis-scene-architect.txt (emoji preserved). */
export const canonicalEllisSectionLabel = (rawLabel) => {
  const label = String(rawLabel || "")
    .replace(/^\*+|\*+$/g, "")
    .trim();
  if (!label) return label;

  if (/^(?:🔍\s*)?Scene Analysis/i.test(label)) {
    return "🔍 Scene Analysis — Editorial Review";
  }
  if (/^(?:🎨\s*)?Creative Suggestions/i.test(label)) {
    return "🎨 Creative Suggestions";
  }
  if (/^(?:📌\s*)?Chapter Cumulative Editorial Note/i.test(label)) {
    return "📌 Chapter Cumulative Editorial Note";
  }
  return label;
};

/** Remove lines that are only markdown bold markers (model artifact). */
export const stripOrphanBoldMarkerLines = (text) => {
  const lines = String(text || "").replace(/\r\n?/g, "\n").split("\n");
  return lines
    .filter((line) => !/^\s*\*{1,6}\s*$/.test(line))
    .join("\n");
};

const isEllisKnownSectionHeadingBody = (body) => {
  const t = String(body || "")
    .trim()
    .replace(/^\*\*|\*\*$/g, "")
    .trim();
  return (
    /^Function in Story\b/i.test(t) ||
    /^Genre Beat Check\b/i.test(t) ||
    /^(?:🔍\s*)?Scene Analysis/i.test(t) ||
    /^(?:🎨\s*)?Creative Suggestions/i.test(t) ||
    /^(?:📌\s*)?Chapter Cumulative Editorial Note/i.test(t)
  );
};

/** Strip markdown heading markers from Ellis section labels (model often emits ###). */
export const stripEllisMarkdownSectionHeadings = (text) =>
  String(text || "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => {
      const match = line.match(/^(\s*)(#{1,6}\s+)(.+)$/);
      if (!match || !isEllisKnownSectionHeadingBody(match[3])) return line;
      return `${match[1]}${match[3].trim()}`;
    })
    .join("\n");

/**
 * Normalize `**Section Label:**` or `Section Label:` header-only lines (no inline body).
 */
export const normalizeEllisSectionHeaderLines = (text) => {
  let out = String(text || "");
  for (const label of ELLIS_PRIMARY_SECTION_LABELS) {
    const base = escapeRegex(label);
    const re = new RegExp(
      `(^|\\n)\\s*\\*{0,2}\\s*(${base})(?:\\s*\\([^\\n)]*\\))?\\s*\\*{0,2}\\s*:\\s*(?=\\n|$)`,
      "gim"
    );
    out = out.replace(re, (_, start, name) => `${start}${name}`);
  }
  const chapterRe = new RegExp(
    `(^|\\n)\\s*\\*{0,2}\\s*(Chapter\\s+${ELLIS_CHAPTER_NUMBER_RE}(?:\\s*[–—-]\\s*POV\\s*:[^\\n]*)?)\\s*\\*{0,2}\\s*:\\s*(?=\\n|$)`,
    "gim"
  );
  out = out.replace(chapterRe, (_, start, name) => `${start}${name.trim()}`);
  return out;
};

/**
 * Join creative sub-labels split across lines onto one `Label: value` line.
 */
export const joinCreativeSuggestionSubLabels = (text) => {
  const lines = String(text || "").replace(/\r\n?/g, "\n").split("\n");
  const result = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let joined = false;

    for (const label of ELLIS_CREATIVE_SUB_LABELS) {
      const headerOnlyRe = new RegExp(
        `^\\s*\\*{0,2}\\s*(${escapeRegex(label)})\\s*\\*{0,2}\\s*:?\\s*$`,
        "i"
      );
      const match = line.match(headerOnlyRe);
      if (!match) continue;

      let j = i + 1;
      while (j < lines.length && lines[j].trim() === "") j += 1;
      if (j >= lines.length) {
        result.push(`${match[1]}:`);
        joined = true;
        break;
      }

      const value = lines[j].trim().replace(/^\*+|\*+$/g, "").trim();
      result.push(`${match[1]}: ${value}`);
      i = j;
      joined = true;
      break;
    }

    if (!joined) {
      result.push(line);
    }
  }

  return result.join("\n");
};

/** Collapse duplicate blank lines introduced by cleanup. */
const collapseBlankLines = (text) =>
  String(text || "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

/** CRLF → LF; collapse runs of 3+ blank lines to 2. */
export const normalizeEllisReviewMarkdown = (text) =>
  String(text || "")
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

/** Remove chat-only footer if it leaked into stored markdown. */
export const stripEllisChatOnlyTail = (text) => {
  const footerLeads = [
    "Chapter feedback complete",
    "If you have questions about this feedback",
  ];
  const raw = String(text || "");
  let cutAt = -1;
  for (const lead of footerLeads) {
    const idx = raw.indexOf(lead);
    if (idx !== -1 && (cutAt === -1 || idx < cutAt)) cutAt = idx;
  }
  if (cutAt === -1) return raw;
  return raw.slice(0, cutAt).trimEnd();
};

const isEllisSceneAnalysisEditorialSuffix = (text) => {
  const t = String(text || "")
    .trim()
    .replace(/^\*\*|\*\*$/g, "")
    .trim();
  return /^(?:[—–-]\s*Editorial Review|\(Editorial Review\))$/i.test(t);
};

const shouldSkipEllisInlineHeaderSplit = (fullString, offset, start, header) => {
  const afterHeader = fullString.slice(offset + start.length + header.length);
  return /^\s*(?:[—–-]\s*Editorial Review|\(Editorial Review\))/i.test(afterHeader);
};

/**
 * Split inline `Label: body` onto separate lines for known Ellis section labels.
 */
export const forceEllisInlineSectionBreaks = (text) => {
  let out = String(text || "");
  const labelsByLength = [...ELLIS_PRIMARY_SECTION_LABELS].sort((a, b) => b.length - a.length);

  for (const label of labelsByLength) {
    const base = escapeRegex(label);
    const re = new RegExp(
      `(^|\\n)(\\s*(?:[-*•]\\s+)?(?:\\*\\*\\s*)?${base}(?:\\s*\\([^\\n)]*\\))?(?:\\s*\\*\\*)?)(\\s*:\\s*)([^\\n])`,
      "gim"
    );
    out = out.replace(re, (match, start, header, _colon, bodyStart, offset, fullString) => {
      if (shouldSkipEllisInlineHeaderSplit(fullString, offset, start, header)) {
        return match;
      }
      return `${start}${header}\n\n${bodyStart}`;
    });
    const noColonRe = new RegExp(
      `(^|\\n)(\\s*(?:[-*•]\\s+)?(?:\\*\\*\\s*)?${base}(?:\\s*\\([^\\n)]*\\))?(?:\\s*\\*\\*)?)(\\s+)([^\\n])`,
      "gim"
    );
    out = out.replace(noColonRe, (match, start, header, space, bodyStart, offset, fullString) => {
      if (/^Chapter\s/i.test(header.trim())) {
        return `${start}${header}${space}${bodyStart}`;
      }
      if (shouldSkipEllisInlineHeaderSplit(fullString, offset, start, header)) {
        return match;
      }
      return `${start}${header}\n\n${bodyStart}`;
    });
  }
  return out;
};

/** Remove orphan Scene Analysis suffix lines leaked by legacy inline splits. */
export const stripEllisSceneAnalysisOrphanSuffixLines = (text) =>
  String(text || "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((line) => !isEllisSceneAnalysisEditorialSuffix(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");

/** Strip pointer arrows and bold the label portion of creative suggestion lines. */
export const styleEllisCreativeBlocks = (text) =>
  String(text || "")
    .replace(/^\s*👉\s*/gm, "")
    .replace(
      new RegExp(`^((?:${ELLIS_CREATIVE_EDITORIAL_LABEL}|${ELLIS_CREATIVE_EXAMPLE_LABEL})\\s*:)\\s*`, "gim"),
      "**$1** "
    )
    .replace(
      /^(Structural Weakness|Character Weakness|Creative Suggestion Name)(\s*:)\s*/gim,
      "**$1$2** "
    );

const ELLIS_CREATIVE_LINE_RE = new RegExp(
  `^\\s*\\*{0,2}\\s*(?:Structural Weakness|Character Weakness|Creative Suggestion Name|${ELLIS_CREATIVE_EDITORIAL_LABEL}|${ELLIS_CREATIVE_EXAMPLE_LABEL})\\s*\\*{0,2}\\s*:`,
  "i"
);

/**
 * Put each creative sub-label (Name/Editorial Logic/Application Example) on its own paragraph so
 * per-line spacing applies (react-markdown otherwise joins them with <br>).
 */
export const spaceEllisCreativeSuggestionLines = (text) => {
  const lines = String(text || "").replace(/\r\n?/g, "\n").split("\n");
  const result = [];
  let inCreative = false;

  for (const line of lines) {
    if (isCreativeSuggestionsHeaderLine(line)) {
      inCreative = true;
      result.push(line);
      continue;
    }

    if (inCreative && exitsCreativeSuggestionsBlock(line)) {
      inCreative = false;
    }

    if (inCreative && ELLIS_CREATIVE_LINE_RE.test(line)) {
      const last = result[result.length - 1];
      if (last !== undefined && last.trim() !== "") {
        result.push("");
      }
    }

    result.push(line);
  }

  return result.join("\n");
};

/**
 * Insert a light separator before each new suggestion (weakness line after prior examples).
 */
export const insertEllisCreativeSuggestionSeparators = (text) => {
  const lines = String(text || "").replace(/\r\n?/g, "\n").split("\n");
  const result = [];
  let inCreative = false;
  let sawExampleInCurrentSuggestion = false;

  for (const line of lines) {
    if (isCreativeSuggestionsHeaderLine(line)) {
      inCreative = true;
      sawExampleInCurrentSuggestion = false;
      result.push(line);
      continue;
    }

    if (inCreative && exitsCreativeSuggestionsBlock(line)) {
      inCreative = false;
      sawExampleInCurrentSuggestion = false;
    }

    if (inCreative && new RegExp(`^\\s*\\*{0,2}\\s*${ELLIS_CREATIVE_EXAMPLE_LABEL}`, "i").test(line)) {
      sawExampleInCurrentSuggestion = true;
    }

    if (inCreative && ELLIS_WEAKNESS_START_RE.test(line)) {
      if (sawExampleInCurrentSuggestion) {
        result.push(ELLIS_SUGGESTION_SEP_MARKER);
        sawExampleInCurrentSuggestion = false;
      }
    }

    result.push(line);
  }

  return result.join("\n");
};

/**
 * Insert `---` before Ellis section headers; emit bold label lines (Olivia-style).
 */
export const insertEllisSectionDividers = (text) => {
  const lines = String(text || "").replace(/\r\n?/g, "\n").split("\n");
  const result = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (ELLIS_SECTION_HEADER_RE.test(line)) {
      const trimmed = line.trim();
      const splitMatch = trimmed.match(ELLIS_SECTION_SPLIT_RE);
      let rawLabel = trimmed.replace(/^\*+\s*/, "").replace(/\s*\*+$/, "").trim();
      if (splitMatch) {
        rawLabel = splitMatch[1]
          .replace(/^\*+\s*/, "")
          .replace(/\s*\*+$/, "")
          .trim();
      }

      if (isEllisSceneTitleHeaderLine(line)) {
        // Keep custom titles ("Chapter One Point Five – POV: …") on one line.
        // Chapter-N regex used to match "Chapter One P" inside "Point".
        result.push(stripEllisInlineMarkdownEmphasis(trimmed));
        continue;
      }

      const lastNonEmpty = [...result].reverse().find((l) => l.trim() !== "");
      if (lastNonEmpty !== "---") {
        const lastLine = result[result.length - 1];
        if (lastLine && lastLine.trim() !== "") {
          result.push("");
        }
        result.push("---");
      }

      if (splitMatch) {
        const content = (splitMatch[2] || "").trim();
        result.push(`**${canonicalEllisSectionLabel(rawLabel)}**`);
        if (content) {
          result.push("");
          result.push(content);
        }
      } else {
        result.push(`**${canonicalEllisSectionLabel(rawLabel)}**`);
      }
      continue;
    }

    result.push(line);
  }

  return result.join("\n");
};

/** Full display pipeline (exported for tests). */
export const prepareEllisReviewForDisplay = (text) => {
  let out = liftEllisReviewSectionHeaders(text);
  out = normalizeEllisReviewMarkdown(out);
  out = stripEllisChatOnlyTail(out);
  out = stripEllisMarkdownSectionHeadings(out);
  out = stripOrphanBoldMarkerLines(out);
  out = normalizeEllisSectionHeaderLines(out);
  out = mergeEllisChapterPovTitleLines(out);
  out = joinCreativeSuggestionSubLabels(out);
  out = forceEllisInlineSectionBreaks(out);
  out = stripEllisSceneAnalysisOrphanSuffixLines(out);
  out = stripOrphanBoldMarkerLines(out);
  out = styleEllisCreativeBlocks(out);
  out = spaceEllisCreativeSuggestionLines(out);
  out = insertEllisCreativeSuggestionSeparators(out);
  out = insertEllisSectionDividers(out);
  return collapseBlankLines(out);
};
