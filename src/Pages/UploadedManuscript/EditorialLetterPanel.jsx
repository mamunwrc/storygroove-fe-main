import { LuRefreshCw } from "react-icons/lu";
import EditorialLetterContent from "./EditorialLetterContent";
import "./EditorialLetterModal.scss";

/**
 * Editorial Letter tab for the upload viewer left sidebar. The letter
 * fetch/poll lives in UploadBookViewerPage so this is a pure presentation
 * surface for the lifted state.
 */
const EditorialLetterPanel = ({
  letterStatus = "pending",
  letter = null,
  letterError = null,
  onRetry,
  blocked = false,
}) => {
  if (blocked) {
    return (
      <p className="outline-characters-empty mb-0">
        Ellis' editing is available on the Studio plan. Upgrade to get an
        editorial letter and scene-by-scene developmental edits.
      </p>
    );
  }

  return (
    <div className="d-flex flex-column flex-grow-1" style={{ minHeight: 0, gap: 10 }}>
      {(letterStatus === "pending" || letterStatus === "generating") && (
        <p
          className="mb-0 flex-shrink-0"
          style={{ fontSize: 13, lineHeight: 1.55, color: "rgba(255,255,255,0.72)" }}
        >
          Ellis is reading your manuscript and writing your editorial letter…
          This can take a couple of minutes.
        </p>
      )}

      {letterStatus === "failed" && (
        <div className="flex-shrink-0" style={{ fontSize: 13 }}>
          <p className="text-danger mb-2">
            {letterError || "The editorial letter could not be generated."}
          </p>
          {typeof onRetry === "function" && (
            <button
              type="button"
              className="sg-btn-outline d-flex align-items-center gap-1"
              style={{ height: 30, fontSize: 12 }}
              onClick={onRetry}
            >
              <LuRefreshCw size={13} /> Try again
            </button>
          )}
        </div>
      )}

      {letterStatus === "ready" && letter && (
        <div className="outline-character-content outline-story-bible-master elm-letter-panel">
          <EditorialLetterContent className="elm-letter-panel__markdown">
            {letter}
          </EditorialLetterContent>
        </div>
      )}
    </div>
  );
};

export default EditorialLetterPanel;
