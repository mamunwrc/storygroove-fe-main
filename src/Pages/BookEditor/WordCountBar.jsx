import { GoBook } from "react-icons/go";
import {
  LuDownload,
  LuLoader2,
  LuImage,
  LuMaximize2,
  LuMinimize2,
} from "react-icons/lu";
import React from "react";
import { formatTitle } from "./utils";
import SupportLink from "../../component/common/SupportLink";

const WordCountBar = ({
  bookName,
  totalWordCount,
  MAX_WORD_COUNT,
  wordPercent,
  showDownloadButton,
  downloadManuscriptDisabled = false,
  isDownloadingManuscript,
  onDownloadManuscript,
  showCoverButton,
  onOpenCoverModal,
  dense = false,
  variant = "default",
  isMobileLayout = false,
  focusMode = false,
  onToggleFocusMode,
  focusModeDisabled = false,
}) => {
  const downloadDisabled =
    isDownloadingManuscript || downloadManuscriptDisabled;
  const downloadTitle = isDownloadingManuscript
    ? "Preparing your Word file…"
    : downloadManuscriptDisabled
      ? "Add manuscript text to download"
      : "Download Manuscript as Word doc (.docx)";
  const downloadAriaLabel = isDownloadingManuscript
    ? "Preparing manuscript download"
    : downloadManuscriptDisabled
      ? "Download manuscript — add manuscript text first"
      : "Download manuscript";

  const isCompact = variant === "compact";
  const showFocusToggle =
    typeof onToggleFocusMode === "function" && !isMobileLayout;

  const focusTitle = focusModeDisabled
    ? "Select a scene to enter focus mode"
    : focusMode
      ? "Exit Focus Mode (Esc)"
      : "Focus Mode — hide side panels and maximize writing space";

  return (
    <div
      className={[
        "border-bottom page-heading",
        dense && "page-heading--dense",
        isCompact && "page-heading--compact",
        isMobileLayout && "page-heading--mobile",
        !dense && !isCompact && "p-4",
        (showDownloadButton || showCoverButton) && "page-heading--has-cta",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="wcbar-row__primary">
        <GoBook size={20} aria-hidden />
        <span className="fw-semibold text-black-50 wcbar-title" title={bookName || ""}>
          {formatTitle(bookName)}
        </span>
      </div>
      <div className="wcbar-row__stats">
        <span className="text-muted wordcount-label">
          <strong>Word Count:</strong> {totalWordCount}{" "}
          {MAX_WORD_COUNT && `of ${MAX_WORD_COUNT}`}
        </span>
        {MAX_WORD_COUNT && (
          <>
            <div className="wordcount-progress">
              <div className="wordcount-bar-bg">
                <div
                  className="wordcount-bar-fill"
                  style={{ width: `${wordPercent}%` }}
                />
              </div>
            </div>
            <span className="wordcount-badge">{wordPercent}%</span>
          </>
        )}
        {(showDownloadButton || showCoverButton) && (
          <div className="wcbar-row__cta">
            {showDownloadButton && (
              <button
                type="button"
                className={[
                  "topbar-action-btn",
                  "topbar-action-btn--download",
                  "topbar-action-btn--prominent",
                  isDownloadingManuscript && "topbar-action-btn--busy",
                  downloadManuscriptDisabled && "topbar-action-btn--download-disabled",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-label={downloadAriaLabel}
                title={downloadTitle}
                aria-busy={isDownloadingManuscript}
                onClick={onDownloadManuscript}
                disabled={downloadDisabled}
              >
                {isDownloadingManuscript ? (
                  <LuLoader2 size={16} className="topbar-action-spinner" aria-hidden />
                ) : (
                  <LuDownload size={16} aria-hidden />
                )}
                <span className="topbar-action-label">
                  {isDownloadingManuscript ? "Preparing…" : "Download Manuscript"}
                </span>
              </button>
            )}
            {showCoverButton && (
              <button
                type="button"
                className="topbar-action-btn topbar-action-btn--cover topbar-action-btn--prominent"
                aria-label="Generate book cover concept"
                title="Generate book cover concept"
                onClick={onOpenCoverModal}
              >
                <LuImage size={16} aria-hidden />
                <span className="topbar-action-label">Book Cover Concept</span>
              </button>
            )}
          </div>
        )}
      </div>
      <div className="topbar-actions">
        {showFocusToggle && (
          <button
            type="button"
            className="topbar-focus-btn"
            aria-pressed={focusMode}
            aria-label={focusTitle}
            title={focusTitle}
            onClick={onToggleFocusMode}
            disabled={focusModeDisabled}
          >
            {focusMode ? (
              <LuMinimize2 size={16} aria-hidden />
            ) : (
              <LuMaximize2 size={16} aria-hidden />
            )}
            <span className="topbar-focus-btn__label">
              {focusMode ? "Exit Focus Mode" : "Focus Mode"}
            </span>
          </button>
        )}
        <SupportLink variant="inline" />
      </div>
    </div>
  );
};

export default WordCountBar;
