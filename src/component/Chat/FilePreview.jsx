import React, { useEffect, useState } from "react";
import { MdClose, MdInsertDriveFile, MdPictureAsPdf } from "react-icons/md";

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileCategory = (file) => {
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf") return "pdf";
  return "document";
};

/**
 * AttachmentChip
 *
 * A compact pre-send chip that sits inside the input box, above the textarea.
 * Displays a small thumbnail for images, or a colored icon for docs.
 * Shows an inline spinner overlay while uploading.
 *
 * Props:
 *   file           — raw File object
 *   isUploading    — true while the upload is in-flight
 *   uploadProgress — 0-100
 *   onRemove()     — called when × is clicked
 */
const FilePreview = ({ file, isUploading, uploadProgress, onRemove }) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const category = getFileCategory(file);

  useEffect(() => {
    if (category !== "image") return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, category]);

  const ext = file.name.split(".").pop().toUpperCase();

  return (
    <div className="attachment-chip" aria-label={`Attachment: ${file.name}`}>
      {/* Visual identity — thumbnail or icon square */}
      <div className={`attachment-chip__thumb${isUploading ? " attachment-chip__thumb--uploading" : ""}`}>
        {category === "image" && previewUrl ? (
          <img src={previewUrl} alt={file.name} className="attachment-chip__img" />
        ) : (
          <div className={`attachment-chip__icon-box attachment-chip__icon-box--${category}`}>
            {category === "pdf"
              ? <MdPictureAsPdf size={20} />
              : <MdInsertDriveFile size={20} />}
          </div>
        )}

        {isUploading && (
          <div className="attachment-chip__upload-overlay" aria-hidden="true">
            <svg className="attachment-chip__spinner" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                strokeDasharray={`${(uploadProgress / 100) * 56.5} 56.5`} />
            </svg>
          </div>
        )}
      </div>

      {/* Name + meta */}
      <div className="attachment-chip__meta">
        <span className="attachment-chip__name" title={file.name}>
          {file.name}
        </span>
        <span className="attachment-chip__sub">
          {ext} · {formatBytes(file.size)}
        </span>
      </div>

      {/* Remove */}
      <button
        type="button"
        className="attachment-chip__remove"
        onClick={onRemove}
        disabled={isUploading}
        aria-label={`Remove ${file.name}`}
        title="Remove"
      >
        <MdClose size={13} />
      </button>
    </div>
  );
};

export default FilePreview;
