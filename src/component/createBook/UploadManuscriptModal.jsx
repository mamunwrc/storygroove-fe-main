import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Form,
  InputGroup,
  Modal,
  OverlayTrigger,
  Spinner,
  Tooltip,
} from "react-bootstrap";
import { toast } from "react-toastify";

import { uploadManuscript } from "../../api/bookGeneration";
import { MdInfoOutline } from "react-icons/md";
import { FiUploadCloud, FiFileText, FiX } from "react-icons/fi";
import "./UploadManuscriptModal.scss";

const MAX_MANUSCRIPT_BYTES = 50 * 1024 * 1024; // 50 MB
const MAX_BOOK_TITLE_LENGTH = 120;

const ACCEPTED_MANUSCRIPT_EXTENSIONS = [".doc", ".docx", ".pdf", ".txt"];

const validateBookTitle = (value) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return "Please enter a title for your book.";
  }
  if (trimmed.length > MAX_BOOK_TITLE_LENGTH) {
    return `Title must be ${MAX_BOOK_TITLE_LENGTH} characters or fewer.`;
  }
  return "";
};

const validateManuscriptFile = (file) => {
  if (!file) {
    return "Please choose a manuscript file to upload.";
  }
  if (file.size > MAX_MANUSCRIPT_BYTES) {
    return "Manuscript is too large. The maximum file size is 50MB.";
  }
  const fileName = String(file.name || "").toLowerCase();
  const hasValidExtension = ACCEPTED_MANUSCRIPT_EXTENSIONS.some((ext) =>
    fileName.endsWith(ext)
  );
  if (!hasValidExtension) {
    return "Only Word (.doc, .docx), PDF, or TXT files are accepted.";
  }
  return "";
};

const FORMATTING_CHECKLIST = [
  "Include a title page with your book title, author name, genre/subgenre, and two comparable titles: published books similar to yours in genre, audience, or tone.",
  "If your manuscript is part of a series, add a brief Series Context section after the title page and before Chapter One. Summarize relevant events from prior books, recurring characters, unresolved conflicts, relationship arcs, world rules, and any continuity Ellis should preserve. This can be in form of a short summary just like if you were preparing it for an editor.",
  "All chapters clearly labeled as Chapter One, Chapter Two, etc.",
  "Prologues and epilogues: use a standalone heading (Prologue, Epilogue). Interludes, letters, introductions, afterwords, preludes, and are supported the same way via Chapter #'s. Ex: Chapter Seven Interlude",
  "Dual or multiple POV or timeline labels when needed, such as Chapter One, POV Lucas, Timeline 1932",
  "File type: Word, PDF, or TXT. Max 50MB. Word (.docx) keeps its formatting — alignment, bold, italics, underline, headings, and lists. PDF and TXT import chapter structure and text only.",
];

