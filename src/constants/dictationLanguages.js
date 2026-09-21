/**
 * Chrome Web Speech API supported locales (kWebSpeechSupportedLocales).
 * Source: chromium/chrome/browser/ash/accessibility/dictation.cc
 * Labels are English-only for the UI dropdown.
 */
export const DICTATION_LANG_AUTO = "auto";

export const DICTATION_LANGUAGE_GROUPS = [
  {
    groupLabel: "English",
    languages: [
      { code: "en-US", label: "English (US)" },
      { code: "en-GB", label: "English (UK)" },
      { code: "en-AU", label: "English (Australia)" },
      { code: "en-CA", label: "English (Canada)" },
      { code: "en-IN", label: "English (India)" },
      { code: "en-IE", label: "English (Ireland)" },
      { code: "en-NZ", label: "English (New Zealand)" },
      { code: "en-ZA", label: "English (South Africa)" },
      { code: "en-PH", label: "English (Philippines)" },
      { code: "en-SG", label: "English (Singapore)" },
      { code: "en-HK", label: "English (Hong Kong)" },
      { code: "en-PK", label: "English (Pakistan)" },
      { code: "en-GH", label: "English (Ghana)" },
      { code: "en-KE", label: "English (Kenya)" },
      { code: "en-NG", label: "English (Nigeria)" },
      { code: "en-TZ", label: "English (Tanzania)" },
    ],
  },
  {
    groupLabel: "Arabic",
    languages: [
      { code: "ar-001", label: "Arabic (Generic)" },
      { code: "ar-SA", label: "Arabic (Saudi Arabia)" },
      { code: "ar-EG", label: "Arabic (Egypt)" },
      { code: "ar-AE", label: "Arabic (UAE)" },
      { code: "ar-DZ", label: "Arabic (Algeria)" },
      { code: "ar-BH", label: "Arabic (Bahrain)" },
      { code: "ar-IQ", label: "Arabic (Iraq)" },
      { code: "ar-JO", label: "Arabic (Jordan)" },
      { code: "ar-KW", label: "Arabic (Kuwait)" },
      { code: "ar-LB", label: "Arabic (Lebanon)" },
      { code: "ar-MA", label: "Arabic (Morocco)" },
      { code: "ar-OM", label: "Arabic (Oman)" },
      { code: "ar-QA", label: "Arabic (Qatar)" },
      { code: "ar-TN", label: "Arabic (Tunisia)" },
      { code: "ar-YE", label: "Arabic (Yemen)" },
      { code: "ar-IL", label: "Arabic (Israel)" },
      { code: "ar-PS", label: "Arabic (Palestine)" },
    ],
  },
  {
    groupLabel: "Spanish",
    languages: [
      { code: "es-ES", label: "Spanish (Spain)" },
      { code: "es-MX", label: "Spanish (Mexico)" },
      { code: "es-US", label: "Spanish (US)" },
      { code: "es-AR", label: "Spanish (Argentina)" },
      { code: "es-CO", label: "Spanish (Colombia)" },
      { code: "es-CL", label: "Spanish (Chile)" },
      { code: "es-PE", label: "Spanish (Peru)" },
      { code: "es-VE", label: "Spanish (Venezuela)" },
      { code: "es-EC", label: "Spanish (Ecuador)" },
      { code: "es-GT", label: "Spanish (Guatemala)" },
      { code: "es-BO", label: "Spanish (Bolivia)" },
      { code: "es-DO", label: "Spanish (Dominican Republic)" },
      { code: "es-HN", label: "Spanish (Honduras)" },
      { code: "es-NI", label: "Spanish (Nicaragua)" },
      { code: "es-PA", label: "Spanish (Panama)" },
      { code: "es-PY", label: "Spanish (Paraguay)" },
      { code: "es-PR", label: "Spanish (Puerto Rico)" },
      { code: "es-SV", label: "Spanish (El Salvador)" },
      { code: "es-UY", label: "Spanish (Uruguay)" },
      { code: "es-CR", label: "Spanish (Costa Rica)" },
    ],
  },
  {
    groupLabel: "Nordic and Baltic",
    languages: [
      { code: "fi-FI", label: "Finnish" },
      { code: "sv-SE", label: "Swedish" },
      { code: "no-NO", label: "Norwegian" },
      { code: "da-DK", label: "Danish" },
      { code: "is-IS", label: "Icelandic" },
      { code: "et-EE", label: "Estonian" },
      { code: "lt-LT", label: "Lithuanian" },
      { code: "lv-LV", label: "Latvian" },
    ],
  },
  {
    groupLabel: "Western Europe",
    languages: [
      { code: "de-DE", label: "German (Germany)" },
      { code: "de-AT", label: "German (Austria)" },
      { code: "de-CH", label: "German (Switzerland)" },
      { code: "fr-FR", label: "French (France)" },
      { code: "fr-CA", label: "French (Canada)" },
      { code: "fr-CH", label: "French (Switzerland)" },
      { code: "fr-BE", label: "French (Belgium)" },
      { code: "it-IT", label: "Italian (Italy)" },
      { code: "it-CH", label: "Italian (Switzerland)" },
      { code: "nl-NL", label: "Dutch (Netherlands)" },
      { code: "nl-BE", label: "Dutch (Belgium)" },
      { code: "pt-PT", label: "Portuguese (Portugal)" },
      { code: "pt-BR", label: "Portuguese (Brazil)" },
      { code: "ca-ES", label: "Catalan" },
      { code: "gl-ES", label: "Galician" },
      { code: "eu-ES", label: "Basque" },
    ],
  },
  {
    groupLabel: "Central and Eastern Europe",
    languages: [
      { code: "pl-PL", label: "Polish" },
      { code: "cs-CZ", label: "Czech" },
      { code: "sk-SK", label: "Slovak" },
      { code: "sl-SI", label: "Slovenian" },
      { code: "hr-HR", label: "Croatian" },
      { code: "ro-RO", label: "Romanian" },
      { code: "hu-HU", label: "Hungarian" },
      { code: "bg-BG", label: "Bulgarian" },
      { code: "ru-RU", label: "Russian" },
      { code: "uk-UA", label: "Ukrainian" },
      { code: "sr-RS", label: "Serbian" },
      { code: "el-GR", label: "Greek" },
      { code: "mk-MK", label: "Macedonian" },
      { code: "sq-AL", label: "Albanian" },
      { code: "bs-BA", label: "Bosnian" },
    ],
  },
  {
    groupLabel: "South Asia",
    languages: [
      { code: "hi-IN", label: "Hindi" },
      { code: "bn-IN", label: "Bengali (India)" },
      { code: "bn-BD", label: "Bengali (Bangladesh)" },
      { code: "ta-IN", label: "Tamil (India)" },
      { code: "ta-LK", label: "Tamil (Sri Lanka)" },
      { code: "ta-MY", label: "Tamil (Malaysia)" },
      { code: "ta-SG", label: "Tamil (Singapore)" },
      { code: "te-IN", label: "Telugu" },
      { code: "mr-IN", label: "Marathi" },
      { code: "gu-IN", label: "Gujarati" },
      { code: "kn-IN", label: "Kannada" },
      { code: "ml-IN", label: "Malayalam" },
      { code: "pa-Guru-IN", label: "Punjabi" },
      { code: "ur-PK", label: "Urdu (Pakistan)" },
      { code: "ur-IN", label: "Urdu (India)" },
      { code: "ne-NP", label: "Nepali" },
      { code: "si-LK", label: "Sinhala" },
    ],
  },
  {
    groupLabel: "East and Southeast Asia",
    languages: [
      { code: "ja-JP", label: "Japanese" },
      { code: "ko-KR", label: "Korean" },
      { code: "zh-Hans", label: "Chinese (Simplified)" },
      { code: "zh-TW", label: "Chinese (Traditional)" },
      { code: "yue-Hant-HK", label: "Cantonese (Hong Kong)" },
      { code: "vi-VN", label: "Vietnamese" },
      { code: "th-TH", label: "Thai" },
      { code: "id-ID", label: "Indonesian" },
      { code: "fil-PH", label: "Filipino" },
      { code: "ms-MY", label: "Malay" },
      { code: "jv-ID", label: "Javanese" },
      { code: "su-ID", label: "Sundanese" },
      { code: "km-KH", label: "Khmer" },
      { code: "lo-LA", label: "Lao" },
      { code: "my-MM", label: "Burmese" },
    ],
  },
  {
    groupLabel: "Middle East and Central Asia",
    languages: [
      { code: "iw-IL", label: "Hebrew" },
      { code: "fa-IR", label: "Persian" },
      { code: "tr-TR", label: "Turkish" },
      { code: "az-AZ", label: "Azerbaijani" },
      { code: "hy-AM", label: "Armenian" },
      { code: "ka-GE", label: "Georgian" },
      { code: "kk-KZ", label: "Kazakh" },
      { code: "uz-UZ", label: "Uzbek" },
    ],
  },
  {
    groupLabel: "Africa",
    languages: [
      { code: "af-ZA", label: "Afrikaans" },
      { code: "am-ET", label: "Amharic" },
      { code: "sw-KE", label: "Swahili (Kenya)" },
      { code: "sw-TZ", label: "Swahili (Tanzania)" },
      { code: "zu-ZA", label: "Zulu" },
    ],
  },
  {
    groupLabel: "Other",
    languages: [
      { code: "mn-MN", label: "Mongolian" },
    ],
  },
];

/** Map deprecated codes from earlier app versions to current Chrome locales. */
export const DICTATION_LANG_LEGACY_ALIASES = {
  "nb-NO": "no-NO",
  "he-IL": "iw-IL",
  "zh-CN": "zh-Hans",
};

const LANGUAGE_LABEL_BY_CODE = DICTATION_LANGUAGE_GROUPS.reduce((acc, group) => {
  group.languages.forEach(({ code, label }) => {
    acc[code] = label;
  });
  return acc;
}, {});

export const isKnownDictationLanguage = (code) =>
  Boolean(code && LANGUAGE_LABEL_BY_CODE[code]);

export const normalizeDictationLanguageCode = (code) => {
  if (!code || code === DICTATION_LANG_AUTO) return code;
  const aliased = DICTATION_LANG_LEGACY_ALIASES[code] || code;
  return isKnownDictationLanguage(aliased) ? aliased : DICTATION_LANG_AUTO;
};

export const getDictationLanguageLabel = (code) =>
  LANGUAGE_LABEL_BY_CODE[code] || code;
