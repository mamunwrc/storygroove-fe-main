const SIGNATURE_START_RE = /\n\s*Sincerely,\s*\n/i;

const ACT_LEAD_IN_RE =
  /(^|\n\n)(In Act (?:One|Two|Three|[123]|I{1,3}))([,.\s])/gim;

const SECTION_MARKER_SPLIT_RE =
  /([.!?])(["']?)\s+(?=\d\.\s+(?:Core manuscript strengths|Recurring structural risks|Character arc evaluation|Global revision recommendations|Genre[- ]specific performance|Tentpole scenes|Tentpole scene opportunities))/gi;

/** Ellis often bolds chapter refs; unwrap so they render as plain prose. */
const CHAPTER_BOLD_MARKDOWN_RE =
  /\*\*(Chapters?\s+(?:\d+(?:\s+[A-Z])?|[A-Z][a-z]+(?:[\s-][A-Za-z]+)*)(?:\s+(?:and|through|to|–|—|-)\s+(?:\d+(?:\s+[A-Z])?|[A-Z][a-z]+(?:[\s-][A-Za-z]+)*))*)\*\*/gi;

const SECTION_TRANSITIONS = [
  {
    pattern: /^1\.\s+Core manuscript strengths/i,
    label: "1. Core Manuscript Strengths",
  },
  {
    pattern: /^2\.\s+Recurring structural risks/i,
    label: "2. Recurring Structural Risks",
  },
  {
    pattern: /^3\.\s+Character arc evaluation/i,
    label: "3. Character Arc Evaluation",
  },
  {
    pattern: /^4\.\s+Global revision recommendations/i,
    label: "4. Global Revision Recommendations",
  },
  {
    pattern: /^5\.\s+Genre[- ]specific performance/i,
    label: "5. Genre Performance",
  },
  {
    pattern: /^6\.\s+Tentpole scenes/i,
    label: "6. Tentpole Scenes",
  },
  {
    pattern: /^7\.\s+Tentpole scene opportunities/i,
    label: "7. Tentpole Scene Opportunities",
  },
];

/**
 * Turn plain-text (or lightly markdown) editorial letters into structured
 * markdown with clear paragraphs, act emphasis, and a signature block.
 */
export const formatEditorialLetterMarkdown = (raw) => {
  if (!raw) return "";

  let text = String(raw).replace(/\r\n/g, "\n").trim();
  if (!text) return "";

  const signatureIndex = text.search(SIGNATURE_START_RE);
  let body = text;
  let signature = "";

  if (signatureIndex !== -1) {
    body = text.slice(0, signatureIndex).trim();
    signature = text.slice(signatureIndex).trim();
  }

  body = isolateSectionHeaderLines(body);
  body = promotePlainTextParagraphs(body);
  body = splitSectionTransitions(body);
  body = emphasizeActLeadIns(body);
  body = formatGreeting(body);
  body = emphasizeSectionTransitions(body);
  body = escapeOrderedListMarkers(body);

  if (signature) {
    signature = formatSignatureBlock(signature);
    return unwrapChapterNameBoldMarkdown(
      escapeOrderedListMarkers(`${body}\n\n---\n\n${signature}`)
    );
  }

  return unwrapChapterNameBoldMarkdown(body);
};

const unwrapChapterNameBoldMarkdown = (text) =>
  text.replace(CHAPTER_BOLD_MARKDOWN_RE, "$1");

const isSectionHeaderLine = (line) => {
  const trimmed = String(line || "").trim();
  if (!trimmed) return false;
  return SECTION_TRANSITIONS.some(({ pattern }) => pattern.test(trimmed));
};

/**
 * Ellis sometimes writes a section header immediately followed by its body
 * paragraph on the very next physical line, joined by a single `\n` rather
 * than a blank line (e.g. "1. Core Manuscript Strengths\nThe manuscript
 * shows strong voice..."). `promotePlainTextParagraphs` treats anything
 * between blank lines as one paragraph and collapses internal newlines into
 * spaces, so a header line and its body would merge into a single block —
 * and that merged block then matches `resolveSectionDisplayLabel`, which
 * collapses the *entire* block down to just the bold label, silently
 * dropping the body underneath it. Force a blank line around every
 * recognized header line up front so it always lands in its own paragraph,
 * regardless of how it was originally separated from its body text.
 */
const isolateSectionHeaderLines = (text) => {
  const lines = text.split("\n");
  const out = [];

  lines.forEach((line, idx) => {
    if (!isSectionHeaderLine(line)) {
      out.push(line);
      return;
    }
    if (out.length && out[out.length - 1].trim() !== "") out.push("");
    out.push(line);
    const nextLine = lines[idx + 1];
    if (nextLine !== undefined && nextLine.trim() !== "") out.push("");
  });

  return out.join("\n");
};

const promotePlainTextParagraphs = (text) => {
  let normalized = text.replace(/\n{3,}/g, "\n\n").trim();

  if (/\n\n/.test(normalized)) {
    return normalized
      .split(/\n\n+/)
      .map((block) => block.replace(/\n+/g, " ").replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join("\n\n");
  }

  if (/\n/.test(normalized)) {
    const lines = normalized
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
    return mergeContinuationLines(lines).join("\n\n");
  }

  return normalized
    .replace(/([.!?])(["']?)\s+(?=[A-Z"'])/g, "$1$2\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

/** Keep prose that continues on the next physical line (common after inline **bold**). */
const mergeContinuationLines = (lines = []) => {
  const merged = [];
  for (const line of lines) {
    const prev = merged[merged.length - 1];
    if (prev && shouldMergeEditorialLetterLine(prev, line)) {
      merged[merged.length - 1] = `${prev} ${line}`;
      continue;
    }
    merged.push(line);
  }
  return merged;
};

const shouldMergeEditorialLetterLine = (prevLine, nextLine) => {
  const prev = String(prevLine || "").trim();
  const next = String(nextLine || "").trim();
  if (!prev || !next) return false;
  if (isSectionHeaderLine(prev) || isSectionHeaderLine(next)) return false;
  if (/^Hello [^,\n]+,$/i.test(next)) return false;
  if (/\*\*$/.test(prev)) return true;
  if (/[,;:]$/.test(prev) && /^[a-z("'“]/.test(next)) return true;
  if (!/[.!?]["']?$/.test(prev) && /^[a-z("'“]/.test(next)) return true;
  return false;
};

const splitSectionTransitions = (text) =>
  text.replace(SECTION_MARKER_SPLIT_RE, "$1$2\n\n");

const resolveSectionDisplayLabel = (block) => {
  const line = String(block || "").trim();
  for (const { pattern, label } of SECTION_TRANSITIONS) {
    if (pattern.test(line)) return label;
  }
  return null;
};

const emphasizeSectionTransitions = (text) =>
  text
    .split(/\n\n+/)
    .map((block) => {
      const label = resolveSectionDisplayLabel(block);
      if (!label) return block;
      return `**${label}**`;
    })
    .join("\n\n");

const emphasizeActLeadIns = (text) =>
  text.replace(ACT_LEAD_IN_RE, (_, prefix, actPhrase, trailing) => {
    return `${prefix}**${actPhrase.trim()}**${trailing}`;
  });

const formatGreeting = (text) => {
  const match = text.match(/^Hello [^,\n]+,/);
  if (!match) return text;

  const greeting = match[0];
  const rest = text.slice(greeting.length).trim();
  if (!rest) return `**${greeting}**`;
  return `**${greeting}**\n\n${rest}`;
};

/** Prevent CommonMark from turning letter section numbers into <ol><li>. */
const escapeOrderedListMarkers = (text) =>
  text.replace(/^(\d+)\.\s+/gm, "$1\\. ");

const formatSignatureBlock = (signature) => {
  const lines = signature
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return signature;

  const closing = lines[0];
  const signer = lines[1] || "Ellis";
  const affiliation = lines[2] || "";
  const note = lines.slice(3).join(" ").trim();

  let formatted = `${closing}\n\n**${signer}**`;
  if (affiliation) formatted += `\n\n${affiliation}`;
  if (note) formatted += `\n\n*${note}*`;
  return formatted;
};
