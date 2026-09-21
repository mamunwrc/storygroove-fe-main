/**
 * Blank lines must survive a chapter reload. `react-quill` pushes every string
 * it is given through `clipboard.convert()`, which drops blank blocks in two
 * ways, so these tests drive a real Quill instance configured like the editor.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { createRequire } from "node:module";
import {
  normalizeQuillHtmlForRoundTrip,
  isVisuallyEmptyBlockInnerHtml,
} from "../../../utils/quillHtmlNormalize.js";
import {
  preserveLeadingIndentation,
  unwrapWordFakeEmphasis,
  getLeadingManuscriptIndent,
} from "../../../utils/preserveLeadingIndentation.js";

const require = createRequire(import.meta.url);

const dom = new JSDOM(
  `<!doctype html><html><body><div id="stock"></div><div id="app"></div></body></html>`,
  { pretendToBeVisual: true }
);

for (const key of [
  "window",
  "document",
  "navigator",
  "Node",
  "Text",
  "Range",
  "Element",
  "HTMLElement",
  "DocumentFragment",
  "Event",
  "MutationObserver",
  "getComputedStyle",
]) {
  Object.defineProperty(globalThis, key, {
    value: dom.window[key],
    configurable: true,
    writable: true,
  });
}
globalThis.document.execCommand = () => {};

const Quill = require("quill");

const insertQuillEnterNewline = (quill, range, context) => {
  const Parchment = Quill.import("parchment");
  if (range.length > 0) {
    quill.scroll.deleteAt(range.index, range.length);
  }
  const lineFormats = Object.keys(context.format).reduce((formats, name) => {
    if (
      Parchment.query(name, Parchment.Scope.BLOCK) &&
      !Array.isArray(context.format[name])
    ) {
      formats[name] = context.format[name];
    }
    return formats;
  }, {});
  quill.insertText(range.index, "\n", lineFormats, Quill.sources.USER);
  quill.setSelection(range.index + 1, Quill.sources.SILENT);
  quill.focus();
  Object.keys(context.format).forEach((name) => {
    if (lineFormats[name] != null) return;
    if (Array.isArray(context.format[name])) return;
    if (name === "link") return;
    quill.format(name, context.format[name], Quill.sources.USER);
  });
};

const scheduleIndentAfterNativeEnter = (quill, indentCount, fallbackCursorIndex) => {
  if (!indentCount) return;
  const indent = "\u00a0".repeat(indentCount);
  const onTextChange = (_delta, _oldDelta, source) => {
    if (source !== "user") return;
    quill.off("text-change", onTextChange);
    const sel = quill.getSelection();
    const cursorIndex =
      sel?.index ??
      (Number.isFinite(fallbackCursorIndex) ? fallbackCursorIndex : null);
    if (cursorIndex == null) return;
    const nextLine = quill.getLine(cursorIndex);
    if (!nextLine) return;
    const [, nextOffset] = nextLine;
    const nextStart = cursorIndex - (nextOffset || 0);
    const existing = quill.getText(nextStart, indent.length);
    if (getLeadingManuscriptIndent(existing).length >= indentCount) {
      quill.setSelection(nextStart + indentCount, 0, Quill.sources.SILENT);
      return;
    }
    if (quill.getText(nextStart, 1) === "\t") {
      quill.deleteText(nextStart, 1, Quill.sources.USER);
    }
    quill.insertText(nextStart, indent, Quill.sources.USER);
    quill.setSelection(nextStart + indent.length, 0, Quill.sources.SILENT);
  };
  quill.on("text-change", onTextChange);
};

const SizeStyle = Quill.import("attributors/style/size");
SizeStyle.whitelist = ["10pt", "11pt", "12pt", "14pt", "16pt", "18pt"];
Quill.register(SizeStyle, true);

const Parchment = Quill.import("parchment");
Quill.register(
  new Parchment.Attributor.Style("paragraphSpacing", "margin-bottom", {
    scope: Parchment.Scope.BLOCK,
    whitelist: ["0", "6pt", "12pt", "18pt"],
  }),
  true
);
Quill.register(
  new Parchment.Attributor.Attribute(
    "manuscriptFirstLineIndent",
    "data-manuscript-first-line-indent",
    { scope: Parchment.Scope.BLOCK }
  ),
  true
);

const Delta = Quill.import("delta");

const isVisuallyEmptyBlockElement = (node) => {
  if (!node?.tagName || !/^(P|DIV|H[1-6])$/.test(node.tagName)) return false;
  if (node.childNodes.length === 0) return true;
  return isVisuallyEmptyBlockInnerHtml(node.innerHTML || "");
};

const matchEmptyLine = (node, delta) => {
  if (!isVisuallyEmptyBlockElement(node)) return delta;
  const last = delta.ops?.[delta.ops.length - 1];
  if (last && typeof last.insert === "string" && last.insert.endsWith("\n")) {
    return delta;
  }
  return delta.insert("\n");
};

const TRAILING_BLANK_SENTINEL = "<p><br></p>";

const tagManuscriptFirstLineIndentOnDelta = (delta, count) => {
  if (!delta?.ops?.length || !count) return delta;
  let tagged = false;
  const ops = delta.ops.map((op) => {
    if (tagged || typeof op.insert !== "string" || !op.insert.includes("\n")) {
      return op;
    }
    tagged = true;
    return {
      ...op,
      attributes: {
        ...(op.attributes || {}),
        manuscriptFirstLineIndent: count,
      },
    };
  });
  return tagged ? new Delta(ops) : delta;
};

const matchManuscriptFirstLineIndentBlock = (node, delta) => {
  if (node?.tagName !== "P" && node?.tagName !== "DIV") return delta;
  const first = delta?.ops?.[0];
  const count =
    first && typeof first.insert === "string"
      ? getLeadingManuscriptIndent(first.insert).length
      : 0;
  if (!count) return delta;
  return tagManuscriptFirstLineIndentOnDelta(delta, count);
};

const stockQuill = new Quill("#stock", {});
const appQuill = new Quill("#app", {
  modules: {
    clipboard: {
      matchVisual: false,
      matchers: [
        [dom.window.Node.ELEMENT_NODE, matchManuscriptFirstLineIndentBlock],
        [dom.window.Node.ELEMENT_NODE, matchEmptyLine],
      ],
    },
  },
});

/** Blank lines the reader would see, excluding the always-present final newline. */
const blankLinesAfterLoad = (quill, storedHtml) => {
  const html = `${normalizeQuillHtmlForRoundTrip(storedHtml)}${TRAILING_BLANK_SENTINEL}`;
  quill.setContents(quill.clipboard.convert(html));
  const lines = quill.getText().split("\n");
  return lines.slice(0, -1).filter((line) => line.trim() === "").length;
};

