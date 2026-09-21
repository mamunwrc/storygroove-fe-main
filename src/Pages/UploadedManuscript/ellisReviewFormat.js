import React, { Fragment, memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import {
  isCompleteEllisChapterOpener,
} from "./ellisChapterOpenerParse";
import {
  isEllisDevelopmentalReviewText,
  isPartialEllisDevelopmentalReview,
} from "./ellisChatHelpers";
import {
  ELLIS_SUGGESTION_SEP_MARKER,
  canonicalEllisSectionLabel,
  isEllisCreativeEditorialLogicLineText,
  isEllisCreativeExampleLineText,
  prepareEllisReviewForDisplay,
} from "./ellisReviewFormatCore";

const REMARK_PLUGINS = [remarkGfm, remarkBreaks];

const flattenMarkdownChildrenToText = (children) => {
  if (children == null) return "";
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children.map(flattenMarkdownChildrenToText).join("");
  }
  if (React.isValidElement(children)) {
    return flattenMarkdownChildrenToText(children.props.children);
  }
  return "";
};

const isEllisSceneTitleParagraph = (text) => {
  const t = String(text || "").trim();
  return isCompleteEllisChapterOpener(t) || /^POV\s*:/i.test(t);
};

const isEllisCreativeWeaknessLine = (text) =>
  /^(?:Structural Weakness|Character Weakness):/i.test(String(text || "").trim());

const isEllisCreativeSubLabelLine = (text) => {
  const t = String(text || "").trim();
  return (
    /^(?:Structural Weakness|Character Weakness|Creative Suggestion Name):/i.test(t) ||
    isEllisCreativeEditorialLogicLineText(t)
  );
};

const isEllisCreativeSuggestionNameLine = (text) =>
  /^Creative Suggestion Name:/i.test(String(text || "").trim());

const isEllisCreativeEditorialLogicLine = (text) =>
  isEllisCreativeEditorialLogicLineText(text);

const isEllisCreativeExampleLine = (text) => isEllisCreativeExampleLineText(text);

const isEllisCreativeSuggestionsHeaderLine = (text) => {
  const t = String(text || "")
    .trim()
    .replace(/^\*\*|\*\*$/g, "")
    .trim();
  return /^(?:🎨\s*)?Creative Suggestions$/i.test(t);
};

const isEllisPrimarySectionHeaderText = (text) => {
  const t = String(text || "")
    .trim()
    .replace(/^\*\*|\*\*$/g, "")
    .trim();
  return (
    /^Function in Story\b/i.test(t) ||
    /^Genre Beat Check\b/i.test(t) ||
    /^(?:🔍\s*)?Scene Analysis/i.test(t) ||
    /^(?:🎨\s*)?Creative Suggestions/i.test(t) ||
    /^(?:📌\s*)?Chapter Cumulative Editorial Note/i.test(t)
  );
};

const EllisCreativeSuggestionsSectionHeader = ({ label }) => (
  <>
    <p className="ellis-creative-section-header">
      <strong>{label}</strong>
    </p>
    <hr className="ellis-creative-section-divider" aria-hidden="true" />
  </>
);

const EllisSectionHeaderFromHeading = ({ text }) => {
  const label = canonicalEllisSectionLabel(text);
  const isCreativeHeader = isEllisCreativeSuggestionsHeaderLine(label);

  return (
    <>
      <hr className="scene-section-separator" aria-hidden="true" />
      {isCreativeHeader ? (
        <EllisCreativeSuggestionsSectionHeader label={label} />
      ) : (
        <p>
          <strong>{label}</strong>
        </p>
      )}
    </>
  );
};

const ellisHeadingComponent = (Tag) =>
  function EllisReviewHeading({ children }) {
    const text = flattenMarkdownChildrenToText(children).trim();
    if (isEllisPrimarySectionHeaderText(text)) {
      return (
        <EllisSectionHeaderFromHeading
          text={text.replace(/^\*\*|\*\*$/g, "").trim()}
        />
      );
    }
    return <Tag>{children}</Tag>;
  };

export const isEllisFormattedReviewText = (text) =>
  isPartialEllisDevelopmentalReview(text) || isEllisDevelopmentalReviewText(text);

const baseComponents = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
};

const ellisReviewComponents = {
  ...baseComponents,
  hr: () => <hr className="scene-section-separator" />,
  h1: ellisHeadingComponent("h1"),
  h2: ellisHeadingComponent("h2"),
  h3: ellisHeadingComponent("h3"),
  h4: ellisHeadingComponent("h4"),
  p: ({ children, ...props }) => {
    const text = flattenMarkdownChildrenToText(children).trim();

    if (isEllisCreativeSuggestionsHeaderLine(text)) {
      return (
        <EllisCreativeSuggestionsSectionHeader
          label={canonicalEllisSectionLabel(text.replace(/^\*\*|\*\*$/g, "").trim())}
        />
      );
    }

    if (isEllisPrimarySectionHeaderText(text)) {
      return (
        <p>
          <strong>{canonicalEllisSectionLabel(text)}</strong>
        </p>
      );
    }

    if (isEllisCreativeWeaknessLine(text)) {
      const match = text.match(/^((?:Structural Weakness|Character Weakness):)\s*(.*)$/i);
      if (match) {
        return (
          <p className="ellis-creative-sub-label ellis-creative-weakness-line" {...props}>
            <strong>{match[1]}</strong>{" "}
            <span className="ellis-creative-weakness-value">{match[2]}</span>
          </p>
        );
      }
    }

    const className = [
      isEllisSceneTitleParagraph(text) ? "ellis-review-scene-title" : "",
      isEllisCreativeExampleLine(text)
        ? "ellis-creative-sub-label ellis-creative-example"
        : isEllisCreativeSuggestionNameLine(text)
          ? "ellis-creative-sub-label ellis-creative-suggestion-name"
          : isEllisCreativeEditorialLogicLine(text)
            ? "ellis-creative-sub-label ellis-creative-description"
            : isEllisCreativeSubLabelLine(text)
              ? "ellis-creative-sub-label"
              : "",
    ]
      .filter(Boolean)
      .join(" ") || undefined;

    return (
      <p className={className} {...props}>
        {children}
      </p>
    );
  },
};

const renderEllisReviewMarkdown = (text) => {
  const segments = String(text || "").split(ELLIS_SUGGESTION_SEP_MARKER);

  if (segments.length === 1) {
    return (
      <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={ellisReviewComponents}>
        {text}
      </ReactMarkdown>
    );
  }

  return segments.map((segment, index) => (
    <Fragment key={index}>
      {index > 0 ? (
        <hr className="ellis-creative-suggestion-separator" aria-hidden="true" />
      ) : null}
      {segment.trim() ? (
        <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={ellisReviewComponents}>
          {segment}
        </ReactMarkdown>
      ) : null}
    </Fragment>
  ));
};

export const EllisChapterReviewView = memo(function EllisChapterReviewView({ text }) {
  const prepared = prepareEllisReviewForDisplay(text);
  return (
    <div className="sidebar-markdown-body sidebar-markdown-body--ellis-review">
      {renderEllisReviewMarkdown(prepared)}
    </div>
  );
});
