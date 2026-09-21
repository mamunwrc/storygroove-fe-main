import { memo } from "react";
import {
  OLIVIA_STUDIO_WORD_LIMIT_BOLD,
  OLIVIA_STUDIO_WORD_LIMIT_SECTIONS,
} from "../../constants/oliviaStudioInput";

/** Wrap the first occurrence of `phrase` in <strong> while keeping the rest plain. */
const withBoldPhrase = (text, phrase) => {
  if (!phrase) return text;
  const idx = text.indexOf(phrase);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <strong>{phrase}</strong>
      {text.slice(idx + phrase.length)}
    </>
  );
};

/**
 * Formatted in-thread refusal when chat input exceeds the word cap.
 */
const OliviaWordLimitNotice = ({ className = "ocm-word-limit-warning" }) => {
  const { headline, refusalLine, remaster, scratch, ellisLine } =
    OLIVIA_STUDIO_WORD_LIMIT_SECTIONS;
  const { wordCount, coachingIcon, scenesOutlined } =
    OLIVIA_STUDIO_WORD_LIMIT_BOLD;
  const { outlineFirst, draftAsYouOutline } = scratch;

  return (
    <div className={className} role="alert">
      <p className="ocm-word-limit-warning__headline">
        <span className="ocm-word-limit-warning__emoji" aria-hidden="true">
          🔴
        </span>
        <strong>{headline}</strong>
      </p>

      <div className="ocm-word-limit-warning__body">
        <p className="ocm-word-limit-warning__refusal">
          <span
            className="ocm-word-limit-warning__inline-emoji"
            aria-hidden="true"
          >
            💬{" "}
          </span>
          <strong>{refusalLine}</strong>
        </p>

        <hr className="ocm-word-limit-warning__separator" />

        <p className="ocm-word-limit-warning__section-header">
          <span
            className="ocm-word-limit-warning__inline-emoji"
            aria-hidden="true"
          >
            🔨{" "}
          </span>
          <strong>{remaster.header}</strong>
        </p>

        <p>{withBoldPhrase(remaster.intro[0], wordCount)}</p>
        <p>{remaster.intro[1]}</p>
        <p>{remaster.intro[2]}</p>

        <p className="ocm-word-limit-warning__example-label">
          <span
            className="ocm-word-limit-warning__inline-emoji"
            aria-hidden="true"
          >
            💡{" "}
          </span>
          <strong>{remaster.exampleLabel}</strong>
        </p>
        <blockquote className="ocm-word-limit-warning__example">
          &ldquo;{remaster.example}&rdquo;
        </blockquote>

        <p className="ocm-word-limit-warning__tutorial-tip">
          <strong>
            <span
              className="ocm-word-limit-warning__inline-emoji"
              aria-hidden="true"
            >
              📌{" "}
            </span>
            {remaster.tutorialTip}
          </strong>
        </p>

        <hr className="ocm-word-limit-warning__separator" />

        <p className="ocm-word-limit-warning__section-header">
          <span
            className="ocm-word-limit-warning__inline-emoji"
            aria-hidden="true"
          >
            ✍️{" "}
          </span>
          <strong>{scratch.header}</strong>
        </p>

        <p>{scratch.intro[0]}</p>
        <p className="ocm-word-limit-warning__choose-process">
          <strong>{scratch.intro[1]}</strong>
        </p>

        <p className="ocm-word-limit-warning__subsection-header">
          <span
            className="ocm-word-limit-warning__inline-emoji"
            aria-hidden="true"
          >
            🗺️{" "}
          </span>
          <strong>{outlineFirst.header}</strong>
        </p>
        <p>{withBoldPhrase(outlineFirst.body, coachingIcon)}</p>

        <p className="ocm-word-limit-warning__subsection-header">
          <span
            className="ocm-word-limit-warning__inline-emoji"
            aria-hidden="true"
          >
            🔄{" "}
          </span>
          <strong>{draftAsYouOutline.header}</strong>
        </p>
        <p>{draftAsYouOutline.intro[0]}</p>
        <p>{withBoldPhrase(draftAsYouOutline.intro[1], scenesOutlined)}</p>
        <p>{withBoldPhrase(draftAsYouOutline.intro[2], coachingIcon)}</p>

        <p className="ocm-word-limit-warning__steps-label">
          {draftAsYouOutline.stepsLabel}
        </p>
        <ul className="ocm-word-limit-warning__steps">
          {draftAsYouOutline.steps.map((step) => (
            <li key={step.slice(0, 40)}>{step}</li>
          ))}
        </ul>
        <p>{draftAsYouOutline.closing}</p>

        <p className="ocm-word-limit-warning__tutorial-tip">
          <strong>
            <span
              className="ocm-word-limit-warning__inline-emoji"
              aria-hidden="true"
            >
              📌{" "}
            </span>
            {scratch.tutorialTip}
          </strong>
        </p>

        <p className="ocm-word-limit-warning__ellis-line">
          <strong>
            <span
              className="ocm-word-limit-warning__inline-emoji"
              aria-hidden="true"
            >
              📝{" "}
            </span>
            {ellisLine}
          </strong>
        </p>
      </div>
    </div>
  );
};

export default memo(OliviaWordLimitNotice);
