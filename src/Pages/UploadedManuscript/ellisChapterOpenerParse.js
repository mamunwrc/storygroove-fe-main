/**
 * Parse and detect Ellis scene opener lines (`Chapter … – POV: Name`).
 * Word-number logic mirrors backend manuscriptParser / FE utils parseWordChapterNumber.
 */

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

const ONES_TITLE = ONES.slice(1).map(
  (word) => word.charAt(0).toUpperCase() + word.slice(1)
);

const TENS_TITLE = Object.keys(TENS).map(
  (word) => word.charAt(0).toUpperCase() + word.slice(1)
);

const ONES_AFTER_TENS_TITLE = ONES.slice(1, 10).map(
  (word) => word.charAt(0).toUpperCase() + word.slice(1)
);

const capitalize = (value) => {
  const s = String(value || "").trim();
  return s.length ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;
};

/** Model sometimes splits 14–19 as `Four` + `teen`, `Nine` + `teen`, etc. */
const TEEN_PREFIX_TO_COMPOUND = {
  four: "Fourteen",
  five: "Fifteen",
  six: "Sixteen",
  seven: "Seventeen",
  eight: "Eighteen",
  nine: "Nineteen",
};

export const combineTeenPrefixWord = (prefixWord) => {
  const lower = String(prefixWord || "").trim().toLowerCase();
  return TEEN_PREFIX_TO_COMPOUND[lower] || null;
};

export const canMergeTeenSuffixWithLabelParts = (labelParts) => {
  if (!Array.isArray(labelParts) || labelParts.length !== 1) return false;
  return Boolean(combineTeenPrefixWord(labelParts[0]));
};

export const isTeenSuffixToken = (line) => {
  const t = stripEllisInlineMarkdownEmphasis(line);
  return /^teen$/i.test(t);
};

export const stripEllisInlineMarkdownEmphasis = (line) =>
  String(line || "")
    .trim()
    .replace(/^\*+\s*|\s*\*+$/g, "")
    .trim();

const isNumberWord = (word) => {
  const lower = String(word || "").toLowerCase();
  return lower in ONES_MAP || lower in TENS;
};

const consumeWordChapterNumber = (rest) => {
  let remaining = String(rest || "").trim();
  const numberWords = [];
  let sawNumber = false;

  while (remaining) {
    const wm = remaining.match(/^([a-z]+)(\s*)/i);
    if (!wm) break;
    const word = wm[1].toLowerCase();
    if (word in ONES_MAP || word in TENS) {
      numberWords.push(capitalize(wm[1]));
      sawNumber = true;
      remaining = remaining.slice(wm[0].length).trim();
    } else {
      break;
    }
  }

  if (!sawNumber) return null;
  return { numberWords, remainder: remaining };
};

const parseLetterSuffix = (remainder) => {
  const trimmed = String(remainder || "").trim();
  if (!trimmed) return { letterSuffix: "", remainder: "" };
  if (/^(POV|Timeline)\b/i.test(trimmed)) {
    return { letterSuffix: "", remainder: trimmed };
  }
  const m = trimmed.match(/^[-–—\s]*([A-Za-z])(?![A-Za-z])(.*)$/);
  if (!m) return { letterSuffix: "", remainder: trimmed };
  return {
    letterSuffix: m[1].toUpperCase(),
    remainder: String(m[2] || "").trim(),
  };
};

const splitInlinePov = (text) => {
  const trimmed = String(text || "").trim();
  const m = trimmed.match(/^(.+?)\s*[–—-]\s*POV\s*:\s*(.+)$/i);
  if (!m) return { body: trimmed, pov: null };
  return { body: m[1].trim(), pov: m[2].trim() };
};

/**
 * Regex fragment: digits or word numbers 1–99 with optional letter suffix (e.g. 21A, Twenty One A).
 * Longer words first in alternations so `Fourteen` is not captured as `Four` + remainder.
 */
export const buildEllisChapterNumberRegex = () => {
  const singles = [...ONES_TITLE].sort((a, b) => b.length - a.length).join("|");
  const tens = [...TENS_TITLE].sort((a, b) => b.length - a.length).join("|");
  const onesAfterTens = [...ONES_AFTER_TENS_TITLE]
    .sort((a, b) => b.length - a.length)
    .join("|");
  return `(?:\\d+(?:[A-Za-z](?![A-Za-z]))?|(?:${singles}|${tens})(?:\\s+(?:${onesAfterTens}))?(?:\\s+[A-Z](?![A-Za-z]))?)`;
};

export const isChapterNumberWordToken = (line) => {
  const t = stripEllisInlineMarkdownEmphasis(line);
  if (!t) return false;
  return isNumberWord(t);
};

export const isSceneLetterSuffixToken = (line) => {
  const t = stripEllisInlineMarkdownEmphasis(line);
  return /^[A-Za-z]$/.test(t);
};

