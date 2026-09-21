import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLiveTranscript,
  buildNormalizedLiveTranscript,
  normalizeDictationTranscript,
  prepareDisplayTranscript,
  joinDictationToBase,
  formatDictationText,
  needsDictationCapitalization,
  capitalizeFirstLetter,
  capitalizeInternalSentenceStarts,
  getLiveDictationDelta,
  getDictationSeparator,
} from "./dictationTranscript.js";

const mockResults = (items) => ({
  length: items.length,
  [Symbol.iterator]: function* () {
    for (const item of items) {
      yield item;
    }
  },
  ...Object.fromEntries(
    items.map((item, i) => [
      i,
      {
        isFinal: item.isFinal,
        0: { transcript: item.transcript },
      },
    ])
  ),
});

test("buildLiveTranscript separates final and interim chunks", () => {
  const results = mockResults([
    { isFinal: true, transcript: "Hello " },
    { isFinal: false, transcript: "world" },
  ]);

  const { committed, interim, live } = buildLiveTranscript(results);
  assert.equal(committed, "Hello ");
  assert.equal(interim, "world");
  assert.equal(live, "Hello world");
});

test("buildLiveTranscript recomputes full transcript from all results", () => {
  const results = mockResults([
    { isFinal: true, transcript: "Hello " },
    { isFinal: true, transcript: "there" },
  ]);

  const { committed, interim, live } = buildLiveTranscript(results);
  assert.equal(committed, "Hello there");
  assert.equal(interim, "");
  assert.equal(live, "Hello there");
});

test("buildLiveTranscript handles empty/invalid input", () => {
  assert.deepEqual(buildLiveTranscript(null), {
    committed: "",
    interim: "",
    live: "",
  });
});

test("normalizeDictationTranscript maps end-of-chunk spoken punctuation", () => {
  assert.equal(normalizeDictationTranscript("hello comma"), "hello,");
  assert.equal(normalizeDictationTranscript("wait question mark"), "wait?");
  assert.equal(normalizeDictationTranscript("wow exclamation point"), "wow!");
  assert.equal(normalizeDictationTranscript("full stop"), ".");
});

test("normalizeDictationTranscript preserves prose with embedded command phrases", () => {
  assert.equal(
    normalizeDictationTranscript("She wrote a new paragraph"),
    "She wrote a new paragraph"
  );
  assert.equal(
    normalizeDictationTranscript("line one new line line two"),
    "line one new line line two"
  );
  assert.equal(
    normalizeDictationTranscript("start new paragraph end"),
    "start new paragraph end"
  );
  assert.equal(
    normalizeDictationTranscript("hello comma world"),
    "hello comma world"
  );
});

test("normalizeDictationTranscript maps whole-chunk layout commands", () => {
  assert.equal(normalizeDictationTranscript("new paragraph"), "\n\n");
  assert.equal(normalizeDictationTranscript("next paragraph"), "\n\n");
  assert.equal(normalizeDictationTranscript("new line"), "\n");
  assert.equal(normalizeDictationTranscript("next line"), "\n");
});

test("normalizeDictationTranscript does not map stop to period", () => {
  assert.equal(
    normalizeDictationTranscript("come to a stop"),
    "come to a stop"
  );
  assert.equal(normalizeDictationTranscript("stop here"), "stop here");
});

test("normalizeDictationTranscript can preserve trailing space for live updates", () => {
  assert.equal(
    normalizeDictationTranscript("hello comma ", { trim: false }),
    "hello, "
  );
});

test("buildNormalizedLiveTranscript normalizes final chunks only", () => {
  const results = mockResults([
    { isFinal: true, transcript: "hello comma " },
    { isFinal: false, transcript: "world" },
  ]);

  const { committed, interim, live } = buildNormalizedLiveTranscript(results, {
    lang: "en",
  });
  assert.equal(committed, "hello, ");
  assert.equal(interim, "world");
  assert.equal(live, "hello, world");
});

test("buildNormalizedLiveTranscript handles multi-chunk layout commands", () => {
  const results = mockResults([
    { isFinal: true, transcript: "line one " },
    { isFinal: true, transcript: "new line" },
    { isFinal: true, transcript: "line two" },
  ]);

  const { committed, live } = buildNormalizedLiveTranscript(results, {
    lang: "en",
  });
  assert.equal(committed, "line one \nline two");
  assert.equal(live, "line one \nline two");
});

test("buildNormalizedLiveTranscript bypasses when useSpokenCommands is false", () => {
  const results = mockResults([
    { isFinal: true, transcript: "hello comma" },
  ]);

  const { committed } = buildNormalizedLiveTranscript(results, {
    useSpokenCommands: false,
  });
  assert.equal(committed, "hello comma");
});

test("prepareDisplayTranscript skips spoken commands when engine auto-punctuates", () => {
  assert.equal(
    prepareDisplayTranscript("hello comma world", { useSpokenCommands: false }),
    "hello comma world"
  );
  assert.equal(
    prepareDisplayTranscript("hello comma", { useSpokenCommands: true }),
    "hello,"
  );
});

