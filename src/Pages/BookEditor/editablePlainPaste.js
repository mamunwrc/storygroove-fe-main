/** insertText walks every newline as a DOM mutation and locks the tab. */
export const HEAVY_EDITABLE_PASTE_CHARS = 2500;
export const HEAVY_EDITABLE_PASTE_LINES = 40;

/**
 * True when clipboard text would freeze contentEditable via execCommand("insertText").
 * Counts newlines with an early exit so a 200k paste does not allocate a match array.
 */
export const isHeavyPlainPaste = (text) => {
  if (!text) return false;
  if (text.length >= HEAVY_EDITABLE_PASTE_CHARS) return true;
  let lines = 1;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) {
      lines += 1;
      if (lines >= HEAVY_EDITABLE_PASTE_LINES) return true;
    }
  }
  return false;
};

const nodeIsInEditable = (el, node) => {
  if (!el || !node) return false;
  return node === el || el.contains(node);
};

const BLOCK_TAGS = new Set(["DIV", "P", "LI", "H1", "H2", "H3", "H4", "H5", "H6"]);

/** Plain text of a range so <br>/<div> become newlines (Range.toString / innerText drop them). */
const fragmentToPlain = (frag) => {
  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.nodeValue || "").replace(/\u00a0/g, " ");
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    if (node.nodeName === "BR") return "\n";
    let s = "";
    for (const child of node.childNodes) s += walk(child);
    if (BLOCK_TAGS.has(node.nodeName) && s && !s.endsWith("\n")) s += "\n";
    return s;
  };
  let out = "";
  for (const child of frag.childNodes) out += walk(child);
  return out;
};

const rangeToPlain = (range) => fragmentToPlain(range.cloneContents());

const placeCaret = (el, offset, sel) => {
  if (!sel) return;
  const node = el.firstChild;
  if (!node || node.nodeType !== Node.TEXT_NODE) return;
  const pos = Math.max(0, Math.min(offset, node.length));
  const caret = document.createRange();
  caret.setStart(node, pos);
  caret.collapse(true);
  sel.removeAllRanges();
  sel.addRange(caret);
};

const writePlain = (el, text, caretAt, sel) => {
  el.textContent = text;
  try {
    placeCaret(el, caretAt, sel);
  } catch {
    // Caret restore is best-effort; the paste itself must never throw.
  }
};

/**
 * Replace the current selection with one text node. If the selection is not
 * clearly inside the editor, replace the whole field — never append.
 */
export const replaceEditableSelectionWithPlainText = (el, pasted) => {
  if (!el) return;
  const next = String(pasted ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u2028/g, "\n")
    .replace(/\u2029/g, "\n\n");
  const sel = typeof window !== "undefined" ? window.getSelection() : null;
  const range =
    sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
  const rangeInEditor =
    range &&
    (nodeIsInEditable(el, range.commonAncestorContainer) ||
      nodeIsInEditable(el, sel.anchorNode) ||
      nodeIsInEditable(el, sel.focusNode));

  if (!rangeInEditor) {
    writePlain(el, next, next.length, sel);
    return;
  }

  try {
    const pre = range.cloneRange();
    pre.selectNodeContents(el);
    pre.setEnd(range.startContainer, range.startOffset);
    const before = rangeToPlain(pre);
    const post = range.cloneRange();
    post.selectNodeContents(el);
    post.setStart(range.endContainer, range.endOffset);
      const after = rangeToPlain(post);
    writePlain(el, before + next + after, before.length + next.length, sel);
  } catch {
    writePlain(el, next, next.length, sel);
  }
};

/**
 * Clipboard `text/plain` has no bold/italic/lists, so a paste from Word / Docs
 * / Sudowrite / a web page loses its formatting unless we read `text/html`.
 * We convert that HTML to the markdown we already store instead of inserting it
 * verbatim: source HTML nests thousands of styled spans per line and locks the
 * tab, but the markdown it distills to is tiny. Runs on a detached element, so
 * there is no layout/reflow regardless of paste length.
 */
const CLIPBOARD_HTML_MAX = 3_000_000; // ~3MB; above this, fall back to plain text.

const MD_BLOCK_TAGS = new Set([
  "P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6",
  "BLOCKQUOTE", "SECTION", "ARTICLE", "TR", "PRE",
]);
const STRONG_TAGS = new Set(["STRONG", "B"]);
const EM_TAGS = new Set(["EM", "I"]);

const serializeHtmlNode = (node) => {
  if (!node) return "";
  if (node.nodeType === 3) return (node.nodeValue || "").replace(/\s+/g, " ");
  if (node.nodeType !== 1) return ""; // comments, etc.
  const tag = node.nodeName;
  if (tag === "SCRIPT" || tag === "STYLE" || tag === "HEAD" || tag === "TITLE") {
    return "";
  }
  if (tag === "BR") return "\n";

  if (tag === "OL" || tag === "UL") {
    let out = "";
    let n = 1;
    for (const child of node.childNodes) {
      if (child.nodeName === "LI") {
        const body = serializeHtmlNode(child).trim();
        if (body) {
          out += (tag === "OL" ? `${n}. ` : "- ") + body + "\n";
          n += 1;
        }
      } else {
        out += serializeHtmlNode(child);
      }
    }
    return out ? `\n${out}\n` : "";
  }

  let inner = "";
  for (const child of node.childNodes) inner += serializeHtmlNode(child);

  if (STRONG_TAGS.has(tag)) {
    const t = inner.trim();
    return t && !t.includes("\n") ? inner.replace(t, `**${t}**`) : inner;
  }
  if (EM_TAGS.has(tag)) {
    const t = inner.trim();
    return t && !t.includes("\n") ? inner.replace(t, `*${t}*`) : inner;
  }
  if (tag === "LI") return inner; // stray <li> outside a list
  if (MD_BLOCK_TAGS.has(tag)) {
    const trimmed = inner.replace(/\n+$/, "");
    return trimmed ? `\n${trimmed}\n` : "";
  }
  return inner;
};

