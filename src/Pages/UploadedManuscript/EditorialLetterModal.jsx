import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LuX } from "react-icons/lu";
import { toast } from "react-toastify";
import {
  sendEditorialLetterChat,
  saveEditorialLetter,
  getEditorialLetterChatHistory,
} from "../../api/bookGeneration";
import EditorialLetterReader from "./EditorialLetterReader";
import {
  mapEditorialLetterApiMessageToRow,
  resolveLatestEditorialLetterFromMessages,
} from "./editorialLetterHelpers";
import "./EditorialLetterModal.scss";

const ELLIS_AVATAR_BG =
  "url(/assets/images/ellis.png), url(/assets/images/Ellis-Avatar.jpg)";

const SCROLL_NEAR_BOTTOM_THRESHOLD = 80;

const EllisAvatar = ({ className = "" }) => (
  <div
    className={`elm-avatar ${className}`.trim()}
    role="img"
    aria-label="Ellis"
    style={{
      backgroundImage: ELLIS_AVATAR_BG,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    }}
  />
);

const EditorialLetterLoadingState = ({
  title = "Loading…",
  subtitle = "Please wait.",
}) => (
  <div
    className="elm-body elm-body--loading"
    aria-busy="true"
    aria-live="polite"
  >
    <div className="elm-letter-reader__loading-card">
      <div className="elm-letter-reader__spinner" role="status" />
      <p className="elm-letter-reader__loading-title">{title}</p>
      <p className="elm-letter-reader__loading-sub">{subtitle}</p>
    </div>
  </div>
);

/**
 * Editorial Letter modal: Consent -> deliver letter -> read -> save.
 */
