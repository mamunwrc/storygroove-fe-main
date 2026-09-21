/**
 * Flatten HTML to plain text for word counting.
 * Block boundaries become whitespace so adjacent paragraphs do not merge
 * (e.g. </p><p> must not produce "Singha.Emon").
 */
export const htmlToCountableText = (html = "") =>
  String(html)
    .replace(/<\/(p|div|h[1-6]|li|blockquote|tr)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&[a-zA-Z0-9#]+;/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();

/** Count words in HTML manuscript prose (Olivia + Ellis). */
export const countWordsFromHtml = (html = "") => {
  const text = htmlToCountableText(html);
  if (!text) return 0;
  return text.split(/\s+/).filter((word) => word.length > 0).length;
};
