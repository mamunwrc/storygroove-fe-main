/**
 * Deterministic, content-safe normalizer for Ellis conversational/agentic replies.
 * Only adjusts whitespace and emphasis — never rewrites, splits, or invents content.
 */

const POINTING_HAND_CTA_RE = /^\s*👉\s*/;
const ATX_HEADING_RE = /^(#{1,6}\s+\S)/;
const UNORDERED_LIST_RE = /^(\s*[-*+]\s+\S)/;
const ORDERED_LIST_RE = /^(\s*\d+\.\s+\S)/;

const isListLine = (line) =>
  UNORDERED_LIST_RE.test(line) || ORDERED_LIST_RE.test(line);

const isBlockStartLine = (line) =>
  ATX_HEADING_RE.test(line) || isListLine(line);

const ensureBlankLineBeforeBlock = (text) => {
  const lines = String(text).split(/\r?\n/);
  const out = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const prev = out[out.length - 1];

    if (
      i > 0 &&
      isBlockStartLine(line) &&
      prev !== undefined &&
      prev.trim() !== "" &&
      !isListLine(prev)
    ) {
      if (isListLine(line) && isListLine(prev)) {
        out.push(line);
        continue;
      }
      if (ATX_HEADING_RE.test(line) && ATX_HEADING_RE.test(prev)) {
        out.push(line);
        continue;
      }
      out.push("");
    }

    out.push(line);
  }

  return out.join("\n");
};

const separateGluedHeadingFromProse = (text) =>
  String(text).replace(
    /^([^\n#][^\n]*?)(\s*)(#{1,6}\s+\S[^\n]*)$/gm,
    (_, prose, _space, heading) => `${prose.trimEnd()}\n\n${heading}`
  );

const boldPointingHandCtaLines = (text) =>
  String(text)
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!POINTING_HAND_CTA_RE.test(trimmed)) return line;

      const afterHand = trimmed.replace(POINTING_HAND_CTA_RE, "").trim();
      if (!afterHand) return line;
      if (/^\*\*[\s\S]+\*\*$/.test(afterHand)) return line;

      const leading = line.match(/^\s*/)?.[0] || "";
      return `${leading}👉 **${afterHand}**`;
    })
    .join("\n");

const collapseExcessBlankLines = (text) =>
  String(text).replace(/\n{3,}/g, "\n\n").trim();

/**
 * Prepare Ellis conversational/agentic assistant text for markdown rendering.
 * Idempotent: already-formatted text passes through unchanged.
 */
export const prepareEllisConversationalForDisplay = (text) => {
  const raw = String(text ?? "");
  if (!raw.trim()) return raw;

  let out = raw;
  out = separateGluedHeadingFromProse(out);
  out = ensureBlankLineBeforeBlock(out);
  out = boldPointingHandCtaLines(out);
  out = collapseExcessBlankLines(out);

  return out;
};
