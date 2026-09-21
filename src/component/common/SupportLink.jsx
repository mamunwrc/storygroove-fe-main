import React from "react";
import clsx from "clsx";
import "./SupportLink.scss";

const SUPPORT_EMAIL = "support@storygroove.ai";

/**
 * Shared "Need help?" support email link.
 *
 * Variants:
 *  - "centered-bold": block-level, centered, bold (Dashboard under-cards slot).
 *  - "inline": compact, neutral, suitable for top-bar / header right-corner slots.
 */
const SupportLink = ({ variant = "inline", className }) => {
  return (
    <div
      className={clsx(
        "sg-support-link",
        `sg-support-link--${variant}`,
        className
      )}
    >
      <span className="sg-support-link__label">Need help?</span>{" "}
      <a
        className="sg-support-link__email"
        href={`mailto:${SUPPORT_EMAIL}`}
      >
        {SUPPORT_EMAIL}
      </a>
    </div>
  );
};

export default SupportLink;
