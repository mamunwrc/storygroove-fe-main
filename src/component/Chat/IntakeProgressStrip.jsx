import React from "react";
import "./IntakeProgressStrip.scss";

/**
 * Sticky intake progress strip for Simone / Olivia agent chats.
 */
const IntakeProgressStrip = ({
  label,
  current,
  total,
  remaining,
  percent,
}) => {
  const safePercent = Math.min(100, Math.max(0, percent ?? 0));
  const ariaLabel = `${label}: question ${current} of ${total}, ${remaining} question${
    remaining === 1 ? "" : "s"
  } remaining`;

  return (
    <div className="intake-progress-strip" role="status" aria-label={ariaLabel}>
      <div className="intake-progress-strip__inner">
        <span className="intake-progress-strip__label">{label}</span>
        <div className="intake-progress-strip__bar-wrap">
          <div className="intake-progress-strip__bar-bg">
            <div
              className="intake-progress-strip__bar-fill"
              style={{ width: `${safePercent}%` }}
            />
          </div>
        </div>
        <span className="intake-progress-strip__meta">
          Question {current} of {total}
          {remaining > 0 && (
            <>
              <span className="intake-progress-strip__sep" aria-hidden="true">
                ·
              </span>
              {remaining} left
            </>
          )}
        </span>
      </div>
    </div>
  );
};

export default IntakeProgressStrip;
