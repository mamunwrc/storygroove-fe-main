/** Max words allowed in Olivia Outlining & Drafting Studio chat input. */
export const OLIVIA_STUDIO_MAX_WORDS = 1000;

/** Phrases rendered in bold inside otherwise-regular paragraphs. */
export const OLIVIA_STUDIO_WORD_LIMIT_BOLD = {
  wordCount: "fewer than 1,000 words",
  coachingIcon: "speech-bubble coaching icon",
  scenesOutlined: "15 scenes outlined",
};

/** Structured copy for the in-thread refusal bubble. */
export const OLIVIA_STUDIO_WORD_LIMIT_SECTIONS = {
  headline:
    "It looks like you've shared manuscript pages or a drafted chapter.",
  refusalLine:
    "I do not read or coach drafted chapters from chat. I read them directly from your Drafting Space through the chapter-coaching feature.",
  remaster: {
    header:
      "If you are remastering an existing draft, partial draft, or existing outline",
    intro: [
      "Give me a high-level overview of the chapter in fewer than 1,000 words. It does not need to be lengthy. A short summary is usually all I need, and you can use the dictation feature 🎙️ if it is easier to talk it through.",
      "Tell me what happens, then ask how we can make it stronger. If you already know what is not landing, be as specific as you like.",
      "We will talk it through and rebuild the chapter structure together. Working from a summary keeps us from becoming overly attached to what is already on the page, giving us room to reconsider the chapter and explore stronger possibilities.",
    ],
    exampleLabel: "For example:",
    example:
      "My Chapter One for The Lanterns of Blackwell Manor opens with Eliza arriving at her late aunt's crumbling estate after receiving a strange letter warning her not to sell the house. She finds a locked room at the end of the west corridor and hears someone crying behind the door, but when she finally gets the key, the room is empty.\n\nThe chapter has atmosphere, but it needs more pressure. I want a stronger turn, a more dangerous ending, and a reason for the reader to believe that opening the door has consequences.",
    tutorialTip:
      'Revisit "Remaster a Messy Draft, Partial Draft, or Existing Outline with Olivia" (Step 5) in the Bitesize Tutorials on your dashboard.',
  },
  scratch: {
    header: "If you are starting a novel from scratch",
    intro: [
      "I coach each drafted chapter in the context of your larger outline. This allows me to assess how the chapter supports the developing story rather than evaluating it in isolation.",
      "Choose the process that best suits how you write:",
    ],
    outlineFirst: {
      header: "Option One: Outline First",
      body: "Complete your outline, then begin drafting in the Drafting Space. Click the speech-bubble coaching icon 💬 beside any scene title in your outline when you are ready for me to read and coach that chapter.",
    },
    draftAsYouOutline: {
      header: "Option Two: Draft as You Outline",
      intro: [
        "You do not have to outline your entire novel before you begin drafting. You can outline enough to establish direction, draft those chapters, and adjust the developing structure as the manuscript reveals new possibilities.",
        "I need at least 15 scenes outlined before chapter coaching unlocks. This gives me enough forward story context to provide useful feedback on the chapter's structure, pacing, continuity, and purpose.",
        "Once you have outlined 15 scenes, the speech-bubble coaching icon 💬 will appear beside each scene title in your outline.",
      ],
      stepsLabel: "You can then:",
      steps: [
        "🧭 Outline enough to move forward.",
        "✍️ Draft the corresponding chapter in your Drafting Space.",
        "💬 Click the speech-bubble icon beside the scene to ask me to read and coach the chapter.",
        "🔄 Revise your outline as the manuscript develops.",
        "📖 Continue outlining and drafting in stages.",
      ],
      closing:
        "Your outline can remain provisional while your draft develops. If a chapter is already open in the editor, ask me to look at it — I can read it from there.",
    },
    tutorialTip:
      'Revisit "Draft and Coach Your Chapters with Olivia" (Step 6) in the Bitesize Tutorials on your dashboard.',
  },
  ellisLine:
    "For developmental feedback on a completed second or third draft, work with Ellis.",
};

/** Flat string for chat state and MarkdownView fallback. */
export const OLIVIA_STUDIO_WORD_LIMIT_TEXT = [
  `🔴 ${OLIVIA_STUDIO_WORD_LIMIT_SECTIONS.headline}`,
  `💬 ${OLIVIA_STUDIO_WORD_LIMIT_SECTIONS.refusalLine}`,
  `🔨 ${OLIVIA_STUDIO_WORD_LIMIT_SECTIONS.remaster.header}`,
  ...OLIVIA_STUDIO_WORD_LIMIT_SECTIONS.remaster.intro,
  `💡 ${OLIVIA_STUDIO_WORD_LIMIT_SECTIONS.remaster.exampleLabel}`,
  `"${OLIVIA_STUDIO_WORD_LIMIT_SECTIONS.remaster.example}"`,
  `📌 ${OLIVIA_STUDIO_WORD_LIMIT_SECTIONS.remaster.tutorialTip}`,
  `✍️ ${OLIVIA_STUDIO_WORD_LIMIT_SECTIONS.scratch.header}`,
  ...OLIVIA_STUDIO_WORD_LIMIT_SECTIONS.scratch.intro,
  `🗺️ ${OLIVIA_STUDIO_WORD_LIMIT_SECTIONS.scratch.outlineFirst.header}`,
  OLIVIA_STUDIO_WORD_LIMIT_SECTIONS.scratch.outlineFirst.body,
  `🔄 ${OLIVIA_STUDIO_WORD_LIMIT_SECTIONS.scratch.draftAsYouOutline.header}`,
  ...OLIVIA_STUDIO_WORD_LIMIT_SECTIONS.scratch.draftAsYouOutline.intro,
  OLIVIA_STUDIO_WORD_LIMIT_SECTIONS.scratch.draftAsYouOutline.stepsLabel,
  ...OLIVIA_STUDIO_WORD_LIMIT_SECTIONS.scratch.draftAsYouOutline.steps,
  OLIVIA_STUDIO_WORD_LIMIT_SECTIONS.scratch.draftAsYouOutline.closing,
  `📌 ${OLIVIA_STUDIO_WORD_LIMIT_SECTIONS.scratch.tutorialTip}`,
  `📝 ${OLIVIA_STUDIO_WORD_LIMIT_SECTIONS.ellisLine}`,
].join("\n\n");

export const countPlainTextWords = (text = "") => {
  const trimmed = String(text || "").trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter((word) => word.length > 0).length;
};

export const isOliviaStudioOverWordLimit = (
  text = "",
  maxWords = OLIVIA_STUDIO_MAX_WORDS
) => countPlainTextWords(text) > maxWords;

export const isOliviaStudioWordLimitMessage = (text = "") =>
  String(text || "").trim() === OLIVIA_STUDIO_WORD_LIMIT_TEXT.trim();
