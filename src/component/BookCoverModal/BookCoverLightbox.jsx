import { useEffect, useCallback } from "react";
import { LuX, LuChevronLeft, LuChevronRight, LuDownload, LuPaintbrush } from "react-icons/lu";
import { resolveCoverAssetUrl } from "./coverChatHelpers";
import BookCoverMaskEditor from "./BookCoverMaskEditor";

const BookCoverLightbox = ({
  open,
  version,
  versions = [],
  onClose,
  onPrev,
  onNext,
  onDownload,
  bookName,
  editMode = false,
  onStartEdit,
  onCancelEdit,
  onApplyEdit,
  editBusy = false,
  canEdit = false,
  enhancePrompt = false,
  onEnhancePromptChange,
}) => {
  const handleKeyDown = useCallback(
    (e) => {
      if (!open) return;
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowLeft") onPrev?.();
      if (e.key === "ArrowRight") onNext?.();
    },
    [open, onClose, onPrev, onNext]
  );

  useEffect(() => {
    if (!open) return undefined;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, handleKeyDown]);

  if (!open || !version) return null;

  const hasPrev = versions.length > 1 && onPrev;
  const hasNext = versions.length > 1 && onNext;

  return (
    <div
      className="bcs-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`Cover version ${version.versionNumber}`}
      onClick={onClose}
    >
      <div
        className={`bcs-lightbox__panel${editMode ? " bcs-lightbox__panel--edit" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="bcs-lightbox__close"
          onClick={onClose}
          aria-label="Close preview"
        >
          <LuX size={22} />
        </button>

        {editMode ? (
          <BookCoverMaskEditor
            imageUrl={resolveCoverAssetUrl(version.coverUrl)}
            versionNumber={version.versionNumber}
            onCancel={onCancelEdit}
            onApply={onApplyEdit}
            isApplying={editBusy}
            enhancePrompt={enhancePrompt}
            onEnhancePromptChange={onEnhancePromptChange}
          />
        ) : (
          <>
            {hasPrev && (
              <button
                type="button"
                className="bcs-lightbox__nav bcs-lightbox__nav--prev"
                onClick={onPrev}
                aria-label="Previous cover"
              >
                <LuChevronLeft size={24} />
              </button>
            )}

            <div className="bcs-lightbox__image-wrap">
              <img
                src={resolveCoverAssetUrl(version.coverUrl)}
                alt={`Cover version ${version.versionNumber} for ${bookName || "your novel"}`}
                className="bcs-lightbox__image"
              />
            </div>

            {hasNext && (
              <button
                type="button"
                className="bcs-lightbox__nav bcs-lightbox__nav--next"
                onClick={onNext}
                aria-label="Next cover"
              >
                <LuChevronRight size={24} />
              </button>
            )}

            <div className="bcs-lightbox__footer">
              <div className="bcs-lightbox__meta">
                <span className="bcs-lightbox__label">Version {version.versionNumber}</span>
              </div>
              <div className="bcs-lightbox__actions">
                {canEdit && (
                  <button
                    type="button"
                    className="bcs-lightbox__btn bcs-lightbox__btn--primary"
                    onClick={() => onStartEdit?.(version)}
                  >
                    <LuPaintbrush size={16} />
                    Refine cover
                  </button>
                )}
                <button
                  type="button"
                  className="bcs-lightbox__btn bcs-lightbox__btn--outline"
                  onClick={() => onDownload?.(version)}
                >
                  <LuDownload size={16} />
                  Download
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BookCoverLightbox;
