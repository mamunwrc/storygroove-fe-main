/**
 * Preserve first-line/leading indentation across a Quill reload.
 *
 * Quill's clipboard collapses a paragraph's leading whitespace on reload.
 * Convert leading spaces/tabs into non-breaking spaces, which Quill keeps
 * verbatim, so manual indent survives refresh and chapter navigation.
 *
 * Word paste usually does NOT use spaces/tabs — it uses CSS `text-indent` /
 * `mso-first-line-indent` / `mso-char-indent` (often only in a `<style>` block).
 * Word desktop on Windows commonly emits custom indents (0.3") as character
 * units (`mso-char-indent: 1.8 12pt`) while the default 0.5" stays `text-indent`.
 * Quill drops unregistered CSS, so those must be rewritten to nbsps before convert().
 *
 * One manuscript tab equals five spaces, which is Word's default 0.5in
 * first-line indent. Copied CSS indents scale from that: 0.25in → 3 spaces,
 * 1in → 10 spaces.
 */
export const MANUSCRIPT_TAB_SPACES = 5;

export const MANUSCRIPT_PARAGRAPH_INDENT = "\u00a0".repeat(MANUSCRIPT_TAB_SPACES);

const INLINE_OPEN_TAGS = "span|strong|em|b|i|u|s|a|font|mark|sub|sup|small|big";

const INDENT_CSS_DETECT_RE =
  /(?:text-indent|mso-first-line-indent|mso-text-indent-alt|margin-left|mso-para-margin-left|mso-margin-left-alt|padding-left|mso-char-indent(?:-count|-size)?|mso-tab-count|mso-padding-alt|mso-spacerun)\s*:/i;

const INDENT_CSS_STRIP_RE =
  /(?:text-indent|mso-first-line-indent|mso-text-indent-alt|margin-left|mso-para-margin-left|mso-margin-left-alt|padding-left|mso-char-indent(?:-count|-size)?|mso-tab-count|mso-padding-alt)\s*:\s*[^;}"'\n]+;?/gi;

const WORD_CONVERT_INDENT_RE =
  /(?:text-indent|mso-first-line-indent|mso-text-indent-alt|margin-left|mso-para-margin-left|mso-margin-left-alt|padding-left|mso-char-indent(?:-count|-size)?|mso-tab-count|mso-padding-alt|mso-spacerun)\s*:|class\s*=\s*[^>]*\bMso(?:Normal|NoSpacing|BodyText|BodyTextIndent|ListParagraph|Quote)|xmlns:w=|Word\.Document|<w:ind\b|\bWordSection\d*\b/i;

/** Word desktop clipboard: process even when indent lives only in mso-* / XML. */
const WORD_CLIPBOARD_RE =
  /xmlns:w=|Word\.Document|\bWordSection\d*\b|class\s*=\s*[^>]*\bMso(?:Normal|NoSpacing|BodyText|ListParagraph)|mso-char-indent\s*:|mso-spacerun\s*:/i;

/** Match innermost `<p>` / `<div>` blocks so WordSection wrappers do not swallow paragraphs. */
const BLOCK_INNERMOST_RE =
  /<(p|div)(\s[^>]*)?>((?:(?!<(?:p|div)\b)[\s\S])*?)<\/\1>/gi;

const MSO_PARAGRAPH_CLASS_RE =
  /\bMso(?:Normal|NoSpacing|BodyText|BodyTextIndent|ListParagraph|Quote)(?:CxSp(?:First|Middle|Last|None))?\b/i;

/** Parse 0.3 / .3 / 21,6 (locale comma) into a JS number. */
const parseLocaleNumber = (raw = "") => {
  const value = String(raw || "").trim();
  if (!value) return null;
  const normalized = /^-?\d+,\d+/.test(value)
    ? value.replace(",", ".")
    : value;
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
};

/** Read a single CSS length from a style string. */
const readStyleLengthInches = (styleText, propRe) => {
  const match = String(styleText || "").match(propRe);
  if (!match) return null;
  return cssLengthToInches(match[1]);
};