test("joinDictationToBase inserts space when needed", () => {
  assert.equal(joinDictationToBase("Hello", "world"), "Hello world");
  assert.equal(joinDictationToBase("Hello ", "world"), "Hello world");
  assert.equal(joinDictationToBase("", "world"), "World");
  assert.equal(joinDictationToBase("Hello", ""), "Hello");
});

test("getDictationSeparator avoids double spaces", () => {
  assert.equal(getDictationSeparator(""), "");
  assert.equal(getDictationSeparator("   "), "");
  assert.equal(getDictationSeparator("Hello"), " ");
  assert.equal(getDictationSeparator("Hello "), "");
  assert.equal(getDictationSeparator("Hello\n"), "");
});

test("getLiveDictationDelta skips speech already accepted after keyboard rebase", () => {
  assert.equal(getLiveDictationDelta("hello world", ""), "hello world");
  assert.equal(getLiveDictationDelta("hello world", "hello "), "world");
  assert.equal(getLiveDictationDelta("hello", "hello world"), "");
  assert.equal(getLiveDictationDelta("other words", "hello "), "other words");
});

test("getLiveDictationDelta returns only revised tail, never the full transcript", () => {
  // Interim "world" revised to "word" after being accepted — must NOT replay
  // the whole accepted transcript (which reintroduced deleted words).
  assert.equal(getLiveDictationDelta("hello word", "hello world"), "d");
  // New speech appended after an accepted prefix.
  assert.equal(
    getLiveDictationDelta("hello world foo", "hello world"),
    " foo"
  );
  // Revision plus new speech beyond the shared prefix.
  assert.equal(
    getLiveDictationDelta("hello there friend", "hello world"),
    "there friend"
  );
});

test("formatDictationText capitalizes sentence starts", () => {
  assert.equal(formatDictationText("hello. world"), "Hello. World");
  assert.equal(
    formatDictationText("hello. world", { priorContext: "She said " }),
    "hello. World"
  );
  assert.equal(
    formatDictationText("world", { priorContext: "Hello. " }),
    "World"
  );
  assert.equal(formatDictationText("new paragraph world"), "New paragraph world");
  assert.equal(
    formatDictationText("line one. \n\nworld"),
    "Line one. \n\nWorld"
  );
});

test("formatDictationText with autoPunctuation avoids false mid-sentence caps", () => {
  assert.equal(
    formatDictationText("hello. world", { autoPunctuation: true }),
    "Hello. world"
  );
  assert.equal(
    formatDictationText("Then more", {
      priorContext: "She said ",
      autoPunctuation: true,
    }),
    "then more"
  );
  assert.equal(
    formatDictationText("Fresh start", {
      priorContext: "Hello. ",
      autoPunctuation: true,
    }),
    "Fresh start"
  );
});

test("needsDictationCapitalization detects sentence boundaries", () => {
  assert.equal(needsDictationCapitalization(""), true);
  assert.equal(needsDictationCapitalization("Hello. "), true);
  assert.equal(needsDictationCapitalization("Hello?\n"), true);
  assert.equal(needsDictationCapitalization("She said "), false);
  assert.equal(needsDictationCapitalization("Hello"), false);
});

test("capitalizeInternalSentenceStarts handles punctuation and newlines", () => {
  assert.equal(capitalizeInternalSentenceStarts("hello. world"), "hello. World");
  assert.equal(capitalizeInternalSentenceStarts("one\n\ntwo"), "one\n\nTwo");
  assert.equal(capitalizeFirstLetter("hola"), "Hola");
});

test("normalizeDictationTranscript maps Spanish end-of-chunk punctuation", () => {
  assert.equal(
    normalizeDictationTranscript("hola coma", { lang: "es" }),
    "hola,"
  );
  assert.equal(
    normalizeDictationTranscript("espera signo de interrogación", {
      lang: "es-ES",
    }),
    "espera?"
  );
  assert.equal(
    normalizeDictationTranscript("hola coma en el mundo", { lang: "es" }),
    "hola coma en el mundo"
  );
});

test("normalizeDictationTranscript maps French spoken punctuation", () => {
  assert.equal(
    normalizeDictationTranscript("bonjour virgule", { lang: "fr-FR" }),
    "bonjour,"
  );
  assert.equal(
    normalizeDictationTranscript("un bon point dans le match", { lang: "fr" }),
    "un bon point dans le match"
  );
});

test("normalizeDictationTranscript maps German spoken punctuation", () => {
  assert.equal(
    normalizeDictationTranscript("hallo Komma", { lang: "de-DE" }),
    "hallo,"
  );
});

test("normalizeDictationTranscript maps Finnish spoken punctuation", () => {
  assert.equal(
    normalizeDictationTranscript("hei pilkku", { lang: "fi-FI" }),
    "hei,"
  );
});

test("normalizeDictationTranscript maps Italian spoken punctuation", () => {
  assert.equal(
    normalizeDictationTranscript("ciao virgola", { lang: "it-IT" }),
    "ciao,"
  );
  assert.equal(
    normalizeDictationTranscript("un buon punto di vista", { lang: "it" }),
    "un buon punto di vista"
  );
});

test("prepareDisplayTranscript passes lang to normalization", () => {
  assert.equal(
    prepareDisplayTranscript("hola coma", {
      lang: "es",
      useSpokenCommands: true,
    }),
    "hola,"
  );
});
