/**
 * Helpers for Web Speech API dictation: live transcript assembly and
 * spoken-punctuation normalization.
 */

import { normalizeSpokenCommandsInChunk } from "./spokenPunctuationRules.js";

/**
 * Build committed (final) + interim transcript from a SpeechRecognitionResultList.
 * Recomputes the full transcript on every event (robust against Chrome's
 * resultIndex quirks): committed = all final chunks, interim = all non-final.
 *
 * @param {SpeechRecognitionResultList|Array} results
 * @returns {{ committed: string, interim: string, live: string }}
 */
export const buildLiveTranscript = (results) => {
  let committed = "";
  let interim = "";

  if (!results || typeof results.length !== "number") {
    return { committed, interim, live: "" };
  }

  for (let i = 0; i < results.length; i++) {
    const chunk = results[i]?.[0]?.transcript || "";
    if (results[i].isFinal) {
      committed += chunk;
    } else {
      interim += chunk;
    }
  }

  return {
    committed,
    interim,
    live: committed + interim,
  };
};

/**
 * Build live transcript with per-final-chunk spoken-command normalization.
 * Interim text stays raw until the chunk finalizes.
 *
 * @param {SpeechRecognitionResultList|Array} results
 * @param {{ lang?: string, useSpokenCommands?: boolean }} [options]
 * @returns {{ committed: string, interim: string, live: string }}
 */
export const buildNormalizedLiveTranscript = (
  results,
  { lang = "en", useSpokenCommands = true } = {}
) => {
  if (!useSpokenCommands) {
    return buildLiveTranscript(results);
  }

  let committed = "";
  let interim = "";

  if (!results || typeof results.length !== "number") {
    return { committed, interim, live: "" };
  }

  for (let i = 0; i < results.length; i++) {
    const chunk = results[i]?.[0]?.transcript || "";
    if (results[i].isFinal) {
      committed += normalizeSpokenCommandsInChunk(chunk, {
        lang,
        trim: false,
      });
    } else {
      interim += chunk;
    }
  }

  return {
    committed,
    interim,
    live: committed + interim,
  };
};

/**
 * Normalize spoken punctuation in a single chunk (tests and deliver fallback).
 *
 * @param {string} text
 * @param {{ lang?: string, trim?: boolean }} [options]
 * @returns {string}
 */
export const normalizeDictationTranscript = (text, options = {}) =>
  normalizeSpokenCommandsInChunk(text, options);

