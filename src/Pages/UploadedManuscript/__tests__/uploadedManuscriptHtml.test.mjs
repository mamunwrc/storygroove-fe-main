import assert from "node:assert/strict";
import test from "node:test";
import {
  countChapterWords,
  stripUploadedManuscriptDisplayHtml,
  trimDeadParagraphBreaks,
} from "../utils.js";
import { preserveLeadingIndentation } from "../../../utils/preserveLeadingIndentation.js";

test("trimDeadParagraphBreaks removes empty paragraph tags between prose", () => {
  const html =
    "<p>First.</p><p><br></p><p>Second.</p><p><br/></p><p>Third.</p>";
  assert.equal(
    trimDeadParagraphBreaks(html),
    "<p>First.</p><p>Second.</p><p>Third.</p>"
  );
});

test("trimDeadParagraphBreaks preserves paragraphs with text", () => {
  const html = "<p>Line one.</p><p>Line two.</p>";
  assert.equal(trimDeadParagraphBreaks(html), html);
});

test("stripUploadedManuscriptDisplayHtml trims dead breaks after other stripping", () => {
  const html = "<p>Opening.</p><p><br></p><p>Next beat.</p>";
  assert.equal(
    stripUploadedManuscriptDisplayHtml(html),
    "<p>Opening.</p><p>Next beat.</p>"
  );
});

test("stripUploadedManuscriptDisplayHtml preserves blank paragraphs for editor load", () => {
  const html = "<p>Opening.</p><p><br></p><p>Next beat.</p>";
  assert.equal(
    stripUploadedManuscriptDisplayHtml(html, { preserveBlankParagraphs: true }),
    html
  );
});

test("editor load keeps the first paragraph even when it matches the chapter title", () => {
  const html = "<p>Epilogue</p><p>She opened the door.</p>";
  assert.equal(
    stripUploadedManuscriptDisplayHtml(html, {
      sceneTitle: "Epilogue",
      chapterLabel: "Epilogue",
      preserveBlankParagraphs: true,
      stripLeadingTitle: false,
    }),
    html
  );
});

test("preserveLeadingIndentation converts leading paragraph spaces to nbsp", () => {
  const html = "<p>    Indented first line.</p><p>No indent.</p>";
  assert.equal(
    preserveLeadingIndentation(html),
    "<p>\u00a0\u00a0\u00a0\u00a0Indented first line.</p><p>No indent.</p>"
  );
});

test("preserveLeadingIndentation keeps indentation after a <br>", () => {
  const html = "<p>First line.<br>   Second line indent.</p>";
  assert.equal(
    preserveLeadingIndentation(html),
    "<p>First line.<br>\u00a0\u00a0\u00a0Second line indent.</p>"
  );
});

test("preserveLeadingIndentation leaves already-nbsp indentation untouched", () => {
  const html = "<p>\u00a0\u00a0Already indented.</p>";
  assert.equal(preserveLeadingIndentation(html), html);
});

test("preserveLeadingIndentation preserves indent when the first line is formatted", () => {
  const html =
    '<p><span style="font-size: 14pt;">   Formatted indent.</span></p>';
  assert.equal(
    preserveLeadingIndentation(html),
    '<p><span style="font-size: 14pt;">\u00a0\u00a0\u00a0Formatted indent.</span></p>'
  );
});

test("preserveLeadingIndentation preserves indent before a bold first word", () => {
  const html = "<p><strong>   Bold start</strong> and the rest.</p>";
  assert.equal(
    preserveLeadingIndentation(html),
    "<p><strong>\u00a0\u00a0\u00a0Bold start</strong> and the rest.</p>"
  );
});

test("preserveLeadingIndentation converts a leading tab to five nbsp", () => {
  const html = "<p>\tIndented with tab.</p>";
  assert.equal(
    preserveLeadingIndentation(html),
    "<p>\u00a0\u00a0\u00a0\u00a0\u00a0Indented with tab.</p>"
  );
});

test("preserveLeadingIndentation converts tab after inline formatting", () => {
  const html = "<p><strong>\tBold indent.</strong></p>";
  assert.equal(
    preserveLeadingIndentation(html),
    "<p><strong>\u00a0\u00a0\u00a0\u00a0\u00a0Bold indent.</strong></p>"
  );
});

test("preserveLeadingIndentation does not touch inline spaces that are not leading", () => {
  const html = "<p><span>Text</span>   trailing gap.</p>";
  assert.equal(preserveLeadingIndentation(html), html);
});

test("preserveLeadingIndentation converts Word inline text-indent to nbsps", () => {
  const html = '<p style="text-indent:.5in">She walked in.</p>';
  const result = preserveLeadingIndentation(html);
  assert.equal(result.includes("text-indent"), false);
  assert.equal(
    result.includes("\u00a0\u00a0\u00a0\u00a0\u00a0She walked in."),
    true
  );
});

test("uploaded manuscript word count includes the first paragraph", () => {
  const sceneData = {
    _id: "ch-1",
    sceneTitle: "Epilogue",
    userContent: "<p>She opened the door</p><p>Then the hallway waited.</p>",
  };
  assert.equal(
    countChapterWords(sceneData, { isUploadedManuscript: true }),
    8
  );
});