const FONT_SIZE_IN_STYLE_RE =
  /(?:font-size|mso-ansi-font-size|mso-bidi-font-size)\s*:\s*([^;}"'\n]+)/i;

const fontSizeInchesFromText = (source = "") => {
  const match = String(source || "").match(FONT_SIZE_IN_STYLE_RE);
  if (!match) return null;
  const inches = cssLengthToInches(match[1]);
  return inches >= MIN_INDENT_INCHES ? inches : null;
};

/**
 * Word `mso-char-indent` shorthand:
 *   `2 12pt`  → count × size
 *   `1.8`     → count × first-character size (default 12pt)
 *   `.3in` / `21.6pt` → absolute first-line indent
 * Custom values like 0.3" are often this property only; 0.5" is usually text-indent.
 */
const parseMsoCharIndent = (raw = "", fontSizeHintInches = null) => {
  const value = String(raw || "")
    .replace(/!important/gi, "")
    .trim();
  if (!value) return null;

  const pair = value.match(/^(-?[\d.,]+)\s+(-?[\d.,]+\s*[a-z%]+)/i);
  if (pair) {
    const count = parseLocaleNumber(pair[1]);
    const size = cssLengthToInches(pair[2]);
    if (count != null && count > 0 && size >= MIN_INDENT_INCHES) {
      return count * size;
    }
  }

  if (/(?:in|pt|px|cm|mm|em|rem|pc)\s*$/i.test(value)) {
    const inches = cssLengthToInches(value);
    return Number.isFinite(inches) ? inches : null;
  }

  const count = parseLocaleNumber(value);
  if (count == null || count <= 0) return count === 0 ? 0 : null;
  const unit =
    fontSizeHintInches != null && fontSizeHintInches >= MIN_INDENT_INCHES
      ? fontSizeHintInches
      : 12 / 72;
  return count * unit;
};

const readMsoCharIndent = (styleText, fontSizeHintInches = null) => {
  const match = String(styleText || "").match(
    /mso-char-indent\s*:\s*([^;}\n]+)/i
  );
  if (!match) return null;
  return parseMsoCharIndent(match[1], fontSizeHintInches);
};

/**
 * Word encodes first-line indent many ways. Custom values (e.g. 0.3") often use
 * `mso-char-indent` / `mso-text-indent-alt` instead of `text-indent:.5in`.
 */
export const readParagraphIndentInches = (styleText = "", options = {}) => {
  const source = String(styleText || "");
  const fontSizeHint =
    options.fontSizeHint ?? fontSizeInchesFromText(source);

  const textIndent = readStyleLengthInches(source, /text-indent\s*:\s*([^;}\n]+)/i);
  const msoFirstLine = readStyleLengthInches(
    source,
    /mso-first-line-indent\s*:\s*([^;}\n]+)/i
  );
  const msoTextIndentAlt = readStyleLengthInches(
    source,
    /mso-text-indent-alt\s*:\s*([^;}\n]+)/i
  );
  const msoCharIndent = readMsoCharIndent(source, fontSizeHint);
  const marginLeft = readStyleLengthInches(source, /margin-left\s*:\s*([^;}\n]+)/i);
  const msoParaMarginLeft = readStyleLengthInches(
    source,
    /mso-para-margin-left\s*:\s*([^;}\n]+)/i
  );
  const msoMarginLeftAlt = readStyleLengthInches(
    source,
    /mso-margin-left-alt\s*:\s*([^;}\n]+)/i
  );
  const paddingLeft = readStyleLengthInches(source, /padding-left\s*:\s*([^;}\n]+)/i);
  const msoPaddingAlt = readStyleLengthInches(
    source,
    /mso-padding-alt\s*:\s*[^;\s]+\s+[^;\s]+\s+[^;\s]+\s+([^;}\n]+)/i
  );
  const charIndentCount = readStyleNumber(
    source,
    /mso-char-indent-count\s*:\s*([\d.,]+)/i
  );
  const charIndentSize = readStyleLengthInches(
    source,
    /mso-char-indent-size\s*:\s*([^;}\n]+)/i
  );

  const firstLineCandidates = [
    textIndent,
    msoFirstLine,
    msoTextIndentAlt,
    msoCharIndent,
  ].filter((v) => v != null);
  for (const inches of firstLineCandidates) {
    if (inches >= MIN_INDENT_INCHES) return inches;
  }

  if (charIndentCount != null && charIndentCount > 0) {
    const unitInches =
      charIndentSize ?? fontSizeHint ?? fontSizeInchesFromText(source);
    const unit =
      unitInches != null && unitInches >= MIN_INDENT_INCHES
        ? unitInches
        : 12 / 72;
    const total = charIndentCount * unit;
    if (total >= MIN_INDENT_INCHES) return total;
  }

  const marginCandidates = [marginLeft, msoParaMarginLeft, msoMarginLeftAlt].filter(
    (v) => v != null
  );

  // Hanging indent: negative text-indent + positive margin-left — not first-line indent.
  if (
    textIndent != null &&
    textIndent < 0 &&
    marginCandidates.some((inches) => inches >= MIN_INDENT_INCHES)
  ) {
    return null;
  }

  for (const inches of marginCandidates) {
    if (inches >= MIN_INDENT_INCHES) return inches;
  }

  const paddingCandidates = [paddingLeft, msoPaddingAlt].filter((v) => v != null);
  for (const inches of paddingCandidates) {
    if (inches >= MIN_INDENT_INCHES) return inches;
  }

  return null;
};

