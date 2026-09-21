import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import {
  HEAVY_EDITABLE_PASTE_CHARS,
  HEAVY_EDITABLE_PASTE_LINES,
  isHeavyPlainPaste,
  replaceEditableSelectionWithPlainText,
  replaceEditableSelectionWithHtml,
  clipboardHtmlToMarkdown,
  handleHeavyEditableDeleteKey,
  isHeavyEditable,
  selectionCoversEditable,
  clearEditableContents,
} from "./editablePlainPaste.js";

test("isHeavyPlainPaste is false for a short dossier snippet", () => {
  assert.equal(isHeavyPlainPaste("👤 Lola: 17-Point Dossier\n• Name: Lola"), false);
});

test("isHeavyPlainPaste is true past the char cap", () => {
  assert.equal(isHeavyPlainPaste("a".repeat(HEAVY_EDITABLE_PASTE_CHARS)), true);
});

test("isHeavyPlainPaste is true past the line cap without allocating a match array", () => {
  const text = Array.from({ length: HEAVY_EDITABLE_PASTE_LINES }, () => "line").join("\n");
  assert.equal(isHeavyPlainPaste(text), true);
});

test("isHeavyPlainPaste is false for empty", () => {
  assert.equal(isHeavyPlainPaste(""), false);
  assert.equal(isHeavyPlainPaste(null), false);
});

const installEditor = (html) => {
  const dom = new JSDOM(
    `<!DOCTYPE html><div id="ed" contenteditable="true">${html}</div>`,
    { pretendToBeVisual: true }
  );
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  globalThis.Range = dom.window.Range;
  return dom.window.document.getElementById("ed");
};

const selectAll = (el) => {
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  return sel;
};

test("replaceEditableSelectionWithPlainText select-all replaces instead of appending", () => {
  const el = installEditor("old<br>dossier");
  selectAll(el);
  replaceEditableSelectionWithPlainText(el, "NEW LONG");
  assert.equal(el.textContent, "NEW LONG");
});

test("replaceEditableSelectionWithPlainText with no in-editor selection replaces the field", () => {
  const el = installEditor("old dossier");
  window.getSelection().removeAllRanges();
  replaceEditableSelectionWithPlainText(el, "NEW");
  assert.equal(el.textContent, "NEW");
});

test("replaceEditableSelectionWithPlainText keeps surrounding lines on a partial paste", () => {
  const el = installEditor("hello<br>world");
  // Select only "world" (the text node after the br).
  const textNode = [...el.childNodes].find(
    (n) => n.nodeType === Node.TEXT_NODE && n.nodeValue === "world"
  );
  assert.ok(textNode, "expected a world text node");
  const range = document.createRange();
  range.selectNodeContents(textNode);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  replaceEditableSelectionWithPlainText(el, "there");
  assert.equal(el.textContent.replace(/\r/g, ""), "hello\nthere");
});

test("clipboardHtmlToMarkdown keeps bold and italic from the source", () => {
  installEditor("");
  assert.equal(
    clipboardHtmlToMarkdown("<p>Meet <b>Lola</b>, a <i>rebel</i>.</p>"),
    "Meet **Lola**, a *rebel*."
  );
});

test("clipboardHtmlToMarkdown turns bullet and numbered lists into markdown", () => {
  installEditor("");
  assert.equal(
    clipboardHtmlToMarkdown("<ul><li>Age: 17</li><li>Town: Reno</li></ul>"),
    "- Age: 17\n- Town: Reno"
  );
  assert.equal(
    clipboardHtmlToMarkdown("<ol><li>Archetype</li><li>Wound</li></ol>"),
    "1. Archetype\n2. Wound"
  );
});

test("clipboardHtmlToMarkdown separates paragraphs with a blank line", () => {
  installEditor("");
  assert.equal(
    clipboardHtmlToMarkdown("<p>One</p><p>Two</p>"),
    "One\n\nTwo"
  );
});

test("clipboardHtmlToMarkdown drops <style>/<head> noise (Word/Docs clipboard)", () => {
  installEditor("");
  const html =
    "<html><head><style>p{color:red}</style></head><body><p><b>Name</b></p></body></html>";
  assert.equal(clipboardHtmlToMarkdown(html), "**Name**");
});

test("replaceEditableSelectionWithHtml on select-all replaces with formatted HTML", () => {
  const el = installEditor("old plain text");
  selectAll(el);
  replaceEditableSelectionWithHtml(el, "<strong>Lola</strong><br>rebel");
  assert.equal(el.innerHTML, "<strong>Lola</strong><br>rebel");
  assert.equal(el.textContent, "Lolarebel");
});

test("isHeavyEditable is true when child node count hits the line cap", () => {
  const html = Array.from({ length: HEAVY_EDITABLE_PASTE_LINES }, () => "line").join("<br>");
  const el = installEditor(html);
  assert.equal(isHeavyEditable(el), true);
});

test("selectionCoversEditable is true after select-all", () => {
  const el = installEditor("a<br>b<br>c");
  selectAll(el);
  assert.equal(selectionCoversEditable(el), true);
});

test("selectionCoversEditable is true when the drag-select spans every character", () => {
  const el = installEditor("hello<br>world");
  const first = el.firstChild;
  const last = el.lastChild;
  assert.equal(first.nodeType, Node.TEXT_NODE);
  assert.equal(last.nodeType, Node.TEXT_NODE);
  const range = document.createRange();
  range.setStart(first, 0);
  range.setEnd(last, last.length);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  assert.equal(selectionCoversEditable(el), true);
});

test("selectionCoversEditable is false for a collapsed caret", () => {
  const el = installEditor("hello");
  window.getSelection().removeAllRanges();
  assert.equal(selectionCoversEditable(el), false);
});

test("handleHeavyEditableDeleteKey select-all Backspace clears a heavy editor", () => {
  const html = Array.from(
    { length: HEAVY_EDITABLE_PASTE_LINES + 5 },
    (_, i) => `line ${i}`
  ).join("<br>");
  const el = installEditor(html);
  selectAll(el);
  const e = new window.KeyboardEvent("keydown", {
    key: "Backspace",
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(e, "currentTarget", { value: el });
  handleHeavyEditableDeleteKey(e);
  assert.equal(e.defaultPrevented, true);
  assert.equal(el.textContent, "");
});

test("handleHeavyEditableDeleteKey does not steal Backspace on a short editor", () => {
  const el = installEditor("short");
  selectAll(el);
  const e = new window.KeyboardEvent("keydown", {
    key: "Backspace",
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(e, "currentTarget", { value: el });
  handleHeavyEditableDeleteKey(e);
  assert.equal(e.defaultPrevented, false);
  assert.equal(el.textContent, "short");
});

test("clearEditableContents empties the field", () => {
  const el = installEditor("keep<br>me");
  clearEditableContents(el);
  assert.equal(el.textContent, "");
});
