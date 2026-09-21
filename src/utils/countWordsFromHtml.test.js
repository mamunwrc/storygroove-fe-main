import test from "node:test";
import assert from "node:assert/strict";
import { countWordsFromHtml } from "./countWordsFromHtml.js";

test("counts words across separate paragraph tags", () => {
  const html =
    "<p>Emon Singha.</p><p>Emon Singha.</p><p>Emon Singha.</p><p>Emon Singha.</p>";
  assert.equal(countWordsFromHtml(html), 8);
});

test("counts words in a single paragraph", () => {
  assert.equal(
    countWordsFromHtml("<p>Emon Singha. Emon Singha.</p>"),
    4
  );
});

test("treats br as a word boundary", () => {
  assert.equal(countWordsFromHtml("one<br>two"), 2);
});

test("returns 0 for empty or whitespace-only html", () => {
  assert.equal(countWordsFromHtml(""), 0);
  assert.equal(countWordsFromHtml("<p></p>"), 0);
  assert.equal(countWordsFromHtml("   "), 0);
});

test("decodes nbsp and does not count html tags", () => {
  assert.equal(countWordsFromHtml("<p>hello&nbsp;world</p>"), 2);
});
