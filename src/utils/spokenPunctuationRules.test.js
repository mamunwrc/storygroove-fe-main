import test from "node:test";
import assert from "node:assert/strict";
import {
  resolvePunctuationLang,
  getSpokenPunctuationRules,
  getSpokenPunctuationGuide,
  isSupportedPunctuationLang,
  normalizeSpokenCommandsInChunk,
  SUPPORTED_PUNCTUATION_LANGS,
  PUNCTUATION_TIER_WHOLE_CHUNK,
  PUNCTUATION_TIER_END_OF_CHUNK,
} from "./spokenPunctuationRules.js";

test("SUPPORTED_PUNCTUATION_LANGS includes en es fr de fi it", () => {
  assert.deepEqual(SUPPORTED_PUNCTUATION_LANGS, [
    "en",
    "es",
    "fr",
    "de",
    "fi",
    "it",
  ]);
});

test("resolvePunctuationLang maps BCP-47 to primary subtag", () => {
  assert.equal(resolvePunctuationLang("es-MX"), "es");
  assert.equal(resolvePunctuationLang("fr-CA"), "fr");
  assert.equal(resolvePunctuationLang("de-DE"), "de");
  assert.equal(resolvePunctuationLang("fi-FI"), "fi");
  assert.equal(resolvePunctuationLang("it-IT"), "it");
  assert.equal(resolvePunctuationLang("en-US"), "en");
});

test("resolvePunctuationLang falls back to en for unknown languages", () => {
  assert.equal(resolvePunctuationLang("ja-JP"), "en");
  assert.equal(resolvePunctuationLang(""), "en");
  assert.equal(resolvePunctuationLang(undefined), "en");
});

test("isSupportedPunctuationLang", () => {
  assert.equal(isSupportedPunctuationLang("es-ES"), true);
  assert.equal(isSupportedPunctuationLang("ja-JP"), false);
});

test("getSpokenPunctuationRules returns tiered rules per language", () => {
  const esRules = getSpokenPunctuationRules("es");
  assert.ok(esRules.length > 0);
  assert.ok(esRules.some((r) => r.tier === PUNCTUATION_TIER_WHOLE_CHUNK));
  assert.ok(esRules.some((r) => r.tier === PUNCTUATION_TIER_END_OF_CHUNK));
});

test("normalizeSpokenCommandsInChunk wholeChunk layout only when chunk matches", () => {
  assert.equal(normalizeSpokenCommandsInChunk("new paragraph"), "\n\n");
  assert.equal(
    normalizeSpokenCommandsInChunk("She wrote a new paragraph"),
    "She wrote a new paragraph"
  );
});

test("normalizeSpokenCommandsInChunk endOfChunk suffix only", () => {
  assert.equal(normalizeSpokenCommandsInChunk("hello comma"), "hello,");
  assert.equal(
    normalizeSpokenCommandsInChunk("a comma in the text"),
    "a comma in the text"
  );
});

test("normalizeSpokenCommandsInChunk maps literary marks (en)", () => {
  assert.equal(
    normalizeSpokenCommandsInChunk("I was just em dash"),
    "I was just—"
  );
  assert.equal(normalizeSpokenCommandsInChunk("wait ellipsis"), "wait…");
  assert.equal(normalizeSpokenCommandsInChunk("then dot dot dot"), "then…");
  assert.equal(
    normalizeSpokenCommandsInChunk("clause one semicolon"),
    "clause one;"
  );
  assert.equal(normalizeSpokenCommandsInChunk("note colon"), "note:");
});

test("normalizeSpokenCommandsInChunk maps literary marks across languages", () => {
  assert.equal(
    normalizeSpokenCommandsInChunk("frase punto y coma", { lang: "es" }),
    "frase;"
  );
  assert.equal(
    normalizeSpokenCommandsInChunk("note dos puntos", { lang: "es-MX" }),
    "note:"
  );
  assert.equal(
    normalizeSpokenCommandsInChunk("attends points de suspension", {
      lang: "fr-FR",
    }),
    "attends…"
  );
  assert.equal(
    normalizeSpokenCommandsInChunk("satz Gedankenstrich", { lang: "de-DE" }),
    "satz—"
  );
  assert.equal(
    normalizeSpokenCommandsInChunk("lause puolipiste", { lang: "fi-FI" }),
    "lause;"
  );
  assert.equal(
    normalizeSpokenCommandsInChunk("frase due punti", { lang: "it-IT" }),
    "frase:"
  );
});

test("literary marks do not corrupt prose mid-sentence", () => {
  assert.equal(
    normalizeSpokenCommandsInChunk("a colon cleanse routine"),
    "a colon cleanse routine"
  );
  assert.equal(
    normalizeSpokenCommandsInChunk("the em dash is a punctuation mark"),
    "the em dash is a punctuation mark"
  );
});

test("getSpokenPunctuationGuide returns localized, structured content", () => {
  const en = getSpokenPunctuationGuide("en-US");
  assert.equal(en.langKey, "en");
  assert.equal(en.isSupported, true);
  assert.equal(en.marks.length, 8);
  assert.ok(en.marks.some((m) => m.symbol === "—"));
  assert.ok(en.marks.some((m) => m.symbol === "…"));
  assert.ok(en.marks.some((m) => m.symbol === ";"));
  assert.ok(en.marks.some((m) => m.symbol === ":"));
  assert.ok(en.layout.length > 0);
  assert.ok(en.examples.some((e) => e.kind === "do"));
  assert.ok(en.examples.some((e) => e.kind === "dont"));
  assert.equal(en.labels.title, "Voice typing tips");

  const fr = getSpokenPunctuationGuide("fr-CA");
  assert.equal(fr.langKey, "fr");
  assert.ok(fr.marks.some((m) => m.say === "virgule"));
});

test("getSpokenPunctuationGuide flags unsupported langs but still returns English content", () => {
  const ja = getSpokenPunctuationGuide("ja-JP");
  assert.equal(ja.langKey, "en");
  assert.equal(ja.isSupported, false);
  assert.ok(ja.unsupportedNote.length > 0);
});

test("guide phrases stay in sync with normalization rules", () => {
  for (const lang of SUPPORTED_PUNCTUATION_LANGS) {
    const guide = getSpokenPunctuationGuide(lang);

    for (const mark of guide.marks) {
      const out = normalizeSpokenCommandsInChunk(`ZZ ${mark.say}`, { lang });
      assert.equal(
        out,
        `ZZ${mark.symbol}`,
        `${lang} mark "${mark.say}" should insert "${mark.symbol}"`
      );
    }

    for (const item of guide.layout) {
      const out = normalizeSpokenCommandsInChunk(item.say, { lang });
      assert.ok(
        out === "\n\n" || out === "\n",
        `${lang} layout "${item.say}" should insert a line break, got ${JSON.stringify(
          out
        )}`
      );
    }
  }
});
