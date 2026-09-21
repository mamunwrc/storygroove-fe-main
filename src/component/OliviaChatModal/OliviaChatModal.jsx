import {
  useRef,
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
  useMemo,
  memo,
} from "react";
import { LuX } from "react-icons/lu";
import { computeActOffsets } from "../../Pages/BookEditor/utils";
import {
  findLatestLayeringTableTextFromMessages,
  hasDetectedNewScenes,
} from "../../Pages/BookEditor/oliviaLayeringParse";
import { isRichScene, MarkdownView, sceneTitleFromRichText } from "./oliviaChatHelpers";
import {
  countOliviaOutlineTableRows,
  extractOliviaOutlineTable,
} from "./oliviaMarkdownNormalize";
import OliviaChatComposer from "./OliviaChatComposer";
import OliviaChatMessageRow from "./OliviaChatMessageRow";
import "./OliviaChatModal.scss";

const ScenePlanFrame = memo(function ScenePlanFrame({
  tableMarkdown,
  nextLabel,
  open,
  onOpenChange,
  children,
}) {
  const closeBtnRef = useRef(null);
  const hasPlan = Boolean(tableMarkdown);

  useEffect(() => {
    if (!open || !hasPlan) return undefined;
    closeBtnRef.current?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, hasPlan, onOpenChange]);

  return (
    <div className="ocm-conversation">
      {children}
      {open && hasPlan ? (
        <div
          className="ocm-plan-sheet"
          id="ocm-plan-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ocm-plan-title"
        >
          <div className="ocm-plan-sheet__bar">
            <div className="ocm-plan-sheet__copy">
              <h2 id="ocm-plan-title" className="ocm-plan-sheet__title">
                Your chapter plan
              </h2>
              {nextLabel ? (
                <p className="ocm-plan-sheet__next">{nextLabel}</p>
              ) : null}
            </div>
            <button
              ref={closeBtnRef}
              type="button"
              className="ocm-plan-sheet__close"
              onClick={() => onOpenChange(false)}
            >
              Close
            </button>
          </div>
          <div className="ocm-plan-sheet__body ocm-message-text">
            <MarkdownView text={tableMarkdown} />
          </div>
        </div>
      ) : null}
    </div>
  );
});

const TypingIndicator = ({ "aria-live": ariaLive, "aria-label": ariaLabel } = {}) => (
  <div
    className="ocm-message ocm-agent-message"
    aria-live={ariaLive}
    aria-label={ariaLabel}
  >
    <div className="ocm-message-avatar">
      <img
        src="/assets/images/olivia.png"
        alt="Olivia"
        onError={(e) => {
          e.target.src = "/assets/images/avatar.jpg";
        }}
      />
    </div>
    <div className="ocm-message-bubble">
      <div className="ocm-typing-dots">
        <span />
        <span />
        <span />
      </div>
    </div>
  </div>
);

