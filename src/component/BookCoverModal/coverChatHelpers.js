export const COVER_METADATA_KIND_WELCOME = "cover_welcome";
export const COVER_METADATA_KIND_CONVERSATIONAL = "cover_conversational";
export const COVER_METADATA_KIND_GENERATE_OFFER = "cover_generate_offer";
export const COVER_METADATA_KIND_RENDER_NOTICE = "cover_render_notice";

export const COVER_RENDER_REFINE_CTA =
  "👉 **Want to make changes or explore a different direction?** Use **Refine cover** to adjust this version, or tell me in chat what kind of new concept you would like to see. 🎨";

const LEGACY_COVER_RENDER_FOOTER_RE =
  /Cover image ready\. Browse all versions in \*\*Covers\*\*, or keep refining direction in chat for your next version\.?\s*/g;

const INTERNAL_LEAK_PATTERNS = [
  /Prompt for render:[\s\S]*$/im,
  /Applying on (?:this|the) (?:first )?render:[\s\S]*$/im,
  /"imagePrompt"\s*:[\s\S]*$/m,
  /\bimagePrompt:\s*[\s\S]*$/im,
  /```json[\s\S]*?```/g,
];

export const stripCoverInternalLeaks = (text) => {
  let out = String(text || "").trim();
  for (const pattern of INTERNAL_LEAK_PATTERNS) {
    out = out.replace(pattern, "").trim();
  }
  return out;
};

export const shouldShowCoverGenerateButton = ({
  message,
  quotaEmpty = false,
  hasGenerateHandler = false,
} = {}) => {
  if (!message || message.role !== "assistant") return false;
  if (!hasGenerateHandler) return false;
  if (message.metadata?.kind !== COVER_METADATA_KIND_GENERATE_OFFER) return false;
  if (message.metadata?.generationConsumed) return false;
  if (quotaEmpty || message.metadata?.quotaAvailable === false) return false;
  return true;
};

export const formatCoverAssistantText = (message) =>
  stripCoverInternalLeaks(message?.text || "");

export const isCoverRenderNotice = (message) =>
  message?.kind === "render_notice" ||
  message?.metadata?.kind === COVER_METADATA_KIND_RENDER_NOTICE;

export const getCoverRenderNoticeHeadline = (message) => {
  const text = formatCoverAssistantText(message)
    .replace(LEGACY_COVER_RENDER_FOOTER_RE, "")
    .trim();
  return text || "Your cover is ready.";
};

export const getCoverRenderRefineCta = () => COVER_RENDER_REFINE_CTA;

/** Relative /userData paths must use the API host, not the React dev server. */
export const resolveCoverAssetUrl = (url) => {
  if (!url) return "";
  const raw = String(url).trim();
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = (process.env.REACT_APP_BASE_URL || "").replace(/\/+$/, "");
  if (!base) return raw.startsWith("/") ? raw : `/${raw}`;
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  return `${base}${path}`;
};