/** Exactly what Quill saves for a blank line the caret is sitting on. */
const CURSOR_BLANK =
  '<p class="ql-align-justify" style="margin-bottom: 6pt;">' +
  '<span style="background-color: transparent; font-size: 12pt;">' +
  '<span class="ql-cursor">\uFEFF</span></span></p>';

const FORMATTED_BLANK =
  '<p class="ql-align-justify" style="margin-bottom: 6pt;"><br></p>';

const CASES = [
  ["caret placeholder mid-chapter", `<p>A</p>${CURSOR_BLANK}<p>B</p>`, 1],
  ["caret placeholder at end of chapter", `<p>A</p>${CURSOR_BLANK}`, 1],
  ["formatted blank mid-chapter", `<p>A</p>${FORMATTED_BLANK}<p>B</p>`, 1],
  ["formatted blank at end of chapter", `<p>A</p>${FORMATTED_BLANK}`, 1],
  ["plain blank mid-chapter", "<p>A</p><p><br></p><p>B</p>", 1],
  ["plain blank at end of chapter", "<p>A</p><p><br></p>", 1],
  ["two blanks at end of chapter", "<p>A</p><p><br></p><p><br></p>", 2],
  ["bare empty paragraph", "<p>A</p><p></p><p>B</p>", 1],
  ["no blank lines", "<p>A</p><p>B</p>", 0],
];

