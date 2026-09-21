import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeEllisReviewMarkdown,
  forceEllisInlineSectionBreaks,
  insertEllisSectionDividers,
  prepareEllisReviewForDisplay,
  stripEllisChatOnlyTail,
  stripOrphanBoldMarkerLines,
  canonicalEllisSectionLabel,
  joinCreativeSuggestionSubLabels,
  insertEllisCreativeSuggestionSeparators,
  spaceEllisCreativeSuggestionLines,
  stripEllisSceneAnalysisOrphanSuffixLines,
  stripEllisMarkdownSectionHeadings,
  mergeEllisChapterPovTitleLines,
  ELLIS_SUGGESTION_SEP_MARKER,
} from "../ellisReviewFormatCore.js";
import { isCompleteEllisChapterOpener } from "../ellisChapterOpenerParse.js";

const SAMPLE_REVIEW = `Chapter 1A – POV: Mara

Function in Story: Opening hook
Genre Beat Check: This scene sets up the inciting beat.
🔍 Scene Analysis
The structure works but pacing drags in the second half.

🎨 Creative Suggestions
Structural Weakness: Late stakes
Creative Suggestion Name: "Raise the Alarm"
👉 Editorial Logic: Bring the threat on-page sooner.
👉 Example 1: Mara heard the siren before she saw the smoke.

📌 Chapter Cumulative Editorial Note
This chapter establishes Mara's ordinary world while hinting at the coming rupture.
The reader should leave this chapter feeling uneasy anticipation, because the opening promises disruption Mara cannot yet name.`;

test("normalizeEllisReviewMarkdown collapses excess blank lines", () => {
  assert.equal(normalizeEllisReviewMarkdown("a\n\n\n\nb"), "a\n\nb");
});

test("forceEllisInlineSectionBreaks splits inline Genre Beat Check", () => {
  const out = forceEllisInlineSectionBreaks(
    "Genre Beat Check: This scene sets up the inciting beat."
  );
  assert.match(out, /Genre Beat Check/);
  assert.match(out, /This scene sets up the inciting beat/);
  assert.ok(out.includes("\n\n"));
});

test("insertEllisSectionDividers adds hr before Ellis section headers", () => {
  const out = insertEllisSectionDividers(SAMPLE_REVIEW);
  assert.match(out, /---/);
  assert.match(out, /^Chapter 1A – POV: Mara/m);
  assert.doesNotMatch(out, /^---\n\nChapter 1A/m);
  assert.match(out, /\*\*Function in Story\*\*/);
  assert.match(out, /\*\*Genre Beat Check\*\*/);
  assert.match(out, /\*\*🔍 Scene Analysis — Editorial Review\*\*/);
  assert.match(out, /\*\*🎨 Creative Suggestions\*\*/);
  assert.match(out, /\*\*📌 Chapter Cumulative Editorial Note\*\*/);
});

test("insertEllisSectionDividers skips hr before chapter scene titles", () => {
  const out = insertEllisSectionDividers(
    `Chapter One – POV: Darien\n\nFunction in Story: Opening hook`
  );
  assert.match(out, /^Chapter One – POV: Darien/);
  assert.doesNotMatch(out, /^---\n+Chapter One/m);
  assert.doesNotMatch(out, /^---\n+\*\*Chapter One/m);
  assert.match(out, /\n---\n\*\*Function in Story\*\*/);
});

test("canonicalEllisSectionLabel adds required emojis for Scene Analysis", () => {
  assert.equal(
    canonicalEllisSectionLabel("Scene Analysis"),
    "🔍 Scene Analysis — Editorial Review"
  );
  assert.equal(
    canonicalEllisSectionLabel("Scene Analysis (Editorial Review)"),
    "🔍 Scene Analysis — Editorial Review"
  );
  assert.equal(
    canonicalEllisSectionLabel("Scene Analysis — Editorial Review"),
    "🔍 Scene Analysis — Editorial Review"
  );
  assert.equal(canonicalEllisSectionLabel("Creative Suggestions"), "🎨 Creative Suggestions");
});

