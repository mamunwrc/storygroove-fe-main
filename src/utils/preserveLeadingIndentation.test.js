import test from "node:test";
import assert from "node:assert/strict";
import {
  MANUSCRIPT_PARAGRAPH_INDENT,
  clipboardNeedsIndentPreservation,
  convertWordFirstLineIndentToNbsp,
  cssLengthToInches,
  getLeadingManuscriptIndent,
  hasPositiveFirstLineIndent,
  nbspsFromIndentInches,
  preserveLeadingIndentation,
  readParagraphIndentInches,
  unwrapWordFakeEmphasis,
} from "./preserveLeadingIndentation.js";

test("cssLengthToInches understands Word's .5in and 36pt first-line indent", () => {
  assert.equal(cssLengthToInches(".5in"), 0.5);
  assert.equal(cssLengthToInches("0.5in"), 0.5);
  assert.equal(cssLengthToInches("36pt"), 0.5);
  assert.equal(cssLengthToInches("36.0pt"), 0.5);
  assert.equal(cssLengthToInches("21.6pt").toFixed(4), (0.3).toFixed(4));
  assert.equal(cssLengthToInches("21,6pt").toFixed(4), (0.3).toFixed(4));
  assert.equal(cssLengthToInches("0,3in"), 0.3);
  assert.equal(cssLengthToInches("0in"), 0);
  assert.equal(cssLengthToInches("-0.5in") < 0, true);
});

test("hasPositiveFirstLineIndent ignores hanging and zero indents", () => {
  assert.equal(hasPositiveFirstLineIndent("text-indent:.5in"), true);
  assert.equal(hasPositiveFirstLineIndent("mso-first-line-indent: 36pt"), true);
  assert.equal(hasPositiveFirstLineIndent("text-indent:0.25in"), true);
  assert.equal(hasPositiveFirstLineIndent("text-indent:0in"), false);
  assert.equal(hasPositiveFirstLineIndent("text-indent:-0.5in; margin-left:0.5in"), false);
  assert.equal(hasPositiveFirstLineIndent("color:red"), false);
});

test("nbspsFromIndentInches scales with the copied indent, not a fixed 0.5in", () => {
  assert.equal(nbspsFromIndentInches(0.25), "\u00a0".repeat(3));
  assert.equal(nbspsFromIndentInches(0.5), MANUSCRIPT_PARAGRAPH_INDENT);
  assert.equal(nbspsFromIndentInches(1), "\u00a0".repeat(10));
  assert.equal(nbspsFromIndentInches(0), "");
});

test("convertWordFirstLineIndentToNbsp rewrites inline text-indent", () => {
  const html = '<p style="margin:0;text-indent:.5in">She walked in.</p>';
  assert.equal(
    convertWordFirstLineIndentToNbsp(html),
    `<p style="margin:0">${MANUSCRIPT_PARAGRAPH_INDENT}She walked in.</p>`
  );
});

test("convertWordFirstLineIndentToNbsp applies MsoNormal stylesheet indent", () => {
  const html = `<html><head><style>
p.MsoNormal, li.MsoNormal, div.MsoNormal
	{margin:0in;
	text-indent:.5in;
	font-size:12.0pt;}
</style></head><body>
<p class=MsoNormal>First paragraph.</p>
<p class=MsoNormal>Second paragraph.</p>
</body></html>`;
  const converted = convertWordFirstLineIndentToNbsp(html);
  assert.equal(converted.includes(`>First paragraph.`), false);
  assert.match(
    converted,
    new RegExp(`class=MsoNormal>${MANUSCRIPT_PARAGRAPH_INDENT}First paragraph\\.`)
  );
  assert.match(
    converted,
    new RegExp(`class=MsoNormal>${MANUSCRIPT_PARAGRAPH_INDENT}Second paragraph\\.`)
  );
});

test("convertWordFirstLineIndentToNbsp does not indent centered paragraphs", () => {
  const html =
    '<p class="ql-align-center" style="text-indent:.5in">Chapter One</p>';
  assert.equal(convertWordFirstLineIndentToNbsp(html), html);
});

test("convertWordFirstLineIndentToNbsp does not double-indent existing nbsps", () => {
  const html = `<p style="text-indent:.5in">${MANUSCRIPT_PARAGRAPH_INDENT}Already indented.</p>`;
  assert.equal(convertWordFirstLineIndentToNbsp(html), html);
});

