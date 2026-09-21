import React, { useState } from "react";
import { MdInsertDriveFile, MdPictureAsPdf, MdDownload, MdOpenInNew, MdClose, MdZoomIn } from "react-icons/md";

const BASE_URL = process.env.REACT_APP_BASE_URL || "";

const TYPE_LABELS = {
  pdf: "PDF",
  document: "Document",
  image: "Image",
};

/**
 * FileMessageCard
 *
 * Renders a file attachment inside a chat bubble.
 *
 * Images → inline preview with zoom-on-hover + full-screen lightbox.
 * PDFs / documents → a polished card with icon badge, name, type label,
 *                    and open/download action buttons.
 *
 * Props:
 *   fileUrl   — relative path (e.g. /userData/123/chat/file.pdf)
 *               or full S3 URL (legacy stored messages)
 *   fileType  — "image" | "pdf" | "document"
 *   fileName  — original display filename
 */
const ChatFileMessage = ({ fileUrl, fileType, fileName }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  let fullUrl;
  if (!fileUrl) {
    fullUrl = "";
  } else if (/^https?:\/\//.test(fileUrl)) {
    try {
      const parsed = new URL(fileUrl);
      fullUrl = `${BASE_URL}${parsed.pathname}`;
    } catch {
      fullUrl = fileUrl;
    }
  } else {
    fullUrl = `${BASE_URL}${fileUrl}`;
  }

  const ext = fileName ? fileName.split(".").pop().toUpperCase() : "FILE";

  if (fileType === "image") {
    return (
      <>
        <div className="fmc fmc--image">
          <div className="fmc__image-wrap" onClick={() => setLightboxOpen(true)} role="button" tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setLightboxOpen(true)}
            aria-label={`View full size: ${fileName}`}>
            <img src={fullUrl} alt={fileName} className="fmc__image" />
            <div className="fmc__image-overlay" aria-hidden="true">
              <MdZoomIn size={22} />
            </div>
          </div>
          {fileName && (
            <span className="fmc__image-caption">{fileName}</span>
          )}
        </div>

        {lightboxOpen && (
          <div
            className="fmc-lightbox"
            onClick={() => setLightboxOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label={`Full size: ${fileName}`}
          >
            <div className="fmc-lightbox__inner" onClick={(e) => e.stopPropagation()}>
              <img src={fullUrl} alt={fileName} className="fmc-lightbox__img" />
              <div className="fmc-lightbox__bar">
                <span className="fmc-lightbox__name">{fileName}</span>
                <div className="fmc-lightbox__actions">
                  <a href={fullUrl} download={fileName} className="fmc-lightbox__btn"
                    title="Download" aria-label="Download" onClick={(e) => e.stopPropagation()}>
                    <MdDownload size={18} />
                  </a>
                  <button className="fmc-lightbox__btn fmc-lightbox__btn--close"
                    onClick={() => setLightboxOpen(false)} aria-label="Close">
                    <MdClose size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  const docType = fileType || "document";

  return (
    <div className={`fmc fmc--doc fmc--doc-${docType}`}>
      {/* Icon badge */}
      <div className={`fmc__icon-badge fmc__icon-badge--${docType}`}>
        {docType === "pdf"
          ? <MdPictureAsPdf size={22} />
          : <MdInsertDriveFile size={22} />}
        <span className="fmc__ext-label">{ext}</span>
      </div>

      {/* Info */}
      <div className="fmc__doc-info">
        <span className="fmc__doc-name" title={fileName}>{fileName}</span>
        <span className="fmc__doc-type">{TYPE_LABELS[docType] || "File"}</span>
      </div>

      {/* Actions */}
      <div className="fmc__doc-actions">
        <a
          href={fullUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="fmc__action-btn"
          title="Open"
          aria-label={`Open ${fileName}`}
          onClick={(e) => e.stopPropagation()}
        >
          <MdOpenInNew size={16} />
        </a>
        <a
          href={fullUrl}
          download={fileName}
          className="fmc__action-btn"
          title="Download"
          aria-label={`Download ${fileName}`}
          onClick={(e) => e.stopPropagation()}
        >
          <MdDownload size={16} />
        </a>
      </div>
    </div>
  );
};

export default ChatFileMessage;