for (const [label, storedHtml, expected] of CASES) {
  test(`preserves blank lines: ${label}`, () => {
    assert.equal(blankLinesAfterLoad(appQuill, storedHtml), expected);
  });
}

test("sentinel adds no content to an empty chapter", () => {
  appQuill.setContents(
    appQuill.clipboard.convert(
      `${normalizeQuillHtmlForRoundTrip("")}${TRAILING_BLANK_SENTINEL}`
    )
  );
  assert.equal(appQuill.getText(), "\n");
});

test("stock Quill drops a trailing blank line without the sentinel", () => {
  stockQuill.setContents(stockQuill.clipboard.convert("<p>A</p><p><br></p>"));
  const lines = stockQuill.getText().split("\n").slice(0, -1);
  assert.equal(
    lines.filter((line) => line.trim() === "").length,
    0,
    "guards the assumption behind TRAILING_BLANK_SENTINEL"
  );
});

test("stock Quill drops a bare empty paragraph without the matcher", () => {
  stockQuill.setContents(
    stockQuill.clipboard.convert("<p>A</p><p></p><p>B</p>")
  );
  assert.equal(stockQuill.getText(), "A\nB\n");
});

/**
 * Reload bug regression: programmatic api load must not be written back to
 * parent state. Parent keeps server HTML; Quill getHTML() after api load may
 * differ in formatting but must still display blank lines for the user.
 */
test("Word text-indent becomes visible nbsps after clipboard.convert", () => {
  const wordHtml = '<p style="text-indent:.5in">She walked into the room.</p>';
  const converted = preserveLeadingIndentation(wordHtml);
  appQuill.setContents(appQuill.clipboard.convert(converted));
  const html = appQuill.root.innerHTML;
  assert.equal(html.includes("&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"), true);
  assert.equal(appQuill.getText().includes("\t"), false);
  assert.equal(appQuill.getText().includes("She walked into the room."), true);
});

test("Word MsoNormal stylesheet indent survives clipboard.convert", () => {
  const wordHtml = `<html><head><style>
p.MsoNormal { margin:0in; text-indent:.5in; }
</style></head><body><p class=MsoNormal>First paragraph.</p></body></html>`;
  const converted = preserveLeadingIndentation(wordHtml);
  appQuill.setContents(appQuill.clipboard.convert(converted));
  assert.equal(appQuill.root.innerHTML.includes("&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"), true);
  assert.equal(appQuill.getText().includes("First paragraph."), true);
});

test("Word 0.3in indent inside WordSection wrapper survives clipboard.convert", () => {
  const wordHtml = `<html><head><style>
p.MsoNormal { margin:0in; text-indent:.3in; }
</style></head><body><div class=WordSection1><p class=MsoNormal>Indented line.</p></div></body></html>`;
  const converted = preserveLeadingIndentation(wordHtml);
  appQuill.setContents(appQuill.clipboard.convert(converted));
  assert.equal(appQuill.root.innerHTML.includes("&nbsp;&nbsp;&nbsp;"), true);
  assert.equal(appQuill.getText().includes("Indented line."), true);
});

test("Word desktop 0.3in indent + leading tab stays 3 nbsps, not the 0.5in default", () => {
  const wordHtml =
    "<p class=MsoNormal style='text-indent:.3in'>\tShe walked into the room.</p>";
  const converted = preserveLeadingIndentation(wordHtml);
  appQuill.setContents(appQuill.clipboard.convert(converted));
  const text = appQuill.getText();
  const leading = (text.match(/^\u00a0+/) || [""])[0].length;
  assert.equal(leading, 3, "0.3in must map to exactly 3 nbsps");
  assert.equal(text.includes("\t"), false);
  assert.equal(text.includes("She walked into the room."), true);
});