const EditorialLetterModal = ({
  open = false,
  novelId,
  initialDraft = "",
  blocked = false,
  onSaved,
  onClose,
}) => {
  const [messages, setMessages] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [consentStep, setConsentStep] = useState(1);

  const abortRef = useRef(null);
  const bufferRef = useRef("");
  const rafRef = useRef(null);
  const streamingRef = useRef(false);
  const placeholderIdRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const scrollEndRef = useRef(null);
  const historyLoadedForRef = useRef(null);

  const busy = isProcessing || isStreaming;

  const latestLetter = useMemo(
    () =>
      resolveLatestEditorialLetterFromMessages(messages) ||
      String(initialDraft || "").trim(),
    [messages, initialDraft]
  );
  const hasLetter = Boolean(latestLetter);

  /**
   * boot — waiting on chat history (never show consent step 2 / save CTA)
   * consent — intro steps before first delivery
   * letter — reading / streaming / saving the letter
   */
  const phase = useMemo(() => {
    if (blocked) return "blocked";
    if (!historyLoaded) return "boot";
    if (!hasLetter && !busy && messages.length === 0) return "consent";
    return "letter";
  }, [blocked, historyLoaded, hasLetter, busy, messages.length]);

  const isNearBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return true;
    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;
    return distanceFromBottom <= SCROLL_NEAR_BOTTOM_THRESHOLD;
  }, []);

  const loadHistory = useCallback(async () => {
    if (!novelId || blocked) {
      setHistoryLoaded(true);
      setIsHistoryLoading(false);
      return;
    }
    setIsHistoryLoading(true);
    setHistoryLoaded(false);
    try {
      const data = await getEditorialLetterChatHistory(novelId);
      let rows = (data.messages || []).map((m) =>
        mapEditorialLetterApiMessageToRow(m)
      );
      if (rows.length === 0 && String(initialDraft || "").trim()) {
        rows = [
          {
            id: "seed-draft",
            role: "assistant",
            text: initialDraft.trim(),
            sortTs: Date.now() - 1000,
            metadata: { kind: "ellis_editorial_letter_draft", seeded: true },
          },
        ];
      }
      rows.sort((a, b) => (a.sortTs || 0) - (b.sortTs || 0));
      setMessages(rows);
      historyLoadedForRef.current = novelId;
    } catch (_) {
      if (String(initialDraft || "").trim()) {
        setMessages([
          {
            id: "seed-draft",
            role: "assistant",
            text: initialDraft.trim(),
            sortTs: Date.now() - 1000,
            metadata: { kind: "ellis_editorial_letter_draft", seeded: true },
          },
        ]);
      } else {
        setMessages([]);
      }
      historyLoadedForRef.current = novelId;
    } finally {
      setIsHistoryLoading(false);
      setHistoryLoaded(true);
    }
  }, [novelId, blocked, initialDraft]);

  useEffect(() => {
    if (!open || !novelId) return undefined;
    if (historyLoadedForRef.current === novelId && historyLoaded) {
      return undefined;
    }
    loadHistory();
    return undefined;
  }, [open, novelId, loadHistory, historyLoaded]);

  useEffect(() => {
    if (!open) {
      historyLoadedForRef.current = null;
      setHistoryLoaded(false);
      setIsHistoryLoading(false);
      setMessages([]);
      setConsentStep(1);
      setErrorMsg(null);
      setIsProcessing(false);
      setIsStreaming(false);
      setIsSaving(false);
    }
  }, [open, novelId]);

  useEffect(() => {
    if (phase !== "letter" || !busy) return;
    if (!isNearBottom()) return;
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [latestLetter, phase, busy, isNearBottom]);

  const startFlushing = useCallback(() => {
    if (streamingRef.current) return;
    streamingRef.current = true;
    const flush = () => {
      const pid = placeholderIdRef.current;
      if (bufferRef.current && pid) {
        const chunk = bufferRef.current;
        bufferRef.current = "";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === pid ? { ...m, text: (m.text || "") + chunk } : m
          )
        );
      }
      if (streamingRef.current) {
        rafRef.current = requestAnimationFrame(flush);
      }
    };
    rafRef.current = requestAnimationFrame(flush);
  }, []);

  const stopFlushing = useCallback(() => {
    streamingRef.current = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const pid = placeholderIdRef.current;
    if (bufferRef.current && pid) {
      const remaining = bufferRef.current;
      bufferRef.current = "";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pid ? { ...m, text: (m.text || "") + remaining } : m
        )
      );
    }
  }, []);

  const runLetterStream = useCallback(async () => {
    if (busy || !novelId) return;
    setErrorMsg(null);
    setIsProcessing(true);
    bufferRef.current = "";

    const assistantMsgId = `assistant-${Date.now()}`;
    placeholderIdRef.current = assistantMsgId;

    setMessages((prev) => [
      ...prev,
      {
        id: assistantMsgId,
        role: "assistant",
        text: "",
        sortTs: Date.now() + 1,
      },
    ]);

    const abortController = new AbortController();
    abortRef.current = abortController;

    let sawToken = false;
    const onFirstToken = () => {
      if (sawToken) return;
      sawToken = true;
      setIsProcessing(false);
      setIsStreaming(true);
      startFlushing();
    };

    try {
      const response = await sendEditorialLetterChat(
        novelId,
        "",
        abortController.signal,
        []
      );
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim().startsWith("data:")) continue;
          const payload = line.trim().slice(5).trim();
          if (!payload) continue;
          let data;
          try {
            data = JSON.parse(payload);
          } catch (_) {
            continue;
          }
          if (data.error) {
            throw new Error(data.error);
          }
          if (data.token) {
            onFirstToken();
            bufferRef.current += data.token;
          }
          if (data.done && data.message) {
            onFirstToken();
            stopFlushing();
            setIsStreaming(false);
            const serverId = data.message.id || assistantMsgId;
            const content = data.message.content || "";
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      id: serverId,
                      text: content,
                      sortTs: data.message.created_at
                        ? data.message.created_at * 1000
                        : m.sortTs,
                    }
                  : m
              )
            );
            placeholderIdRef.current = serverId;
          }
        }
      }
    } catch (err) {
      stopFlushing();
      setIsStreaming(false);
      setMessages((prev) => {
        const pid = placeholderIdRef.current;
        return prev.filter(
          (m) =>
            m.id !== pid ||
            (m.role === "assistant" && String(m.text || "").trim())
        );
      });
      if (err.name !== "AbortError") {
        const msg =
          err.message || "Ellis could not write the letter. Please try again.";
        setErrorMsg(msg);
        toast.error(msg);
        // Return to deliver step so the writer can retry.
        setConsentStep(2);
      }
    } finally {
      setIsProcessing(false);
      stopFlushing();
      setIsStreaming(false);
      abortRef.current = null;
      placeholderIdRef.current = null;
    }
  }, [busy, novelId, startFlushing, stopFlushing]);

  const handleConsent = useCallback(() => {
    runLetterStream();
  }, [runLetterStream]);

  const handleSave = useCallback(async () => {
    if (!hasLetter || busy || isSaving) return;
    setIsSaving(true);
    try {
      const result = await saveEditorialLetter(novelId, latestLetter);
      onSaved?.(result?.editorialLetter || latestLetter);
    } catch (err) {
      toast.error(
        err?.response?.data?.error ||
          err.message ||
          "Could not save the editorial letter."
      );
    } finally {
      setIsSaving(false);
    }
  }, [hasLetter, busy, isSaving, novelId, latestLetter, onSaved]);

  const canDismiss = blocked;

  const handleClose = useCallback(() => {
    if (!canDismiss) return;
    if (abortRef.current) abortRef.current.abort();
    stopFlushing();
    onClose?.();
  }, [canDismiss, onClose, stopFlushing]);

  useEffect(() => {
    if (!canDismiss) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [canDismiss, handleClose]);

  if (!open) return null;

  const modalClassName =
    phase === "letter" ? "elm-modal elm-modal--letter" : "elm-modal";

  const showSaveActions = phase === "letter" && hasLetter && !busy;

  return (
    <div className="elm-backdrop" role="presentation">
      <div
        className={modalClassName}
        role="dialog"
        aria-modal="true"
        aria-label="Ellis Has Your Manuscript"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="elm-header">
          <div className="elm-header-left">
            <EllisAvatar className="elm-header-avatar" />
            <div>
              <h5 className="elm-title">Ellis Has Your Manuscript</h5>
              <p className="elm-subtitle">
                Senior Developmental Editor at StoryGroove
              </p>
            </div>
          </div>
          {canDismiss && (
            <button
              type="button"
              className="elm-close-btn"
              onClick={handleClose}
              aria-label="Close"
            >
              <LuX />
            </button>
          )}
        </div>

        {phase === "blocked" ? (
          <div className="elm-body">
            <div className="elm-blocked-card">
              <p className="elm-blocked-title">
                Ellis&apos; editing is on the Studio plan
              </p>
              <p className="elm-blocked-sub">
                Upgrade to get your editorial letter and scene-by-scene
                developmental edits.
              </p>
            </div>
          </div>
        ) : phase === "boot" ? (
          <EditorialLetterLoadingState
            title={
              isHistoryLoading
                ? "Preparing your session"
                : "Opening editorial letter"
            }
            subtitle="Ellis is getting ready…"
          />
        ) : phase === "consent" ? (
          <div className="elm-body elm-consent-body">
            <div className="elm-consent-scroll">
              <p className="elm-consent-step-label">
                Step {consentStep} of 2
              </p>
              <div
                className={`elm-consent-card${
                  consentStep === 2 ? " elm-consent-card--deliver" : ""
                }`}
              >
                <EllisAvatar className="elm-consent-avatar" />
                <div
                  className={`elm-consent-copy${
                    consentStep === 2 ? " elm-consent-copy--deliver" : ""
                  }`}
                >
                  {consentStep === 1 ? (
                    <>
                      <p className="elm-consent-lead">
                        Hi there, I&apos;m Ellis, Senior Developmental Editor at
                        StoryGroove. I have your manuscript.
                      </p>
                      <p className="elm-consent-text">
                        The first thing I did was read the full draft so I could
                        understand the novel as a whole: its structure, voice,
                        character movement, stakes, pacing, and reader experience.
                      </p>
                      <p className="elm-consent-text">
                        📘 First , I&apos;ll begin with your{" "}
                        <strong>Global Editorial Letter</strong>, the kind of
                        big-picture developmental assessment a professional dev editor
                        usually delivers after a full manuscript read.
                      </p>
                      <p className="elm-consent-emphasis">
                        But you and I are not going to stop there.
                      </p>
                      <p className="elm-consent-emphasis">
                        We&apos;re going to be spending some time together.
                      </p>
                      <p className="elm-consent-text">
                        📝 After you read your letter, we&apos;ll move chapter by chapter
                        through your manuscript and build your{" "}
                        <strong>Chapter-by-Chapter Developmental Plan</strong> together.
                        One chapter at a time. Focused, specific, and designed to help
                        you revise with clarity instead of overwhelm.
                      </p>
                      <p className="elm-consent-text">
                        🔴 <strong>Do not skim your Global Editorial Letter.</strong>{" "}
                        Study it closely and give yourself time to absorb the
                        structural patterns I have identified across your manuscript.
                        It may feel overwhelming at first, especially if this is your
                        first developmental edit, but we will break it into clear,
                        manageable revisions as we work chapter by chapter.
                      </p>
                    </>
                  ) : (
                    <p className="elm-consent-deliver-text">
                      📘 When you&apos;re ready, deliver your{" "}
                      <strong>Global Editorial Letter</strong> and save it to your{" "}
                      <strong>Manuscript Hub</strong>. After that, use my avatar in
                      the lower-left corner to ask questions, talk through the
                      feedback, or move into your{" "}
                      <strong>Chapter-by-Chapter Developmental Plan</strong>.
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="elm-consent-actions">
              {errorMsg && <p className="elm-error">{errorMsg}</p>}
              {consentStep === 1 ? (
                <button
                  type="button"
                  className="elm-primary-btn"
                  onClick={() => setConsentStep(2)}
                >
                  OK, got it.
                </button>
              ) : (
                <div className="elm-consent-action-row">
                  <button
                    type="button"
                    className="elm-back-btn"
                    onClick={() => setConsentStep(1)}
                    disabled={busy}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="elm-primary-btn"
                    onClick={handleConsent}
                    disabled={busy}
                  >
                    Deliver My Editorial Letter
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div
              className="elm-body elm-body--letter"
              ref={scrollContainerRef}
            >
              <EditorialLetterReader
                content={latestLetter}
                isLoading={false}
                isStreaming={isStreaming}
                isProcessing={isProcessing}
              />
              <div ref={scrollEndRef} aria-hidden="true" />
            </div>

            {errorMsg && !hasLetter && (
              <div className="elm-consent-actions">
                <p className="elm-error">{errorMsg}</p>
                <button
                  type="button"
                  className="elm-primary-btn"
                  onClick={handleConsent}
                  disabled={busy}
                >
                  Try again
                </button>
              </div>
            )}

            {showSaveActions && (
              <div className="elm-consent-actions">
                <button
                  type="button"
                  className="elm-primary-btn"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving
                    ? "Saving Editorial Letter…"
                    : "Save Editorial Letter & Click on Ellis’ Avatar Bottom Right To Continue"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default EditorialLetterModal;
