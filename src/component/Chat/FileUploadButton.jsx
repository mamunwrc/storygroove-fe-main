import React, { useRef } from "react";
import { MdAttachFile } from "react-icons/md";
import { toast } from "react-toastify";
import {
  CHAT_MAX_ATTACHMENTS as MAX_FILES,
  CHAT_MAX_FILE_SIZE_MB as MAX_FILE_SIZE_MB,
  CHAT_MAX_FILE_SIZE_BYTES as MAX_FILE_SIZE_BYTES,
  CHAT_ACCEPTED_MIME_TYPES as ACCEPTED_TYPES,
} from "../../constants/chatConstants";
import "./FileUploadButton.scss";

/**
 * FileUploadButton
 *
 * Props:
 *   onFilesSelected(files: File[]) — called with the validated File array
 *   disabled       — disables the button entirely
 *   currentCount   — number of files already staged (used to enforce the 5-file cap)
 */
const FileUploadButton = ({ onFilesSelected, disabled, currentCount = 0 }) => {
  const inputRef = useRef(null);

  const slotsRemaining = MAX_FILES - currentCount;
  const isAtLimit = slotsRemaining <= 0;

  const handleChange = (e) => {
    const selected = Array.from(e.target.files || []);
    e.target.value = "";

    if (!selected.length) return;

    const slotsLeft = MAX_FILES - currentCount;

    if (slotsLeft <= 0) {
      toast.warn(`You can attach a maximum of ${MAX_FILES} files per message.`);
      return;
    }

    // Trim to available slots and warn only if we had to drop some
    const candidates = selected.slice(0, slotsLeft);
    if (selected.length > slotsLeft) {
      const dropped = selected.length - slotsLeft;
      toast.warn(
        `Only ${slotsLeft} slot${slotsLeft !== 1 ? "s" : ""} left — ${dropped} file${dropped !== 1 ? "s were" : " was"} not added (max ${MAX_FILES} per message).`
      );
    }
    const valid = [];

    for (const file of candidates) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error(`"${file.name}" is too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`);
      } else {
        valid.push(file);
      }
    }

    if (valid.length > 0) {
      onFilesSelected(valid);
    }
  };

  const title = isAtLimit
    ? `Maximum ${MAX_FILES} files reached`
    : `Attach file${slotsRemaining > 1 ? "s" : ""} (${slotsRemaining} slot${slotsRemaining !== 1 ? "s" : ""} left)`;

  return (
    <>
      <button
        type="button"
        className="chat-file-attach-btn"
        onClick={() => !isAtLimit && inputRef.current?.click()}
        disabled={disabled || isAtLimit}
        title={title}
        aria-label={title}
      >
        <MdAttachFile aria-hidden />
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        multiple
        onChange={handleChange}
        style={{ display: "none" }}
        aria-hidden="true"
        tabIndex={-1}
      />
    </>
  );
};

export default FileUploadButton;
