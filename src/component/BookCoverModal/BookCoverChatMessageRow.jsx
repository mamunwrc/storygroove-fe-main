import { memo } from "react";
import { LuPalette, LuPaintbrush } from "react-icons/lu";
import { MarkdownView } from "../OliviaChatModal/oliviaChatHelpers";
import ChatFileMessage from "../Chat/ChatFileMessage";
import {
  formatCoverAssistantText,
  shouldShowCoverGenerateButton,
  resolveCoverAssetUrl,
  isCoverRenderNotice,
  getCoverRenderNoticeHeadline,
  getCoverRenderRefineCta,
} from "./coverChatHelpers";

const StudioAvatar = () => (
  <div className="ocm-message-avatar">
    <div
      className="bcs-studio-avatar"
      role="img"
      aria-label="Cover Studio"
    >
      <LuPalette size={22} aria-hidden />
    </div>
  </div>
);

const BookCoverChatMessageRow = memo(function BookCoverChatMessageRow({
  message,
  onImageClick,
  onGenerateCover,
  onEditCover,
  isRendering = false,
  quotaEmpty = false,
  generatingMessageId = null,
}) {
  const isUser = message.role === "user";
  const coverUrl = message.coverUrl;
  const isRenderNotice = isCoverRenderNotice(message);
  const showInlineCover =
    !isUser && (isRenderNotice || coverUrl) && Boolean(coverUrl);
  const attachments = Array.isArray(message.attachments)
    ? message.attachments
    : [];
  const resolvedCoverUrl = coverUrl ? resolveCoverAssetUrl(coverUrl) : null;
  const renderHeadline =
    isRenderNotice && showInlineCover
      ? getCoverRenderNoticeHeadline(message)
      : null;
  const renderRefineCta =
    isRenderNotice && showInlineCover ? getCoverRenderRefineCta() : null;
  const displayText = isUser
    ? message.text
    : renderHeadline != null
      ? renderHeadline
      : formatCoverAssistantText(message);
  const showGenerate = shouldShowCoverGenerateButton({
    message,
    quotaEmpty,
    hasGenerateHandler: typeof onGenerateCover === "function",
  });
  const isGeneratingThis =
    isRendering && generatingMessageId && String(message.id) === String(generatingMessageId);
  const canEditInline =
    !isUser &&
    Boolean(coverUrl) &&
    Boolean(message.coverVersionId) &&
    typeof onEditCover === "function";

  return (
    <div
      className={`ocm-message ${
        isUser ? "ocm-user-message" : "ocm-agent-message"
      }`}
    >
      {!isUser && <StudioAvatar />}
      <div className="ocm-message-bubble-wrapper">
        <div className="ocm-message-bubble">
          <div className="ocm-message-text">
            {isUser ? displayText : <MarkdownView text={displayText} />}
          </div>

          {showInlineCover && resolvedCoverUrl && (
            <div className="bcs-render-notice-content">
              <div className="bcs-inline-cover-wrap">
                <button
                  type="button"
                  className="bcs-inline-cover"
                  onClick={() => onImageClick?.(message)}
                  aria-label="View generated cover larger"
                >
                  <img
                    src={resolvedCoverUrl}
                    alt="Generated cover version"
                    className="bcs-inline-cover__img"
                  />
                </button>
                {canEditInline && (
                  <button
                    type="button"
                    className="bcs-inline-cover__edit"
                    onClick={() => onEditCover?.(message)}
                    disabled={isRendering || quotaEmpty}
                    aria-label="Refine this cover"
                    title="Refine this cover"
                  >
                    <LuPaintbrush size={16} aria-hidden />
                    <span>Refine</span>
                  </button>
                )}
              </div>
              {renderRefineCta && (
                <div className="bcs-inline-cover__cta">
                  <MarkdownView text={renderRefineCta} />
                </div>
              )}
            </div>
          )}

          {attachments.length > 0 && (
            <div className="ocm-message-attachments">
              {attachments.map((att, idx) => (
                <ChatFileMessage
                  key={`${message.id}-att-${idx}`}
                  fileUrl={att.fileUrl}
                  fileType={att.fileType}
                  fileName={att.fileName}
                />
              ))}
            </div>
          )}
        </div>
        {showGenerate && (
          <div className="ocm-insert-scene-area">
            <button
              type="button"
              className="ocm-insert-scene-btn"
              disabled={isRendering}
              aria-busy={isGeneratingThis}
              onClick={() => onGenerateCover?.(message)}
            >
              {isGeneratingThis ? "Generating cover…" : "Generate cover image"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

export default BookCoverChatMessageRow;