test("insertEllisSectionDividers matches plain Scene Analysis for legacy reviews", () => {
  const legacy = "Scene Analysis\nBody paragraph here.";
  const out = insertEllisSectionDividers(legacy);
  assert.match(out, /\*\*🔍 Scene Analysis — Editorial Review\*\*/);
});

test("prepareEllisReviewForDisplay splits a section glued onto a long custom opener", () => {
  const out = prepareEllisReviewForDisplay(
    "Epilogue - September- 1936 - California – POV: Myla Function in Story: Closes the occult cost."
  );
  assert.match(out, /Epilogue - September- 1936 - California – POV: Myla/);
  assert.match(out, /\*\*Function in Story\*\*/);
  assert.ok(!/POV: Myla Function in Story/i.test(out));
});

test("prepareEllisReviewForDisplay preserves cumulative note as plain prose", () => {
  const out = prepareEllisReviewForDisplay(SAMPLE_REVIEW);
  assert.match(out, /📌 Chapter Cumulative Editorial Note/);
  assert.match(
    out,
    /The reader should leave this chapter feeling uneasy anticipation/
  );
  assert.doesNotMatch(out, /^> /m);
});

test("insertEllisSectionDividers adds hr before Creative Suggestions and cumulative note", () => {
  const out = insertEllisSectionDividers(SAMPLE_REVIEW);
  const creativeIdx = out.indexOf("**🎨 Creative Suggestions**");
  const cumulativeIdx = out.indexOf("**📌 Chapter Cumulative Editorial Note**");
  assert.ok(creativeIdx > 0);
  assert.ok(cumulativeIdx > creativeIdx);
  assert.match(out.slice(0, creativeIdx), /\n---\n\s*$/);
  assert.match(out.slice(0, cumulativeIdx), /\n---\n\s*$/);
  assert.doesNotMatch(
    out.slice(creativeIdx, cumulativeIdx),
    /\n---\n\*\*Structural Weakness/
  );
});