const OliviaChatModal = ({
  messages = [],
  /**
   * Send a user message. The textarea draft is owned by OliviaChatComposer
   * (typing must not re-render the message list); `onSend` receives trimmed text.
   */
  onSend,
  onClose,
  onWordLimitBlocked,
  isProcessing = false,
  isStreaming = false,
  onInsertScene,
  onQuickReply,
  userContents = [],
  targetScene = null,
  layeringState = null,
  onSceneDelivered,
  savedSceneMessageIds = [],
  isHistoryLoading = false,
  onLoadEarlierMessages,
  hasMoreOnServer = false,
  isLoadingEarlier = false,
  webSearchEnabled = false,
  onWebSearchToggle,
  novelId = null,
  coachingScene = null,
  onExitCoaching,
}) => {
  const messagesEndRef = useRef(null);
  const messageRefs = useRef({});
  const prevIsStreamingRef = useRef(false);
  const skipNextAutoScrollRef = useRef(false);
  const scrollContainerRef = useRef(null);
  const showEarlierAnchorRef = useRef(null);
  // True while the viewport is at/near the bottom — only then do we auto-follow
  // new messages. Prevents yanking the reader down while they browse history.
  const isNearBottomRef = useRef(true);
  const [insertingMessageId, setInsertingMessageId] = useState(null);
  const [insertOutlineLoadingMessageId, setInsertOutlineLoadingMessageId] =
    useState(null);
  const [savingSceneId, setSavingSceneId] = useState(null);
  const [planOpen, setPlanOpen] = useState(false);
  const planToggleRef = useRef(null);

  const savedSceneIdSet = useMemo(
    () => new Set(savedSceneMessageIds),
    [savedSceneMessageIds]
  );

  const actOffsets = useMemo(() => computeActOffsets(userContents), [userContents]);

  const showFullHistoryLoader = isHistoryLoading && messages.length === 0;

  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const streamingAssistantMessage =
    lastMessage?.role === "assistant" ? lastMessage : null;

  const streamingMessageId =
    (isStreaming || isProcessing) && streamingAssistantMessage
      ? streamingAssistantMessage.id
      : null;

  /** Hide empty assistant placeholder until first streamed token (avoids a blank bubble). */
  const showTypingIndicator =
    isProcessing ||
    (isStreaming &&
      streamingAssistantMessage &&
      !String(streamingAssistantMessage.text || "").trim());

  const shouldHideEmptyStreamingRow = (message) =>
    isStreaming &&
    message.id === streamingMessageId &&
    !String(message.text || "").trim();

  const lastRichSceneId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (
        m.role === "assistant" &&
        isRichScene(m.text) &&
        m.id !== streamingMessageId
      ) {
        return m.id;
      }
    }
    return null;
  }, [messages, streamingMessageId]);

  useEffect(() => {
    const wasStreaming = prevIsStreamingRef.current;
    prevIsStreamingRef.current = isStreaming;

    if (wasStreaming && !isStreaming) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.role === "assistant" && hasDetectedNewScenes(lastMsg.text)) {
        skipNextAutoScrollRef.current = true;
        const el = messageRefs.current[lastMsg.id];
        if (el) {
          setTimeout(() => {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 150);
        }
      }
    }
  }, [isStreaming, messages]);

  useEffect(() => {
    if (skipNextAutoScrollRef.current) {
      skipNextAutoScrollRef.current = false;
      return;
    }
    const newestIsUser =
      messages.length > 0 && messages[messages.length - 1].role === "user";
    // Only auto-follow when the reader is at the bottom, or right after they
    // send a message. Don't yank them down while they read earlier history.
    if (isNearBottomRef.current || newestIsUser) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isProcessing]);

  const isBusy = isProcessing || isStreaming;
  const inputLocked = isBusy || isHistoryLoading;

  const pinnedTableMarkdown = useMemo(() => {
    const streamingIdx = streamingMessageId
      ? messages.findIndex((m) => m.id === streamingMessageId)
      : -1;
    const fromThread = findLatestLayeringTableTextFromMessages(
      messages,
      streamingIdx >= 0 ? streamingIdx : undefined
    );
    const extractedThread = extractOliviaOutlineTable(fromThread);
    if (extractedThread) return extractedThread;
    if (targetScene || coachingScene) return null;
    return extractOliviaOutlineTable(layeringState?.tableText);
  }, [
    messages,
    streamingMessageId,
    targetScene,
    coachingScene,
    layeringState?.tableText,
  ]);

  const pinnedTableNextLabel = useMemo(() => {
    const next = layeringState?.nextLayeringTarget;
    if (!next || layeringState?.allDone) return null;
    const ref = next.rawSceneRef || "";
    const title = (next.title || "").trim();
    if (!ref) return null;
    const plainRef = ref.replace(/^NEW\s+/i, "");
    return title ? `Up next: ${title}` : `Up next: ${plainRef}`;
  }, [layeringState?.nextLayeringTarget, layeringState?.allDone]);

  const planSceneCount = useMemo(
    () => countOliviaOutlineTableRows(pinnedTableMarkdown),
    [pinnedTableMarkdown]
  );

  useEffect(() => {
    if (!pinnedTableMarkdown) setPlanOpen(false);
  }, [pinnedTableMarkdown]);

  const handlePlanOpenChange = useCallback((nextOpen) => {
    setPlanOpen(nextOpen);
    if (!nextOpen) {
      planToggleRef.current?.focus();
    }
  }, []);

  const lastQuickReplyMsgId = useMemo(() => {
    let id = null;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant" && messages[i].quickReplies?.length) {
        id = messages[i].id;
        break;
      }
    }
    return id;
  }, [messages]);

  const lastMessageIsUser =
    messages.length > 0 && messages[messages.length - 1].role === "user";
  const showQuickReplies =
    !lastMessageIsUser &&
    (!isBusy || (lastQuickReplyMsgId && !isProcessing));

  const handleDirectLayeringInsert = useCallback(
    async (message, target) => {
      if (!target || insertOutlineLoadingMessageId) return;
      const sceneTitle = sceneTitleFromRichText(message.text);
      setInsertOutlineLoadingMessageId(message.id);
      try {
        if (onInsertScene) {
          await onInsertScene(
            message.text,
            target.actNumber,
            target.afterSceneIndex,
            sceneTitle,
            target.layeringStableKey,
            message.id
          );
        }
      } finally {
        setInsertOutlineLoadingMessageId(null);
      }
    },
    [insertOutlineLoadingMessageId, onInsertScene]
  );

  const handleInsertConfirm = useCallback(
    async (text, actNumber, afterSceneIndex, sceneTitle, layeringStableKey) => {
      const sourceMessageId = insertingMessageId;
      if (!sourceMessageId) return;
      setInsertOutlineLoadingMessageId(sourceMessageId);
      try {
        if (onInsertScene) {
          await onInsertScene(
            text,
            actNumber,
            afterSceneIndex,
            sceneTitle,
            layeringStableKey,
            sourceMessageId
          );
        }
      } finally {
        setInsertOutlineLoadingMessageId(null);
        setInsertingMessageId(null);
      }
    },
    [insertingMessageId, onInsertScene]
  );

  const handleSaveSceneToOutline = useCallback(
    async (message) => {
      if (!onSceneDelivered || !targetScene) return;
      setSavingSceneId(message.id);
      try {
        await onSceneDelivered({
          messageId: message.id,
          text: message.text,
          actNumber: targetScene.actNumber,
          sceneIndex: targetScene.sceneIndex,
        });
      } finally {
        setSavingSceneId(null);
      }
    },
    [onSceneDelivered, targetScene]
  );

  const handleStartInsertForm = useCallback((messageId) => {
    setInsertingMessageId(messageId);
  }, []);

  const handleCancelInsertForm = useCallback(() => {
    setInsertingMessageId(null);
  }, []);

  const registerMessageRef = useCallback((messageId, el) => {
    if (el) {
      messageRefs.current[messageId] = el;
    }
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distanceFromBottom <= 80;
  }, []);

  const handleShowEarlier = useCallback(() => {
    if (!hasMoreOnServer || isLoadingEarlier || !onLoadEarlierMessages) return;
    const container = scrollContainerRef.current;
    if (container) {
      showEarlierAnchorRef.current = {
        scrollTop: container.scrollTop,
        scrollHeight: container.scrollHeight,
      };
    }
    skipNextAutoScrollRef.current = true;
    onLoadEarlierMessages();
  }, [hasMoreOnServer, isLoadingEarlier, onLoadEarlierMessages]);

  useLayoutEffect(() => {
    const anchor = showEarlierAnchorRef.current;
    const container = scrollContainerRef.current;
    if (!anchor || !container) return;
    const delta = container.scrollHeight - anchor.scrollHeight;
    container.scrollTop = anchor.scrollTop + delta;
    showEarlierAnchorRef.current = null;
  }, [messages.length]);

  return (
    <div className="ocm-backdrop" onClick={onClose}>
      <div className="ocm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ocm-header">
          <h5 className="ocm-title">
            Olivia Story Bible, Outlining Expert, Book Coach
          </h5>
          <div className="ocm-header-actions">
            {/* Plan pin is not ready yet — keep the control out of the header.
            {pinnedTableMarkdown ? (
              <button
                ref={planToggleRef}
                type="button"
                className="ocm-plan-dock__btn"
                aria-expanded={planOpen}
                aria-controls="ocm-plan-sheet"
                aria-label={
                  planOpen
                    ? "Hide scene plan"
                    : planSceneCount > 0
                      ? `View scene plan, ${planSceneCount} scenes`
                      : "View scene plan"
                }
                onClick={() => handlePlanOpenChange(!planOpen)}
              >
                <LuList aria-hidden className="ocm-plan-dock__icon" />
                <span className="ocm-plan-dock__label">
                  {planOpen ? "Hide plan" : "View plan"}
                </span>
                {planSceneCount > 0 ? (
                  <span className="ocm-plan-dock__count">
                    {planSceneCount}
                  </span>
                ) : null}
              </button>
            ) : null}
            */}
            <button
              type="button"
              className="ocm-close-btn"
              onClick={onClose}
              aria-label="Close Olivia chat"
            >
              <LuX />
            </button>
          </div>
        </div>

        {coachingScene && (
          <div className="ocm-mode-chip" role="status" aria-live="polite">
            <span className="ocm-mode-chip__label">
              Coaching
              {" — "}
              {coachingScene.sceneTitle ||
                `Chapter ${coachingScene.globalSceneNumber}`}
            </span>
            {onExitCoaching && (
              <button
                type="button"
                className="ocm-mode-chip__exit"
                onClick={onExitCoaching}
              >
                Back to general chat
              </button>
            )}
          </div>
        )}

        <ScenePlanFrame
          tableMarkdown={pinnedTableMarkdown}
          nextLabel={pinnedTableNextLabel}
          open={planOpen}
          onOpenChange={handlePlanOpenChange}
        >
        <div
          className="ocm-body"
          ref={scrollContainerRef}
          onScroll={handleScroll}
        >
          {showFullHistoryLoader ? (
            <div
              className="ocm-history-loader"
              aria-busy="true"
              aria-live="polite"
              aria-label="Loading conversation"
            >
              <div className="ocm-history-loader-card">
                <div className="ocm-history-loader-spinner" role="status" />
                <p className="ocm-history-loader-title">Loading conversation</p>
                <p className="ocm-history-loader-sub">
                  Fetching your thread with Olivia…
                </p>
              </div>
            </div>
          ) : (
            <div className="ocm-messages-list">
              {isHistoryLoading && messages.length > 0 && (
                <div
                  className="ocm-history-loading-banner"
                  aria-live="polite"
                >
                  Loading earlier messages…
                </div>
              )}
              {hasMoreOnServer && (
                <div className="ocm-show-earlier-row">
                  <button
                    type="button"
                    className="ocm-show-earlier-btn"
                    onClick={handleShowEarlier}
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
              {messages.map((message, msgIndex) =>
                shouldHideEmptyStreamingRow(message) ? null : (
                <OliviaChatMessageRow
                  key={message.id}
                  message={message}
                  msgIndex={msgIndex}
                  messages={messages}
                  userContents={userContents}
                  layeringState={layeringState}
                  targetScene={targetScene}
                  actOffsets={actOffsets}
                  streamingMessageId={streamingMessageId}
                  lastRichSceneId={lastRichSceneId}
                  lastQuickReplyMsgId={lastQuickReplyMsgId}
                  showQuickReplies={showQuickReplies}
                  savedSceneIdSet={savedSceneIdSet}
                  isBusy={isBusy}
                  insertingMessageId={insertingMessageId}
                  insertOutlineLoadingMessageId={insertOutlineLoadingMessageId}
                  savingSceneId={savingSceneId}
                  onQuickReply={onQuickReply}
                  onInsertScene={onInsertScene}
                  onSceneDelivered={onSceneDelivered}
                  onDirectLayeringInsert={handleDirectLayeringInsert}
                  onInsertConfirm={handleInsertConfirm}
                  onStartInsertForm={handleStartInsertForm}
                  onCancelInsertForm={handleCancelInsertForm}
                  onSaveSceneToOutline={handleSaveSceneToOutline}
                  registerMessageRef={registerMessageRef}
                />
              ))}

              {showTypingIndicator && (
                <TypingIndicator aria-live="polite" aria-label="Olivia is typing" />
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        </ScenePlanFrame>

        <OliviaChatComposer
          novelId={novelId}
          onSend={onSend}
          onWordLimitBlocked={onWordLimitBlocked}
          inputLocked={inputLocked}
          webSearchEnabled={webSearchEnabled}
          onWebSearchToggle={onWebSearchToggle}
        />
      </div>
    </div>
  );
};

export default memo(OliviaChatModal);
