const PLACEHOLDER_TITLES = new Set(["new chat", "untitled", "untitled story"]);

export function isPlaceholderThreadTitle(title) {
  if (title == null || !String(title).trim()) return true;
  return PLACEHOLDER_TITLES.has(String(title).trim().toLowerCase());
}

/**
 * Parse working title from a delivered Story Starter Kit (Simone output).
 */
export function parseStoryStarterKitWorkingTitle(text) {
  if (!text || !text.includes("Simone's Story Starter Kit for")) return null;

  const strict = text.match(
    /\*\*✨\s*Simone's Story Starter Kit for\s+(.+?)\s*✨\*\*/s
  );
  if (strict) return strict[1].replace(/\*+/g, "").trim();

  const loose = text.match(/Simone's Story Starter Kit for\s+([\s\S]+?)\s*✨/);
  if (!loose) return null;
  return loose[1].replace(/\*+/g, "").replace(/^✨\s*/, "").trim() || null;
}
