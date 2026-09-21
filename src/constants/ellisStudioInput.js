/** Max words allowed in Ellis chat input (same cap as Olivia studio). */
export const ELLIS_CHAT_MAX_WORDS = 1000;

/** Structured copy for the in-thread paste-gate bubble. */
export const ELLIS_CHAT_WORD_LIMIT_SECTIONS = {
  headline:
    "It looks like you're trying to paste manuscript or chapter pages into the chat.",
  body: "Please paste your chapter pages into My Manuscript instead. I can read them directly from there, and you can ask me in the chat what you would like me to examine.",
};

/** Flat string for chat state and equality checks. */
export const ELLIS_CHAT_WORD_LIMIT_TEXT = [
  `📌 ${ELLIS_CHAT_WORD_LIMIT_SECTIONS.headline}`,
  ELLIS_CHAT_WORD_LIMIT_SECTIONS.body,
].join("\n\n");

const countPlainTextWords = (text = "") => {
  const trimmed = String(text || "").trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter((word) => word.length > 0).length;
};

export const isEllisChatOverWordLimit = (
  text = "",
  maxWords = ELLIS_CHAT_MAX_WORDS
) => countPlainTextWords(text) > maxWords;

export const isEllisChatWordLimitMessage = (text = "") =>
  String(text || "").trim() === ELLIS_CHAT_WORD_LIMIT_TEXT.trim();
