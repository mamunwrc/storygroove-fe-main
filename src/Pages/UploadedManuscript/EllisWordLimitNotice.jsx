import { memo } from "react";
import { ELLIS_CHAT_WORD_LIMIT_SECTIONS } from "../../constants/ellisStudioInput";

/**
 * In-thread refusal when Ellis chat input exceeds the word cap.
 * Copy is Ellis-specific: redirect to My Manuscript, do not reuse Olivia's remaster script.
 */
const EllisWordLimitNotice = ({ className = "ocm-word-limit-warning" }) => {
  const { headline, body } = ELLIS_CHAT_WORD_LIMIT_SECTIONS;

  return (
    <div className={className} role="alert">
      <p className="ocm-word-limit-warning__headline">
        <span className="ocm-word-limit-warning__emoji" aria-hidden="true">
          📌
        </span>
        <strong>{headline}</strong>
      </p>
      <div className="ocm-word-limit-warning__body">
        <p>{body}</p>
      </div>
    </div>
  );
};

export default memo(EllisWordLimitNotice);
