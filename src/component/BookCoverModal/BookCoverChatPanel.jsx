import { useRef, useEffect, useState, useCallback } from "react";
import { MdSend } from "react-icons/md";
import {
  LuPalette,
  LuSparkles,
  LuPaintbrush,
  LuType,
  LuLayoutTemplate,
} from "react-icons/lu";
import VoiceRecorder from "../Chat/VoiceRecorder";
import FileUploadButton from "../Chat/FileUploadButton";
import FilePreview from "../Chat/FilePreview";
import { CHAT_MAX_ATTACHMENTS } from "../../constants/chatConstants";
import BookCoverChatMessageRow from "./BookCoverChatMessageRow";
import "../OliviaChatModal/OliviaChatModal.scss";
import "./BookCoverModal.scss";

const StudioAvatar = () => (
  <div className="ocm-message-avatar">
    <div className="bcs-studio-avatar" role="img" aria-label="Cover Studio">
      <LuPalette size={22} aria-hidden />
    </div>
  </div>
);

const COVER_GENERATING_STAGES = [
  { icon: LuLayoutTemplate, label: "Composing the layout…" },
  { icon: LuPaintbrush, label: "Painting the artwork…" },
  { icon: LuType, label: "Setting the typography…" },
  { icon: LuSparkles, label: "Polishing the details…" },
];