const readStyleNumber = (styleText, propRe) => {
  const match = String(styleText || "").match(propRe);
  if (!match) return null;
  return parseLocaleNumber(match[1]);
};

/** @deprecated use readParagraphIndentInches — kept for tests/callers */
export const readFirstLineIndentInches = (styleText = "") => {
  const inches = readParagraphIndentInches(styleText);
  return inches == null ? null : inches;
};

const BLOCK_OPEN_INDENT_RE = new RegExp(
  `(<p\\b[^>]*>|<br\\s*/?>)((?:<(?:${INLINE_OPEN_TAGS})\\b[^>]*>)*)([ \\t]+)`,
  "gi"
);

/** Expand a leading whitespace run (spaces + tabs) into nbsp units. */
export const expandLeadingWhitespaceToNbsp = (whitespace = "") => {
  let count = 0;
  for (const ch of String(whitespace)) {
    if (ch === "\t") count += MANUSCRIPT_TAB_SPACES;
    else if (ch === " ") count += 1;
  }
  return "\u00a0".repeat(count);
};

/** Replace every tab character with the manuscript paragraph indent width. */
export const convertTabCharactersToIndent = (html = "") =>
  String(html || "").replace(/\t/g, MANUSCRIPT_PARAGRAPH_INDENT);

/** CSS length → inches. Returns 0 when the value cannot be parsed. */
export const cssLengthToInches = (raw = "") => {
  const value = String(raw || "")
    .replace(/!important/gi, "")
    .trim();
  if (!value) return 0;
  const match = value.match(
    /^(-?(?:\d+(?:[.,]\d+)?|\.\d+))\s*(in|pt|px|cm|mm|em|rem|pc|%)?$/i
  );
  if (!match) return 0;
  const n = parseLocaleNumber(match[1]);
  if (n == null) return 0;
  switch ((match[2] || "px").toLowerCase()) {
    case "in":
      return n;
    case "pt":
      return n / 72;
    case "px":
      return n / 96;
    case "cm":
      return n / 2.54;
    case "mm":
      return n / 25.4;
    case "pc":
      return (n * 12) / 72;
    case "em":
    case "rem":
      return (n * 12) / 72;
    case "%":
      return 0;
    default:
      return n / 96;
  }
};

/** Word default first-line indent; 0.5in maps to `MANUSCRIPT_TAB_SPACES` nbsps. */
export const WORD_DEFAULT_INDENT_INCHES = 0.5;

const MIN_INDENT_INCHES = 0.02;
const MAX_INDENT_NBSPS = 40;

/**
 * Map a CSS first-line indent onto nbsps, proportional to Word's 0.5in = 5
 * spaces. 0.25in → 3, 0.5in → 5, 1in → 10.
 */
export const nbspsFromIndentInches = (inches) => {
  if (!Number.isFinite(inches) || inches < MIN_INDENT_INCHES) return "";
  const count = Math.round(
    (inches / WORD_DEFAULT_INDENT_INCHES) * MANUSCRIPT_TAB_SPACES
  );
  return "\u00a0".repeat(Math.max(1, Math.min(count, MAX_INDENT_NBSPS)));
};

