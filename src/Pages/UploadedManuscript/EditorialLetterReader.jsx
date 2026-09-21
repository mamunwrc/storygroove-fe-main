import { memo } from "react";
import EditorialLetterContent from "./EditorialLetterContent";

/**
 * Document-style reading surface for the editorial letter modal.
 */
const EditorialLetterReader = ({
  content = "",
  isLoading = false,
  isStreaming = false,
  isProcessing = false,
}) => {
  const hasContent = Boolean(String(content || "").trim());
  const showBootLoading = isLoading || (isProcessing && !hasContent);
  const showStreamingBanner = isStreaming && hasContent;

  if (showBootLoading) {
    return (
      <div
        className="elm-letter-reader elm-letter-reader--loading"
        aria-busy="true"
        aria-live="polite"
      >
        <div className="elm-letter-reader__loading-card">
          <div className="elm-letter-reader__spinner" role="status" />
          <p className="elm-letter-reader__loading-title">
            {isProcessing
              ? "Writing your editorial letter"
              : "Loading editorial letter"}
          </p>
          <p className="elm-letter-reader__loading-sub">
            {isProcessing
              ? "Ellis is drafting your Global Editorial Letter. This can take a minute…"
              : "Fetching your editorial letter…"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="elm-letter-reader">
      {showStreamingBanner && (
        <div className="elm-letter-reader__status" aria-live="polite">
          <span className="elm-streaming-pulse" />
          Ellis is writing your editorial letter…
        </div>
      )}
      <article className="elm-letter-reader__document">
        {hasContent ? (
          <EditorialLetterContent className="elm-letter-reader__markdown">
            {content}
          </EditorialLetterContent>
        ) : (
          <p className="elm-letter-reader__placeholder">
            Your editorial letter will appear here shortly.
          </p>
        )}
      </article>
    </div>
  );
};

export default memo(EditorialLetterReader);
