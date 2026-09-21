import test from "node:test";
import assert from "node:assert/strict";
import {
  isVisuallyEmptyBlockInnerHtml,
  normalizeQuillHtmlForRoundTrip,
  areQuillHtmlEquivalent,
} from "./quillHtmlNormalize.js";

test("detects Quill cursor placeholder paragraphs as visually empty", () => {
  const inner =
    '<span style="font-size: 12pt;"><span class="ql-cursor">&#xFEFF;</span></span>';
  assert.equal(isVisuallyEmptyBlockInnerHtml(inner), true);
});

test("normalizeQuillHtmlForRoundTrip preserves block attrs on blank paragraphs", () => {
  const html =
    '<p class="ql-align-justify" style="margin-bottom: 6pt;"><span style="font-size: 12pt; background-color: transparent;"><span class="ql-cursor">&#xFEFF;</span></span></p><p>Body</p>';
  assert.equal(
    normalizeQuillHtmlForRoundTrip(html),
    '<p class="ql-align-justify" style="margin-bottom: 6pt;"><br></p><p>Body</p>'
  );
});

test("normalizeQuillHtmlForRoundTrip leaves prose paragraphs unchanged", () => {
  const html = '<p class="ql-align-center">Hello world</p>';
  assert.equal(normalizeQuillHtmlForRoundTrip(html), html);
});

test("normalizeQuillHtmlForRoundTrip normalizes bare empty paragraphs", () => {
  assert.equal(normalizeQuillHtmlForRoundTrip("<p></p>"), "<p><br></p>");
});

test("areQuillHtmlEquivalent treats cursor placeholder and br blank as equal", () => {
  const feff =
    '<p>Test</p><p><span class="ql-cursor">\uFEFF</span></p>';
  const br = "<p>Test</p><p><br></p>";
  assert.equal(areQuillHtmlEquivalent(feff, br), true);
});
