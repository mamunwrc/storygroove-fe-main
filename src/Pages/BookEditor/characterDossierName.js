/** Keep in sync with AddCharacterModal / characterService. */
export const MAX_CHARACTER_NAME_LENGTH = 120;

/** Heading + Basic Information live at the top — do not scan a pasted novel. */
export const DOSSIER_NAME_SCAN_CHARS = 8000;

const DOSSIER_HEADER_NAME_RE =
  /(?:^|\n)\s*(?:#{1,3}\s*)?\*{0,2}\s*👤\s*([^*\n]+?)\s*[:\-–—]\s*17[\s-]*Point\s+Dossier\s*\*{0,2}/i;

const DOSSIER_BULLET_NAME_RE =
  /(?:^|\n)[ \t]*(?:[-•*][ \t]+)?\*{0,2}Name\*{0,2}[ \t]*:[ \t]*([^\n]+)/i;

const cleanExtractedName = (raw) => {
  const name = String(raw || "")
    .replace(/\*{1,3}/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!name || /^\[.*\]$/.test(name)) return "";
  if (/CHARACTER\s+DOSSIERS/i.test(name)) return "";
  return name.slice(0, MAX_CHARACTER_NAME_LENGTH);
};

/**
 * Read the character's display name from a 17-point dossier body.
 * Prefers the `👤 Name: 17-Point Dossier` title (first line users edit),
 * then the Basic Information `Name:` bullet. Works on markdown and on
 * contentEditable innerText (bold markers stripped).
 */
export const extractCharacterNameFromDossier = (text) => {
  if (!text || typeof text !== "string") return "";
  const scan = text.length > DOSSIER_NAME_SCAN_CHARS
    ? text.slice(0, DOSSIER_NAME_SCAN_CHARS)
    : text;
  const header = scan.match(DOSSIER_HEADER_NAME_RE);
  const fromHeader = cleanExtractedName(header?.[1]);
  if (fromHeader) return fromHeader;
  const bullet = scan.match(DOSSIER_BULLET_NAME_RE);
  return cleanExtractedName(bullet?.[1]);
};