export const isPovOnlyLine = (line) => {
  const t = stripEllisInlineMarkdownEmphasis(line);
  return /^POV\s*:\s*\S/i.test(t);
};

export const isPovContinuationLine = (line) => {
  const t = stripEllisInlineMarkdownEmphasis(line);
  if (isPovOnlyLine(line)) return true;
  const m = t.match(/^(.+?)\s*[–—-]\s*POV\s*:\s*\S/i);
  if (!m) return false;
  const token = m[1].trim();
  return (
    isChapterNumberWordToken(token) ||
    isSceneLetterSuffixToken(token) ||
    /^teen$/i.test(token)
  );
};

/** Next line is `rest of custom title – POV: Name` (not a Chapter-N wrap). */
export const parseEllisCustomTitlePovContinuation = (line) => {
  const t = stripEllisInlineMarkdownEmphasis(line);
  if (!t || isPovOnlyLine(line)) return null;
  const m = t.match(/^(.+?)\s*[–—-]\s*POV\s*:\s*(.+)$/i);
  if (!m) return null;
  const titlePart = m[1].trim();
  const pov = m[2].trim();
  if (!titlePart || !pov) return null;
  if (isChapterNumberWordToken(titlePart) || isSceneLetterSuffixToken(titlePart)) {
    return null;
  }
  return { titlePart, pov };
};

export const isEllisChapterOpenerStart = (line) => {
  const t = stripEllisInlineMarkdownEmphasis(line);
  if (!t) return false;
  if (/Chapter Cumulative Editorial Note/i.test(t)) return false;
  if (t.length > 160) return false;
  if (/^Chapter\s+(?:\d|[A-Za-z])/i.test(t)) return true;
  return /^.+?\s*[–—-]\s*POV\s*:\s*\S/.test(t);
};

/**
 * @returns {{
 *   chapterPrefix: string,
 *   numberWords: string[],
 *   digitPart: string,
 *   letterSuffix: string,
 *   pov: string | null,
 *   isComplete: boolean,
 *   labelBody: string,
 * }}
 */
export const parseEllisChapterOpener = (text) => {
  const trimmed = stripEllisInlineMarkdownEmphasis(text);
  const empty = {
    chapterPrefix: "Chapter",
    numberWords: [],
    digitPart: "",
    letterSuffix: "",
    pov: null,
    isComplete: false,
    labelBody: "",
  };

  if (!trimmed) return empty;

  const chapterMatch = trimmed.match(/^Chapter\s+(.+)$/i);
  if (!chapterMatch) return empty;

  const { body, pov } = splitInlinePov(chapterMatch[1]);
  let numberWords = [];
  let digitPart = "";
  let letterSuffix = "";
  let remainder = body;

  const digitMatch = body.match(/^(\d{1,3})(.*)$/);
  if (digitMatch && /^\d/.test(body)) {
    digitPart = digitMatch[1];
    remainder = digitMatch[2].trim();
    const letterParse = parseLetterSuffix(remainder);
    letterSuffix = letterParse.letterSuffix;
    remainder = letterParse.remainder;
  } else {
    const wordParse = consumeWordChapterNumber(body);
    if (wordParse) {
      numberWords = wordParse.numberWords;
      remainder = wordParse.remainder;
      const letterParse = parseLetterSuffix(remainder);
      letterSuffix = letterParse.letterSuffix;
      remainder = letterParse.remainder;
    }
  }

  const labelParts = [];
  if (digitPart) {
    labelParts.push(digitPart + (letterSuffix || ""));
  } else {
    labelParts.push(...numberWords);
    if (letterSuffix) labelParts.push(letterSuffix);
  }
  if (remainder) {
    labelParts.push(...remainder.split(/\s+/).filter(Boolean));
    remainder = "";
  }

  const labelBody = labelParts.join(" ").trim();
  const isComplete = Boolean(pov) && Boolean(labelBody);

  return {
    chapterPrefix: "Chapter",
    numberWords,
    digitPart,
    letterSuffix,
    pov,
    isComplete,
    labelBody,
  };
};

export const formatEllisChapterOpener = ({ labelBody, pov }) => {
  const label = String(labelBody || "").trim();
  const name = String(pov || "").trim();
  if (!label) return "";
  if (!name) return `Chapter ${label}`;
  return `Chapter ${label} – POV: ${name}`;
};

export const isCompleteEllisChapterOpener = (line) => {
  if (!isEllisChapterOpenerStart(line)) return false;
  if (parseEllisChapterOpener(line).isComplete) return true;
  const t = stripEllisInlineMarkdownEmphasis(line);
  return /^.+?\s*[–—-]\s*POV\s*:\s*\S/.test(t) && t.length <= 160;
};

export const isIncompleteEllisChapterOpener = (line) => {
  if (!isEllisChapterOpenerStart(line)) return false;
  const parsed = parseEllisChapterOpener(line);
  return Boolean(parsed.labelBody) && !parsed.isComplete;
};