test("convertWordFirstLineIndentToNbsp keeps a 1in indent wider than 0.5in", () => {
  const html = '<p style="text-indent:1in">Deep indent.</p>';
  assert.equal(
    convertWordFirstLineIndentToNbsp(html),
    `<p>${"\u00a0".repeat(10)}Deep indent.</p>`
  );
});

test("convertWordFirstLineIndentToNbsp keeps a 0.25in indent narrower than 0.5in", () => {
  const html = '<p style="text-indent:0.25in">Shallow indent.</p>';
  assert.equal(
    convertWordFirstLineIndentToNbsp(html),
    `<p>${"\u00a0".repeat(3)}Shallow indent.</p>`
  );
});

test("convertWordFirstLineIndentToNbsp uses each paragraph's own stylesheet indent", () => {
  const html = `<html><head><style>
p.narrow { text-indent:0.25in; }
p.wide { text-indent:1in; }
</style></head><body>
<p class="narrow">A.</p>
<p class="wide">B.</p>
</body></html>`;
  const converted = convertWordFirstLineIndentToNbsp(html);
  assert.match(
    converted,
    new RegExp(`class="narrow">${"\u00a0".repeat(3)}A\\.`)
  );
  assert.match(
    converted,
    new RegExp(`class="wide">${"\u00a0".repeat(10)}B\\.`)
  );
});

test("preserveLeadingIndentation still converts leading spaces and tabs", () => {
  assert.equal(
    preserveLeadingIndentation("<p>\tIndented with tab.</p>"),
    `<p>${MANUSCRIPT_PARAGRAPH_INDENT}Indented with tab.</p>`
  );
  assert.equal(
    preserveLeadingIndentation("<p>    Indented first line.</p>"),
    `<p>${"\u00a0".repeat(4)}Indented first line.</p>`
  );
});

test("preserveLeadingIndentation converts Word CSS indent in one pass", () => {
  const html = '<p style="text-indent:36pt">Prose line.</p>';
  const result = preserveLeadingIndentation(html);
  assert.equal(result.includes("text-indent"), false);
  assert.equal(result.includes(`${MANUSCRIPT_PARAGRAPH_INDENT}Prose line.`), true);
});

test("preserveLeadingIndentation strips text-indent so Quill cannot inject a tab", () => {
  const html = '<p style="margin:0;text-indent:.5in">She walked in.</p>';
  const result = preserveLeadingIndentation(html);
  assert.equal(result.includes("text-indent"), false);
  assert.equal(
    result,
    `<p style="margin:0">${MANUSCRIPT_PARAGRAPH_INDENT}She walked in.</p>`
  );
});

test("convertWordFirstLineIndentToNbsp applies indent inside WordSection wrappers", () => {
  const html = `<html><head><style>
p.MsoNormal { margin:0in; text-indent:.3in; }
</style></head><body><div class=WordSection1><p class=MsoNormal>Indented.</p></div></body></html>`;
  const converted = convertWordFirstLineIndentToNbsp(html);
  assert.match(
    converted,
    new RegExp(`class=MsoNormal>${"\u00a0".repeat(3)}Indented\\.`)
  );
});

test("convertWordFirstLineIndentToNbsp handles mso-tab-count leading spans", () => {
  const html =
    "<p class=MsoNormal><span style='mso-tab-count:1'>&nbsp;&nbsp;&nbsp;</span>Hello</p>";
  assert.equal(
    convertWordFirstLineIndentToNbsp(html),
    `<p class=MsoNormal>${"\u00a0".repeat(3)}Hello</p>`
  );
});

test("clipboardNeedsIndentPreservation detects Word CSS indent, not style-block tabs", () => {
  const wordHtml = `<html><head><style>
p.MsoNormal
	{margin:0in;
	text-indent:.5in;}
</style></head><body><p class=MsoNormal>Hello.</p></body></html>`;
  assert.equal(clipboardNeedsIndentPreservation(wordHtml, "Hello."), true);

  const styleTabsOnly = `<html><head><style>
p.body
	{margin:0in;
	font-size:12.0pt;}
</style></head><body><p class="body">Hello.</p></body></html>`;
  assert.equal(clipboardNeedsIndentPreservation(styleTabsOnly, "Hello."), false);

  assert.equal(clipboardNeedsIndentPreservation("", "\tHello."), true);
  assert.equal(clipboardNeedsIndentPreservation("<p>    Hello.</p>", "Hello."), true);
  assert.equal(clipboardNeedsIndentPreservation("<p>Hello.</p>", "Hello."), false);
});

