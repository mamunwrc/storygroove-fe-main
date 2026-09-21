/** Olivia outline table header (5- or 6-column). Accepts Scene or Chapter labels. */
const OUTLINE_TABLE_HEADER_RE =
  /\| (?:Scene|Chapter) # \| Act \| Title \| POV \|(?: (?:Scene|Chapter) Purpose \|)? Summary \|/;

const isTableRowLine = (line) => /^\s*\|/.test(line);

const splitTableCells = (line) => {
  const t = String(line || "").trim();
  if (!t.includes("|")) return [];
  const parts = t.split("|");
  if (parts[0].trim() === "") parts.shift();
  if (parts.length && parts[parts.length - 1].trim() === "") parts.pop();
  return parts.map((c) => c.trim());
};

const isDelimiterRow = (line) => {
  const cells = splitTableCells(line);
  return (
    cells.length > 0 &&
    cells.every((c) => /^:?-{3,}:?$/.test(String(c).replace(/\s/g, "")))
  );
};

const makeDelimiterRow = (colCount) =>
  `|${Array.from({ length: colCount }, () => "---------").join("|")}|`;

const formatTableRow = (cells) => `| ${cells.join(" | ")} |`;

const purposeColumnIndex = (headerCells) =>
  headerCells.findIndex((c) => /^(?:scene|chapter)\s*purpose$/i.test(c));

/** Pad/trim a body row so GFM sees the same column count as the header. */
const alignBodyCells = (cells, colCount, headerCells) => {
  if (cells.length === colCount) return cells;
  const next = cells.slice();
  if (next.length === colCount - 1) {
    const purposeIdx = purposeColumnIndex(headerCells);
    if (purposeIdx >= 0) {
      next.splice(purposeIdx, 0, "");
      return next.slice(0, colCount);
    }
  }
  while (next.length < colCount) next.push("");
  if (next.length > colCount) {
    next[colCount - 1] = next.slice(colCount - 1).join(" | ");
    next.length = colCount;
  }
  return next;
};

/**
 * GFM requires the delimiter row to have the same cell count as the header.
 * Models keep the 5-col `---` row when they add Scene Purpose, which makes
 * remark-gfm reject the whole table.
 */
const alignOutlineTableColumns = (text) => {
  const lines = String(text).replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!OUTLINE_TABLE_HEADER_RE.test(line)) {
      out.push(line);
      i += 1;
      continue;
    }
    const headerCells = splitTableCells(line);
    const colCount = headerCells.length;
    out.push(line);
    i += 1;
    if (i < lines.length && isDelimiterRow(lines[i])) {
      const sepCells = splitTableCells(lines[i]);
      out.push(sepCells.length === colCount ? lines[i] : makeDelimiterRow(colCount));
      i += 1;
    } else if (colCount >= 2) {
      out.push(makeDelimiterRow(colCount));
    }
    while (i < lines.length && isTableRowLine(lines[i]) && !isDelimiterRow(lines[i])) {
      const cells = splitTableCells(lines[i]);
      if (cells.length === colCount) {
        out.push(lines[i]);
      } else {
        out.push(formatTableRow(alignBodyCells(cells, colCount, headerCells)));
      }
      i += 1;
    }
  }
  return out.join("\n");
};

/** Writer-facing table copy uses Chapter; models may still emit Scene. */
const relabelOutlineTableSceneToChapter = (text) =>
  String(text).replace(/(^|\n)(\|[^\n]*)/g, (_full, prefix, row) => {
    const next = row
      .replace(/Scene #/g, "Chapter #")
      .replace(/\bScene Purpose\b/gi, "Chapter Purpose")
      .replace(/\bNEW\s+Scene\b/gi, "NEW Chapter")
      .replace(/(\|\s*)Scene(\s+\d+(?:\.\d+)?\s*\|)/gi, "$1Chapter$2");
    return prefix + next;
  });

/**
 * Slice the GFM outline/layering table out of a longer assistant message so
 * the sticky pin can show the table without the surrounding chat copy.
 */
export const extractOliviaOutlineTable = (text) => {
  if (!text) return null;
  const normalized = normalizeOliviaMarkdown(text);
  const lines = String(normalized).split("\n");
  const start = lines.findIndex((l) => OUTLINE_TABLE_HEADER_RE.test(l));
  if (start < 0) return null;
  const block = [];
  for (let i = start; i < lines.length; i++) {
    if (!isTableRowLine(lines[i])) break;
    block.push(lines[i].replace(/\s+$/, ""));
  }
  return block.length >= 2 ? block.join("\n") : null;
};

/** Body-row count (excludes header + delimiter) for the plan chip. */
export const countOliviaOutlineTableRows = (tableMarkdown) => {
  if (!tableMarkdown) return 0;
  return String(tableMarkdown)
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      if (!t.startsWith("|")) return false;
      if (/^\|[\s:|-]+\|$/.test(t)) return false;
      if (OUTLINE_TABLE_HEADER_RE.test(t)) return false;
      return true;
    }).length;
};

/**
 * Pre-process assistant markdown: fix bold headings, inline table boundaries,
 * and Scene Purpose column-count mismatches so remark-gfm can parse a table.
 */
export const normalizeOliviaMarkdown = (text) => {
  if (!text) return text;
  return relabelOutlineTableSceneToChapter(
    alignOutlineTableColumns(
      text
        .replace(
          /^\s*Which\s+scenes?\s+do\s+you\s+want\s+(?:expanded|to\s+generate)[^\n]*(?:\n.*Pick[^\n]*)?\s*$/gim,
          ""
        )
        .replace(/^(\s*\*\*[^*\n]+\*\*\s*)\n(?!\n)/gm, "$1\n\n")
        .replace(
          new RegExp(
            `([^\\n|])\\s*(${OUTLINE_TABLE_HEADER_RE.source})`,
            "g"
          ),
          "$1\n\n$2"
        )
    )
  );
};
