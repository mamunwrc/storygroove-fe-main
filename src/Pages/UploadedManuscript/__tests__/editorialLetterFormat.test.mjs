import test from "node:test";
import assert from "node:assert/strict";
import { formatEditorialLetterMarkdown } from "../editorialLetterFormat.js";

test("formatEditorialLetterMarkdown splits single-newline paragraphs", () => {
  const input = "Hello Jane,\n\nYour voice is strong.\n\nIn Act 2, pacing slows.";
  const output = formatEditorialLetterMarkdown(input);

  assert.match(output, /\*\*Hello Jane,\*\*/);
  assert.match(output, /\*\*In Act 2\*\*, pacing slows\./);
  assert.match(output, /Your voice is strong\./);
});

test("formatEditorialLetterMarkdown formats signature block", () => {
  const input =
    "Body paragraph one.\n\nBody paragraph two.\n\nSincerely,\nEllis\nAI Creative Writing Academy\n\nNote: This is educational.";
  const output = formatEditorialLetterMarkdown(input);

  assert.match(output, /Body paragraph one\./);
  assert.match(output, /---/);
  assert.match(output, /Sincerely,/);
  assert.match(output, /\*\*Ellis\*\*/);
  assert.match(output, /\*Note: This is educational\.\*/);
});

test("formatEditorialLetterMarkdown splits a continuous block into paragraphs", () => {
  const input =
    "Hello Sam, Your opening works well. The middle loses momentum. The ending lands emotionally.";
  const output = formatEditorialLetterMarkdown(input);

  assert.match(output, /\*\*Hello Sam,\*\*/);
  assert.ok(output.includes("\n\n"));
});

test("formatEditorialLetterMarkdown escapes line-start numbers so they stay prose", () => {
  const input =
    "Hello Ana,\n\n1. Core manuscript strengths (voice, stakes).\n\nYour opening works.\n\n2. Recurring structural risks.\n\nPacing dips in Act 2.";
  const output = formatEditorialLetterMarkdown(input);

  assert.match(output, /\*\*1\. Core Manuscript Strengths\*\*/);
  assert.match(output, /\*\*2\. Recurring Structural Risks\*\*/);
  assert.doesNotMatch(output, /voice, stakes/);
  assert.doesNotMatch(output, /^1\. Core/m);
});

test("formatEditorialLetterMarkdown splits inline section markers onto their own line", () => {
  const input =
    "Hello Ana,\n\nYour opening works well. 1. Core manuscript strengths (voice, stakes).\n\nPacing dips in Act 2.";
  const output = formatEditorialLetterMarkdown(input);

  assert.match(output, /works well\.\n\n\*\*1\. Core Manuscript Strengths\*\*/);
});

test("formatEditorialLetterMarkdown keeps a section's body when the header and body are joined by a single newline (regression)", () => {
  // Reproduces the reported bug: Ellis writes the header and its very next
  // line of prose with only one `\n` (no blank line) between them. Every
  // section's body text must survive, not just the last one.
  const input =
    "Hello Ana,\n\nSome intro text here.\n\n" +
    "1. Core Manuscript Strengths\n" +
    "The manuscript shows strong voice and a compelling premise across the opening chapters.\n\n" +
    "2. Recurring Structural Risks\n" +
    "Pacing drags in the middle act and several subplots resolve too quickly.\n\n" +
    "3. Character Arc Evaluation\n" +
    "Darien's arc is clear but supporting characters need more development.\n\n" +
    "4. Global Revision Recommendations\n\n" +
    "The third major revision is to deepen the moral complexity around Darien.";

  const output = formatEditorialLetterMarkdown(input);

  assert.match(output, /\*\*1\. Core Manuscript Strengths\*\*/);
  assert.match(output, /The manuscript shows strong voice/);
  assert.match(output, /\*\*2\. Recurring Structural Risks\*\*/);
  assert.match(output, /Pacing drags in the middle act/);
  assert.match(output, /\*\*3\. Character Arc Evaluation\*\*/);
  assert.match(output, /Darien's arc is clear/);
  assert.match(output, /\*\*4\. Global Revision Recommendations\*\*/);
  assert.match(output, /The third major revision/);
});

test("formatEditorialLetterMarkdown uses clean labels for all seven section transitions", () => {
  const rawSections = [
    "1. Core manuscript strengths (voice, stakes, momentum, emotional connection, thematic cohesion).",
    "2. Recurring structural risks (pacing dips, escalation weakening, stakes softening).",
    "3. Character arc evaluation (emotional realism, motivation clarity, vulnerability layering).",
    "4. Global revision recommendations (tighten escalation, deepen emotional payoff, strengthen setups/payoffs).",
    "5. Genre-specific performance (state genre/subgenre used).",
    "6. Tentpole scenes are the pivotal emotional or structural moments that hold up the entire story.",
    "7. Tentpole scene opportunities.",
  ];
  const displayLabels = [
    "1. Core Manuscript Strengths",
    "2. Recurring Structural Risks",
    "3. Character Arc Evaluation",
    "4. Global Revision Recommendations",
    "5. Genre Performance",
    "6. Tentpole Scenes",
    "7. Tentpole Scene Opportunities",
  ];
  const input = `Hello Ana,\n\n${rawSections.join("\n\n")}\n\nBody under section.`;
  const output = formatEditorialLetterMarkdown(input);

  for (const label of displayLabels) {
    assert.match(output, new RegExp(`\\*\\*${label}\\*\\*`));
  }
  assert.doesNotMatch(output, /voice, stakes, momentum/);
  assert.doesNotMatch(output, /pivotal emotional or structural moments/);
});

test("formatEditorialLetterMarkdown unwraps bold chapter references from Ellis output", () => {
  const input =
    "Hello Jane,\n\n**Chapters Thirty-Six and Thirty-Seven** need tighter escalation.\n\nThe beat in **Chapter Seven** lands well.\n\n**Chapter 15 B** could use a clearer POV.\n\n1. Core manuscript strengths (voice, stakes).\n\nIn Act Two, pacing slows.\n\nSincerely,\nEllis";
  const output = formatEditorialLetterMarkdown(input);

  assert.match(output, /\*\*Hello Jane,\*\*/);
  assert.match(output, /\*\*1\. Core Manuscript Strengths\*\*/);
  assert.match(output, /\*\*In Act Two\*\*/);
  assert.match(output, /\*\*Ellis\*\*/);
  assert.match(output, /Chapters Thirty-Six and Thirty-Seven need tighter escalation/);
  assert.match(output, /beat in Chapter Seven lands well/);
  assert.match(output, /Chapter 15 B could use a clearer POV/);
  assert.doesNotMatch(output, /\*\*Chapters Thirty-Six/);
  assert.doesNotMatch(output, /\*\*Chapter Seven\*\*/);
  assert.doesNotMatch(output, /\*\*Chapter 15 B\*\*/);
});

test("formatEditorialLetterMarkdown keeps prose on the same line after inline bold", () => {
  const input =
    "Hello Ana,\n\nDeliver your **Global Editorial Letter** and save it to your Manuscript Hub.";
  assert.match(formatEditorialLetterMarkdown(input), /\*\*Global Editorial Letter\*\* and save/);

  const singleNewlineInput =
    "**Global Editorial Letter**\nis the first step in revision.";
  assert.match(
    formatEditorialLetterMarkdown(singleNewlineInput),
    /\*\*Global Editorial Letter\*\* is the first step/
  );
});