test("getLeadingManuscriptIndent copies the leading nbsp run", () => {
  assert.equal(
    getLeadingManuscriptIndent(`${MANUSCRIPT_PARAGRAPH_INDENT}Hello`),
    MANUSCRIPT_PARAGRAPH_INDENT
  );
  assert.equal(getLeadingManuscriptIndent("Hello"), "");
  assert.equal(getLeadingManuscriptIndent("  Hello"), "\u00a0\u00a0");
  assert.equal(getLeadingManuscriptIndent("\tHello"), MANUSCRIPT_PARAGRAPH_INDENT);
});

test("unwrapWordFakeEmphasis removes Word's fake bold wrappers", () => {
  const html =
    "<p><b style='mso-bidi-font-weight:normal'><span>Plain prose.</span></b></p>";
  assert.equal(
    unwrapWordFakeEmphasis(html),
    "<p><span>Plain prose.</span></p>"
  );
});

test("unwrapWordFakeEmphasis keeps real bold", () => {
  const html = "<p><b>Actually bold</b> and <strong>also bold</strong>.</p>";
  assert.equal(unwrapWordFakeEmphasis(html), html);
});

test("convertWordFirstLineIndentToNbsp handles Word mso-text-indent-alt", () => {
  const html = '<p style="mso-text-indent-alt:.3in">Hello</p>';
  assert.equal(
    convertWordFirstLineIndentToNbsp(html),
    `<p>${"\u00a0".repeat(3)}Hello</p>`
  );
});

test("convertWordFirstLineIndentToNbsp handles Word div.MsoNormal blocks", () => {
  const html = '<div class=MsoNormal style="text-indent:.3in">Hello</div>';
  assert.equal(
    convertWordFirstLineIndentToNbsp(html),
    `<div class=MsoNormal>${"\u00a0".repeat(3)}Hello</div>`
  );
});

test("convertWordFirstLineIndentToNbsp handles Word margin-left indent", () => {
  const html = '<p style="margin-left:.3in;text-indent:0in">Hello</p>';
  assert.equal(
    convertWordFirstLineIndentToNbsp(html),
    `<p>${"\u00a0".repeat(3)}Hello</p>`
  );
});

test("clipboardNeedsIndentPreservation detects mso-text-indent-alt", () => {
  assert.equal(
    clipboardNeedsIndentPreservation('<p style="mso-text-indent-alt:.3in">Hi</p>', "Hi"),
    true
  );
});

// Word desktop (Windows) can emit BOTH the first-line-indent CSS and a leading
// tab/space run. A tab always expands to MANUSCRIPT_TAB_SPACES (0.5in), which used
// to flatten every non-0.5in indent to 0.5in. The measured CSS width must win.
test("Word desktop tab + text-indent keeps the measured width, not the 0.5in tab default", () => {
  assert.equal(
    convertWordFirstLineIndentToNbsp(
      "<p class=MsoNormal style='text-indent:.3in'>\tShe walked in.</p>"
    ),
    `<p class=MsoNormal>${"\u00a0".repeat(3)}She walked in.</p>`
  );
  assert.equal(
    convertWordFirstLineIndentToNbsp(
      "<p class=MsoNormal style='text-indent:.5in'>\tShe walked in.</p>"
    ),
    `<p class=MsoNormal>${"\u00a0".repeat(5)}She walked in.</p>`
  );
  assert.equal(
    convertWordFirstLineIndentToNbsp(
      "<p class=MsoNormal style='text-indent:1in'>\tShe walked in.</p>"
    ),
    `<p class=MsoNormal>${"\u00a0".repeat(10)}She walked in.</p>`
  );
});

test("Word desktop stylesheet indent wins over a leading tab in the paragraph", () => {
  const html = `<html><head><style>
p.MsoNormal { margin:0in; text-indent:.3in; }
</style></head><body><div class=WordSection1><p class=MsoNormal>\tIndented.</p></div></body></html>`;
  const converted = convertWordFirstLineIndentToNbsp(html);
  assert.match(converted, new RegExp(`class=MsoNormal>${"\u00a0".repeat(3)}Indented\\.`));
  assert.equal(converted.includes("\t"), false);
});