test("prepareEllisReviewForDisplay normalizes markdown h3 section headings", () => {
  const input = `Chapter One – POV: Darien

Function in Story: Opening hook
Genre Beat Check: Sets up the inciting beat.
### 🔍 Scene Analysis — Editorial Review
Scene body paragraph.

### 🎨 Creative Suggestions
Structural Weakness: Late stakes
Creative Suggestion Name: "Raise the Alarm"
👉 Editorial Logic: Bring the threat on-page sooner.

### 📌 Chapter Cumulative Editorial Note
The reader should leave this chapter feeling uneasy anticipation, because the opening promises disruption.`;
  const out = prepareEllisReviewForDisplay(input);
  assert.match(out, /\*\*🔍 Scene Analysis — Editorial Review\*\*/);
  assert.match(out, /\*\*🎨 Creative Suggestions\*\*/);
  assert.match(out, /\*\*📌 Chapter Cumulative Editorial Note\*\*/);
  assert.doesNotMatch(out, /^### /m);
  const creativeIdx = out.indexOf("**🎨 Creative Suggestions**");
  const cumulativeIdx = out.indexOf("**📌 Chapter Cumulative Editorial Note**");
  assert.match(out.slice(0, creativeIdx), /\n---\n\s*$/);
  assert.match(out.slice(0, cumulativeIdx), /\n---\n\s*$/);
});

test("mergeEllisChapterPovTitleLines joins split chapter and POV lines", () => {
  const input = `Chapter One

POV: Darien

Function in Story: Opening hook`;
  const out = mergeEllisChapterPovTitleLines(input);
  assert.equal(out, `Chapter One – POV: Darien

Function in Story: Opening hook`);
});

test("custom chapter titles keep their stored label as the review opener", () => {
  assert.equal(isCompleteEllisChapterOpener("1.5 – POV: Darien"), true);
  assert.equal(isCompleteEllisChapterOpener("The Betrayal – POV: Cassie"), true);
  const custom = mergeEllisChapterPovTitleLines(
    "1.5 – POV: Darien\n\nFunction in Story: Opening hook"
  );
  assert.match(custom, /^1\.5 – POV: Darien/m);
  assert.doesNotMatch(custom, /^Chapter /m);
});

test("prepareEllisReviewForDisplay keeps a custom Chapter One Point Five opener intact", () => {
  const out = prepareEllisReviewForDisplay(
    `Chapter One Point Five – POV: Myla

Function in Story: Bridge work between Chapter One and what follows.`
  );
  assert.match(out, /^Chapter One Point Five – POV: Myla/m);
  assert.doesNotMatch(out, /Chapter One P\b/);
  assert.doesNotMatch(out, /^oint Five/m);
  assert.match(out, /\n---\n\*\*Function in Story\*\*/);
});

test("insertEllisSectionDividers does not split Point in a custom chapter title", () => {
  const out = insertEllisSectionDividers(
    `Chapter One Point Five – POV: Myla

Function in Story: Bridge work.`
  );
  assert.match(out, /^Chapter One Point Five – POV: Myla/m);
  assert.doesNotMatch(out, /^Chapter One P$/m);
  assert.doesNotMatch(out, /^oint Five/m);
});

test("mergeEllisChapterPovTitleLines joins lettered chapter wrap before POV", () => {
  const input = `Chapter Seven

A – POV: Darien as Adrien

Function in Story: Internal Threshold`;
  const out = mergeEllisChapterPovTitleLines(input);
  assert.equal(
    out,
    `Chapter Seven A – POV: Darien as Adrien

Function in Story: Internal Threshold`
  );
});

test("mergeEllisChapterPovTitleLines joins letter then POV on separate lines", () => {
  const input = `Chapter Seven
A
POV: Darien as Adrien`;
  const out = mergeEllisChapterPovTitleLines(input);
  assert.equal(out, `Chapter Seven A – POV: Darien as Adrien`);
});

test("mergeEllisChapterPovTitleLines joins compound chapter Twenty One split before POV", () => {
  const input = `Chapter Twenty

One – POV: David John

Function in Story: Opening hook`;
  const out = mergeEllisChapterPovTitleLines(input);
  assert.equal(out, `Chapter Twenty One – POV: David John

Function in Story: Opening hook`);
});

test("mergeEllisChapterPovTitleLines joins compound chapter Twenty Two split before POV", () => {
  const input = `Chapter Twenty
Two – POV: Darien`;
  const out = mergeEllisChapterPovTitleLines(input);
  assert.equal(out, `Chapter Twenty Two – POV: Darien`);
});

test("mergeEllisChapterPovTitleLines joins compound chapter Thirty Five split before POV", () => {
  const input = `Chapter Thirty
Five – POV: Mara`;
  const out = mergeEllisChapterPovTitleLines(input);
  assert.equal(out, `Chapter Thirty Five – POV: Mara`);
});

test("mergeEllisChapterPovTitleLines joins compound chapter Ninety Nine split before POV", () => {
  const input = `Chapter Ninety
Nine – POV: Alex`;
  const out = mergeEllisChapterPovTitleLines(input);
  assert.equal(out, `Chapter Ninety Nine – POV: Alex`);
});

test("mergeEllisChapterPovTitleLines joins three-line compound number then POV", () => {
  const input = `Chapter Twenty
One
POV: David John`;
  const out = mergeEllisChapterPovTitleLines(input);
  assert.equal(out, `Chapter Twenty One – POV: David John`);
});

test("mergeEllisChapterPovTitleLines joins teen suffix split for Chapter Fourteen", () => {
  const input = `Chapter Four
teen – POV: Darien as Adrien`;
  const out = mergeEllisChapterPovTitleLines(input);
  assert.equal(out, `Chapter Fourteen – POV: Darien as Adrien`);
});

test("mergeEllisChapterPovTitleLines joins teen suffix split for Chapter Nineteen", () => {
  const input = `Chapter Nine
teen – POV: Wesley Smith`;
  const out = mergeEllisChapterPovTitleLines(input);
  assert.equal(out, `Chapter Nineteen – POV: Wesley Smith`);
});

test("mergeEllisChapterPovTitleLines joins three-line teen suffix then POV", () => {
  const input = `Chapter Six
teen
POV: Mara Vale`;
  const out = mergeEllisChapterPovTitleLines(input);
  assert.equal(out, `Chapter Sixteen – POV: Mara Vale`);
});

test("prepareEllisReviewForDisplay merges teen suffix chapter opener split across lines", () => {
  const input = `Chapter Four
teen – POV: Darien as Adrien

Function in Story: Internal Threshold
Genre Beat Check: Workplace immersion.`;
  const out = prepareEllisReviewForDisplay(input);
  assert.match(out, /^Chapter Fourteen – POV: Darien as Adrien/m);
  assert.doesNotMatch(out, /^teen – POV:/m);
  assert.doesNotMatch(out, /^---\n+Chapter Fourteen/m);
});

test("prepareEllisReviewForDisplay merges compound chapter opener split across lines", () => {
  const input = `Chapter Twenty
Two – POV: Darien

Function in Story: Internal Threshold
Genre Beat Check: Workplace immersion.`;
  const out = prepareEllisReviewForDisplay(input);
  assert.match(out, /^Chapter Twenty Two – POV: Darien/m);
  assert.doesNotMatch(out, /^Two – POV:/m);
  assert.doesNotMatch(out, /^---\n+Chapter Twenty Two/m);
});

test("prepareEllisReviewForDisplay merges split chapter and POV scene opener", () => {
  const input = `Chapter One
POV: Darien

Function in Story: Opening hook`;
  const out = prepareEllisReviewForDisplay(input);
  assert.match(out, /^Chapter One – POV: Darien/);
  assert.doesNotMatch(out, /^POV: Darien/m);
});

test("prepareEllisReviewForDisplay merges Chapter Seven / A – POV wrap", () => {
  const input = `Chapter Seven
A – POV: Darien as Adrien

Function in Story: Internal Threshold
Genre Beat Check: Workplace immersion.`;
  const out = prepareEllisReviewForDisplay(input);
  assert.match(out, /^Chapter Seven A – POV: Darien as Adrien/m);
  assert.doesNotMatch(out, /^A – POV:/m);
});

test("stripEllisMarkdownSectionHeadings removes hash prefixes from section labels", () => {
  const input = `### 🎨 Creative Suggestions
### 📌 Chapter Cumulative Editorial Note`;
  const out = stripEllisMarkdownSectionHeadings(input);
  assert.equal(out, `🎨 Creative Suggestions\n📌 Chapter Cumulative Editorial Note`);
});

test("stripEllisChatOnlyTail removes chat footer when present", () => {
  const withFooter =
    "Review body.\n\nIf you have questions about this feedback, tell me.";
  assert.equal(stripEllisChatOnlyTail(withFooter), "Review body.");
});

test("prepareEllisReviewForDisplay does not mutate short non-review text", () => {
  const short = "Thanks — let's look at Chapter Two next.";
  assert.equal(prepareEllisReviewForDisplay(short), short);
});

test("stripOrphanBoldMarkerLines removes lone ** lines", () => {
  const input = "Function in Story\n**\nBody paragraph.";
  assert.equal(stripOrphanBoldMarkerLines(input), "Function in Story\nBody paragraph.");
});

test("prepareEllisReviewForDisplay removes ** artifacts after **Label:** headers", () => {
  const input = `Chapter One – POV: Darien

**Function in Story:**
**
Framing Hook body here.

**Genre Beat Check:**
**
Genre body here.`;
  const out = prepareEllisReviewForDisplay(input);
  assert.doesNotMatch(out, /^\s*\*\*\s*$/m);
  assert.match(out, /Framing Hook body here/);
  assert.match(out, /Genre body here/);
});

test("creative sub-labels stay inline under Creative Suggestions without extra dividers", () => {
  const input = `🔍 Scene Analysis
Body paragraph.

🎨 Creative Suggestions
Structural Weakness: Late stakes
Creative Suggestion Name: "Raise the Alarm"
Character Weakness: Flat reaction
👉 Editorial Logic: Bring the threat on-page sooner.`;
  const out = prepareEllisReviewForDisplay(input);
  assert.match(out, /\*\*🎨 Creative Suggestions\*\*/);
  assert.match(out, /\*\*Structural Weakness:\*\* Late stakes/);
  assert.match(out, /\*\*Creative Suggestion Name:\*\* "Raise the Alarm"/);
  assert.match(out, /\*\*Character Weakness:\*\* Flat reaction/);
  assert.match(out, /\*\*Editorial Logic:\*\* Bring the threat on-page sooner\./);
  assert.doesNotMatch(out, new RegExp(ELLIS_SUGGESTION_SEP_MARKER));
  assert.doesNotMatch(out, /\*\*Structural Weakness\*\*\n\nLate/);
  const sections = out.split("\n---\n");
  const creativeBlock = sections.find((s) => s.includes("🎨 Creative Suggestions"));
  assert.ok(creativeBlock);
  assert.doesNotMatch(creativeBlock, /\n---\n/);
  assert.doesNotMatch(creativeBlock, /^\s*>\s/m);
});

test("joinCreativeSuggestionSubLabels merges label and value split across lines", () => {
  const input = `🎨 Creative Suggestions
Structural Weakness
Late stakes
Creative Suggestion Name
"Raise the Alarm"`;
  const out = joinCreativeSuggestionSubLabels(input);
  assert.match(out, /Structural Weakness: Late stakes/);
  assert.match(out, /Creative Suggestion Name: "Raise the Alarm"/);
});

test("insertEllisCreativeSuggestionSeparators adds marker before 2nd suggestion only", () => {
  const input = `🎨 Creative Suggestions
**Structural Weakness:** First weakness
**Creative Suggestion Name:** "One"
**Editorial Logic:** First description
**Example 1:** First example rewrite.
Structural Weakness: Second weakness
Creative Suggestion Name: "Two"`;
  const out = insertEllisCreativeSuggestionSeparators(input);
  assert.doesNotMatch(
    out,
    new RegExp(`Creative Suggestions\\n\\n${ELLIS_SUGGESTION_SEP_MARKER}`)
  );
  assert.match(out, new RegExp(`${ELLIS_SUGGESTION_SEP_MARKER}\\nStructural Weakness: Second`));
});

test("forceEllisInlineSectionBreaks does not split Scene Analysis editorial suffix", () => {
  const input = `Genre Beat Check: Sets up the inciting beat.

🔍 Scene Analysis — Editorial Review
Darien reads as a sharp, self-aware narrator.`;
  const out = forceEllisInlineSectionBreaks(input);
  assert.doesNotMatch(out, /^— Editorial Review$/m);
  assert.match(out, /🔍 Scene Analysis — Editorial Review\n\nDarien reads/);
});

test("prepareEllisReviewForDisplay does not duplicate Scene Analysis editorial suffix", () => {
  const input = `Genre Beat Check: Sets up the inciting beat.

🔍 Scene Analysis — Editorial Review
Darien reads as a sharp, self-aware narrator.`;
  const out = prepareEllisReviewForDisplay(input);
  assert.match(out, /\*\*🔍 Scene Analysis — Editorial Review\*\*/);
  assert.doesNotMatch(out, /^— Editorial Review$/m);
  assert.doesNotMatch(out, /\*\*🔍 Scene Analysis — Editorial Review\*\*\n\n— Editorial Review/m);
});

test("stripEllisSceneAnalysisOrphanSuffixLines removes orphan suffix lines", () => {
  const input = `**🔍 Scene Analysis — Editorial Review**

— Editorial Review

Body paragraph.`;
  assert.equal(
    stripEllisSceneAnalysisOrphanSuffixLines(input),
    `**🔍 Scene Analysis — Editorial Review**

Body paragraph.`
  );
});

test("spaceEllisCreativeSuggestionLines puts each sub-label on its own paragraph", () => {
  const input = `🎨 Creative Suggestions
**Structural Weakness:** Late stakes
**Creative Suggestion Name:** "Raise the Alarm"
**Editorial Logic:** Bring the threat sooner.
**Example 1:** Mara heard the siren.
**Example 2:** Smoke curled under the door.`;
  const out = spaceEllisCreativeSuggestionLines(input);
  assert.match(out, /Name:\*\* "Raise the Alarm"\n\n\*\*Editorial Logic/);
  assert.match(out, /Editorial Logic:\*\* Bring the threat sooner\.\n\n\*\*Example 1/);
  assert.match(out, /Example 1:\*\* Mara heard the siren\.\n\n\*\*Example 2/);
});

test("insertEllisCreativeSuggestionSeparators does not separate Character Weakness in same suggestion", () => {
  const input = `🎨 Creative Suggestions
Structural Weakness: Late stakes
Creative Suggestion Name: "Raise the Alarm"
Character Weakness: Flat reaction
👉 Editorial Logic: Bring the threat on-page sooner.`;
  const out = insertEllisCreativeSuggestionSeparators(input);
  assert.doesNotMatch(out, new RegExp(ELLIS_SUGGESTION_SEP_MARKER));
});

test("prepareEllisReviewForDisplay formats Application Example labels", () => {
  const input = `🎨 Creative Suggestions
Structural Weakness: Late stakes
Creative Suggestion Name: "Raise the Alarm"
👉 Editorial Logic: Bring the threat on-page sooner.
👉 Application Example 1: Mara heard the siren before she saw the smoke.
👉 Application Example 2: Smoke curled under the door.`;
  const out = prepareEllisReviewForDisplay(input);
  assert.match(out, /\*\*Editorial Logic:\*\* Bring the threat on-page sooner\./);
  assert.match(out, /\*\*Application Example 1:\*\* Mara heard the siren/);
  assert.match(out, /\*\*Application Example 2:\*\* Smoke curled under the door/);
  assert.doesNotMatch(out, /👉/);
});

test("prepareEllisReviewForDisplay formats legacy Description label for stored reviews", () => {
  const input = `🎨 Creative Suggestions
Structural Weakness: Late stakes
Creative Suggestion Name: "Raise the Alarm"
👉 Description: Bring the threat on-page sooner.
👉 Example 1: Mara heard the siren before she saw the smoke.`;
  const out = prepareEllisReviewForDisplay(input);
  assert.match(out, /\*\*Description:\*\* Bring the threat on-page sooner\./);
  assert.doesNotMatch(out, /👉/);
});

test("prepareEllisReviewForDisplay separates multiple creative suggestions", () => {
  const input = `🎨 Creative Suggestions
Structural Weakness: First weakness
Creative Suggestion Name: "One"
👉 Editorial Logic: First description
👉 Example 1: First example rewrite.
Structural Weakness: Second weakness
Creative Suggestion Name: "Two"
👉 Editorial Logic: Second description.`;
  const out = prepareEllisReviewForDisplay(input);
  assert.match(out, new RegExp(ELLIS_SUGGESTION_SEP_MARKER));
  assert.doesNotMatch(out, /👉/);
  assert.match(out, /\*\*Editorial Logic:\*\* First description/);
  assert.match(out, /\*\*Example 1:\*\* First example rewrite\./);
  const creativeBlock = out.split("**🎨 Creative Suggestions**")[1] || "";
  const sepCount = (creativeBlock.match(new RegExp(ELLIS_SUGGESTION_SEP_MARKER, "g")) || [])
    .length;
  assert.equal(sepCount, 1);
});
