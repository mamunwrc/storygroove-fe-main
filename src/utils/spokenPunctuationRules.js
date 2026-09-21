/**
 * Locale-keyed spoken punctuation phrase maps for Web Speech API dictation.
 * Rules are tiered: wholeChunk (pause-delimited utterance) or endOfChunk (suffix).
 */

export const SUPPORTED_PUNCTUATION_LANGS = ["en", "es", "fr", "de", "fi", "it"];

export const PUNCTUATION_TIER_WHOLE_CHUNK = "wholeChunk";
export const PUNCTUATION_TIER_END_OF_CHUNK = "endOfChunk";

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const rule = (phrase, replacement, tier) => ({ phrase, replacement, tier });

const RULES_BY_LANG = {
  en: [
    rule("new paragraph", "\n\n", PUNCTUATION_TIER_WHOLE_CHUNK),
    rule("next paragraph", "\n\n", PUNCTUATION_TIER_WHOLE_CHUNK),
    rule("new line", "\n", PUNCTUATION_TIER_WHOLE_CHUNK),
    rule("next line", "\n", PUNCTUATION_TIER_WHOLE_CHUNK),
    rule("newline", "\n", PUNCTUATION_TIER_WHOLE_CHUNK),
    rule("exclamation point", "!", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("exclamation mark", "!", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("question mark", "?", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("full stop", ".", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("period", ".", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("comma", ",", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("em dash", "—", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("ellipsis", "…", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("dot dot dot", "…", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("semicolon", ";", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("colon", ":", PUNCTUATION_TIER_END_OF_CHUNK),
  ],
  es: [
    rule("nuevo párrafo", "\n\n", PUNCTUATION_TIER_WHOLE_CHUNK),
    rule("nuevo parrafo", "\n\n", PUNCTUATION_TIER_WHOLE_CHUNK),
    rule("siguiente párrafo", "\n\n", PUNCTUATION_TIER_WHOLE_CHUNK),
    rule("siguiente parrafo", "\n\n", PUNCTUATION_TIER_WHOLE_CHUNK),
    rule("nueva línea", "\n", PUNCTUATION_TIER_WHOLE_CHUNK),
    rule("nueva linea", "\n", PUNCTUATION_TIER_WHOLE_CHUNK),
    rule("siguiente línea", "\n", PUNCTUATION_TIER_WHOLE_CHUNK),
    rule("siguiente linea", "\n", PUNCTUATION_TIER_WHOLE_CHUNK),
    rule("signo de interrogación", "?", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("signo de interrogacion", "?", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("signo de exclamación", "!", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("signo de exclamacion", "!", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("interrogación", "?", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("interrogacion", "?", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("exclamación", "!", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("exclamacion", "!", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("punto", ".", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("coma", ",", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("guión largo", "—", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("guion largo", "—", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("puntos suspensivos", "…", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("punto y coma", ";", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("dos puntos", ":", PUNCTUATION_TIER_END_OF_CHUNK),
  ],
  fr: [
    rule("nouveau paragraphe", "\n\n", PUNCTUATION_TIER_WHOLE_CHUNK),
    rule("paragraphe suivant", "\n\n", PUNCTUATION_TIER_WHOLE_CHUNK),
    rule("à la ligne", "\n", PUNCTUATION_TIER_WHOLE_CHUNK),
    rule("a la ligne", "\n", PUNCTUATION_TIER_WHOLE_CHUNK),
    rule("ligne suivante", "\n", PUNCTUATION_TIER_WHOLE_CHUNK),
    rule("point d'interrogation", "?", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("point d interrogation", "?", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("point d'exclamation", "!", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("point d exclamation", "!", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("point final", ".", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("virgule", ",", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("tiret cadratin", "—", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("tiret long", "—", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("points de suspension", "…", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("point-virgule", ";", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("point virgule", ";", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("deux-points", ":", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("deux points", ":", PUNCTUATION_TIER_END_OF_CHUNK),
  ],
  de: [
    rule("neuer Absatz", "\n\n", PUNCTUATION_TIER_WHOLE_CHUNK),
    rule("nächster Absatz", "\n\n", PUNCTUATION_TIER_WHOLE_CHUNK),
    rule("neue Zeile", "\n", PUNCTUATION_TIER_WHOLE_CHUNK),
    rule("nächste Zeile", "\n", PUNCTUATION_TIER_WHOLE_CHUNK),
    rule("Fragezeichen", "?", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("Ausrufezeichen", "!", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("Punkt", ".", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("Komma", ",", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("Gedankenstrich", "—", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("Auslassungspunkte", "…", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("Semikolon", ";", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("Strichpunkt", ";", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("Doppelpunkt", ":", PUNCTUATION_TIER_END_OF_CHUNK),
  ],
  fi: [
    rule("uusi kappale", "\n\n", PUNCTUATION_TIER_WHOLE_CHUNK),
    rule("seuraava kappale", "\n\n", PUNCTUATION_TIER_WHOLE_CHUNK),
    rule("uusi rivi", "\n", PUNCTUATION_TIER_WHOLE_CHUNK),
    rule("seuraava rivi", "\n", PUNCTUATION_TIER_WHOLE_CHUNK),
    rule("kysymysmerkki", "?", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("huutomerkki", "!", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("piste", ".", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("pilkku", ",", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("ajatusviiva", "—", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("kolme pistettä", "…", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("puolipiste", ";", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("kaksoispiste", ":", PUNCTUATION_TIER_END_OF_CHUNK),
  ],
  it: [
    rule("nuovo paragrafo", "\n\n", PUNCTUATION_TIER_WHOLE_CHUNK),
    rule("paragrafo successivo", "\n\n", PUNCTUATION_TIER_WHOLE_CHUNK),
    rule("nuova riga", "\n", PUNCTUATION_TIER_WHOLE_CHUNK),
    rule("riga successiva", "\n", PUNCTUATION_TIER_WHOLE_CHUNK),
    rule("a capo", "\n", PUNCTUATION_TIER_WHOLE_CHUNK),
    rule("punto interrogativo", "?", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("punto esclamativo", "!", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("punto fermo", ".", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("virgola", ",", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("lineetta", "—", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("trattino lungo", "—", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("puntini di sospensione", "…", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("punto e virgola", ";", PUNCTUATION_TIER_END_OF_CHUNK),
    rule("due punti", ":", PUNCTUATION_TIER_END_OF_CHUNK),
  ],
};

// Symbols shown in the tips popover chips. "¶" = blank line, "↵" = line break.
const SYMBOL_PARAGRAPH = "¶";
const SYMBOL_NEWLINE = "↵";

/**
 * Curated, user-facing voice-command reference per language. Phrases match
 * RULES_BY_LANG; labels/intro/examples are localized for the tips popover.
 */
const GUIDE_BY_LANG = {
  en: {
    intro:
      "Words appear as you speak. Say a mark right after a phrase; pause before a layout command.",
    marks: [
      { say: "comma", symbol: ",", label: "Comma" },
      { say: "period", symbol: ".", label: "Period", alt: "full stop" },
      { say: "question mark", symbol: "?", label: "Question mark" },
      {
        say: "exclamation point",
        symbol: "!",
        label: "Exclamation",
        alt: "exclamation mark",
      },
      { say: "em dash", symbol: "—", label: "Em dash" },
      { say: "ellipsis", symbol: "…", label: "Ellipsis", alt: "dot dot dot" },
      { say: "semicolon", symbol: ";", label: "Semicolon" },
      { say: "colon", symbol: ":", label: "Colon" },
    ],
    layout: [
      { say: "new paragraph", symbol: SYMBOL_PARAGRAPH, label: "New paragraph" },
      { say: "next paragraph", symbol: SYMBOL_PARAGRAPH, label: "Next paragraph" },
      { say: "new line", symbol: SYMBOL_NEWLINE, label: "New line" },
      { say: "next line", symbol: SYMBOL_NEWLINE, label: "Next line" },
    ],
    examples: [
      { kind: "do", text: '"I was just em dash" becomes "I was just—"' },
      { kind: "do", text: '"I waited period" becomes "I waited."' },
      {
        kind: "dont",
        text: 'Speaking normally, "she wrote a new paragraph" stays as text — don\'t pause before it.',
      },
    ],
    labels: {
      title: "Voice typing tips",
      how: "How it works",
      punctuation: "Punctuation",
      layout: "Paragraphs & lines",
      examples: "Examples",
    },
    autoNote:
      "Your browser adds punctuation from pauses. When speaking fast, say “comma”, “period”, etc. — those always work too.",
    unsupportedNote:
      "Spoken commands for your selected language aren't available yet, so English commands are used.",
  },
  es: {
    intro:
      "Las palabras aparecen al hablar. Di un signo justo después de una frase; haz una pausa antes de un comando de formato.",
    marks: [
      { say: "coma", symbol: ",", label: "Coma" },
      { say: "punto", symbol: ".", label: "Punto" },
      {
        say: "signo de interrogación",
        symbol: "?",
        label: "Interrogación",
        alt: "interrogación",
      },
      {
        say: "signo de exclamación",
        symbol: "!",
        label: "Exclamación",
        alt: "exclamación",
      },
      { say: "guión largo", symbol: "—", label: "Raya" },
      {
        say: "puntos suspensivos",
        symbol: "…",
        label: "Puntos suspensivos",
      },
      { say: "punto y coma", symbol: ";", label: "Punto y coma" },
      { say: "dos puntos", symbol: ":", label: "Dos puntos" },
    ],
    layout: [
      { say: "nuevo párrafo", symbol: SYMBOL_PARAGRAPH, label: "Nuevo párrafo" },
      {
        say: "siguiente párrafo",
        symbol: SYMBOL_PARAGRAPH,
        label: "Siguiente párrafo",
      },
      { say: "nueva línea", symbol: SYMBOL_NEWLINE, label: "Nueva línea" },
      { say: "siguiente línea", symbol: SYMBOL_NEWLINE, label: "Siguiente línea" },
    ],
    examples: [
      { kind: "do", text: '"esperé punto" se convierte en "esperé."' },
      {
        kind: "dont",
        text: 'Al hablar normal, "escribió un nuevo párrafo" queda como texto — no hagas una pausa antes.',
      },
    ],
    labels: {
      title: "Consejos de dictado",
      how: "Cómo funciona",
      punctuation: "Puntuación",
      layout: "Párrafos y líneas",
      examples: "Ejemplos",
    },
    autoNote:
      "Tu navegador añade la puntuación automáticamente con tus pausas — los signos hablados son opcionales.",
    unsupportedNote:
      "Los comandos para el idioma seleccionado aún no están disponibles; se usan los de inglés.",
  },
  fr: {
    intro:
      "Les mots apparaissent quand vous parlez. Dites un signe juste après une phrase ; faites une pause avant une commande de mise en page.",
    marks: [
      { say: "virgule", symbol: ",", label: "Virgule" },
      { say: "point final", symbol: ".", label: "Point" },
      {
        say: "point d'interrogation",
        symbol: "?",
        label: "Point d'interrogation",
      },
      {
        say: "point d'exclamation",
        symbol: "!",
        label: "Point d'exclamation",
      },
      { say: "tiret cadratin", symbol: "—", label: "Tiret cadratin", alt: "tiret long" },
      {
        say: "points de suspension",
        symbol: "…",
        label: "Points de suspension",
      },
      { say: "point-virgule", symbol: ";", label: "Point-virgule" },
      { say: "deux-points", symbol: ":", label: "Deux-points" },
    ],
    layout: [
      {
        say: "nouveau paragraphe",
        symbol: SYMBOL_PARAGRAPH,
        label: "Nouveau paragraphe",
      },
      {
        say: "paragraphe suivant",
        symbol: SYMBOL_PARAGRAPH,
        label: "Paragraphe suivant",
      },
      { say: "à la ligne", symbol: SYMBOL_NEWLINE, label: "Nouvelle ligne" },
      { say: "ligne suivante", symbol: SYMBOL_NEWLINE, label: "Ligne suivante" },
    ],
    examples: [
      { kind: "do", text: '« j\'ai attendu point final » devient « j\'ai attendu. »' },
      {
        kind: "dont",
        text: 'En parlant normalement, « elle a écrit un nouveau paragraphe » reste du texte — ne faites pas de pause avant.',
      },
    ],
    labels: {
      title: "Conseils de dictée",
      how: "Comment ça marche",
      punctuation: "Ponctuation",
      layout: "Paragraphes et lignes",
      examples: "Exemples",
    },
    autoNote:
      "Votre navigateur ajoute la ponctuation automatiquement à partir de vos pauses — les signes dictés sont facultatifs.",
    unsupportedNote:
      "Les commandes pour la langue choisie ne sont pas encore disponibles ; celles en anglais sont utilisées.",
  },
  de: {
    intro:
      "Wörter erscheinen beim Sprechen. Sagen Sie ein Zeichen direkt nach einem Satz; pausieren Sie vor einem Layout-Befehl.",
    marks: [
      { say: "Komma", symbol: ",", label: "Komma" },
      { say: "Punkt", symbol: ".", label: "Punkt" },
      { say: "Fragezeichen", symbol: "?", label: "Fragezeichen" },
      { say: "Ausrufezeichen", symbol: "!", label: "Ausrufezeichen" },
      { say: "Gedankenstrich", symbol: "—", label: "Gedankenstrich" },
      { say: "Auslassungspunkte", symbol: "…", label: "Auslassungspunkte" },
      { say: "Semikolon", symbol: ";", label: "Semikolon", alt: "Strichpunkt" },
      { say: "Doppelpunkt", symbol: ":", label: "Doppelpunkt" },
    ],
    layout: [
      { say: "neuer Absatz", symbol: SYMBOL_PARAGRAPH, label: "Neuer Absatz" },
      {
        say: "nächster Absatz",
        symbol: SYMBOL_PARAGRAPH,
        label: "Nächster Absatz",
      },
      { say: "neue Zeile", symbol: SYMBOL_NEWLINE, label: "Neue Zeile" },
      { say: "nächste Zeile", symbol: SYMBOL_NEWLINE, label: "Nächste Zeile" },
    ],
    examples: [
      { kind: "do", text: '„ich wartete Punkt" wird zu „ich wartete."' },
      {
        kind: "dont",
        text: 'Beim normalen Sprechen bleibt „sie schrieb einen neuen Absatz" Text — davor nicht pausieren.',
      },
    ],
    labels: {
      title: "Tipps zum Diktieren",
      how: "So funktioniert es",
      punctuation: "Satzzeichen",
      layout: "Absätze & Zeilen",
      examples: "Beispiele",
    },
    autoNote:
      "Ihr Browser fügt Satzzeichen automatisch aus Ihren Pausen ein — gesprochene Zeichen sind optional.",
    unsupportedNote:
      "Befehle für die gewählte Sprache sind noch nicht verfügbar; es werden englische Befehle verwendet.",
  },
  fi: {
    intro:
      "Sanat ilmestyvät puhuessasi. Sano merkki heti lauseen jälkeen; tauota ennen asettelukomentoa.",
    marks: [
      { say: "pilkku", symbol: ",", label: "Pilkku" },
      { say: "piste", symbol: ".", label: "Piste" },
      { say: "kysymysmerkki", symbol: "?", label: "Kysymysmerkki" },
      { say: "huutomerkki", symbol: "!", label: "Huutomerkki" },
      { say: "ajatusviiva", symbol: "—", label: "Ajatusviiva" },
      { say: "kolme pistettä", symbol: "…", label: "Kolme pistettä" },
      { say: "puolipiste", symbol: ";", label: "Puolipiste" },
      { say: "kaksoispiste", symbol: ":", label: "Kaksoispiste" },
    ],
    layout: [
      { say: "uusi kappale", symbol: SYMBOL_PARAGRAPH, label: "Uusi kappale" },
      {
        say: "seuraava kappale",
        symbol: SYMBOL_PARAGRAPH,
        label: "Seuraava kappale",
      },
      { say: "uusi rivi", symbol: SYMBOL_NEWLINE, label: "Uusi rivi" },
      { say: "seuraava rivi", symbol: SYMBOL_NEWLINE, label: "Seuraava rivi" },
    ],
    examples: [
      { kind: "do", text: '"odotin piste" muuttuu muotoon "odotin."' },
      {
        kind: "dont",
        text: 'Normaalisti puhuttaessa "hän kirjoitti uusi kappale" jää tekstiksi — älä tauota ennen sitä.',
      },
    ],
    labels: {
      title: "Sanelun vinkit",
      how: "Näin se toimii",
      punctuation: "Välimerkit",
      layout: "Kappaleet ja rivit",
      examples: "Esimerkit",
    },
    autoNote:
      "Selaimesi lisää välimerkit automaattisesti taukojesi perusteella — puhutut merkit ovat valinnaisia.",
    unsupportedNote:
      "Valitsemasi kielen komennot eivät ole vielä saatavilla, joten käytetään englanninkielisiä.",
  },
  it: {
    intro:
      "Le parole appaiono mentre parli. Di' un segno subito dopo una frase; fai una pausa prima di un comando di formato.",
    marks: [
      { say: "virgola", symbol: ",", label: "Virgola" },
      { say: "punto fermo", symbol: ".", label: "Punto" },
      {
        say: "punto interrogativo",
        symbol: "?",
        label: "Punto interrogativo",
      },
      {
        say: "punto esclamativo",
        symbol: "!",
        label: "Punto esclamativo",
      },
      { say: "lineetta", symbol: "—", label: "Lineetta", alt: "trattino lungo" },
      {
        say: "puntini di sospensione",
        symbol: "…",
        label: "Puntini di sospensione",
      },
      { say: "punto e virgola", symbol: ";", label: "Punto e virgola" },
      { say: "due punti", symbol: ":", label: "Due punti" },
    ],
    layout: [
      { say: "nuovo paragrafo", symbol: SYMBOL_PARAGRAPH, label: "Nuovo paragrafo" },
      {
        say: "paragrafo successivo",
        symbol: SYMBOL_PARAGRAPH,
        label: "Paragrafo successivo",
      },
      { say: "nuova riga", symbol: SYMBOL_NEWLINE, label: "Nuova riga" },
      { say: "riga successiva", symbol: SYMBOL_NEWLINE, label: "Riga successiva" },
    ],
    examples: [
      { kind: "do", text: '"ho aspettato punto fermo" diventa "ho aspettato."' },
      {
        kind: "dont",
        text: 'Parlando normalmente, "ha scritto un nuovo paragrafo" resta testo — non fare una pausa prima.',
      },
    ],
    labels: {
      title: "Consigli per la dettatura",
      how: "Come funziona",
      punctuation: "Punteggiatura",
      layout: "Paragrafi e righe",
      examples: "Esempi",
    },
    autoNote:
      "Il browser aggiunge la punteggiatura automaticamente dalle tue pause — i segni dettati sono facoltativi.",
    unsupportedNote:
      "I comandi per la lingua selezionata non sono ancora disponibili; vengono usati quelli in inglese.",
  },
};

const applyChunkPostProcess = (text, { trim = true } = {}) => {
  let normalized = String(text || "");

  normalized = normalized.replace(/\s+([.,?!;:…—])/g, "$1");
  normalized = normalized.replace(/[ \t]+\n/g, "\n");
  normalized = normalized.replace(/\n[ \t]+/g, "\n");
  normalized = normalized.replace(/[^\S\n]+/g, " ");

  return trim ? normalized.trim() : normalized;
};

const preserveChunkSuffix = (original, transformed) => {
  const trailing = String(original || "").match(/\s+$/);
  if (!trailing || !transformed) return transformed;
  return `${transformed}${trailing[0]}`;
};

/**
 * @param {string} [bcp47]
 * @returns {"en"|"es"|"fr"|"de"|"fi"|"it"}
 */
export const resolvePunctuationLang = (bcp47) => {
  const primary = String(bcp47 || "")
    .trim()
    .split("-")[0]
    .toLowerCase();
  if (SUPPORTED_PUNCTUATION_LANGS.includes(primary)) {
    return primary;
  }
  return "en";
};

/**
 * @param {string} [lang] BCP-47 or primary subtag
 * @returns {Array<{ phrase: string, replacement: string, tier: string }>}
 */
export const getSpokenPunctuationRules = (lang) => {
  const key = resolvePunctuationLang(lang);
  return RULES_BY_LANG[key] || RULES_BY_LANG.en;
};

/**
 * Apply tiered spoken-command rules to a single STT result chunk.
 *
 * @param {string} chunkText
 * @param {{ lang?: string, trim?: boolean }} [options]
 * @returns {string}
 */
export const normalizeSpokenCommandsInChunk = (
  chunkText,
  { lang = "en", trim = true } = {}
) => {
  const chunk = String(chunkText || "");
  if (!chunk) return "";

  const rules = getSpokenPunctuationRules(resolvePunctuationLang(lang));
  const trimmed = chunk.trim();
  const trimmedLower = trimmed.toLowerCase();

  const wholeChunkRules = rules.filter(
    (r) => r.tier === PUNCTUATION_TIER_WHOLE_CHUNK
  );
  const endOfChunkRules = rules
    .filter((r) => r.tier === PUNCTUATION_TIER_END_OF_CHUNK)
    .sort((a, b) => b.phrase.length - a.phrase.length);

  for (const { phrase, replacement } of wholeChunkRules) {
    if (trimmedLower === phrase.toLowerCase()) {
      return applyChunkPostProcess(replacement, { trim: false });
    }
  }

  for (const { phrase, replacement } of endOfChunkRules) {
    const phraseLower = phrase.toLowerCase();
    if (trimmedLower === phraseLower) {
      return applyChunkPostProcess(replacement, { trim });
    }

    const suffixPattern = new RegExp(
      `^(.+?)\\s+${escapeRegex(phrase)}\\s*$`,
      "i"
    );
    const match = trimmed.match(suffixPattern);
    if (match) {
      const transformed = applyChunkPostProcess(match[1] + replacement, {
        trim: false,
      });
      return preserveChunkSuffix(chunk, transformed);
    }
  }

  return applyChunkPostProcess(chunk, { trim });
};

export const isSupportedPunctuationLang = (lang) => {
  const primary = String(lang || "")
    .trim()
    .split("-")[0]
    .toLowerCase();
  return SUPPORTED_PUNCTUATION_LANGS.includes(primary);
};

/**
 * Structured, localized voice-command reference for the tips popover.
 * Falls back to English content when the language has no curated rules.
 *
 * @param {string} [lang] BCP-47 or primary subtag
 * @returns {{
 *   langKey: string,
 *   isSupported: boolean,
 *   intro: string,
 *   marks: Array<{ say: string, symbol: string, label: string, alt?: string }>,
 *   layout: Array<{ say: string, symbol: string, label: string }>,
 *   examples: Array<{ kind: "do"|"dont", text: string }>,
 *   labels: Record<string, string>,
 *   autoNote: string,
 *   unsupportedNote: string,
 * }}
 */
export const getSpokenPunctuationGuide = (lang) => {
  const key = resolvePunctuationLang(lang);
  const guide = GUIDE_BY_LANG[key] || GUIDE_BY_LANG.en;
  return {
    langKey: key,
    isSupported: isSupportedPunctuationLang(lang),
    ...guide,
  };
};