const getSpeechRecognitionCtor = () => {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

/**
 * Whether the browser exposes SpeechRecognition.unspokenPunctuation (Chrome ~150+).
 * Checks prototype and a fresh instance (Blink may expose the attribute on instances only).
 * @returns {boolean}
 */
export const supportsUnspokenPunctuation = () => {
  const Recognition = getSpeechRecognitionCtor();
  if (!Recognition) return false;
  if ("unspokenPunctuation" in Recognition.prototype) return true;
  try {
    const recognition = new Recognition();
    return "unspokenPunctuation" in recognition;
  } catch {
    return false;
  }
};

/**
 * Format transcript for display/delivery. When the engine auto-punctuates
 * (unspokenPunctuation), skip spoken-command rules.
 *
 * @param {string} text
 * @param {{ lang?: string, useSpokenCommands?: boolean, trim?: boolean }} [options]
 * @returns {string}
 */
export const prepareDisplayTranscript = (
  text,
  { lang = "en", useSpokenCommands = true, trim = true } = {}
) => {
  if (!useSpokenCommands) {
    const raw = String(text || "");
    return trim ? raw.trim() : raw;
  }
  return normalizeSpokenCommandsInChunk(text, { lang, trim });
};

const LETTER_RE = "\\p{L}";

/**
 * Whether dictated text should start with a capital letter given text before the cursor.
 *
 * @param {string} priorContext
 * @returns {boolean}
 */
export const needsDictationCapitalization = (priorContext) => {
  const prior = String(priorContext || "");
  if (!prior.trim()) return true;
  return /[.!?]\s*$|\n\s*$/.test(prior);
};

/**
 * Uppercase the first letter in a string (after optional leading whitespace).
 *
 * @param {string} text
 * @returns {string}
 */
export const capitalizeFirstLetter = (text) =>
  String(text || "").replace(
    new RegExp(`^(\\s*)(${LETTER_RE})`, "u"),
    (_, whitespace, letter) => whitespace + letter.toLocaleUpperCase()
  );

/**
 * Lowercase the first letter when inserting mid-sentence (Chrome auto-punct
 * often capitalizes each phrase after a pause).
 *
 * @param {string} text
 * @returns {string}
 */
export const decapitalizeFirstLetter = (text) =>
  String(text || "").replace(
    new RegExp(`^(\\s*)(${LETTER_RE})`, "u"),
    (_, whitespace, letter) => whitespace + letter.toLocaleLowerCase()
  );

/**
 * Uppercase the first letter after sentence-ending punctuation or line breaks.
 *
 * @param {string} text
 * @returns {string}
 */
export const capitalizeInternalSentenceStarts = (text) =>
  String(text || "").replace(
    new RegExp(`([.!?]\\s+|\\n\\n?)(${LETTER_RE})`, "gu"),
    (_, boundary, letter) => boundary + letter.toLocaleUpperCase()
  );

/**
 * Apply sentence capitalization for dictation output.
 *
 * @param {string} text
 * @param {{ priorContext?: string, autoPunctuation?: boolean }} [options]
 * @returns {string}
 */
export const formatDictationText = (text, { priorContext = "", autoPunctuation = false } = {}) => {
  const raw = String(text || "");
  if (!raw) return raw;

  // Chrome pause-based punctuation adds periods mid-thought; capitalizing after
  // every "." creates false sentence breaks. Only capitalize the chunk start
  // from document context; spoken-command mode still gets internal caps.
  let result = autoPunctuation
    ? raw
    : capitalizeInternalSentenceStarts(raw);

  if (needsDictationCapitalization(priorContext)) {
    result = capitalizeFirstLetter(result);
  } else if (autoPunctuation) {
    result = decapitalizeFirstLetter(result);
  }
  return result;
};

/**
 * Space to insert before new dictation, if any.
 * Avoids doubling when prior text already ends with whitespace.
 *
 * @param {string} priorContext
 * @returns {string}
 */
export const getDictationSeparator = (priorContext) => {
  const before = String(priorContext || "");
  if (!before.trim().length) return "";
  if (/\s$/.test(before)) return "";
  return " ";
};

/**
 * Join a base draft with new dictation text, inserting a space when needed.
 *
 * @param {string} base
 * @param {string} dictated
 * @returns {string}
 */
export const joinDictationToBase = (base, dictated, { autoPunctuation = false } = {}) => {
  const baseText = String(base || "");
  const dictatedText = formatDictationText(String(dictated || "").trim(), {
    priorContext: baseText,
    autoPunctuation,
  });
  if (!dictatedText) return baseText;
  if (!baseText.trim()) return dictatedText;
  return `${baseText}${getDictationSeparator(baseText)}${dictatedText}`;
};
/**
 * Length of the shared leading prefix between two strings.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
const commonPrefixLength = (a, b) => {
  const max = Math.min(a.length, b.length);
  let i = 0;
  while (i < max && a[i] === b[i]) i += 1;
  return i;
};

/**
 * Speech still left to apply after a keyboard rebase during live dictation.
 *
 * `acceptedPrefix` is the transcript already committed to the document at the
 * time of the last edit/caret move. The speech engine's live transcript keeps a
 * volatile interim tail that can be revised on later results, so we must NOT
 * dump the whole transcript when it stops matching the accepted prefix (that is
 * what caused deleted words to reappear). Instead, return only the portion after
 * the longest common prefix — at worst a few revised characters, never the whole
 * (already-inserted) transcript.
 *
 * @param {string} live
 * @param {string} [acceptedPrefix]
 * @returns {string}
 */
export const getLiveDictationDelta = (live, acceptedPrefix = "") => {
  const liveText = String(live || "");
  const accepted = String(acceptedPrefix || "");
  if (!accepted) return liveText;
  if (liveText.startsWith(accepted)) return liveText.slice(accepted.length);
  // Interim shrank back inside the accepted prefix — wait for new speech.
  if (accepted.startsWith(liveText)) return "";
  // Divergence (interim revision of already-accepted words): only apply the
  // suffix beyond the shared prefix so previously accepted text is not replayed.
  return liveText.slice(commonPrefixLength(liveText, accepted));
};
