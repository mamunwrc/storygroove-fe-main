import React, { useState } from "react";
import { toast } from "react-toastify";
import { LuCopy, LuCheck } from "react-icons/lu";
import { ELLIS_CHAPTER_REVIEW_FOOTER_PARAGRAPHS } from "./ellisChatHelpers";
import "./SceneArchitectReview.scss";

const CopyButton = ({ getText, label = "Copy" }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (_) {
      toast.error("Could not copy to clipboard.");
    }
  };
  return (
    <button
      type="button"
      className="sg-btn-outline d-flex align-items-center gap-1"
      style={{ height: 28, fontSize: 11.5, padding: "0 9px" }}
      onClick={handleCopy}
    >
      {copied ? <LuCheck size={12} /> : <LuCopy size={12} />}
      {copied ? "Copied" : label}
    </button>
  );
};

/** Format a single creative suggestion to plain text (for copy). */
const suggestionToText = (s) => {
  const lines = [];
  const head = [s.suggestionName, s.weakness ? `(${s.weakness})` : null]
    .filter(Boolean)
    .join(" ");
  if (head) lines.push(head);
  if (s.description) lines.push(s.description);
  (s.examples || []).forEach((ex, i) => {
    lines.push(`Example ${i + 1}: ${ex}`);
  });
  return lines.join("\n");
};

/** Format a whole scene card to plain text (for copy). */
const sceneToText = (chapterLabel, scene) => {
  const lines = [];
  lines.push(
    `${chapterLabel}, Scene ${scene.label}${
      scene.title ? ` — ${scene.title}` : ""
    }`
  );
  if (scene.firstLine) lines.push(`First line: ${scene.firstLine}`);
  if (scene.functionInStory)
    lines.push(`Function in Story: ${scene.functionInStory}`);
  if (scene.genreBeatCheck)
    lines.push(`Genre Beat Check: ${scene.genreBeatCheck}`);
  if (scene.sceneAnalysis) lines.push(`\nScene Analysis:\n${scene.sceneAnalysis}`);
  if (scene.creativeSuggestions?.length) {
    lines.push(`\nCreative Suggestions:`);
    scene.creativeSuggestions.forEach((s) => {
      lines.push(suggestionToText(s));
      lines.push("");
    });
  }
  return lines.join("\n");
};

/** Format the entire chapter review to plain text. */
const chapterToText = (chapterLabel, review) => {
  const parts = (review.scenes || []).map((s) => sceneToText(chapterLabel, s));
  if (review.cumulativeNote) {
    parts.push(`\nCumulative Editorial Note:\n${review.cumulativeNote}`);
  }
  return parts.join("\n\n");
};

const SectionLabel = ({ children }) => (
  <div className="ellis-scene-architect-review__section-label">{children}</div>
);

