import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import ChatFileMessage from "../../component/Chat/ChatFileMessage";
import {
  getEllisChapterReviewFooterText,
  getEllisInsertButtonLabel,
  shouldShowEllisInsertButton,
  ELLIS_INSERT_CONFIRM_KIND,
  ELLIS_SCENE_WELCOME_KIND,
  isEllisDevelopmentalReviewMessage,
  isEllisTaggedReviewMessage,
  isPartialEllisDevelopmentalReview,
  stripEllisLegacyWorkflowCta,
} from "./ellisChatHelpers";
import { prepareEllisConversationalForDisplay } from "./ellisConversationalFormat";
import { EllisChapterReviewView } from "./ellisReviewFormat";
import { isEllisChatWordLimitMessage } from "../../constants/ellisStudioInput";
import EllisWordLimitNotice from "./EllisWordLimitNotice";
import ChatMessageCopyButton from "../../component/Chat/ChatMessageCopyButton";
import "./SceneArchitectReview.scss";

const ELLIS_AVATAR_BG =
  "url(/assets/images/ellis.png), url(/assets/images/Ellis-Avatar.jpg)";

const markdownComponents = {
  // eslint-disable-next-line jsx-a11y/anchor-has-content
  a: (props) => <a {...props} target="_blank" rel="noopener noreferrer" />,
};

const EllisMarkdown = ({ children }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm, remarkBreaks]}
    components={markdownComponents}
  >
    {children || ""}
  </ReactMarkdown>
);

const EllisChapterReviewFooter = ({ alreadySaved = false }) => (
  <div className="ellis-chapter-review-footer">
    <EllisMarkdown>{getEllisChapterReviewFooterText(alreadySaved)}</EllisMarkdown>
  </div>
);

const isEllisPreformattedUiMessage = (message) => {
  const kind = message?.metadata?.kind;
  return (
    kind === ELLIS_SCENE_WELCOME_KIND || kind === ELLIS_INSERT_CONFIRM_KIND
  );
};

const formatEllisConversationalText = (message, text) =>
  isEllisPreformattedUiMessage(message)
    ? text
    : prepareEllisConversationalForDisplay(text);

const EllisChatMessageRow = ({
  message,
  streamingMessageId = null,
  insertableReviewMessageIds = [],
  isInserting = false,
  onInsertReview,
}) => {
  const isStreamingRow = message.id === streamingMessageId;
  const displayText = stripEllisLegacyWorkflowCta(message.text);
  const isTaggedReview = isEllisTaggedReviewMessage({
    ...message,
    text: displayText,
  });
  const isReviewMessage =
    isTaggedReview ||
    isEllisDevelopmentalReviewMessage({
      ...message,
      text: displayText,
    });
  const isStreamingReview =
    isStreamingRow && isPartialEllisDevelopmentalReview(displayText);
  const showFormattedReview =
    isReviewMessage || isStreamingReview;
  const isInsertConfirm =
    message.role === "assistant" &&
    message.metadata?.kind === ELLIS_INSERT_CONFIRM_KIND;
  // Insertability is per-chapter: only the latest first-pass review of a chapter
  // whose review isn't already in the Revision Plan is insertable.
  const isInsertable = insertableReviewMessageIds.includes(String(message.id));
  const showInsertFooterAsSaved = !isInsertable && !isInserting;
  // Keep button visible while inserting (optimistic save flips isInsertable off).
  const showInsert = shouldShowEllisInsertButton({
    isReviewMessage: isReviewMessage && !isStreamingReview,
    isAssistant: message.role === "assistant",
    isStreamingRow,
    alreadySaved: !isInsertable,
    isInserting,
    hasInsertHandler: typeof onInsertReview === "function",
  });
  const showPostReviewFooter =
    isReviewMessage && !isStreamingRow && Boolean(displayText.trim());

  return (
    <div
      className={`ocm-message ${
        message.role === "user" ? "ocm-user-message" : "ocm-agent-message"
      }${isInsertConfirm ? " ocm-message--enter" : ""}`}
    >
      {message.role === "assistant" && (
        <div className="ocm-message-avatar">
          <div
            className="ocm-message-avatar__img"
            role="img"
            aria-label="Ellis"
            draggable={false}
            style={{
              backgroundImage: ELLIS_AVATAR_BG,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          />
        </div>
      )}
      <div className="ocm-message-bubble-wrapper">
        <div className="ocm-message-bubble">
          <div className="ocm-message-text">
            {message.role === "assistant" && showFormattedReview ? (
              <>
                <EllisChapterReviewView text={displayText} />
                {isStreamingReview && (
                  <div className="ocm-table-streaming-notice">
                    <span className="ocm-streaming-pulse" />
                    Ellis&apos; is writing your chapter review…
                  </div>
                )}
                {showPostReviewFooter && !isStreamingReview && (
                  <EllisChapterReviewFooter
                    alreadySaved={showInsertFooterAsSaved}
                  />
                )}
              </>
            ) : message.role === "assistant" &&
              isEllisChatWordLimitMessage(message.text) ? (
              <EllisWordLimitNotice className="ocm-word-limit-warning ocm-word-limit-warning--bubble" />
            ) : message.role === "assistant" ? (
              <EllisMarkdown>
                {formatEllisConversationalText(message, displayText)}
              </EllisMarkdown>
            ) : (
              message.text
            )}
            {message.attachments?.length > 0 && (
              <div className="ocm-message-attachments">
                {message.attachments.map((att, idx) => (
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
          {message.role === "assistant" && (
            <div className="ocm-message-footer">
              <ChatMessageCopyButton text={displayText} />
            </div>
          )}
        </div>
        {showInsert && (
          <div className="ocm-insert-scene-area">
            <button
              type="button"
              className="ocm-insert-scene-btn"
              disabled={isInserting}
              onClick={() => onInsertReview(message)}
            >
              {isInserting ? (
                <>
                  <span className="ocm-insert-spinner" aria-hidden />
                  Inserting to Revision Plan…
                </>
              ) : (
                getEllisInsertButtonLabel()
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(EllisChatMessageRow);