export const clipboardHtmlToMarkdown = (html) => {
  if (!html || typeof document === "undefined") return "";
  if (html.length > CLIPBOARD_HTML_MAX) return "";
  let container;
  try {
    container = document.createElement("div");
    container.innerHTML = html; // fragment parse drops <html>/<head>/<body> wrappers
  } catch {
    return "";
  }
  return serializeHtmlNode(container)
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\n+|\n+$/g, "");
};

const placeCaretAfter = (node, sel) => {
  if (!sel || !node) return;
  try {
    const r = document.createRange();
    r.setStartAfter(node);
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);
  } catch {
    // best-effort caret restore
  }
};

/**
 * Insert clean formatted HTML (only <strong>/<em>/<br> + text) at the caret,
 * replacing the selection. Node count tracks real structure, not the source's
 * markup, so this stays cheap even for a multi-page paste.
 */
export const replaceEditableSelectionWithHtml = (el, html) => {
  if (!el) return;
  const sel = typeof window !== "undefined" ? window.getSelection() : null;
  const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
  const rangeInEditor =
    range &&
    (nodeIsInEditable(el, range.commonAncestorContainer) ||
      nodeIsInEditable(el, sel.anchorNode) ||
      nodeIsInEditable(el, sel.focusNode));

  // Select-all + paste: one innerHTML write. deleteContents() walks every <br>.
  if (!rangeInEditor || rangeCoversEditable(el, range)) {
    el.innerHTML = html || "";
    placeCaretAfter(el.lastChild, sel);
    return;
  }

  try {
    const frag = document.createRange().createContextualFragment(html || "");
    const lastNode = frag.lastChild;
    range.deleteContents();
    range.insertNode(frag);
    placeCaretAfter(lastNode, sel);
  } catch {
    el.innerHTML = html || "";
    placeCaretAfter(el.lastChild, sel);
  }
};

const rangeCoversEditable = (el, range) => {
  if (!el || !range) return false;
  try {
    const full = document.createRange();
    full.selectNodeContents(el);
    return (
      range.compareBoundaryPoints(Range.START_TO_START, full) <= 0 &&
      range.compareBoundaryPoints(Range.END_TO_END, full) >= 0
    );
  } catch {
    return false;
  }
};

export const selectionCoversEditable = (el) => {
  const sel = typeof window !== "undefined" ? window.getSelection() : null;
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
  const range = sel.getRangeAt(0);
  if (
    !nodeIsInEditable(el, range.commonAncestorContainer) &&
    !nodeIsInEditable(el, sel.anchorNode)
  ) {
    return false;
  }
  if (rangeCoversEditable(el, range)) return true;
  // Ctrl+A / drag-select often starts in the first text node, not at the
  // element itself — compareBoundaryPoints then says "not covering".
  const selectedLen = range.toString().length;
  if (selectedLen === 0) return false;
  return selectedLen >= (el.textContent || "").length;
};

/** Many <br>/<strong> children, or one enormous text node. */
export const isHeavyEditable = (el) => {
  if (!el) return false;
  if (el.childNodes.length >= HEAVY_EDITABLE_PASTE_LINES) return true;
  return (el.textContent || "").length >= HEAVY_EDITABLE_PASTE_CHARS;
};

export const clearEditableContents = (el) => {
  if (!el) return;
  el.textContent = "";
  const sel = typeof window !== "undefined" ? window.getSelection() : null;
  if (!sel) return;
  try {
    const caret = document.createRange();
    caret.selectNodeContents(el);
    caret.collapse(true);
    sel.removeAllRanges();
    sel.addRange(caret);
  } catch {
    // Caret restore is best-effort; the clear itself must never throw.
  }
};

const shouldFastClearEditable = (el) =>
  !!el && isHeavyEditable(el) && selectionCoversEditable(el);

/**
 * Native Backspace/Delete on a select-all walks every contentEditable node
 * and locks the tab. Clear in one assignment instead.
 */
export const handleHeavyEditableDeleteKey = (e) => {
  if (e.key !== "Backspace" && e.key !== "Delete") return;
  if (!shouldFastClearEditable(e.currentTarget)) return;
  e.preventDefault();
  clearEditableContents(e.currentTarget);
};

const HEAVY_DELETE_INPUT_TYPES = new Set([
  "deleteContentBackward",
  "deleteContentForward",
  "deleteContent",
  "deleteByCut",
  "deleteByDrag",
]);

/** Edit-menu delete / IME path that bypasses keydown. */
export const handleHeavyEditableBeforeInput = (e) => {
  if (!HEAVY_DELETE_INPUT_TYPES.has(e.inputType)) return;
  if (!shouldFastClearEditable(e.currentTarget)) return;
  e.preventDefault();
  clearEditableContents(e.currentTarget);
};

/** Native cut of a select-all is the same freeze as Backspace. */
export const handleHeavyEditableCut = (e) => {
  const el = e.currentTarget;
  if (!shouldFastClearEditable(el)) return;
  const text = el.innerText || el.textContent || "";
  e.preventDefault();
  try {
    e.clipboardData?.setData("text/plain", text);
  } catch {
    // Clipboard write is best-effort; the field must still clear.
  }
  clearEditableContents(el);
};
