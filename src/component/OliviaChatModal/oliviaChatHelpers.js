import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { normalizeOliviaMarkdown } from "./oliviaMarkdownNormalize";
import {
  formatSceneText,
  getSceneTitleText,
  getSceneTitleTextStrict,
} from "../../Pages/BookEditor/utils";

/** Detect a rich single-scene proposal (has the structured coaching format). */
export const isRichScene = (text) =>
  text &&
  (text.includes("📘 Book Coaching for Scene") ||
    text.includes("🏰 Setting") ||
    text.includes("⚡ Significant Actions") ||
    text.includes("📝 Scene to Write")) &&
  text.includes("Scene Title");

/** During streaming the full set of markers may not be present yet; detect early. */
export const isPartialRichScene = (text) =>
  text &&
  (text.includes("📘 Book Coaching for Scene") ||
    (text.includes("Scene Title") &&
      (text.includes("📝") || text.includes("🏰") || text.includes("⚡"))));

/** Outline-style title for Insert preview (aligned with Book Editor extraction). */
export const sceneTitleFromRichText = (text) => {
  const strict = getSceneTitleTextStrict(text);
  if (strict) return strict;
  const loose = getSceneTitleText(text);
  if (loose && loose !== "Scene") return loose;
  return "New Scene";
};

const REMARK_PLUGINS = [remarkGfm, remarkBreaks];

/**
 * Memoized markdown renderer keyed by the raw text. Bubbles that haven't changed
 * skip the remark/rehype tree work on every parent render.
 */
export const MarkdownView = memo(function MarkdownView({ text }) {
  return (
    <ReactMarkdown remarkPlugins={REMARK_PLUGINS}>
      {normalizeOliviaMarkdown(text)}
    </ReactMarkdown>
  );
});

export const RichSceneView = memo(function RichSceneView({ text }) {
  return formatSceneText(text, null, { preserveHeaderSceneTitle: true });
});