const SceneCard = ({
  chapterLabel,
  scene,
  showCopy = true,
  copyLabel = "Copy",
}) => (
  <div className="ellis-scene-architect-review__scene-card">
    <div className="d-flex align-items-start justify-content-between" style={{ gap: 8 }}>
      <h6 className="ellis-scene-architect-review__scene-title">
        {chapterLabel}, Scene {scene.label}
        {scene.title ? ` — ${scene.title}` : ""}
      </h6>
      {showCopy && (
        <CopyButton
          getText={() => sceneToText(chapterLabel, scene)}
          label={copyLabel}
        />
      )}
    </div>

    {scene.firstLine && (
      <div className="ellis-scene-architect-review__block">
        <SectionLabel>First line</SectionLabel>
        <div className="ellis-scene-architect-review__first-line">
          “{scene.firstLine}”
        </div>
      </div>
    )}

    {scene.functionInStory && (
      <div className="ellis-scene-architect-review__block">
        <SectionLabel>Function in Story</SectionLabel>
        <div className="ellis-scene-architect-review__body">
          {scene.functionInStory}
        </div>
      </div>
    )}

    {scene.genreBeatCheck && (
      <div className="ellis-scene-architect-review__block">
        <SectionLabel>Genre Beat Check</SectionLabel>
        <div className="ellis-scene-architect-review__body">
          {scene.genreBeatCheck}
        </div>
      </div>
    )}

    {scene.sceneAnalysis && (
      <div className="ellis-scene-architect-review__block">
        <SectionLabel>Scene Analysis</SectionLabel>
        <div
          className="ellis-scene-architect-review__body"
          style={{ whiteSpace: "pre-wrap" }}
        >
          {scene.sceneAnalysis}
        </div>
      </div>
    )}

    {scene.creativeSuggestions?.length > 0 && (
      <div className="ellis-scene-architect-review__block">
        <SectionLabel>Creative Suggestions</SectionLabel>
        <div className="d-flex flex-column" style={{ gap: 10 }}>
          {scene.creativeSuggestions.map((s, idx) => (
            <div key={idx} className="ellis-scene-architect-review__suggestion">
              <div className="ellis-scene-architect-review__suggestion-title">
                {s.suggestionName}
                <span className="ellis-scene-architect-review__suggestion-category">
                  {s.category === "character"
                    ? "Character Weakness"
                    : s.category === "structure"
                      ? "Structural Weakness"
                      : s.category}
                </span>
              </div>
              {s.weakness && (
                <div className="ellis-scene-architect-review__weakness">
                  {s.category === "character"
                    ? "Character Weakness:"
                    : "Structural Weakness:"}{" "}
                  {s.weakness}
                </div>
              )}
              {s.description && (
                <div className="ellis-scene-architect-review__body" style={{ marginTop: 4 }}>
                  {s.description}
                </div>
              )}
              {(s.examples || []).map((ex, i) => (
                <div key={i} className="ellis-scene-architect-review__example">
                  <strong style={{ fontStyle: "normal" }}>
                    Example {i + 1}:
                  </strong>{" "}
                  {ex}
                </div>
              ))}
              <div className="mt-2">
                <CopyButton
                  getText={() => suggestionToText(s)}
                  label="Copy"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

const EllisChapterReviewFooter = () => (
  <div className="ellis-chapter-review-footer">
    {ELLIS_CHAPTER_REVIEW_FOOTER_PARAGRAPHS.map((para) => {
      if (para.bold) {
        return (
          <p key={para.emoji}>
            <span aria-hidden="true">{para.emoji} </span>
            {para.beforeBold}
            <strong>{para.bold}</strong>
            {para.afterBold}
          </p>
        );
      }
      return (
        <p key={para.emoji}>
          <span aria-hidden="true">{para.emoji} </span>
          {para.text}
        </p>
      );
    })}
  </div>
);

/**
 * Renders one chapter's structured Scene Architect review: a card per scene
 * (1A, 1B, …) followed by the Cumulative Editorial Note. Copy-to-Word is
 * available per scene, per suggestion, and for the whole chapter.
 */
const SceneArchitectReview = ({
  chapterLabel,
  review,
  showPostReviewFooter = false,
}) => {
  if (!review) return null;
  const scenes = review.scenes || [];
  const label = chapterLabel || review.chapterLabel || "Chapter";
  const sceneCount = scenes.length;
  const hasCumulativeNote = Boolean(review.cumulativeNote);
  const showChapterCopy = sceneCount > 1 || hasCumulativeNote;
  const showSceneCopy = sceneCount > 1 || !showChapterCopy;
  const sceneCopyLabel = showChapterCopy ? "Copy scene" : "Copy";

  return (
    <div className="ellis-scene-architect-review d-flex flex-column" style={{ gap: 12 }}>
      <div className="d-flex align-items-center justify-content-between">
        <span className="ellis-scene-architect-review__meta">
          {scenes.length} scene{scenes.length !== 1 ? "s" : ""}
          {review.pov ? ` · POV: ${review.pov}` : ""}
        </span>
        {showChapterCopy && (
          <CopyButton
            getText={() => chapterToText(label, review)}
            label="Copy chapter"
          />
        )}
      </div>

      {scenes.map((scene) => (
        <SceneCard
          key={scene.label}
          chapterLabel={label}
          scene={scene}
          showCopy={showSceneCopy}
          copyLabel={sceneCopyLabel}
        />
      ))}

      {review.cumulativeNote && (
        <div className="ellis-scene-architect-review__cumulative">
          <div className="d-flex align-items-start justify-content-between" style={{ gap: 8 }}>
            <h6 className="ellis-scene-architect-review__cumulative-title">
              Cumulative Editorial Note
            </h6>
            <CopyButton getText={() => review.cumulativeNote} />
          </div>
          <div className="ellis-scene-architect-review__cumulative-body">
            {review.cumulativeNote}
          </div>
        </div>
      )}

      {showPostReviewFooter && <EllisChapterReviewFooter />}
    </div>
  );
};

export default SceneArchitectReview;
