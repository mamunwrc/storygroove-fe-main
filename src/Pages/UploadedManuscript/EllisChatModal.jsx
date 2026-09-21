import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { LuX } from "react-icons/lu";
import { MdSend } from "react-icons/md";
import VoiceRecorder from "../../component/Chat/VoiceRecorder";
import { useDictationDraft } from "../../hooks/useDictationDraft";
import { isEllisChatOverWordLimit } from "../../constants/ellisStudioInput";
import EllisChatMessageRow from "./EllisChatMessageRow";
import {
  dropEllisOptimisticDuplicates,
  isEllisHiddenUserMessage,
} from "./ellisChatHelpers";
import "../../component/OliviaChatModal/OliviaChatModal.scss";

const ELLIS_AVATAR_BG =
  "url(/assets/images/ellis.png), url(/assets/images/Ellis-Avatar.jpg)";

const TypingIndicator = () => (
  <div
    className="ocm-message ocm-agent-message"
    aria-live="polite"
    aria-label="Ellis is typing"
  >
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
    <div className="ocm-message-bubble">
      <div className="ocm-typing-dots">
        <span />
        <span />
        <span />
      </div>
    </div>
  </div>
);

const EllisEmptyHint = ({ chapterLabel }) => (
  <div className="ocm-history-loader" style={{ minHeight: 160 }}>
    <div className="ocm-history-loader-card">
      <div
        className="ocm-message-avatar"
        style={{ margin: "0 auto 1rem", width: 56, height: 56 }}
      >
        <div
          className="ocm-message-avatar__img"
          role="img"
          aria-label="Ellis"
          style={{
            backgroundImage: ELLIS_AVATAR_BG,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      </div>
      <p className="ocm-history-loader-title">Start with Ellis in chat</p>
      <p className="ocm-history-loader-sub">
        {chapterLabel
          ? `Open Ellis to begin your developmental edit pass — start with ${chapterLabel} when you're ready.`
          : "Open Ellis to begin your scene-by-scene developmental edit pass."}
      </p>
    </div>
  </div>
);

/**
 * Floating Ellis' chat modal — props-driven; parent owns messages and send/insert.
 * `targetChapter` must be a live map row; archived chapters are ignored (Olivia-parity).
 */
const ELLIS_TEXTAREA_MAX_HEIGHT_PX = 180;

const EllisChatModal = ({
  messages = [],
  onSend,
  onClose,
  onWordLimitBlocked,
  targetChapter = null,
  letterReady: _letterReady = false,
  insertableReviewMessageIds = [],
  isHistoryLoading = false,
  hasMoreOnServer = false,
  onLoadEarlierMessages,
  isLoadingEarlier = false,
  isProcessing = false,
  isStreaming = false,
  insertingMessageId = null,
  onInsertReview,
  blocked = false,
}) => {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const inputRef = useRef(input);
  // True while the viewport is at/near the bottom — only then do we auto-follow
  // new messages. Prevents yanking the reader down while they browse history.
  const isNearBottomRef = useRef(true);
  // Stays true after "Show earlier" until the writer scrolls back to the tail.
  // Blocks auto-follow so a later history merge cannot yank them to latest.
  const historyBrowseLockRef = useRef(false);
  // Set just before a "Show earlier" prepend so we can restore the reader's
  // position (keep the same message under the viewport) instead of jumping.
  const prependRestoreRef = useRef(null);
  const skipNextAutoScrollRef = useRef(false);
  const lastNewestIdRef = useRef(null);

  inputRef.current = input;

  const displayMessages = useMemo(
    () => dropEllisOptimisticDuplicates(messages),
    [messages]
  );

  const getDraft = useCallback(() => inputRef.current, []);
  const {
    onDictationStart,
    onDictationProgress,
    onTranscript: onDictationTranscript,
  } = useDictationDraft({ getDraft, setDraft: setInput });

  const liveTarget = targetChapter?.archived ? null : targetChapter;
  const chapterLabel = liveTarget?.label || null;

  const NEAR_BOTTOM_THRESHOLD_PX = 80;

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom <= NEAR_BOTTOM_THRESHOLD_PX;
    isNearBottomRef.current = nearBottom;
    if (nearBottom) historyBrowseLockRef.current = false;
  }, []);

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const scrollHeight = el.scrollHeight;
    const capped = Math.min(scrollHeight, ELLIS_TEXTAREA_MAX_HEIGHT_PX);
    el.style.height = `${capped}px`;
    el.style.overflowY =
      scrollHeight > ELLIS_TEXTAREA_MAX_HEIGHT_PX ? "auto" : "hidden";
  }, []);

  useLayoutEffect(() => {
    const el = scrollContainerRef.current;
    const newestId =
      displayMessages.length > 0
        ? displayMessages[displayMessages.length - 1].id
        : null;
    const newestChanged = newestId !== lastNewestIdRef.current;
    lastNewestIdRef.current = newestId;

    // After a "Show earlier" prepend: keep the previously-visible message in
    // place by offsetting scrollTop by the height that was added on top.
    if (prependRestoreRef.current != null && el) {
      const { prevHeight, prevTop } = prependRestoreRef.current;
      const delta = el.scrollHeight - prevHeight;
      if (delta === 0) {
        // Loading flag flipped but older rows have not been prepended yet.
        return;
      }
      el.scrollTop = prevTop + delta;
      prependRestoreRef.current = null;
      skipNextAutoScrollRef.current = false;
      return;
    }
    if (skipNextAutoScrollRef.current) {
      skipNextAutoScrollRef.current = false;
      return;
    }
    if (historyBrowseLockRef.current) return;
    // A latest-page refetch rebuilds `messages` even when the tail is unchanged.
    // Only follow when the newest row actually changed (or tokens are streaming).
    if (!newestChanged && !isStreaming) return;
    if (!isNearBottomRef.current || !el) return;
    // Instant — smooth scrollIntoView can finish after Show earlier / scroll-up
    // and yank the writer back to the latest page.
    el.scrollTop = el.scrollHeight;
  }, [displayMessages, isStreaming, isProcessing]);

  useEffect(() => {
    resizeTextarea();
  }, [input, resizeTextarea]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape" && typeof onClose === "function") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const streamingAssistantMessage =
    displayMessages.length > 0 &&
    displayMessages[displayMessages.length - 1].role === "assistant"
      ? displayMessages[displayMessages.length - 1]
      : null;
  const streamingMessageId =
    (isStreaming || isProcessing) && streamingAssistantMessage
      ? streamingAssistantMessage.id
      : null;
  const showTypingIndicator =
    isProcessing ||
    (isStreaming &&
      streamingAssistantMessage &&
      !String(streamingAssistantMessage.text || "").trim());

  const shouldHideEmptyStreamingRow = (message) =>
    (isStreaming || isProcessing) &&
    message.id === streamingMessageId &&
    !String(message.text || "").trim();

  const isOverWordLimit = useMemo(
    () => isEllisChatOverWordLimit(input),
    [input]
  );

  const triggerWordLimitBlock = useCallback(() => {
    onWordLimitBlocked?.();
  }, [onWordLimitBlocked]);

  const handlePaste = useCallback(
    (e) => {
      const pasted = e.clipboardData?.getData("text") ?? "";
      if (!pasted) return;

      const el = e.target;
      const start = el.selectionStart ?? input.length;
      const end = el.selectionEnd ?? input.length;
      const combined = `${input.slice(0, start)}${pasted}${input.slice(end)}`;

      if (isEllisChatOverWordLimit(combined)) {
        e.preventDefault();
        triggerWordLimitBlock();
      }
    },
    [input, triggerWordLimitBlock]
  );

  const handleSend = () => {
    const text = String(inputRef.current || "").trim();
    if (isStreaming || isProcessing || blocked) return;
    if (!text) return;
    if (isEllisChatOverWordLimit(text)) {
      triggerWordLimitBlock();
      return;
    }
    // Sending always scrolls to the reader's own message + the reply.
    historyBrowseLockRef.current = false;
    isNearBottomRef.current = true;
    // Clear the ref synchronously so a repeated Enter in this same render
    // cannot enqueue the same user row twice before setInput re-renders.
    inputRef.current = "";
    setInput("");
    onSend?.(text);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const inputLocked = isStreaming || isProcessing || isHistoryLoading;
  const canSend = !inputLocked && input.trim().length > 0 && !isOverWordLimit;

  const composerPlaceholder = "Ask Ellis' anything";

  const handleShowEarlier = useCallback(() => {
    if (typeof onLoadEarlierMessages !== "function") return;
    const el = scrollContainerRef.current;
    if (el) {
      // Abort any in-flight smooth auto-scroll before we snapshot geometry.
      el.scrollTop = el.scrollTop;
      // Snapshot current geometry so the layout effect can restore position
      // once the older messages are prepended (no jump to bottom).
      prependRestoreRef.current = {
        prevHeight: el.scrollHeight,
        prevTop: el.scrollTop,
      };
    }
    historyBrowseLockRef.current = true;
    isNearBottomRef.current = false;
    skipNextAutoScrollRef.current = true;
    onLoadEarlierMessages();
  }, [onLoadEarlierMessages]);

  return (
    <div className="ocm-backdrop" onClick={onClose} role="presentation">
      <div
        className="ocm-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Ask Ellis"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ocm-header">
          <h5 className="ocm-title">
            Ellis Developmental Editor and Manuscript Coach
          </h5>
          <button
            type="button"
            className="ocm-close-btn"
            onClick={onClose}
            aria-label="Close Ellis' chat"
          >
            <LuX />
          </button>
        </div>

        {blocked ? (
          <div className="ocm-body">
            <div className="ocm-history-loader">
              <div className="ocm-history-loader-card">
                <p className="ocm-history-loader-title">
                  Ellis' editing is on the Studio plan
                </p>
                <p className="ocm-history-loader-sub">
                  Upgrade to chat with your developmental editor and get
                  scene-by-scene manuscript feedback.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div
              className="ocm-body"
              ref={scrollContainerRef}
              onScroll={handleScroll}
            >
              {isHistoryLoading && displayMessages.length === 0 ? (
                <div
                  className="ocm-history-loader"
                  aria-busy="true"
                  aria-live="polite"
                  aria-label="Loading conversation"
                >
                  <div className="ocm-history-loader-card">
                    <div
                      className="ocm-history-loader-spinner"
                      role="status"
                    />
                    <p className="ocm-history-loader-title">
                      Loading conversation
                    </p>
                    <p className="ocm-history-loader-sub">
                      Fetching your thread with Ellis…
                    </p>
                  </div>
                </div>
              ) : (
                <div className="ocm-messages-list">
                  {isHistoryLoading && displayMessages.length > 0 && (
                    <div className="ocm-history-loading-banner" aria-live="polite">
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
                  {!isHistoryLoading && displayMessages.length === 0 && (
                    <EllisEmptyHint chapterLabel={chapterLabel} />
                  )}
                  {displayMessages.map((m) =>
                    (shouldHideEmptyStreamingRow(m) ||
                      isEllisHiddenUserMessage(m)) ? null : (
                      <EllisChatMessageRow
                        key={m.id}
                      message={m}
                      chapterLabel={chapterLabel}
                      streamingMessageId={streamingMessageId}
                      insertableReviewMessageIds={insertableReviewMessageIds}
                      isInserting={insertingMessageId === m.id}
                      onInsertReview={onInsertReview}
                      />
                    )
                  )}
                  {showTypingIndicator && <TypingIndicator />}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div className="ocm-input-container">
              <div className="ocm-input-form">
                <div className="ocm-input-box">
                  <div className="ocm-input-row">
                    <textarea
                      ref={textareaRef}
                      rows={1}
                      className="ocm-input"
                      placeholder={composerPlaceholder}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onPaste={handlePaste}
                      onKeyDown={handleKeyDown}
                      disabled={inputLocked}
                    />
                    <div className="ocm-input-actions">
                      <VoiceRecorder
                        onDictationStart={onDictationStart}
                        onDictationProgress={onDictationProgress}
                        onTranscript={onDictationTranscript}
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
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EllisChatModal;