const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const UploadManusciptModal = ({ show, fetchAllBooks, handleClose }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const titleInputRef = useRef(null);
  const checklistInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    manuscript: null,
  });
  const [fieldErrors, setFieldErrors] = useState({
    name: "",
    manuscript: "",
    checklist: "",
  });
  const [checklistConfirmed, setChecklistConfirmed] = useState(false);
  const [sendUnlocked, setSendUnlocked] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!show) return;
    setFieldErrors({ name: "", manuscript: "", checklist: "" });
    setChecklistConfirmed(false);
    setSendUnlocked(false);
  }, [show]);

  useEffect(() => {
    if (!checklistConfirmed) {
      setSendUnlocked(false);
      return undefined;
    }
    const fadeMs = 200;
    const id = window.setTimeout(() => setSendUnlocked(true), fadeMs);
    return () => window.clearTimeout(id);
  }, [checklistConfirmed]);

  const clearFieldError = (field) => {
    setFieldErrors((prev) =>
      prev[field] ? { ...prev, [field]: "" } : prev
    );
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
    if (name === "name") {
      clearFieldError("name");
    }
  };

  const applyFile = (file) => {
    if (!file) return;
    const manuscriptError = validateManuscriptFile(file);
    if (manuscriptError) {
      setFieldErrors((prev) => ({ ...prev, manuscript: manuscriptError }));
      toast.error(manuscriptError);
      return;
    }
    setFieldErrors((prev) => ({ ...prev, manuscript: "" }));
    setFormData((prevState) => ({ ...prevState, manuscript: file }));
  };

  const handleFileChange = (e) => {
    applyFile(e.target.files[0]);
  };

  const handleRemoveFile = (e) => {
    e.stopPropagation();
    setFormData((prev) => ({ ...prev, manuscript: null }));
    clearFieldError("manuscript");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validateForm = () => {
    const nameError = validateBookTitle(formData.name);
    const manuscriptError = validateManuscriptFile(formData.manuscript);
    const checklistError =
      !nameError && !manuscriptError && !checklistConfirmed
        ? "Please confirm you formatted your manuscript using the checklist."
        : "";
    const nextErrors = {
      name: nameError,
      manuscript: manuscriptError,
      checklist: checklistError,
    };
    setFieldErrors(nextErrors);

    if (nameError) {
      titleInputRef.current?.focus();
      return false;
    }
    if (manuscriptError) {
      return false;
    }
    if (checklistError) {
      checklistInputRef.current?.focus();
      return false;
    }
    return true;
  };

  const openFilePicker = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isUploading) return;
    if (!validateForm()) return;

    const payload = {
      ...formData,
      name: formData.name.trim(),
    };

    setIsUploading(true);
    try {
      const response = await uploadManuscript(payload);
      if (response.status === 200) {
        const novelId = response.data?.novelId;
        setFormData({ name: "", manuscript: null });
        setFieldErrors({ name: "", manuscript: "", checklist: "" });
        setChecklistConfirmed(false);
        setSendUnlocked(false);
        if (typeof fetchAllBooks === "function") {
          fetchAllBooks();
        }
        toast.success(response.data.message);
        if (novelId) {
          handleClose();
          navigate(`/dashboard/upload/bookeditor/${novelId}`);
          return;
        }
        handleClose();
      }
    } catch (err) {
      toast.error(
        "Manuscript could not be uploaded. please check the format of your manuscript."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const hasFile = Boolean(formData.manuscript);
  const canSend = sendUnlocked && !isUploading;
  const confirmState = isUploading
    ? "loading"
    : fieldErrors.checklist
      ? "error"
      : checklistConfirmed
        ? "success"
        : "default";
  const confirmHelpId = "upload-manuscript-confirm-help";
  const confirmHint = fieldErrors.checklist || "";

  const dropzoneClassName = [
    "upload-manuscript-dropzone",
    isDragging && "upload-manuscript-dropzone--dragging",
    isUploading && "upload-manuscript-dropzone--disabled",
    fieldErrors.manuscript && !hasFile && "upload-manuscript-dropzone--error",
  ]
    .filter(Boolean)
    .join(" ");

  const sendButton = (
    <button
      className={`sg-btn-fill d-flex align-items-center justify-content-center gap-2${
        isUploading ? " sg-btn-fill--loading" : ""
      }${!checklistConfirmed ? " is-locked" : ""}`}
      form="upload-manuscript-form"
      type="submit"
      disabled={!canSend}
      aria-disabled={!canSend}
    >
      {isUploading ? (
        <>
          <Spinner
            animation="border"
            size="sm"
            role="status"
            aria-hidden="true"
          />
          Uploading…
        </>
      ) : (
        "Send to Ellis"
      )}
    </button>
  );

  return (
    <Modal
      show={show}
      onHide={isUploading ? undefined : handleClose}
      aria-labelledby="upload-manuscript-title"
      centered
      scrollable
      backdrop={isUploading ? "static" : true}
      keyboard={!isUploading}
      className="storygroove-theme upload-manuscript-modal"
    >
      <Modal.Header closeButton={!isUploading}>
        <div>
          <Modal.Title
            id="upload-manuscript-title"
            className="upload-manuscript-modal__title"
          >
            Send Your Manuscript to Ellis
          </Modal.Title>
          <div className="upload-manuscript-modal__subtitle">
            Ellis will read your draft and prepare a developmental review.
          </div>
        </div>
      </Modal.Header>

      <Modal.Body>
        <div className="form-control-icon">
          <Form
            id="upload-manuscript-form"
            noValidate
            onSubmit={handleSubmit}
          >
            <Form.Group className="mb-4" controlId="formName">
              <Form.Label>Title of the book</Form.Label>
              <InputGroup hasValidation>
                <Form.Control
                  ref={titleInputRef}
                  className="border-none"
                  type="text"
                  name="name"
                  placeholder="Enter your book title"
                  value={formData.name}
                  onChange={handleChange}
                  isInvalid={!!fieldErrors.name}
                  disabled={isUploading}
                  maxLength={MAX_BOOK_TITLE_LENGTH}
                  aria-describedby={
                    fieldErrors.name ? "formName-error" : undefined
                  }
                />
                <InputGroup.Text>
                  <OverlayTrigger
                    placement="bottom"
                    overlay={
                      <Tooltip id="formName-tooltip">
                        Mindset matters—naming your book is the first magical
                        step. Picture it on a shelf, in a reader's hands, or
                        trending on BookTok. You can always change it later—this
                        is where the magic begins.
                      </Tooltip>
                    }
                  >
                    <span>
                      <MdInfoOutline />
                    </span>
                  </OverlayTrigger>
                </InputGroup.Text>
                <Form.Control.Feedback type="invalid" id="formName-error">
                  {fieldErrors.name}
                </Form.Control.Feedback>
              </InputGroup>
            </Form.Group>

            <div className="upload-manuscript-checklist mb-4">
              <div className="upload-manuscript-checklist__heading">
                Required Manuscript Formatting Checklist
              </div>
              <p className="upload-manuscript-checklist__description">
                Ellis uses these details and headings to map your manuscript
                correctly and deliver an accurate chapter-by-chapter review.
              </p>
              <ol className="upload-manuscript-checklist__list">
                {FORMATTING_CHECKLIST.map((item) => (
                  <li key={item} className="upload-manuscript-checklist__item">
                    {item}
                  </li>
                ))}
              </ol>
              <div className="upload-manuscript-commit">
                <label
                  className="upload-manuscript-confirm"
                  data-state={confirmState}
                  htmlFor="upload-manuscript-confirm"
                >
                  <input
                    ref={checklistInputRef}
                    id="upload-manuscript-confirm"
                    className="upload-manuscript-confirm__input"
                    type="checkbox"
                    checked={checklistConfirmed}
                    onChange={(e) => {
                      setChecklistConfirmed(e.target.checked);
                      if (e.target.checked) {
                        clearFieldError("checklist");
                      }
                    }}
                    disabled={isUploading}
                    aria-required="true"
                    aria-invalid={!!fieldErrors.checklist}
                    aria-describedby={
                      fieldErrors.checklist ? confirmHelpId : undefined
                    }
                  />
                  <span className="upload-manuscript-confirm__text">
                    I have read the formatting checklist and prepared my
                    manuscript to match.
                  </span>
                </label>
                {confirmHint ? (
                  <p
                    id={confirmHelpId}
                    className="upload-manuscript-confirm__help upload-manuscript-confirm__help--error"
                    role="alert"
                  >
                    {confirmHint}
                  </p>
                ) : null}
              </div>
            </div>

            <Form.Group className="mb-0" controlId="formManuscript">
              <input
                ref={fileInputRef}
                id="manuscript-file"
                type="file"
                accept=".doc,.docx,.pdf,.txt"
                onChange={handleFileChange}
                className="upload-manuscript-file-input"
              />

              {!hasFile ? (
                <div
                  role="button"
                  tabIndex={0}
                  className={dropzoneClassName}
                  onClick={openFilePicker}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openFilePicker();
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!isUploading) setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (isUploading) return;
                    applyFile(e.dataTransfer.files?.[0]);
                  }}
                >
                  <div className="upload-manuscript-dropzone__icon-wrap">
                    <FiUploadCloud size={26} />
                  </div>
                  <div className="upload-manuscript-dropzone__prompt">
                    Drag your manuscript here, or{" "}
                    <span className="upload-manuscript-dropzone__browse">
                      browse
                    </span>
                  </div>
                  <div className="upload-manuscript-dropzone__hint">
                    Word, PDF, or TXT accepted. Max 50MB.
                  </div>
                  {fieldErrors.manuscript ? (
                    <div
                      className="upload-manuscript-field-error"
                      id="formManuscript-error"
                      role="alert"
                    >
                      {fieldErrors.manuscript}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="upload-manuscript-file-card">
                  <div className="upload-manuscript-file-card__icon-wrap">
                    <FiFileText size={22} />
                  </div>
                  <div className="upload-manuscript-file-card__details">
                    <div
                      className="upload-manuscript-file-card__name"
                      title={formData.manuscript.name}
                    >
                      {formData.manuscript.name}
                    </div>
                    <div className="upload-manuscript-file-card__size">
                      {formatBytes(formData.manuscript.size)}
                    </div>
                  </div>
                  <div className="upload-manuscript-file-card__actions">
                    <button
                      type="button"
                      className="upload-manuscript-file-card__replace"
                      onClick={openFilePicker}
                      disabled={isUploading}
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      className="upload-manuscript-file-card__remove"
                      onClick={handleRemoveFile}
                      disabled={isUploading}
                      aria-label="Remove file"
                    >
                      <FiX size={18} />
                    </button>
                  </div>
                </div>
              )}
            </Form.Group>
          </Form>
        </div>
      </Modal.Body>
      <Modal.Footer className="upload-manuscript-actions">
        <button
          className="sg-btn-outline"
          type="button"
          onClick={handleClose}
          disabled={isUploading}
          form="upload-manuscript-form"
        >
          Cancel
        </button>
        {checklistConfirmed ? (
          sendButton
        ) : (
          <OverlayTrigger
            placement="top"
            overlay={
              <Tooltip
                id="upload-manuscript-send-tooltip"
                className="upload-manuscript-tooltip"
              >
                Check the box above to send
              </Tooltip>
            }
          >
            <span className="upload-manuscript-actions__tip">
              {sendButton}
            </span>
          </OverlayTrigger>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default UploadManusciptModal;