const CoverImageGeneratingIndicator = ({ previewSrc = null }) => {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    if (previewSrc) return undefined;
    const id = setInterval(() => {
      setStageIndex((prev) => (prev + 1) % COVER_GENERATING_STAGES.length);
    }, 2200);
    return () => clearInterval(id);
  }, [previewSrc]);

  const stage = COVER_GENERATING_STAGES[stageIndex];
  const StageIcon = stage.icon;

  return (
    <div
      className="ocm-message ocm-agent-message bcs-image-generating"
      aria-live="polite"
      aria-busy="true"
      aria-label="Generating cover image"
    >
      <StudioAvatar />
      <div className="ocm-message-bubble-wrapper">
        <div
          className={`bcs-image-generating__card${
            previewSrc ? " bcs-image-generating__card--preview" : ""
          }`}
        >
          {previewSrc ? (
            <>
              <img
                src={`data:image/png;base64,${previewSrc}`}
                alt="Cover preview in progress"
                className="bcs-image-generating__preview"
              />
              <div className="bcs-image-generating__shimmer bcs-image-generating__shimmer--overlay" aria-hidden="true" />
              <div className="bcs-image-generating__preview-badge">
                <span className="bcs-image-generating__pulse-dot" aria-hidden="true" />
                Refining preview…
              </div>
              <div className="bcs-image-generating__progress" aria-hidden="true">
                <span className="bcs-image-generating__progress-bar" />
              </div>
            </>
          ) : (
            <>
              <div className="bcs-image-generating__aurora" aria-hidden="true" />
              <div className="bcs-image-generating__shimmer" aria-hidden="true" />
              <div className="bcs-image-generating__content">
                <div className="bcs-image-generating__orbit" aria-hidden="true">
                  <span className="bcs-image-generating__orbit-ring" />
                  <span className="bcs-image-generating__orbit-dot" />
                  <span className="bcs-image-generating__orbit-core">
                    <StageIcon size={20} />
                  </span>
                </div>
                <div className="bcs-image-generating__labels">
                  <p className="bcs-image-generating__title">
                    Generating cover image
                  </p>
                  <p key={stageIndex} className="bcs-image-generating__stage">
                    {stage.label}
                  </p>
                </div>
                <div className="bcs-image-generating__progress" aria-hidden="true">
                  <span className="bcs-image-generating__progress-bar" />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const CoverTypingIndicator = () => (
  <div
    className="ocm-message ocm-agent-message"
    aria-live="polite"
    aria-label="Cover Studio is typing"
  >
    <StudioAvatar />
    <div className="ocm-message-bubble">
      <div className="ocm-typing-dots">
        <span />
        <span />
        <span />
      </div>
    </div>
  </div>
);

const CoverEmptyHint = () => (
  <div className="ocm-history-loader" style={{ minHeight: 160 }}>
    <div className="ocm-history-loader-card">
      <div
        className="ocm-message-avatar"
        style={{ margin: "0 auto 1rem", width: 56, height: 56 }}
      >
        <StudioAvatar />
      </div>
      <p className="ocm-history-loader-title">Shape your cover in chat</p>
      <p className="ocm-history-loader-sub">
        Describe mood, genre, typography, or attach reference images — refine as
        you go. When you are ready for an image, say so and Studio will offer a
        Generate cover image button on its reply. Saved versions are in Covers.
      </p>
    </div>
  </div>
);

const BookCoverChatPanel = ({
  messages = [],
  onSend,
  onImageClick,
  onGenerateCover,
  onEditCover,
  isProcessing = false,
  isRendering = false,
  generatingMessageId = null,
  streamingPreviewB64 = null,
  inputLocked = false,
  quotaEmpty = false,
  pendingFiles = [],
  onFilesSelected,
  onRemoveFile,
  hasMoreOnServer = false,
  onLoadEarlierMessages,
  isLoadingEarlier = false,
}) => {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing, isRendering, streamingPreviewB64]);

  useEffect(() => {
    resizeTextarea();
  }, [input, resizeTextarea]);

  const isAnyFileUploading = pendingFiles.some((pf) => pf.isUploading);
  const hasUploadedFile = pendingFiles.some(
    (pf) => pf.fileUrl && !pf.isUploading
  );

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (inputLocked || isProcessing || isAnyFileUploading) return;
    if (!text && !hasUploadedFile) return;
    setInput("");
    onSend?.(text);
  }, [
    input,
    inputLocked,
    isProcessing,
    isAnyFileUploading,
    hasUploadedFile,
    onSend,
  ]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceTranscript = (transcript) => {
    const trimmed = String(transcript || "").trim();
    if (!trimmed) return;
    setInput((prev) => {
      const base = prev.trim();
      return base ? `${base} ${trimmed}` : trimmed;
    });
  };

  const canSend =
    !inputLocked &&
    !isProcessing &&
    !isAnyFileUploading &&
    (input.trim().length > 0 || hasUploadedFile);

  const lastMessage = messages[messages.length - 1];
  const lastMessageHasCover = Boolean(
    lastMessage?.coverUrl &&
      (lastMessage?.kind === "render_notice" ||
        lastMessage?.metadata?.kind === "cover_render_notice")
  );
  const showGeneratingIndicator = isRendering && !lastMessageHasCover;

  return (
    <>
      <div className="ocm-body">
        <div className="ocm-messages-list">
          {hasMoreOnServer && (
            <div className="ocm-show-earlier-row">
              <button
                type="button"
                className="ocm-show-earlier-btn"
                onClick={onLoadEarlierMessages}
                disabled={isLoadingEarlier}
                aria-busy={isLoadingEarlier}
                aria-label="Show earlier messages"
              >
                {isLoadingEarlier
                  ? "Loading earlier messages…"
                  : "Show earlier messages"}
              </button>
            </div>
          )}
          {messages.length === 0 && !isProcessing && <CoverEmptyHint />}
          {messages.map((msg) => (
            <BookCoverChatMessageRow
              key={msg.id}
              message={msg}
              onImageClick={onImageClick}
              onGenerateCover={onGenerateCover}
              onEditCover={onEditCover}
              isRendering={isRendering}
              quotaEmpty={quotaEmpty}
              generatingMessageId={generatingMessageId}
            />
          ))}
          {isProcessing && !isRendering && <CoverTypingIndicator />}
          {showGeneratingIndicator && (
            <CoverImageGeneratingIndicator previewSrc={streamingPreviewB64} />
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="ocm-input-container">
        <div className="ocm-input-form">
          <div className="ocm-input-box">
            {pendingFiles.length > 0 && (
              <div className="chat-attachment-strip">
                {pendingFiles.map((pf) => (
                  <FilePreview
                    key={pf.id}
                    file={pf.file}
                    isUploading={pf.isUploading}
                    uploadProgress={pf.uploadProgress}
                    onRemove={() => onRemoveFile?.(pf.id)}
                  />
                ))}
                {pendingFiles.length >= CHAT_MAX_ATTACHMENTS && (
                  <span className="chat-attachment-limit-badge">
                    Max {CHAT_MAX_ATTACHMENTS} files
                  </span>
                )}
              </div>
            )}

            <div className="ocm-input-row">
              <div className="ocm-input-controls">
                <FileUploadButton
                  onFilesSelected={onFilesSelected}
                  disabled={inputLocked}
                  currentCount={pendingFiles.length}
                />
              </div>

              <textarea
                ref={textareaRef}
                rows={1}
                className="ocm-input"
                placeholder="Describe your cover direction, or ask when you are ready to generate…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={inputLocked}
                style={{ overflowY: "hidden" }}
              />

              <div className="ocm-input-actions">
                <VoiceRecorder
                  onTranscript={handleVoiceTranscript}
                  disabled={inputLocked}
                />
                <button
                  type="button"
                  className="ocm-send-btn"
                  onClick={handleSend}
                  disabled={!canSend}
                  aria-label="Send message"
                >
                  <MdSend />
                </button>
              </div>
            </div>
          </div>
        </div>
        {quotaEmpty && (
          <p className="bcs-cover-composer__hint" role="status">
            Render limit reached — browse saved versions in Covers or wait for your limit to renew.
          </p>
        )}
      </div>
    </>
  );
};

export default BookCoverChatPanel;
