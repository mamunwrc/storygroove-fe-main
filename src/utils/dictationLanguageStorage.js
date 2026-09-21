import {
  DICTATION_LANG_AUTO,
  isKnownDictationLanguage,
  normalizeDictationLanguageCode,
} from "../constants/dictationLanguages";

const STORAGE_KEY = "storygroove-dictation-lang";

export const readDictationLanguagePreference = () => {
  if (typeof window === "undefined") return DICTATION_LANG_AUTO;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored || stored === DICTATION_LANG_AUTO) return DICTATION_LANG_AUTO;
    return normalizeDictationLanguageCode(stored);
  } catch {
    return DICTATION_LANG_AUTO;
  }
};

export const writeDictationLanguagePreference = (value) => {
  if (typeof window === "undefined") return;
  try {
    if (!value || value === DICTATION_LANG_AUTO) {
      window.localStorage.setItem(STORAGE_KEY, DICTATION_LANG_AUTO);
      return;
    }
    const normalized = normalizeDictationLanguageCode(value);
    if (normalized !== DICTATION_LANG_AUTO && isKnownDictationLanguage(normalized)) {
      window.localStorage.setItem(STORAGE_KEY, normalized);
    }
  } catch {
    // localStorage may be unavailable (private mode, quota); fail silently.
  }
};