test("leading nbsp run wider than the measured indent is normalized down", () => {
  // A pre-existing 5-nbsp (0.5in) run on a paragraph that is really 0.3in.
  const html = `<p style="text-indent:.3in">${"\u00a0".repeat(5)}She walked in.</p>`;
  assert.equal(
    convertWordFirstLineIndentToNbsp(html),
    `<p>${"\u00a0".repeat(3)}She walked in.</p>`
  );
});

test("preserveLeadingIndentation is idempotent for Word desktop tab + indent", () => {
  const html = "<p class=MsoNormal style='text-indent:.3in'>\tShe walked in.</p>";
  const once = preserveLeadingIndentation(html);
  const twice = preserveLeadingIndentation(once);
  assert.equal(once, twice);
  assert.equal(once.includes("text-indent"), false);
  assert.equal(once.includes("\t"), false);
  assert.equal(once.includes(`${"\u00a0".repeat(3)}She walked in.`), true);
});

// Word desktop (Windows) often omits text-indent for custom first-line values and
// emits mso-char-indent in character units instead. 0.5in stays text-indent:.5in
// (a round tab stop); 0.3in becomes 1.8 × 12pt characters (= 21.6pt).
test("Word desktop mso-char-indent 0.3in maps to 3 nbsps, not the 0.5in default", () => {
  assert.equal(
    nbspsFromIndentInches(readParagraphIndentInches("mso-char-indent:1.8 12.0pt")),
    "\u00a0".repeat(3)
  );
  assert.equal(
    nbspsFromIndentInches(readParagraphIndentInches("mso-char-indent:.3in")),
    "\u00a0".repeat(3)
  );
  assert.equal(
    nbspsFromIndentInches(readParagraphIndentInches("mso-char-indent:21.6pt")),
    "\u00a0".repeat(3)
  );
  assert.equal(
    nbspsFromIndentInches(readParagraphIndentInches("mso-char-indent:1.8")),
    "\u00a0".repeat(3)
  );
  assert.equal(
    convertWordFirstLineIndentToNbsp(
      "<p class=MsoNormal style='mso-char-indent:1.8 12.0pt'>She walked in.</p>"
    ),
    `<p class=MsoNormal>${"\u00a0".repeat(3)}She walked in.</p>`
  );
  assert.equal(
    convertWordFirstLineIndentToNbsp(
      "<p class=MsoNormal style='mso-char-indent:.3in'>She walked in.</p>"
    ),
    `<p class=MsoNormal>${"\u00a0".repeat(3)}She walked in.</p>`
  );
  assert.equal(
    convertWordFirstLineIndentToNbsp(
      "<p class=MsoNormal style='text-indent:.5in'>She walked in.</p>"
    ),
    `<p class=MsoNormal>${"\u00a0".repeat(5)}She walked in.</p>`
  );
  assert.equal(
    convertWordFirstLineIndentToNbsp(
      "<p class=MsoNormal style='text-indent:1in'>She walked in.</p>"
    ),
    `<p class=MsoNormal>${"\u00a0".repeat(10)}She walked in.</p>`
  );
});

test("Word desktop mso-char-indent-count without font-size uses 12pt manuscript default", () => {
  assert.equal(
    convertWordFirstLineIndentToNbsp(
      "<p class=MsoNormal style='mso-char-indent-count:1.8'>She walked in.</p>"
    ),
    `<p class=MsoNormal>${"\u00a0".repeat(3)}She walked in.</p>`
  );
});

test("Word desktop mso-char-indent on a child span still indents the paragraph", () => {
  const html =
    "<p class=MsoNormal><span style='font-size:12.0pt;mso-char-indent:1.8'>She walked in.</span></p>";
  assert.equal(
    convertWordFirstLineIndentToNbsp(html),
    `<p class=MsoNormal>${"\u00a0".repeat(3)}<span style='font-size:12.0pt;mso-char-indent:1.8'>She walked in.</span></p>`
  );
});

test("MsoNormalCxSpFirst inherits p.MsoNormal stylesheet indent", () => {
  const html = `<html><head><style>
p.MsoNormal { margin:0in; mso-char-indent:1.8 12.0pt; }
</style></head><body><div class=WordSection1>
<p class=MsoNormalCxSpFirst>Indented.</p>
</div></body></html>`;
  const converted = convertWordFirstLineIndentToNbsp(html);
  assert.match(
    converted,
    new RegExp(`class=MsoNormalCxSpFirst>${"\u00a0".repeat(3)}Indented\\.`)
  );
});