export const nbspsFromStyleAttribute = (styleText = "") => {
  const inches = readParagraphIndentInches(styleText);
  if (inches == null) return "";
  return nbspsFromIndentInches(inches);
};

/** True when CSS carries a visible positive first-line indent. */
export const hasPositiveFirstLineIndent = (styleText = "") =>
  nbspsFromStyleAttribute(styleText).length > 0;

export const hasExplicitZeroFirstLineIndent = (styleText = "") => {
  const textIndent = readStyleLengthInches(
    styleText,
    /text-indent\s*:\s*([^;}\n]+)/i
  );
  if (textIndent == null) return false;
  return textIndent < MIN_INDENT_INCHES;
};

const STYLE_TAG_RE = /<style\b[^>]*>[\s\S]*?<\/style>/gi;

const readQuotedAttr = (attrs, name) => {
  const source = String(attrs || "");
  const quoted = source.match(
    new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i")
  );
  if (quoted) return quoted[1] ?? quoted[2] ?? "";
  const bare = source.match(new RegExp(`\\b${name}\\s*=\\s*([^\\s>]+)`, "i"));
  return bare ? bare[1].replace(/['"]/g, "") : "";
};

const stripIndentCssFromAttrs = (attrs = "") => {
  const style = readQuotedAttr(attrs, "style");
  if (!style) return attrs;
  const cleaned = style
    .replace(INDENT_CSS_STRIP_RE, "")
    .replace(/^\s*;+\s*|\s*;+\s*$/g, "")
    .trim();
  if (!cleaned) {
    return String(attrs).replace(/\sstyle=(?:"[^"]*"|'[^']*'|[^\s>]+)/i, "");
  }
  return String(attrs).replace(
    /style=(?:"[^"]*"|'[^']*'|[^\s>]+)/i,
    `style="${cleaned}"`
  );
};

const isWordParagraphDiv = (attrs = "", inner = "") => {
  if (/\bWordSection\d*\b/i.test(attrs) && !MSO_PARAGRAPH_CLASS_RE.test(attrs)) {
    return false;
  }
  if (MSO_PARAGRAPH_CLASS_RE.test(attrs)) return true;
  if (INDENT_CSS_DETECT_RE.test(attrs)) return true;
  return !/<(?:p|div|table|ul|ol|h[1-6])\b/i.test(String(inner || ""));
};

const TWIPS_PER_INCH = 1440;

/** Word OOXML first-line indent from `<w:ind w:firstLine="432"/>` (twips). */
const readWordIndElementInches = (indFragment = "", fontSizePt = 12) => {
  const source = String(indFragment || "");
  const firstLine = source.match(/\bw:firstLine="(\d+)"/i);
  if (firstLine) {
    const inches = parseInt(firstLine[1], 10) / TWIPS_PER_INCH;
    return inches >= MIN_INDENT_INCHES ? inches : null;
  }
  const firstLineChars = source.match(/\bw:firstLineChars="(\d+)"/i);
  if (firstLineChars) {
    const charCount = parseInt(firstLineChars[1], 10) / 50;
    const inches = charCount * (fontSizePt / 72);
    return inches >= MIN_INDENT_INCHES ? inches : null;
  }
  return null;
};

const wordStyleIdToMsoClass = (styleId = "") => {
  const id = String(styleId || "").trim();
  if (!id) return null;
  if (/^normal$/i.test(id)) return "MsoNormal";
  return `Mso${id.charAt(0).toUpperCase()}${id.slice(1)}`;
};

const selectorsForWordStyleId = (styleId = "") => {
  const msoClass = wordStyleIdToMsoClass(styleId);
  if (!msoClass) return [];
  const lower = msoClass.toLowerCase();
  return [`p.${lower}`, `li.${lower}`, `div.${lower}`, `.${lower}`, lower];
};

/** Stylesheet rules from Word's OOXML blocks embedded in clipboard HTML. */
const parseWordXmlIndentRules = (html = "") => {
  const rules = [];
  const source = String(html || "");
  if (!/<w:ind\b/i.test(source)) return rules;

  const styleBlocks =
    source.match(/<w:style\b[\s\S]*?<\/w:style>/gi) || [];
  for (const block of styleBlocks) {
    if (!/\bw:type="paragraph"/i.test(block)) continue;
    const styleId = block.match(/\bw:styleId="([^"]+)"/i)?.[1];
    if (!styleId) continue;
    const indEl = block.match(/<w:ind\b[^>]*\/?>/i)?.[0];
    if (!indEl) continue;
    const inches = readWordIndElementInches(indEl);
    if (inches == null) continue;
    const selectors = selectorsForWordStyleId(styleId);
    if (selectors.length) rules.push({ selectors, inches });
  }

  const docDefaults = source.match(/<w:docDefaults\b[\s\S]*?<\/w:docDefaults>/i)?.[0];
  const defaultInd = docDefaults?.match(/<w:ind\b[^>]*\/?>/i)?.[0];
  if (defaultInd) {
    const inches = readWordIndElementInches(defaultInd);
    if (inches != null) {
      rules.push({
        selectors: selectorsForWordStyleId("Normal"),
        inches,
      });
    }
  }

  return rules;
};

const mergeIndentStylesheetRules = (html = "") => {
  const cssRules = parseStyleBlockIndentRules(html);
  const xmlRules = parseWordXmlIndentRules(html);
  return [...cssRules, ...xmlRules];
};

const readWordXmlIndentInches = (fragment = "", fontSizePt = 12) => {
  const indEl = String(fragment || "").match(/<w:ind\b[^>]*\/?>/i)?.[0];
  if (!indEl) return null;
  return readWordIndElementInches(indEl, fontSizePt);
};

const normalizeWordClassToken = (value = "") =>
  String(value || "")
    .replace(/[\uFEFF\u200B\u2060\u00AD]/g, "")
    .trim()
    .toLowerCase();

const isParagraphIndentSelector = (selector = "") => {
  const sel = String(selector || "").trim().toLowerCase();
  if (!sel || sel.startsWith("@")) return false;
  if (sel.startsWith("table")) return false;
  return /^(p|div|li|h[1-6]|blockquote|\.)?\b/.test(sel);
};

const parseStyleBlockIndentRules = (html = "") => {
  const rules = [];
  const blocks = String(html).match(STYLE_TAG_RE) || [];
  for (const block of blocks) {
    const css = block
      .replace(/^<style\b[^>]*>/i, "")
      .replace(/<\/style>$/i, "")
      .replace(/<!--|-->/g, "");
    for (const rule of css.split("}")) {
      const inches = readParagraphIndentInches(rule);
      if (inches == null) continue;
      const selectorPart = rule.split("{")[0] || "";
      const selectors = selectorPart
        .split(",")
        .map((sel) => sel.trim().toLowerCase().replace(/\s+/g, " "))
        .filter(Boolean)
        .filter(isParagraphIndentSelector);
      if (selectors.length) rules.push({ selectors, inches });
    }
  }
  return rules;
};

const getMsoNormalStylesheetIndentInches = (rules = []) => {
  for (const rule of rules) {
    if (
      rule.selectors.some(
        (sel) =>
          sel === "p.msonormal" ||
          sel === "div.msonormal" ||
          sel === "li.msonormal" ||
          sel === ".msonormal"
      )
    ) {
      return rule.inches;
    }
  }
  return null;
};

const paragraphMatchesIndentSelectors = (tag, attrs, selectors) => {
  if (!selectors?.length) return false;
  const names = new Set(selectors);
  const tagName = String(tag || "").toLowerCase();
  if (names.has(tagName)) return true;

  const classAttr = readQuotedAttr(attrs, "class");
  const classes = classAttr.split(/\s+/).filter(Boolean);
  for (const cls of classes) {
    const c = normalizeWordClassToken(cls);
    if (!c) continue;
    if (names.has(`.${c}`)) return true;
    if (names.has(`${tagName}.${c}`)) return true;
    // Word contextual spacing: MsoNormalCxSpFirst inherits p.MsoNormal rules.
    const base = c.replace(/cxsp(?:first|middle|last|none)$/i, "");
    if (base !== c) {
      if (names.has(`.${base}`)) return true;
      if (names.has(`${tagName}.${base}`)) return true;
    }
  }
  return false;
};

/** Inline style wins; otherwise last matching stylesheet / Word XML rule. */
const indentInchesForParagraph = (tag, attrs, rules, inner = "") => {
  const style = readQuotedAttr(attrs, "style");
  const fontHint =
    fontSizeInchesFromText(style) || fontSizeInchesFromText(inner);
  const fontSizePt = fontHint != null ? fontHint * 72 : 12;

  const inline = readParagraphIndentInches(style, { fontSizeHint: fontHint });
  if (inline != null) return inline;

  const xmlInline = readWordXmlIndentInches(`${attrs}${inner}`, fontSizePt);
  if (xmlInline != null) return xmlInline;

  let matched = null;
  for (const rule of rules) {
    if (paragraphMatchesIndentSelectors(tag, attrs, rule.selectors)) {
      matched = rule.inches;
    }
  }
  if (matched != null) return matched;

  // Word desktop often keeps custom indents (0.3") only on p.MsoNormal in the
  // stylesheet while 0.5" gets copied inline. Fall back to the Normal style rule
  // whenever the paragraph clearly uses that Word class.
  const classAttr = normalizeWordClassToken(readQuotedAttr(attrs, "class"));
  if (/\bmsonormal\b/.test(classAttr)) {
    return getMsoNormalStylesheetIndentInches(rules);
  }
  return null;
};

const shouldSkipWordIndentBlock = (attrs = "") => {
  const source = String(attrs || "");
  if (/\bql-align-(center|right)\b/i.test(source)) return true;
  if (/text-align\s*:\s*(center|right)/i.test(source)) return true;
  return false;
};

const innerLooksEmpty = (inner = "") =>
  String(inner)
    .replace(/<br\s*\/?>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, "")
    .replace(/\u00a0/g, "")
    .replace(/\s+/g, "")
    .length === 0;

const decodeHtmlWhitespace = (value = "") =>
  String(value || "")
    .replace(/&nbsp;/gi, "\u00a0")
    .replace(/&#160;/g, "\u00a0")
    .replace(/&#x0?a0;/gi, "\u00a0");

const nbspsFromWhitespaceRun = (run = "") => {
  let count = 0;
  for (const ch of decodeHtmlWhitespace(run)) {
    if (ch === "\t") count += MANUSCRIPT_TAB_SPACES;
    else if (ch === "\u00a0" || ch === " ") count += 1;
  }
  return count > 0 ? "\u00a0".repeat(count) : "";
};

/** Leading run of whitespace/nbsp (after any inline open tags) at a block's start. */
const LEADING_INDENT_RUN_RE = new RegExp(
  `^((?:<(?:${INLINE_OPEN_TAGS})\\b[^>]*>)*)((?:&nbsp;|&#160;|&#x0?a0;|[\\u00a0 \\t])+)`,
  "i"
);

/**
 * Split a block's inner HTML into the inline-tag prefix, the decoded leading
 * whitespace/nbsp run, and the remaining content. Returns null when there is no
 * leading run to reconcile against a measured CSS indent.
 */
const splitLeadingIndentRun = (inner = "") => {
  const match = String(inner || "").match(LEADING_INDENT_RUN_RE);
  if (!match) return null;
  return {
    prefix: match[1] || "",
    // Decoded run keeps tabs/spaces distinct from nbsps so we only treat an
    // already-nbsp run as "already converted"; a raw tab/space still normalizes.
    runDecoded: decodeHtmlWhitespace(match[2]),
    rest: String(inner).slice(match[0].length),
  };
};

const LEADING_NON_SPAN_INLINE_PREFIX_RE = new RegExp(
  `^(?:\\s|<(?:strong|em|b|i|u|s|a|font|mark|sub|sup|small|big)\\b[^>]*>\\s*)*`,
  "i"
);

const readFirstSpanIndentInches = (inner = "") => {
  const match = String(inner || "").match(
    new RegExp(
      `^${LEADING_NON_SPAN_INLINE_PREFIX_RE.source}<span\\b([^>]*)>`,
      "i"
    )
  );
  if (!match) return null;
  return readParagraphIndentInches(readQuotedAttr(match[1], "style"), {
    fontSizeHint: fontSizeInchesFromText(inner),
  });
};

/** Word often encodes first-line indent as a leading `<span style="mso-tab-count:1">` run. */
const peelLeadingWordIndentSpan = (inner = "") => {
  const source = String(inner || "");
  const tabSpanMatch = source.match(
    new RegExp(
      `^${LEADING_NON_SPAN_INLINE_PREFIX_RE.source}<span\\b([^>]*(?:mso-tab-count|mso-spacerun)[^>]*)>([\\s\\S]*?)<\\/span>`,
      "i"
    )
  );
  if (tabSpanMatch) {
    const indent = nbspsFromWhitespaceRun(tabSpanMatch[2]);
    if (indent) {
      return { inner: source.slice(tabSpanMatch[0].length), indent };
    }
  }

  const whitespaceSpanMatch = source.match(
    new RegExp(
      `^${LEADING_NON_SPAN_INLINE_PREFIX_RE.source}<span\\b([^>]*)>([\\s\\S]*?)<\\/span>`,
      "i"
    )
  );
  if (!whitespaceSpanMatch) return { inner: source, indent: "" };

  const spanInner = whitespaceSpanMatch[2] || "";
  const decoded = decodeHtmlWhitespace(spanInner).replace(/<[^>]+>/g, "");
  const whitespaceOnly =
    decoded.length > 0 &&
    !decoded.replace(/[\u00a0 \t\r\n]/g, "").length;
  if (!whitespaceOnly) return { inner: source, indent: "" };

  const indent = nbspsFromWhitespaceRun(spanInner);
  if (!indent) return { inner: source, indent: "" };

  return {
    inner: source.slice(whitespaceSpanMatch[0].length),
    indent,
  };
};

const resolveBlockIndent = (tag, attrs, inner, rules) => {
  const blockTag = String(tag || "p").toLowerCase();
  const fromBlock = indentInchesForParagraph(blockTag, attrs, rules, inner);
  if (fromBlock != null) {
    return { indent: nbspsFromIndentInches(fromBlock), inner };
  }

  const fromSpan = readFirstSpanIndentInches(inner);
  if (fromSpan != null) {
    return { indent: nbspsFromIndentInches(fromSpan), inner };
  }

  return peelLeadingWordIndentSpan(inner);
};

/**
 * Rewrite Word/Google-Docs first-line indent CSS into leading nbsps Quill
 * can actually display. Safe to run on already-normalized Quill HTML.
 */
export const convertWordFirstLineIndentToNbsp = (html = "") => {
  const source = String(html || "");
  if (!source) return source;
  if (!WORD_CONVERT_INDENT_RE.test(source)) return source;

  const rules = mergeIndentStylesheetRules(source);

  return source.replace(
    BLOCK_INNERMOST_RE,
    (match, tag, attrs = "", inner) => {
      const blockTag = String(tag || "p").toLowerCase();
      if (blockTag === "div" && !isWordParagraphDiv(attrs, inner)) return match;
      if (shouldSkipWordIndentBlock(attrs)) return match;
      if (innerLooksEmpty(inner)) return match;

      const { indent, inner: nextInner } = resolveBlockIndent(
        blockTag,
        attrs,
        inner,
        rules
      );
      if (!indent) return match;

      const cleanedAttrs = stripIndentCssFromAttrs(attrs);

      // The measured CSS indent (inline / stylesheet) is authoritative. When it
      // did not consume a leading span, reconcile it with any leading
      // whitespace/nbsp run already in the text. Word desktop can emit BOTH the
      // real first-line-indent CSS (e.g. text-indent:.3in) AND a leading tab or
      // space run. The old guard bailed out and let that run survive; a tab then
      // expands to MANUSCRIPT_TAB_SPACES (0.5in), silently flattening 0.3in — and
      // every non-0.5in value — to 0.5in. Replace the run with the measured width
      // instead, so 0.3in stays 0.3in while 0.5in/1in are unchanged.
      if (nextInner === inner) {
        const lead = splitLeadingIndentRun(inner);
        if (lead) {
          // Already exactly the measured indent as literal nbsps → leave
          // untouched (idempotent). A raw tab/space run still gets normalized.
          if (lead.runDecoded === indent) return match;
          return `<${blockTag}${cleanedAttrs}>${lead.prefix}${indent}${lead.rest}</${blockTag}>`;
        }
      }

      return `<${blockTag}${cleanedAttrs}>${indent}${nextInner}</${blockTag}>`;
    }
  );
};

/**
 * True when clipboard HTML/text carries indent that Quill would otherwise drop
 * (Word CSS first-line indent, leading spaces/tabs, or body-level tabs).
 * Tabs that only pretty-print a `<style>` block do not count — intercepting
 * those used to mangle Word paste without restoring indent.
 */
export const clipboardNeedsIndentPreservation = (html = "", text = "") => {
  if (String(text || "").includes("\t")) return true;
  const source = String(html || "");
  if (!source) return false;
  if (INDENT_CSS_DETECT_RE.test(source)) return true;
  if (WORD_CLIPBOARD_RE.test(source)) return true;
  if (/\bmso-tab-count\s*:/i.test(source)) return true;
  BLOCK_OPEN_INDENT_RE.lastIndex = 0;
  if (BLOCK_OPEN_INDENT_RE.test(source)) {
    BLOCK_OPEN_INDENT_RE.lastIndex = 0;
    return true;
  }
  BLOCK_OPEN_INDENT_RE.lastIndex = 0;
  const withoutStyle = source.replace(STYLE_TAG_RE, "");
  return withoutStyle.includes("\t");
};

/**
 * Leading whitespace of a Quill line, as nbsps, so Enter can continue
 * first-line indent the way Word does.
 */
export const getLeadingManuscriptIndent = (lineText = "") => {
  const match = String(lineText || "")
    .replace(/\n$/g, "")
    .match(/^[\u00a0 \t]+/);
  if (!match) return "";
  let count = 0;
  for (const ch of match[0]) {
    if (ch === "\t") count += MANUSCRIPT_TAB_SPACES;
    else count += 1;
  }
  return "\u00a0".repeat(count);
};

/**
 * Word wraps ordinary prose in `<b style="mso-bidi-font-weight:normal">`
 * (and the italic equivalent). Quill's `<b>` matcher treats that as real bold.
 * Unwrap those fake wrappers before clipboard.convert().
 */
export const unwrapWordFakeEmphasis = (html = "") => {
  let current = String(html || "");
  let previous = "";
  const unwrap = (tagPattern, fakeStyleRe) => {
    current = current.replace(
      new RegExp(
        `<(${tagPattern})\\b([^>]*)>([\\s\\S]*?)<\\/\\1>`,
        "gi"
      ),
      (match, tag, attrs, inner) =>
        fakeStyleRe.test(attrs) ? inner : match
    );
  };
  while (current !== previous) {
    previous = current;
    unwrap("b|strong", /font-weight\s*:\s*normal/i);
    unwrap("i|em", /font-style\s*:\s*normal/i);
  }
  return current;
};

/**
 * Quill's clipboard turns leftover `text-indent` into a leading tab — then
 * drops that tab on reload. After nbsps are in place, strip the CSS so convert
 * does not add a second indent.
 */
export const stripFirstLineIndentCss = (html = "") =>
  String(html || "")
    .replace(INDENT_CSS_STRIP_RE, "")
    .replace(/\sstyle=(?:"\s*;?\s*"|'\s*;?\s*')/gi, "");

/**
 * The leading whitespace is matched right after a block open (`<p>`) or a
 * `<br>`, but ALSO after any run of inline opening tags that Quill emits when
 * the first line carries formatting (e.g. `<p><span style="...">   Text`,
 * `<p><strong>   Text`). Without skipping those inline tags the indent on
 * formatted first lines would be missed.
 */
export const preserveLeadingIndentation = (html = "") => {
  BLOCK_OPEN_INDENT_RE.lastIndex = 0;
  return stripFirstLineIndentCss(convertWordFirstLineIndentToNbsp(html)).replace(
    BLOCK_OPEN_INDENT_RE,
    (_match, block, inlineTags, spaces) =>
      `${block}${inlineTags}${expandLeadingWhitespaceToNbsp(spaces)}`
  );
};
