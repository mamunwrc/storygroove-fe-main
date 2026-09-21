import test from "node:test";
import assert from "node:assert/strict";
import {
  countOliviaOutlineTableRows,
  extractOliviaOutlineTable,
  normalizeOliviaMarkdown,
} from "./oliviaMarkdownNormalize.js";

test("countOliviaOutlineTableRows ignores header and delimiter", () => {
  const table = extractOliviaOutlineTable(
    [
      "Plan:",
      "| Scene # | Act | Title | POV | Summary |",
      "|---------|-----|-------|-----|----------|",
      "| Scene 1 | 1 | Flute | Lola | At the rooftop. |",
      "| NEW Scene 2.5 | 1 | Camila | Sienna | Aftermath. |",
    ].join("\n")
  );
  assert.equal(countOliviaOutlineTableRows(table), 2);
});

const tableCellCount = (line) => {
  const parts = String(line).trim().split("|");
  if (parts[0].trim() === "") parts.shift();
  if (parts.length && parts[parts.length - 1].trim() === "") parts.pop();
  return parts.length;
};

test("extractOliviaOutlineTable returns only the GFM table from a chat message", () => {
  const input = [
    "Here's your current plan.",
    "",
    "| Scene # | Act | Title | POV | Scene Purpose | Summary |",
    "|---------|-----|-------|-----|----------|",
    "| Scene 1 | 1 | Flute | Lola | Core scene | At the rooftop. |",
    "| NEW Scene 2.5 | 1 | Camila | Sienna | subplot | Aftermath. |",
    "",
    "Ready when you are.",
  ].join("\n");
  const table = extractOliviaOutlineTable(input);
  assert.match(table, /^\| Chapter # \|/);
  assert.match(table, /NEW Chapter 2\.5/);
  assert.doesNotMatch(table, /Ready when you are/);
  assert.doesNotMatch(table, /current plan/);
  const lines = table.split("\n");
  assert.equal(tableCellCount(lines[0]), 6);
  assert.equal(tableCellCount(lines[1]), 6);
});

test("extractOliviaOutlineTable returns null when there is no outline table", () => {
  assert.equal(extractOliviaOutlineTable("Let's talk about the table of contents."), null);
});

test("normalizeOliviaMarkdown breaks inline table header glued to prose", () => {
  const input =
    "We can keep going, or I can deliver your next scene whenever you're ready.| Scene # | Act | Title | POV | Summary |";
  const result = normalizeOliviaMarkdown(input);
  assert.match(result, /ready\.\n\n\| Chapter # \|/);
});

test("normalizeOliviaMarkdown breaks inline six-column table header", () => {
  const input =
    "Here is the plan:| Scene # | Act | Title | POV | Scene Purpose | Summary |";
  const result = normalizeOliviaMarkdown(input);
  assert.match(result, /plan:\n\n\| Chapter # \|/);
});

test("normalizeOliviaMarkdown relabels Scene table copy to Chapter", () => {
  const input = [
    "Summary of your outline:",
    "",
    "| Scene # | Act | Title | POV | Summary |",
    "|---------|-----|-------|-----|----------|",
    "| Scene 1 | 1 | Title | POV | Summary |",
    "| NEW Scene 2.5 | 1 | Camila | Sienna | Aftermath. |",
  ].join("\n");
  const result = normalizeOliviaMarkdown(input);
  assert.match(result, /\| Chapter # \|/);
  assert.match(result, /\| Chapter 1 \|/);
  assert.match(result, /NEW Chapter 2\.5/);
  assert.doesNotMatch(result, /\| Scene # \|/);
});

test("normalizeOliviaMarkdown leaves figurative table prose unchanged", () => {
  const input = "Let's talk on the table about pacing and this layer of tension.";
  assert.equal(normalizeOliviaMarkdown(input), input);
});

test("normalizeOliviaMarkdown rewrites a 5-col delimiter under a Scene Purpose header", () => {
  const input = [
    "| Scene # | Act | Title | POV | Scene Purpose | Summary |",
    "|---------|-----|-------|-----|----------|",
    "| Scene 1 | 1 | Flute | Lola | Core scene | At the rooftop. |",
  ].join("\n");
  const result = normalizeOliviaMarkdown(input);
  const lines = result.split("\n");
  assert.equal(tableCellCount(lines[0]), 6);
  assert.equal(tableCellCount(lines[1]), 6);
  assert.equal(tableCellCount(lines[2]), 6);
});

test("normalizeOliviaMarkdown pads a 5-col body row when Scene Purpose is in the header", () => {
  const input = [
    "| Scene # | Act | Title | POV | Scene Purpose | Summary |",
    "|---------|-----|-------|-----|----------|",
    "| Scene 1 | 1 | Flute | Lola | At the rooftop. |",
  ].join("\n");
  const result = normalizeOliviaMarkdown(input);
  const lines = result.split("\n");
  assert.equal(tableCellCount(lines[1]), 6);
  assert.equal(tableCellCount(lines[2]), 6);
  assert.match(lines[2], /Flute/);
  assert.match(lines[2], /At the rooftop\./);
});