test("Word desktop mso-char-indent 0.3in survives clipboard.convert", () => {
  const wordHtml =
    "<p class=MsoNormal style='mso-char-indent:1.8 12.0pt'>She walked into the room.</p>";
  const converted = preserveLeadingIndentation(wordHtml);
  appQuill.setContents(appQuill.clipboard.convert(converted));
  const text = appQuill.getText();
  const leading = (text.match(/^\u00a0+/) || [""])[0].length;
  assert.equal(leading, 3, "mso-char-indent 1.8×12pt must map to 3 nbsps");
  assert.equal(text.includes("She walked into the room."), true);
});

test("paste tags manuscriptFirstLineIndent for 0.3in Word indent", () => {
  const wordHtml = `<html><head><style>
p.MsoNormal { margin:0in; text-indent:.3in; }
</style></head><body><p class=MsoNormal>First paragraph.</p></body></html>`;
  const converted = preserveLeadingIndentation(wordHtml);
  appQuill.setContents(appQuill.clipboard.convert(converted));
  assert.equal(
    parseInt(appQuill.getFormat(0).manuscriptFirstLineIndent, 10),
    3,
    "paste must tag the paragraph indent width for Enter to continue"
  );
  assert.equal(
    (appQuill.getText().match(/^\u00a0+/) || [""])[0].length,
    3,
    "paste must render 0.3in as 3 leading nbsps"
  );
});

test("Word fake bold wrappers do not make pasted prose bold", () => {
  const wordHtml =
    "<p><b style='mso-bidi-font-weight:normal'>Plain prose from Word.</b></p>";
  const converted = unwrapWordFakeEmphasis(wordHtml);
  appQuill.setContents(appQuill.clipboard.convert(converted));
  const formats = appQuill.getFormat(1);
  assert.equal(formats.bold, undefined);
  assert.equal(appQuill.getText().includes("Plain prose from Word."), true);
});

test("api load preserves blank lines for display without requiring parent write-back", () => {
  const stored =
    "<p>Paragraph</p><p>Test</p><p><br></p>";
  const serverHtml = stored;
  appQuill.setContents(
    appQuill.clipboard.convert(
      `${normalizeQuillHtmlForRoundTrip(serverHtml)}${TRAILING_BLANK_SENTINEL}`
    ),
    "api"
  );
  const quillHtml = appQuill.root.innerHTML;
  const blanksInEditor = appQuill
    .getText()
    .split("\n")
    .slice(0, -1)
    .filter((line) => line.trim() === "").length;

  assert.equal(blanksInEditor, 1, "editor shows blank line after api load");
  assert.ok(
    quillHtml.includes("<br>"),
    "blank paragraph survives api load in editor DOM"
  );
});

test("Enter inserts a newline for plain manuscript paragraphs", () => {
  const host = document.createElement("div");
  host.id = "enter-test";
  document.body.appendChild(host);
  const enterQuill = new Quill("#enter-test", {});

  enterQuill.setText("Hello");
  const range = { index: 5, length: 0 };
  const context = { format: enterQuill.getFormat(5) };
  enterQuill.focus = () => {};
  insertQuillEnterNewline(enterQuill, range, context);

  const lines = enterQuill.getText().split("\n").slice(0, -1);
  assert.equal(lines.length, 2, "Enter must create a second line");
  assert.equal(lines[0], "Hello");
  host.remove();
});

test("Enter on an indented paragraph keeps indent on the new line", () => {
  const indent = "\u00a0".repeat(5);
  const host = document.createElement("div");
  host.id = "enter-indent-test";
  document.body.appendChild(host);
  const enterQuill = new Quill("#enter-indent-test", {});
  enterQuill.setText(`${indent}Hello`);
  const range = { index: indent.length + 5, length: 0 };
  const context = { format: enterQuill.getFormat(range.index) };
  enterQuill.focus = () => {};
  scheduleIndentAfterNativeEnter(enterQuill, 5, range.index + 1);
  insertQuillEnterNewline(enterQuill, range, context);

  const lines = enterQuill.getText().split("\n").slice(0, -1);
  assert.equal(lines.length, 2, "Enter must create a second line");
  assert.equal(lines[0], `${indent}Hello`);
  assert.equal(
    getLeadingManuscriptIndent(lines[1]).length,
    5,
    "new line must keep the first-line indent"
  );
  host.remove();
});
