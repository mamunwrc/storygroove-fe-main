/** Characters Quill and Word leave in otherwise empty blocks. */
import { preserveLeadingIndentation } from "./preserveLeadingIndentation.js";

const INVISIBLE_CHAR_RE = /[\uFEFF\u200B\u00A0]/g;

const EMPTY_BLOCK_TAG_RE = /^(P|DIV|H[1-6])$/;

/**
 * Strip tags/entities/invisible chars and decide if block inner HTML is empty.
 * A lone `<br>` counts as empty (blank paragraph).
 */
export const isVisuallyEmptyBlockInnerHtml = (innerHtml = "") => {
  const withoutCursor = String(innerHtml)
    .replace(/<span[^>]*class="[^"]*\bql-cursor\b[^"]*"[^>]*>[\s\S]*?<\/span>/gi, "")
    .replace(/<br\s*\/?>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#x0?0?feff;/gi, "")
    .replace(/&#65279;/g, "")
    .replace(INVISIBLE_CHAR_RE, "")
    .replace(/\s+/g, "");

  return withoutCursor.length === 0;
};

/**
 * Quill sometimes saves blank paragraphs as styled spans wrapping a zero-width
 * cursor (`\uFEFF`). Those look non-empty to the DOM but vanish on reload
 * because `clipboard.convert()` drops them. Rewrite to `<br>` while keeping
 * block attributes (alignment, spacing, font size on the block when present).
 */
export const normalizeQuillHtmlForRoundTrip = (html = "") => {
  const source = String(html || "");
  if (!source.trim()) return source;

  return source.replace(
    /<(p|div|h[1-6])(\s[^>]*)?>([\s\S]*?)<\/\1>/gi,
    (match, tag, attrs = "", inner) => {
      if (!isVisuallyEmptyBlockInnerHtml(inner)) return match;
      return `<${tag}${attrs || ""}><br></${tag}>`;
    }
  );
};

/** Loose equality for autosave dirty checks (ignores Quill re-serialization noise). */
export const areQuillHtmlEquivalent = (a = "", b = "") =>
  preserveLeadingIndentation(normalizeQuillHtmlForRoundTrip(a)) ===
  preserveLeadingIndentation(normalizeQuillHtmlForRoundTrip(b));

/** DOM helper for Quill clipboard matchers (browser only). */
export const isVisuallyEmptyBlockElement = (node) => {
  if (!node?.tagName || !EMPTY_BLOCK_TAG_RE.test(node.tagName)) return false;
  if (node.childNodes.length === 0) return true;
  return isVisuallyEmptyBlockInnerHtml(node.innerHTML || "");
};
