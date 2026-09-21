import test from "node:test";
import assert from "node:assert/strict";
import {
  DOSSIER_NAME_SCAN_CHARS,
  extractCharacterNameFromDossier,
} from "./characterDossierName.js";

test("extractCharacterNameFromDossier reads the 👤 markdown heading", () => {
  const text = [
    "**👤 Lola Reyes: 17-Point Dossier**",
    "2. Basic Information",
    "   • Name: Lola Reyes",
  ].join("\n");
  assert.equal(extractCharacterNameFromDossier(text), "Lola Reyes");
});

test("extractCharacterNameFromDossier reads innerText heading (no markdown)", () => {
  const text = [
    "👤 Camila Virelli: 17-Point Dossier",
    "2. 📋 Basic Information",
    "   • Name: Camila Virelli",
  ].join("\n");
  assert.equal(extractCharacterNameFromDossier(text), "Camila Virelli");
});

test("extractCharacterNameFromDossier prefers a renamed heading over the Name bullet", () => {
  const text = [
    "👤 Elena Cruz: 17-Point Dossier",
    "   • Name: Lola Reyes",
  ].join("\n");
  assert.equal(extractCharacterNameFromDossier(text), "Elena Cruz");
});

test("extractCharacterNameFromDossier falls back to the Name bullet", () => {
  const text = "2. Basic Information\n   • Name: Marcus Reyes\n   • Age: 42";
  assert.equal(extractCharacterNameFromDossier(text), "Marcus Reyes");
});

test("extractCharacterNameFromDossier ignores the CHARACTER DOSSIERS section title", () => {
  const text = "**👤 CHARACTER DOSSIERS — 17-Point Dossiers**\n• Name: Alice";
  assert.equal(extractCharacterNameFromDossier(text), "Alice");
});

test("extractCharacterNameFromDossier reads the heading without scanning a long body", () => {
  const text = "👤 Pat Hale: 17-Point Dossier\n" + "x".repeat(200_000);
  assert.equal(extractCharacterNameFromDossier(text), "Pat Hale");
});

test("extractCharacterNameFromDossier ignores Name: after the scan ceiling", () => {
  const text = "x".repeat(DOSSIER_NAME_SCAN_CHARS) + "\n• Name: Should Ignore";
  assert.equal(extractCharacterNameFromDossier(text), "");
});

test("extractCharacterNameFromDossier returns empty for blank input", () => {
  assert.equal(extractCharacterNameFromDossier(""), "");
  assert.equal(extractCharacterNameFromDossier(null), "");
});
