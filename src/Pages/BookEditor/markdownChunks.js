/** remark/GFM is fine per chunk; one 50k parse freezes the Characters tab. */
export const CHARACTER_MARKDOWN_CHUNK_CHARS = 4000;

/**
 * Split markdown on line boundaries so each ReactMarkdown tree stays small.
 * Prefers breaking before `1. Section` / `**1. Section**` headers.
 */
export const chunkMarkdownForRender = (
  text,
  maxChars = CHARACTER_MARKDOWN_CHUNK_CHARS
) => {
  if (!text) return [];
  if (text.length <= maxChars) return [text];

  const lines = String(text).replace(/\r\n/g, "\n").split("\n");
  const chunks = [];
  let buf = "";

  for (const line of lines) {
    const isSection = /^\s*(?:\*\*)?\d+\.\s/.test(line);
    if (buf && isSection && buf.length >= Math.min(500, maxChars / 2)) {
      chunks.push(buf);
      buf = line;
      continue;
    }
    const next = buf ? `${buf}\n${line}` : line;
    if (buf && next.length > maxChars) {
      chunks.push(buf);
      buf = line;
    } else {
      buf = next;
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
};