test("clipboardNeedsIndentPreservation detects Word mso-char-indent", () => {
  assert.equal(
    clipboardNeedsIndentPreservation(
      "<p class=MsoNormal style='mso-char-indent:1.8 12.0pt'>Hi</p>",
      "Hi"
    ),
    true
  );
});

test("Word desktop OOXML w:firstLine=432 twips (0.3in) maps to 3 nbsps", () => {
  const html = `<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><style><!--
p.MsoNormal, li.MsoNormal, div.MsoNormal
	{margin:0in;
	font-size:11.0pt;}
--></style><!--[if gte mso 9]><xml>
<w:WordDocument><w:Styles>
<w:style w:type="paragraph" w:styleId="Normal">
<w:pPr><w:ind w:firstLine="432"/></w:pPr>
</w:style>
</w:Styles></w:WordDocument>
</xml><![endif]--></head><body>
<div class=WordSection1><p class=MsoNormal>She walked in.<o:p></o:p></p></div>
</body></html>`;
  assert.match(
    convertWordFirstLineIndentToNbsp(html),
    new RegExp(
      `<p class=MsoNormal>${"\u00a0".repeat(3)}She walked in\\.<o:p><\\/o:p><\\/p>`
    )
  );
});

test("Word desktop OOXML w:firstLine=720 twips (0.5in) maps to 5 nbsps", () => {
  const html = `<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><!--[if gte mso 9]><xml>
<w:style w:type="paragraph" w:styleId="Normal">
<w:pPr><w:ind w:firstLine="720"/></w:pPr>
</w:style>
</xml><![endif]--></head><body><p class=MsoNormal>Hello.<o:p></o:p></p></body></html>`;
  assert.match(
    convertWordFirstLineIndentToNbsp(html),
    new RegExp(`<p class=MsoNormal>${"\u00a0".repeat(5)}Hello\\.<o:p><\\/o:p><\\/p>`)
  );
});

test("Word desktop Calibri stylesheet text-indent:.3in still maps to 3 nbsps", () => {
  const html = `<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><style><!--
@font-face
	{font-family:"Calibri";
	panose-1:2 15 5 2 2 2 4 3 2 4;}
p.MsoNormal, li.MsoNormal, div.MsoNormal
	{mso-style-unhide:no;
	margin:0in;
	text-indent:.3in;
	font-size:11.0pt;
	font-family:"Calibri",sans-serif;}
--></style></head><body><div class=WordSection1>
<p class=MsoNormal>She walked in.<o:p></o:p></p>
</div></body></html>`;
  assert.match(
    convertWordFirstLineIndentToNbsp(html),
    new RegExp(
      `<p class=MsoNormal>${"\u00a0".repeat(3)}She walked in\\.<o:p><\\/o:p><\\/p>`
    )
  );
});

test("Word desktop Arial 0.3in stylesheet-only paste (Windows clipboard shape)", () => {
  const html = `<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><style><!--
@font-face{font-family:"Cambria Math";mso-font-signature:-536869121 1107305727 33554432 0 415 0;}
@font-face{font-family:Aptos;mso-font-signature:536871559 3 0 0 415 0;}
p.MsoNormal, li.MsoNormal, div.MsoNormal
	{margin:0in;
	text-indent:.3in;
	line-height:200%;
	font-size:12.0pt;
	font-family:"Arial",sans-serif;
	color:black;}
.MsoChpDefault{mso-style-type:export-only;font-family:"Arial",sans-serif;}
.MsoPapDefault{mso-style-type:export-only;margin-bottom:8.0pt;line-height:107%;}
@page WordSection1{size:8.5in 11.0in;margin:1.0in 1.0in 1.0in 1.0in;}
div.WordSection1{page:WordSection1;}
--></style><style>
table.MsoNormalTable
	{mso-padding-alt:0in 5.4pt 0in 5.4pt;
	mso-para-margin-left:0in;
	font-size:12.0pt;
	font-family:"Arial",sans-serif;}
</style></head><body lang=EN-US style='tab-interval:.5in;word-wrap:break-word'>
<!--StartFragment-->
<p class=MsoNormal>I clutch my econ textbook, staring at formulas that might as
well be another language.<o:p></o:p></p>
<!--EndFragment-->
</body></html>`;
  assert.match(
    convertWordFirstLineIndentToNbsp(html),
    new RegExp(`<p class=MsoNormal>${"\u00a0".repeat(3)}I clutch my econ`)
  );
});
