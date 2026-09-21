import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button, Spinner, Modal, Form } from "react-bootstrap";
import {
  MdSend,
  MdClose,
  MdTravelExplore,
  MdAutoStories,
  MdForum,
} from "react-icons/md";
import { FaStar } from "react-icons/fa";
import {
  getABook,
  createNovelFromOlivia,
  getOutlineSiblingsByThread,
  renameThread,
} from "../../api/bookGeneration";
import "./AIAgentChatPage.scss";
import { getAssistantThreadMessages, sendAssistantMessageStream, createOliviaThread, getOliviaSiblingsBySimoneThread, RateLimitError, SubscriptionPausedError, uploadChatFile } from "../../api/assistant";
import { toast } from "react-toastify";
import VoiceRecorder from "../../component/Chat/VoiceRecorder";
import { useDictationDraft } from "../../hooks/useDictationDraft";
import FileUploadButton from "../../component/Chat/FileUploadButton";
import FilePreview from "../../component/Chat/FilePreview";
import ChatFileMessage from "../../component/Chat/ChatFileMessage";
import { CHAT_MAX_ATTACHMENTS } from "../../constants/chatConstants";
import { SHOW_WEB_SEARCH_TOGGLE, isOliviaOutlineCtaBlocked } from "../../constants/featureFlags";
import { getAgentAccessAPI } from "../../api/subscriptions";
import { isSubscriptionPaused } from "../../utils";
import {
  isPlaceholderThreadTitle,
  parseStoryStarterKitWorkingTitle,
} from "../../utils/threadTitle";
import SubscriptionRequiredModal from "../../component/Modal/SubscriptionRequiredModal";
import OliviaPurchaseModal from "../../component/Modal/OliviaPurchaseModal";
import SupportLink from "../../component/common/SupportLink";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { getAgentIntakeProgress } from "../../utils/agentIntakeProgress";
import IntakeProgressStrip from "../../component/Chat/IntakeProgressStrip";
import { recordRecentWork } from "../../utils/recentWork";
import ChatMessageCopyButton from "../../component/Chat/ChatMessageCopyButton";

// ---------------------------------------------------------------------------
// Pre-processor for agent message markdown
// ---------------------------------------------------------------------------

/**
 * Ensures standalone bold lines (e.g. "**🎯 Question 9 – Protagonist**")
 * are separated from the following content by a blank line so react-markdown
 * renders them as distinct paragraphs rather than inline text.
 * remark-breaks then handles remaining single \n as <br> line-breaks with spacing.
 */
const preprocessChatMarkdown = (text) => {
  if (!text) return text;
  // Match a full line that is entirely **...**  (nothing outside the markers on that line)
  // and upgrade the trailing \n to \n\n so it becomes a paragraph break, not a <br>.
  return text.replace(/^(\s*\*\*[^*\n]+\*\*\s*)\n(?!\n)/gm, "$1\n\n");
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract plain text from a message object regardless of format.
 * Handles both the new Responses API format and legacy Assistants API format.
 */
const extractMessageText = (msg) => {
  if (!msg) return "";

  // 1. Direct string content (our DB format for new Responses API)
  if (typeof msg.content === "string") return msg.content;

  // 2. OpenAI Assistants / compat array: content[].text.value
  if (Array.isArray(msg.content)) {
    const textParts = msg.content
      .filter((c) => c.type === "text" && c.text?.value)
      .map((c) => c.text.value);
    if (textParts.length > 0) return textParts.join("\n");
  }

  // 3. Fallback: message.text (already extracted)
  if (typeof msg.text === "string") return msg.text;

  return "";
};

/**
 * Convert a raw API message into the shape the UI expects.
 */
const toUIMessage = (msg) => ({
  id: msg.id || msg._id,
  type: msg.role === "user" ? "user" : "agent",
  text: extractMessageText(msg),
  isStarterKit: msg.metadata?.isStarterKit || false,
  timestamp: msg.created_at
    ? new Date(msg.created_at * 1000).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
  created_at: msg.created_at || Date.now() / 1000,
  // Multi-attachment array (preferred). Falls back to legacy single-file fields.
  attachments:
    Array.isArray(msg.attachments) && msg.attachments.length > 0
      ? msg.attachments
      : msg.fileUrl
        ? [{ fileUrl: msg.fileUrl, fileType: msg.fileType || null, fileName: msg.fileName || "" }]
        : [],
});

/**
 * Normalise whatever shape the history endpoint returns into an array of
 * raw API messages.
 */
const normaliseHistoryResponse = (data) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.messages)) return data.messages;
  return [];
};

// ---------------------------------------------------------------------------
// Agent configs
// ---------------------------------------------------------------------------

const agentConfigs = {
  simone: {
    name: "SimoneAI®",
    title: "Story Starter & Market Positioning Coach",
    greeting: "",
    description:
      "SimoneAI® helps fiction writers take the idea in their head, shape it into a clear concept, test its market potential, and deliver a readiness score.",
  },
  olivia: {
    name: "OliviaAI®",
    title: "Build with OliviaAI®",
    greeting: `Hey writer! Welcome! I'm OliviaAI®—your personal Story Builder and Writing Coach.

I'm here to help you build your Story Bible, create a structured outline, develop your cast of characters, and draft your novel with me by your side. I remember your whole novel and coach you while you write.

This is an interactive session where we'll work together to bring your story to life. Let's get started!

Ready to begin? Type: **Yes, let's go!**`,
    description:
      "Build your Story Bible, structured outline, and cast. Draft with OliviaAI® by your side—she remembers your whole novel and coaches you while you write.",
  },
};

const BUILD_CTA_LABEL_SIMONE = "Build My Story Bible With OliviaAI®";
const BUILD_CTA_LABEL_OLIVIA = "Outline with OliviaAI®";

function isSubscriptionError(error) {
  if (error.response?.status !== 403) return false;
  const msg = (error.response?.data?.error || "").toLowerCase();
  return msg.includes("subscri");
}

function getSubscriptionErrorMessage(error) {
  return (
    error.response?.data?.error ||
    "This feature requires an active subscription. Upgrade your plan to unlock the full power of StoryGroove."
  );
}

/**
 * Local title state lives here so keystrokes do not re-render AIAgentChatPage
 * (large chat transcript / markdown). Keep mounted but hidden on step 1 so
 * Back/forward preserves what the user typed.
 */
const OutlineAdditionalDraftStep = React.memo(function OutlineAdditionalDraftStep({
  initialTitle,
  resetKey,
  isActive,
  serverError,
  onClearServerError,
  isBuildingNovel,
  onBack,
  onCreateDraft,
  controlId = "additional-draft-title",
  intro = "Pick a working title for this new outline. It must differ from your existing outline(s) from this chat.",
  inputLabel = "Working title for this outline",
  ctaLabel = "Create Outline",
  ctaBusyLabel = "Creating…",
}) {
  const [title, setTitle] = useState(initialTitle);
  const inputRef = useRef(null);

  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle, resetKey]);

  useEffect(() => {
    if (!isActive) return;
    const t = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(t);
  }, [isActive]);

  return (
    <>
      <p className="modal-message mb-3">{intro}</p>
      <Form.Group controlId={controlId} className="text-start">
        <Form.Label>{inputLabel}</Form.Label>
        <Form.Control
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            onClearServerError();
          }}
          isInvalid={!!serverError}
          disabled={isBuildingNovel}
        />
        <Form.Control.Feedback type="invalid">{serverError}</Form.Control.Feedback>
      </Form.Group>
      <div className="modal-cta-row">
        <Button
          className="sg-btn-outline"
          onClick={onBack}
          disabled={isBuildingNovel}
        >
          Back
        </Button>
        <Button
          variant="primary"
          className="sg-btn-fill"
          disabled={isBuildingNovel || !title.trim()}
          onClick={() => onCreateDraft(title.trim())}
        >
          {isBuildingNovel ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              {ctaBusyLabel}
            </>
          ) : (
            ctaLabel
          )}
        </Button>
      </div>
    </>
  );
});

/** Best-effort title line from Olivia Story Bible / combined agent text for draft naming. */
function parseOliviaOutlineWorkingTitle(combinedText, fallbackName) {
  if (!combinedText || !String(combinedText).trim()) {
    return fallbackName?.trim() || "Untitled Novel";
  }
  const lineMatch = combinedText.match(
    /(?:^|\n)\s*\*?\*?Title\*?\*?\s*(?:&|and|＆)?\s*(?:\*\*?)?(?:Word\s*Count)?\*?\*?\s*[:\s]+([^\n*]+)/im
  );
  if (lineMatch) return lineMatch[1].trim();
  const simple = combinedText.match(/(?:^|\n)\s*Title\s*[:\s]+([^\n]+)/im);
  if (simple) return simple[1].trim();
  return fallbackName?.trim() || "Untitled Novel";
}

/**
 * Build the next "[Project Title] - Outline Version N" suggestion for the
 * additional-draft step. Uses the highest version suffix present in `siblings`
 * (the names of every outline already created from this Olivia thread). The
 * primary outline counts as Version 1 even when its name has no explicit
 * suffix, so the next suggestion is at least Version 2 whenever a primary
 * exists. Strips any pre-existing version suffix from `baseTitle` so we never
 * double-stack ("Foo - Outline Version 2 - Outline Version 3").
 */
const OUTLINE_VERSION_SUFFIX_RE = /\s*-\s*Outline Version\s+(\d+)\s*$/i;

function suggestNextOutlineVersionName(baseTitle, siblings) {
  const versions = [];
  for (const s of siblings || []) {
    const m = OUTLINE_VERSION_SUFFIX_RE.exec(String(s?.name || ""));
    if (m) versions.push(parseInt(m[1], 10));
  }
  // Primary outline is implicit Version 1, so any "next" must be ≥ 2.
  const next = Math.max(1, ...versions) + 1;
  const cleanBase =
    String(baseTitle || "")
      .replace(OUTLINE_VERSION_SUFFIX_RE, "")
      .trim() || "Untitled Novel";
  return `${cleanBase} - Outline Version ${next}`;
}

const getAgentAvatarSrc = (id) => {
  const key = (id || "simone").toLowerCase();
  if (key === "simone") return "/assets/images/Simone-Avatar.jpg";
  if (key === "olivia") return "/assets/images/Olivia-Avatar.jpg";
  if (key === "ellis") return "/assets/images/Ellis-Avatar.jpg";
  return `/assets/images/${key}.png`;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AIAgentChatPage = () => {
  const { agentId, novelId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const currentAgent = agentConfigs[agentId] || agentConfigs.simone;
  const isSimoneOrOlivia = agentId === "simone" || agentId === "olivia";

  // State
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const inputValueRef = useRef(inputValue);
  inputValueRef.current = inputValue;
  const getInputDraft = useCallback(() => inputValueRef.current, []);
  const {
    onDictationStart,
    onDictationProgress,
    onTranscript: onDictationTranscript,
  } = useDictationDraft({ getDraft: getInputDraft, setDraft: setInputValue });
  const [isAgentStarted, setIsAgentStarted] = useState(false);
  const [conceptName, setConceptName] = useState(location.state?.ideaName || "");
  const [threadId, setThreadId] = useState(null);
  /** MongoDB thread document id (required for PATCH /thread/:id/rename) */
  const [threadMongoId, setThreadMongoId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [isBuildingFromStarterKit, setIsBuildingFromStarterKit] = useState(false);
  const [isBuildingNovel, setIsBuildingNovel] = useState(false);
  const [buildProgress, setBuildProgress] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [rateLimitBanner, setRateLimitBanner] = useState(null);

  // Multi-file attachment state
  // Each entry: { id, file, fileUrl, fileType, fileName, isUploading, uploadProgress }
  const [pendingFiles, setPendingFiles] = useState([]);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showOliviaPurchaseModal, setShowOliviaPurchaseModal] = useState(false);
  const [subscriptionModalMessage, setSubscriptionModalMessage] = useState("");
  const [subscriptionData, setSubscriptionData] = useState(null);
  const subscriptionPaused = isSubscriptionPaused(subscriptionData);
  const [simonePaused, setSimonePaused] = useState(false);
  /** Primary outline novel id from thread meta (Olivia dashboard); drives "already have outline" modal */
  const [outlineNovelId, setOutlineNovelId] = useState(null);
  const [showOutlineExistsModal, setShowOutlineExistsModal] = useState(false);
  const [outlineModalStep, setOutlineModalStep] = useState(1);
  const [outlineAdditionalDraftSeed, setOutlineAdditionalDraftSeed] = useState("");
  const [outlineDraftFieldResetKey, setOutlineDraftFieldResetKey] = useState(0);
  const [additionalDraftTitleError, setAdditionalDraftTitleError] = useState("");
  /** Simone → Olivia handoff when an active Olivia thread already exists for this starter kit */
  const [showSimoneOliviaExistsModal, setShowSimoneOliviaExistsModal] = useState(false);
  const [simoneOliviaHandoffModal, setSimoneOliviaHandoffModal] = useState(null);
  const [isSimoneOliviaHandoffBusy, setIsSimoneOliviaHandoffBusy] = useState(false);
  const [oliviaHandoffStep, setOliviaHandoffStep] = useState(1);
  const [oliviaHandoffSeedTitle, setOliviaHandoffSeedTitle] = useState("");
  const [oliviaHandoffTitleError, setOliviaHandoffTitleError] = useState("");
  const [oliviaHandoffFieldResetKey, setOliviaHandoffFieldResetKey] = useState(0);

  const buildAbortRef = useRef(null);
  const streamAbortRef = useRef(null);

  const tokenBufferRef = useRef("");
  const placeholderIdRef = useRef(null);
  const isStreamingRef = useRef(false);
  const rafIdRef = useRef(null);

  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const inputFieldRef = useRef(null);
  // Tracks active upload progress intervals so they can be cleared on unmount.
  const uploadIntervalsRef = useRef(new Set());
  // Set to true when returning from Stripe with action=buildOlivia to auto-trigger
  const pendingBuildOliviaRef = useRef(false);
  const q11RenameDoneRef = useRef(false);
  /** Prevents re-applying kit title on reload after a manual dashboard rename. */
  const kitTitleSyncDoneRef = useRef(false);

  useEffect(() => {
    const intervals = uploadIntervalsRef.current;
    return () => {
      intervals.forEach(clearInterval);
      intervals.clear();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getAgentAccessAPI();
        if (!cancelled) setSubscriptionData(data);
      } catch (error) {
        if (!cancelled) {
          console.error("Error fetching agent access:", error);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const MIN_TEXTAREA_HEIGHT_PX = 44;
  const MAX_TEXTAREA_HEIGHT_PX = 200;

  const handleRateLimitError = useCallback((err) => {
    setRateLimitBanner(err.message);
  }, []);

  const checkWarningHeader = useCallback((response) => {
    try {
      const warningHeader = response.headers.get("X-RateLimit-Warning");
      if (!warningHeader) return;
      const warnings = JSON.parse(warningHeader);
      if (!Array.isArray(warnings) || warnings.length === 0) return;
      const labels = { RPM: "requests/min", RPD: "requests/day", TPM: "tokens/min", TPD: "tokens/day", SPEND: "monthly spend" };
      for (const w of warnings) {
        const label = labels[w.dimension] || w.dimension;
        const currentStr = w.dimension === "SPEND" ? `$${w.current.toFixed(2)}` : w.current.toLocaleString();
        const limitStr = w.dimension === "SPEND" ? `$${w.limit.toFixed(2)}` : w.limit.toLocaleString();
        toast.warn(
          `You're at ${w.percentage}% of your ${label} limit (${currentStr}/${limitStr}). Slow down to avoid being rate limited.`,
          { autoClose: 8000 }
        );
      }
    } catch {
      // ignore header parse errors
    }
  }, []);

  const defaultLoadingMessages = [
    `${currentAgent.name} is thinking about your story...`,
    `${currentAgent.name} is reading between the lines...`,
    `${currentAgent.name} is brainstorming ideas for you...`,
    "Crafting the perfect response for you...",
    "Diving deep into your narrative...",
    "Consulting the creative muse...",
    "Weaving words together just for you...",
    "Great stories take a moment — hang tight!",
    "Exploring new story possibilities...",
    "Polishing the details to perfection...",
    "Turning your ideas into something magical...",
    "Building your story one layer at a time...",
    "Searching for the perfect words...",
    "Connecting the dots in your narrative...",
    "Cooking up something creative...",
    "Shaping your story world right now...",
    "Good things are worth the wait...",
    "Bringing your characters to life...",
    "Mapping out the next chapter...",
    "Putting the finishing touches on your response...",
    "Unraveling the threads of your story...",
    "Imagining the possibilities...",
    "Your story is taking shape — almost ready!",
    "Channeling some serious creative energy...",
  ];

  const starterKitLoadingMessages = [
    "Olivia is reviewing your Story Starter Kit...",
    "Analyzing your story concept and market positioning...",
    "Mapping out your protagonist's journey...",
    "Evaluating your conflict and stakes...",
    "Studying your genre and tone...",
    "Connecting your subplots and themes...",
    "Building your novel's foundation...",
    "Crafting your Story Bible...",
    "Shaping your story world from Simone's blueprint...",
    "Translating your vision into a novel blueprint...",
    "Great novels start with great plans — almost there!",
    "Olivia is putting the pieces together...",
    "Designing your scene-by-scene framework...",
    "Your story is taking shape — hang tight!",
    "Turning Simone's starter kit into your roadmap...",
    "Finalizing your Novel Blueprint...",
  ];

  const loadingMessages = isBuildingFromStarterKit
    ? starterKitLoadingMessages
    : defaultLoadingMessages;

  // -----------------------------------------------------------------------
  // Rotate loading messages while agent is processing
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!isProcessing) {
      setLoadingMessageIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingMessageIndex((prev) => {
        let next;
        do {
          next = Math.floor(Math.random() * loadingMessages.length);
        } while (next === prev && loadingMessages.length > 1);
        return next;
      });
    }, 3500);
    return () => clearInterval(interval);
  }, [isProcessing, loadingMessages.length]);

  // -----------------------------------------------------------------------
  // Scroll to bottom
  // -----------------------------------------------------------------------
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing, isStreaming, isAgentStarted, scrollToBottom]);

  // -----------------------------------------------------------------------
  // Auto-resize textarea (min one line, max capped; overflow scroll when at max)
  // -----------------------------------------------------------------------
  const resizeInputField = useCallback(() => {
    const el = inputFieldRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.minHeight = `${MIN_TEXTAREA_HEIGHT_PX}px`;
    el.style.maxHeight = `${MAX_TEXTAREA_HEIGHT_PX}px`;
    const h = Math.min(
      MAX_TEXTAREA_HEIGHT_PX,
      Math.max(MIN_TEXTAREA_HEIGHT_PX, el.scrollHeight)
    );
    el.style.height = `${h}px`;
    el.style.overflowY = el.scrollHeight > MAX_TEXTAREA_HEIGHT_PX ? "auto" : "hidden";
  }, []);

  useEffect(() => {
    resizeInputField();
  }, [inputValue, resizeInputField]);

  // Re-focus the input once the agent finishes responding so the user can
  // keep typing immediately without having to click the textarea again.
  const wasBusyRef = useRef(false);
  useEffect(() => {
    const isBusy = isProcessing || isStreaming;
    if (wasBusyRef.current && !isBusy && isAgentStarted) {
      // Defer until after the textarea is re-enabled and rendered.
      requestAnimationFrame(() => {
        inputFieldRef.current?.focus();
      });
    }
    wasBusyRef.current = isBusy;
  }, [isProcessing, isStreaming, isAgentStarted]);

  // -----------------------------------------------------------------------
  // rAF token buffer — flushes accumulated tokens into state once per frame
  // -----------------------------------------------------------------------
  const startTokenFlushing = useCallback(() => {
    isStreamingRef.current = true;
    const flush = () => {
      if (tokenBufferRef.current) {
        const chunk = tokenBufferRef.current;
        tokenBufferRef.current = "";
        // The placeholder is always the last message — update it directly
        // instead of mapping through the entire array.
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.id === placeholderIdRef.current) {
            const updated = [...prev];
            updated[updated.length - 1] = { ...last, text: last.text + chunk };
            return updated;
          }
          return prev.map((m) =>
            m.id === placeholderIdRef.current
              ? { ...m, text: m.text + chunk }
              : m
          );
        });
      }
      if (isStreamingRef.current) {
        rafIdRef.current = requestAnimationFrame(flush);
      }
    };
    rafIdRef.current = requestAnimationFrame(flush);
  }, []);

  const stopTokenFlushing = useCallback(() => {
    isStreamingRef.current = false;
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (tokenBufferRef.current) {
      const remaining = tokenBufferRef.current;
      tokenBufferRef.current = "";
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.id === placeholderIdRef.current) {
          const updated = [...prev];
          updated[updated.length - 1] = { ...last, text: last.text + remaining };
          return updated;
        }
        return prev.map((m) =>
          m.id === placeholderIdRef.current
            ? { ...m, text: m.text + remaining }
            : m
        );
      });
    }
  }, []);

  // -----------------------------------------------------------------------
  // Shared SSE stream reader — used by all streaming call-sites
  // -----------------------------------------------------------------------
  const readSSEStream = useCallback(
    async (response, placeholderId, { onError, errorText }) => {
      let placeholderAdded = false;
      placeholderIdRef.current = placeholderId;
      tokenBufferRef.current = "";

      const addPlaceholder = () => {
        if (placeholderAdded) return;
        placeholderAdded = true;
        setIsProcessing(false);
        setIsStreaming(true);
        setMessages((prev) => [
          ...prev,
          {
            id: placeholderId,
            type: "agent",
            text: "",
            timestamp: new Date().toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            created_at: Date.now() / 1000,
          },
        ]);
        startTokenFlushing();
      };

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.substring(6));

            if (data.error) {
              addPlaceholder();
              stopTokenFlushing();
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === placeholderId
                    ? { ...m, text: errorText }
                    : m
                )
              );
              toast.error(data.error);
              if (onError) onError(data.error);
              return { placeholderAdded, hadError: true };
            }

            if (data.token) {
              addPlaceholder();
              tokenBufferRef.current += data.token;
            }

            // Simone session has just crossed the $3.00 scope cap. Append the
            // server-persisted paused message inline (so the user sees the
            // scope reminder without a refresh) and lock the input. The
            // existing `done` event still follows with the normal model reply.
            if (data.simonePaused && data.message) {
              setSimonePaused(true);
              setMessages((prev) => [
                ...prev,
                {
                  id: data.message.id,
                  type: "agent",
                  text: data.message.content,
                  timestamp: new Date(
                    (data.message.created_at || Date.now() / 1000) * 1000
                  ).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                  created_at: data.message.created_at,
                },
              ]);
              continue;
            }

            if (data.done && data.message) {
              addPlaceholder();
              stopTokenFlushing();
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === placeholderId
                    ? {
                        ...m,
                        id: data.message.id,
                        text: data.message.content,
                        created_at: data.message.created_at,
                      }
                    : m
                )
              );
              return { placeholderAdded, hadError: false };
            }
          } catch {
            // ignore malformed SSE lines
          }
        }
      }

      stopTokenFlushing();
      return { placeholderAdded, hadError: false };
    },
    [startTokenFlushing, stopTokenFlushing]
  );

  // -----------------------------------------------------------------------
  // Reset on route change
  // -----------------------------------------------------------------------
  useEffect(() => {
    const buildAbort = buildAbortRef.current;
    const streamAbort = streamAbortRef.current;
    buildAbort?.abort();
    streamAbort?.abort();
    stopTokenFlushing();
    setMessages([]);
    setIsAgentStarted(false);
    setInputValue("");
    setIsProcessing(false);
    setIsStreaming(false);
    setIsBuildingFromStarterKit(false);
    setIsBuildingNovel(false);
    setBuildProgress("");
    setConceptName(location.state?.ideaName || "");
    setThreadMongoId(null);
    setSimonePaused(false);
    setOutlineNovelId(null);
    setShowOutlineExistsModal(false);
    setOutlineModalStep(1);
    setOutlineAdditionalDraftSeed("");
    setOutlineDraftFieldResetKey((k) => k + 1);
    setAdditionalDraftTitleError("");
    setShowSimoneOliviaExistsModal(false);
    setSimoneOliviaHandoffModal(null);
    setIsSimoneOliviaHandoffBusy(false);
    setOliviaHandoffStep(1);
    setOliviaHandoffSeedTitle("");
    setOliviaHandoffTitleError("");
    setOliviaHandoffFieldResetKey((k) => k + 1);
    q11RenameDoneRef.current = false;
    kitTitleSyncDoneRef.current = false;
    return () => {
      buildAbort?.abort();
      streamAbort?.abort();
      stopTokenFlushing();
    };
  }, [agentId, novelId, location.state?.ideaName, stopTokenFlushing]);

  // -----------------------------------------------------------------------
  // Fetch thread history & load messages from the backend
  // -----------------------------------------------------------------------
  const fetchAndSetMessages = useCallback(
    async (tid) => {
      const msgsResponse = await getAssistantThreadMessages(tid);
      const rawMessages = normaliseHistoryResponse(msgsResponse.data);
      let retrievedName = null;

      if (msgsResponse.data && !Array.isArray(msgsResponse.data)) {
        const meta = msgsResponse.data.thread;
        if (meta?._id) {
          setThreadMongoId(meta._id);
        }
        if (meta?.simonePaused) {
          setSimonePaused(true);
        }
        if (meta && Object.prototype.hasOwnProperty.call(meta, "outlineNovelId")) {
          setOutlineNovelId(meta.outlineNovelId || null);
        }
        retrievedName =
          meta?.title ||
          msgsResponse.data.title ||
          msgsResponse.data.name ||
          msgsResponse.data.subject;
        if (
          !conceptName &&
          retrievedName &&
          !isPlaceholderThreadTitle(retrievedName)
        ) {
          setConceptName(retrievedName);
        }
      }

      const uiMessages = rawMessages
        .map(toUIMessage)
        .sort((a, b) => a.created_at - b.created_at);

      const realMessages = uiMessages.filter((m) => !m.isStarterKit);
      if (realMessages.length > 0) {
        setMessages(uiMessages);
        setIsAgentStarted(true);
      } else if (uiMessages.length > 0) {
        setMessages(uiMessages);
      }

      // If the stored thread title already differs from the kit header (e.g. user
      // renamed from the dashboard), do not overwrite on re-entry.
      if (agentId === "simone") {
        const kitAgentMsg = uiMessages
          .filter((m) => m.type === "agent")
          .find((m) => m.text?.includes("Simone's Story Starter Kit for"));
        if (kitAgentMsg) {
          const kitTitle = parseStoryStarterKitWorkingTitle(kitAgentMsg.text);
          const storedTitle =
            retrievedName ||
            (conceptName && !isPlaceholderThreadTitle(conceptName)
              ? conceptName
              : null);
          if (kitTitle?.trim() && storedTitle && !isPlaceholderThreadTitle(storedTitle)) {
            kitTitleSyncDoneRef.current = true;
          }
        }
      }

      if (agentId === "simone" || agentId === "olivia") {
        const meta =
          msgsResponse.data && !Array.isArray(msgsResponse.data)
            ? msgsResponse.data.thread
            : null;
        const threadMongoId = meta?._id;
        const displayName =
          retrievedName ||
          (conceptName && !isPlaceholderThreadTitle(conceptName)
            ? conceptName
            : null) ||
          meta?.title ||
          "New Chat";
        if (threadMongoId) {
          recordRecentWork({
            kind: agentId,
            resourceId: threadMongoId,
            threadId: tid,
            name: displayName,
          });
        }
      }

      return uiMessages;
    },
    [agentId, conceptName]
  );

  useEffect(() => {
    const fetchChatData = async () => {
      setIsLoadingHistory(true);
      try {
        if (isSimoneOrOlivia) {
          if (novelId) {
            setThreadId(novelId);
            const uiMessages = await fetchAndSetMessages(novelId);

            // Auto-start Olivia when thread has a seeded starter kit but no reply yet
            const hasStarterKit = uiMessages.some((m) => m.isStarterKit);
            const hasAgentReply = uiMessages.some((m) => m.type === "agent");
            if (agentId === "olivia" && hasStarterKit && !hasAgentReply) {
              setIsAgentStarted(true);
              setIsBuildingFromStarterKit(true);
              setIsProcessing(true);
              setIsLoadingHistory(false);

              const placeholderId = `streaming-starter-${Date.now()}`;
              const abortController = new AbortController();
              streamAbortRef.current = abortController;

              try {
                const starterKitMsg =
                  "Hi Olivia! I've already completed my Story Starter Kit with Simone. " +
                  "My starter kit with all the details about my story — title, genre, premise, " +
                  "protagonist, conflict, stakes, setting, subplots, and intended emotional " +
                  "payoff — is included above. I'm ready for you to review it and take me deeper!";
                const response = await sendAssistantMessageStream(
                  novelId,
                  starterKitMsg,
                  "olivia",
                  abortController.signal
                );

                checkWarningHeader(response);

                await readSSEStream(response, placeholderId, {
                  errorText: "Failed to start chat. Please try again.",
                });
              } catch (err) {
                if (err.name !== "AbortError") {
                  console.error("Error auto-starting Olivia from Simone:", err);
                  if (err instanceof RateLimitError) {
                    handleRateLimitError(err);
                  } else if (err instanceof SubscriptionPausedError) {
                    toast.error(err.message);
                  } else {
                    toast.error("Failed to start chat. Please try again.");
                  }
                }
              } finally {
                stopTokenFlushing();
                setIsProcessing(false);
                setIsStreaming(false);
                setIsBuildingFromStarterKit(false);
                streamAbortRef.current = null;
              }
              return;
            }
          }
          // No novelId → welcome screen (isAgentStarted stays false)
        } else if (novelId) {
          const response = await getABook(novelId);
          if (response?.data) {
            if (!conceptName) {
              setConceptName(response.data.name || response.data.title || "");
            }
            setMessages([
              {
                id: 1,
                type: "agent",
                text: currentAgent.greeting,
                timestamp: new Date().toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              },
            ]);
            setIsAgentStarted(true);
          }
        } else {
          setMessages([
            {
              id: 1,
              type: "agent",
              text: currentAgent.greeting,
              timestamp: new Date().toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              }),
            },
          ]);
          setIsAgentStarted(true);
        }
      } catch (error) {
        console.error("Failed to fetch chat data:", error);
        if (!isSimoneOrOlivia && messages.length === 0) {
          setMessages([
            {
              id: 1,
              type: "agent",
              text: currentAgent.greeting,
              timestamp: new Date().toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              }),
            },
          ]);
          setIsAgentStarted(true);
        }
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchChatData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [novelId, agentId]);

  // Olivia's two build artifacts (Story Bible + Character Dossiers).
  // Used to detect intake completion; copy is available on all agent messages.
  const isOliviaCopyEligible = (text) => {
    const t = String(text || "");
    return (
      t.includes("📘 Story Bible") ||
      t.includes("📘 StoryGroove.ai™ Master Prompt for Novel Architecture") ||
      t.includes("👤 CHARACTER DOSSIERS — 17-Point Dossiers") ||
      // Some responses wrap headings in markdown bold:
      t.includes("**📘 Story Bible") ||
      t.includes("**📘 StoryGroove.ai™ Master Prompt for Novel Architecture") ||
      t.includes("**👤 CHARACTER DOSSIERS — 17-Point Dossiers")
    );
  };

  // -----------------------------------------------------------------------
  // Start agent ("Enter office" button)
  // -----------------------------------------------------------------------
  const handleStartAgent = async () => {
    if (subscriptionPaused) {
      toast.error(
        "Your subscription is paused. Resume billing to continue agent sessions.",
        { autoClose: 4500 }
      );
      navigate("/dashboard/userprofile?tab=subscription");
      return;
    }
    setIsAgentStarted(true);

    if (isSimoneOrOlivia && threadId) {
      const userHiMessage = {
        id: "user-hi-temp",
        type: "user",
        text: "Hi",
        timestamp: new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        created_at: Date.now() / 1000,
      };
      const placeholderId = `streaming-start-${Date.now()}`;

      setMessages([userHiMessage]);
      setIsProcessing(true);
      const abortController = new AbortController();
      streamAbortRef.current = abortController;

      try {
        const agentNameParam = agentId === "olivia" ? "olivia" : undefined;
        const response = await sendAssistantMessageStream(
          threadId,
          "hi",
          agentNameParam,
          abortController.signal
        );

        checkWarningHeader(response);

        await readSSEStream(response, placeholderId, {
          errorText: "I'm sorry, I'm having trouble connecting right now. Please try again.",
        });
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Error starting chat", err);
        if (err instanceof RateLimitError) {
          handleRateLimitError(err);
        } else {
          const isPaused = err instanceof SubscriptionPausedError;
          const errorText = isPaused
            ? err.message
            : "I'm sorry, I'm having trouble connecting right now. Please try again.";
          setMessages((prev) => {
            const hasPlaceholder = prev.some((m) => m.id === placeholderId);
            if (hasPlaceholder) {
              return prev.map((m) =>
                m.id === placeholderId ? { ...m, text: m.text || errorText } : m
              );
            }
            return [
              ...prev,
              {
                id: Date.now(),
                type: "agent",
                text: errorText,
                timestamp: new Date().toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                created_at: Date.now() / 1000,
              },
            ];
          });
          toast.error(
            isPaused ? err.message : "Failed to start chat. Please try again."
          );
        }
      } finally {
        stopTokenFlushing();
        setIsProcessing(false);
        setIsStreaming(false);
        streamAbortRef.current = null;
      }
    } else {
      setMessages([
        {
          id: Date.now(),
          type: "agent",
          text: currentAgent.greeting,
          timestamp: new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          created_at: Date.now() / 1000,
        },
      ]);
    }
  };

  // -----------------------------------------------------------------------
  // Voice transcript handler — live dictation via useDictationDraft
  // -----------------------------------------------------------------------

  // -----------------------------------------------------------------------
  // File selection & upload handler (multi-file)
  // -----------------------------------------------------------------------
  const handleFilesSelected = useCallback(async (files) => {
    const batchId = Date.now();
    const newEntries = files.map((file, i) => ({
      id: `${batchId}-${i}-${file.name}`,
      file,
      fileUrl: null,
      fileType: null,
      fileName: file.name,
      isUploading: true,
      uploadProgress: 0,
    }));

    setPendingFiles((prev) => [...prev, ...newEntries]);

    // Single batch request — backend accepts all files at once
    const ids = new Set(newEntries.map((e) => e.id));

    const progressInterval = setInterval(() => {
      setPendingFiles((prev) =>
        prev.map((pf) =>
          ids.has(pf.id) && pf.isUploading
            ? { ...pf, uploadProgress: Math.min(pf.uploadProgress + 12, 85) }
            : pf
        )
      );
    }, 200);

    uploadIntervalsRef.current.add(progressInterval);

    try {
      const result = await uploadChatFile(files);
      clearInterval(progressInterval);
      uploadIntervalsRef.current.delete(progressInterval);

      const uploaded = result.attachments || [];

      setPendingFiles((prev) =>
        prev.map((pf) => {
          if (!ids.has(pf.id)) return pf;
          const idx = newEntries.findIndex((e) => e.id === pf.id);
          const att = uploaded[idx];
          return att
            ? {
                ...pf,
                fileUrl: att.fileUrl,
                fileKey: att.fileKey,
                fileType: att.fileType,
                fileName: att.fileName || pf.file.name,
                isUploading: false,
                uploadProgress: 100,
              }
            : { ...pf, isUploading: false, uploadProgress: 100 };
        })
      );
    } catch (err) {
      clearInterval(progressInterval);
      uploadIntervalsRef.current.delete(progressInterval);

      toast.error(err.response?.data?.error || "Failed to upload file(s).");
      setPendingFiles((prev) => prev.filter((pf) => !ids.has(pf.id)));
    }
  }, []);

  const handleRemoveFile = useCallback((id) => {
    setPendingFiles((prev) => prev.filter((pf) => pf.id !== id));
  }, []);

  // -----------------------------------------------------------------------
  // Send message
  // -----------------------------------------------------------------------
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (subscriptionPaused) {
      toast.error(
        "Your subscription is paused. Resume billing to send new messages.",
        { autoClose: 4500 }
      );
      return;
    }
    const hasText = inputValue.trim();
    const readyFiles = pendingFiles.filter((pf) => pf.fileUrl && !pf.isUploading);
    const isAnyUploading = pendingFiles.some((pf) => pf.isUploading);
    if ((!hasText && readyFiles.length === 0) || !isAgentStarted || isProcessing || isStreaming || isAnyUploading) return;

    const userMessageText = inputValue;
    const attachmentsSnapshot = readyFiles.map(({ fileUrl, fileKey, fileType, fileName }) => ({
      fileUrl,
      fileKey,
      fileType,
      fileName,
    }));

    const userMessage = {
      id: Date.now(),
      type: "user",
      text: userMessageText,
      timestamp: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      created_at: Date.now() / 1000,
      attachments: attachmentsSnapshot,
    };

    const priorMessages = messages;
    const latestAgentBefore = [...priorMessages].reverse().find((m) => m.type === "agent");
    const isSimoneQ11Context =
      agentId === "simone" &&
      threadMongoId &&
      !q11RenameDoneRef.current &&
      latestAgentBefore?.text?.includes("Question 11") &&
      latestAgentBefore.text.toLowerCase().includes("working title");

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setPendingFiles([]);

    if ((agentId === "simone" || agentId === "olivia") && threadId) {
      const placeholderId = `streaming-${Date.now()}`;

      setIsProcessing(true);
      const abortController = new AbortController();
      streamAbortRef.current = abortController;

      try {
        const agentNameParam = agentId === "olivia" ? "olivia" : undefined;
        const response = await sendAssistantMessageStream(
          threadId,
          userMessageText,
          agentNameParam,
          abortController.signal,
          attachmentsSnapshot.length > 0 ? attachmentsSnapshot : null,
          SHOW_WEB_SEARCH_TOGGLE && webSearchEnabled
        );

        checkWarningHeader(response);

        const streamResult = await readSSEStream(response, placeholderId, {
          errorText: "Something went wrong while processing your message. Please try again.",
        });

        if (
          agentId === "simone" &&
          !streamResult?.hadError &&
          isSimoneQ11Context &&
          userMessageText.trim()
        ) {
          q11RenameDoneRef.current = true;
          const title = userMessageText.trim().slice(0, 200);
          try {
            await renameThread(threadMongoId, title);
            setConceptName(title);
          } catch (renameErr) {
            console.error("Failed to rename thread from Q11", renameErr);
            q11RenameDoneRef.current = false;
          }
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Error streaming message", err);
        if (err instanceof RateLimitError) {
          handleRateLimitError(err);
        } else {
          const isPaused = err instanceof SubscriptionPausedError;
          const fallbackText =
            "Something went wrong while processing your message. Please try again.";
          const inlineText = isPaused
            ? err.message
            : fallbackText;
          setMessages((prev) => {
            const hasPlaceholder = prev.some((m) => m.id === placeholderId);
            if (hasPlaceholder) {
              return prev.map((m) =>
                m.id === placeholderId
                  ? {
                      ...m,
                      text: m.text || inlineText,
                    }
                  : m
              );
            }
            return [
              ...prev,
              {
                id: Date.now() + 1,
                type: "agent",
                text: inlineText,
                timestamp: new Date().toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                created_at: Date.now() / 1000,
              },
            ];
          });
          toast.error(
            isPaused ? err.message : "Failed to send message. Please try again."
          );
        }
      } finally {
        stopTokenFlushing();
        setIsProcessing(false);
        setIsStreaming(false);
        streamAbortRef.current = null;
      }
    }
  };

  // -----------------------------------------------------------------------
  // Markdown renderer — custom link component keeps target="_blank" styling
  // -----------------------------------------------------------------------
  const markdownComponents = {
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="message-link"
      >
        {children}
      </a>
    ),
    // remark-breaks converts single \n to <br>; render as a block element
    // with spacing so consecutive content lines breathe properly.
    br: () => <span className="msg-line-break" />,
  };

  // -----------------------------------------------------------------------
  // Derived state
  // -----------------------------------------------------------------------

  const displayMessages = (() => {
    if (!isSimoneOrOlivia || messages.length === 0) return messages;
    let msgs = messages.filter((m) => !m.isStarterKit);
    const firstHiIdx = msgs.findIndex(
      (m) => m.type === "user" && m.text?.toLowerCase().trim() === "hi"
    );
    if (firstHiIdx !== -1) {
      msgs = msgs.filter((_, i) => i !== firstHiIdx);
    }
    msgs = msgs.filter(
      (m) =>
        !(
          m.type === "user" &&
          m.text?.includes("I've already completed my Story Starter Kit with Simone")
        )
    );
    return msgs;
  })();

  const hasAssistantMessage = messages.some((msg) => msg.type === "agent");
  const latestAgentMessage = [...messages]
    .reverse()
    .find((msg) => msg.type === "agent");

  const shouldShowBuildButton =
    agentId === "simone" &&
    novelId &&
    latestAgentMessage?.text?.includes("Simone's Story Starter Kit for");

  const shouldShowOliviaBuildButton =
    agentId === "olivia" &&
    novelId &&
    latestAgentMessage?.text?.includes("CHARACTER DOSSIERS");

  const agentMessages = useMemo(
    () => messages.filter((m) => m.type === "agent"),
    [messages]
  );

  const intakeProgress = useMemo(
    () => getAgentIntakeProgress(agentId, agentMessages),
    [agentId, agentMessages]
  );

  const isIntakeComplete =
    (agentId === "simone" && shouldShowBuildButton) ||
    (agentId === "olivia" &&
      (shouldShowOliviaBuildButton ||
        agentMessages.some((m) => isOliviaCopyEligible(m.text))));

  const showIntakeProgress =
    (agentId === "simone" || agentId === "olivia") &&
    isAgentStarted &&
    !isLoadingHistory &&
    !isIntakeComplete &&
    !(agentId === "simone" && simonePaused) &&
    intakeProgress;

  const getOliviaCombinedOutlineText = useCallback(() => {
    const agentMsgs = messages.filter((m) => m.type === "agent");
    const masterStartIdx = agentMsgs.findIndex(
      (m) =>
        (m.text &&
          (m.text.includes("📘 Story Bible") ||
            m.text.includes("Master Prompt for Novel Architecture"))) ||
        /\bTitle\s*(?:&|and|＆)\s*Word\s*Count\b/i.test(m.text || "")
    );
    const latest = [...messages].reverse().find((msg) => msg.type === "agent");
    return masterStartIdx >= 0
      ? agentMsgs
          .slice(masterStartIdx)
          .map((m) => m.text || "")
          .join("\n\n")
      : agentMsgs.map((m) => m.text || "").join("\n\n") || latest?.text || "";
  }, [messages]);

  const submitCreateNovelOutline = useCallback(
    async ({ forceNew, proposedNovelName }) => {
      const combinedText = getOliviaCombinedOutlineText();
      if (!combinedText.trim()) {
        toast.error("No outline text found to build from.");
        return;
      }
      setIsBuildingNovel(true);
      setBuildProgress(
        forceNew ? "Creating another draft..." : "Creating your novel..."
      );
      try {
        const response = await createNovelFromOlivia({
          oliviaResponse: combinedText,
          sourceThreadId: novelId,
          forceNew,
          proposedNovelName,
        });
        const createdNovelId = response.data?.novelId;
        if (createdNovelId) {
          setShowOutlineExistsModal(false);
          setOutlineModalStep(1);
          setAdditionalDraftTitleError("");
          if (!forceNew) {
            setOutlineNovelId(String(createdNovelId));
          }
          navigate(`/dashboard/bookeditor/${createdNovelId}`);
        } else {
          toast.error("Novel was created but no ID was returned.");
        }
      } catch (error) {
        const data = error.response?.data;
        const code = data?.code || data?.error;
        if (code === "DUPLICATE_OUTLINE_TITLE") {
          setAdditionalDraftTitleError(
            data?.message ||
              "That title is already used for an outline from this chat. Pick a different name."
          );
          return;
        }
        if (code === "OUTLINE_ALREADY_EXISTS") {
          const pid = data?.primaryNovelId;
          toast.info(
            data?.message ||
              "An outline already exists for this chat. Opening the existing one."
          );
          if (pid) {
            setOutlineNovelId(String(pid));
            navigate(`/dashboard/bookeditor/${pid}`);
          }
          return;
        }
        console.error("Error building novel:", error);
        if (isSubscriptionError(error)) {
          setSubscriptionModalMessage(getSubscriptionErrorMessage(error));
          setShowSubscriptionModal(true);
        } else {
          const message =
            data?.message ||
            data?.error ||
            error.message ||
            "Failed to build novel. Please try again.";
          toast.error(message);
        }
      } finally {
        setIsBuildingNovel(false);
        setBuildProgress("");
      }
    },
    [getOliviaCombinedOutlineText, novelId, navigate]
  );

  useEffect(() => {
    if (agentId !== "simone" || !threadMongoId || isStreaming || isProcessing) return;
    if (kitTitleSyncDoneRef.current) return;
    const text = latestAgentMessage?.text || "";
    if (
      !text.includes("Simone's Story Starter Kit for") ||
      !text.includes("**📖 Story Synopsis**")
    ) {
      return;
    }
    const kitTitle = parseStoryStarterKitWorkingTitle(text);
    if (!kitTitle?.trim()) return;
    if (kitTitle.trim() === (conceptName || "").trim()) {
      kitTitleSyncDoneRef.current = true;
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await renameThread(threadMongoId, kitTitle.trim());
        if (!cancelled) {
          setConceptName(kitTitle.trim());
          kitTitleSyncDoneRef.current = true;
        }
      } catch (err) {
        console.error("Failed to sync thread title from Story Starter Kit", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    agentId,
    threadMongoId,
    isStreaming,
    isProcessing,
    latestAgentMessage?.text,
    conceptName,
  ]);

  // -----------------------------------------------------------------------
  // Build with Olivia handler (shared by button and auto-trigger)
  // -----------------------------------------------------------------------
  const handleBuildWithOlivia = useCallback(async () => {
    try {
      setIsSimoneOliviaHandoffBusy(true);
      const kitParsed = parseStoryStarterKitWorkingTitle(
        latestAgentMessage?.text || ""
      );
      const title =
        (kitParsed && kitParsed.trim()) ||
        (conceptName && !isPlaceholderThreadTitle(conceptName)
          ? conceptName
          : null) ||
        "New Chat";
      const starterKitContent = latestAgentMessage?.text || "";
      const simoneThreadId = novelId;
      const createResponse = await createOliviaThread(
        title,
        starterKitContent,
        simoneThreadId,
        false
      );
      if (!createResponse.data) {
        toast.error("Failed to create thread. Please try again.");
        return;
      }
      const newThreadId =
        createResponse.data.threadId ||
        createResponse.data.id ||
        createResponse.data._id;
      if (!newThreadId) {
        toast.error("Failed to create thread. Please try again.");
        return;
      }
      if (createResponse.data?.existed) {
        setSimoneOliviaHandoffModal({
          existingThreadId: newThreadId,
          handoffTitle: title,
          starterKitContent,
        });
        setOliviaHandoffStep(1);
        setOliviaHandoffSeedTitle("");
        setOliviaHandoffTitleError("");
        setOliviaHandoffFieldResetKey((k) => k + 1);
        setShowSimoneOliviaExistsModal(true);
        return;
      }
      navigate(
        `/dashboard/agent-chat/olivia/novel/${newThreadId}`,
        { state: { ideaName: title, fromSimone: true } }
      );
    } catch (error) {
      console.error("Error creating Olivia thread:", error);
      if (isSubscriptionError(error)) {
        setSubscriptionModalMessage(getSubscriptionErrorMessage(error));
        setShowSubscriptionModal(true);
      } else {
        toast.error("Failed to create thread. Please try again.");
      }
    } finally {
      setIsSimoneOliviaHandoffBusy(false);
    }
  }, [conceptName, latestAgentMessage, novelId, navigate]);

  // Step 1 → step 2: compute a "<Project> - Outline Version N" seed by inspecting
  // the user's active Olivia threads for this Story Starter Kit and bumping
  // past the highest existing version. Falls back to the next version after the
  // primary (implicit v1) when sibling fetch fails so the modal remains usable.
  const openOliviaHandoffStep2 = useCallback(async () => {
    if (!simoneOliviaHandoffModal || !novelId) return;
    const baseTitle =
      simoneOliviaHandoffModal.handoffTitle ||
      (conceptName && !isPlaceholderThreadTitle(conceptName) ? conceptName : "") ||
      "Untitled Novel";
    let seed = suggestNextOutlineVersionName(baseTitle, []);
    try {
      const sibsResp = await getOliviaSiblingsBySimoneThread(novelId);
      const sibs = (sibsResp?.data?.threads || []).map((t) => ({
        name: t.title,
      }));
      seed = suggestNextOutlineVersionName(baseTitle, sibs);
    } catch (sibErr) {
      console.error(
        "Failed to fetch Olivia thread siblings for version suggestion",
        sibErr
      );
    }
    setOliviaHandoffSeedTitle(seed);
    setOliviaHandoffFieldResetKey((k) => k + 1);
    setOliviaHandoffTitleError("");
    setOliviaHandoffStep(2);
  }, [conceptName, novelId, simoneOliviaHandoffModal]);

  const confirmNewOliviaHandoffThread = useCallback(
    async (proposedTitle) => {
      if (!simoneOliviaHandoffModal || !novelId) return;
      const trimmedProposed = (proposedTitle || "").trim();
      if (!trimmedProposed) {
        setOliviaHandoffTitleError("A title is required.");
        return;
      }
      setIsSimoneOliviaHandoffBusy(true);
      try {
        const { handoffTitle, starterKitContent } = simoneOliviaHandoffModal;
        const createResponse = await createOliviaThread(
          handoffTitle,
          starterKitContent,
          novelId,
          true,
          trimmedProposed
        );
        if (!createResponse.data) {
          toast.error("Failed to create thread. Please try again.");
          return;
        }
        const newThreadId =
          createResponse.data.threadId ||
          createResponse.data.id ||
          createResponse.data._id;
        if (!newThreadId) {
          toast.error("Failed to create thread. Please try again.");
          return;
        }
        setShowSimoneOliviaExistsModal(false);
        setSimoneOliviaHandoffModal(null);
        setOliviaHandoffStep(1);
        setOliviaHandoffTitleError("");
        navigate(
          `/dashboard/agent-chat/olivia/novel/${newThreadId}`,
          { state: { ideaName: trimmedProposed, fromSimone: true } }
        );
      } catch (error) {
        const data = error.response?.data;
        const code = data?.code || data?.error;
        if (code === "DUPLICATE_OUTLINE_TITLE") {
          setOliviaHandoffTitleError(
            data?.message ||
              "An Olivia chat with this title already exists for this Story Starter Kit. Choose a different title."
          );
          return;
        }
        console.error("Error creating new Olivia thread:", error);
        if (isSubscriptionError(error)) {
          setSubscriptionModalMessage(getSubscriptionErrorMessage(error));
          setShowSubscriptionModal(true);
        } else {
          const message =
            data?.message ||
            data?.error ||
            error.message ||
            "Failed to create thread. Please try again.";
          toast.error(message);
        }
      } finally {
        setIsSimoneOliviaHandoffBusy(false);
      }
    },
    [navigate, novelId, simoneOliviaHandoffModal]
  );

  // Detect action=buildOlivia on return from Stripe and flag for auto-trigger
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("action") === "buildOlivia") {
      pendingBuildOliviaRef.current = true;
      navigate(location.pathname, { replace: true });
    }
  }, [location.search, location.pathname, navigate]);

  // Auto-trigger Olivia build once the Starter Kit message is ready (after upgrade)
  useEffect(() => {
    if (!pendingBuildOliviaRef.current || !shouldShowBuildButton || isLoadingHistory) {
      return;
    }
    if (subscriptionData === null) return;
    if (isOliviaOutlineCtaBlocked(subscriptionData)) {
      pendingBuildOliviaRef.current = false;
      setShowOliviaPurchaseModal(true);
      return;
    }
    pendingBuildOliviaRef.current = false;
    handleBuildWithOlivia();
  }, [shouldShowBuildButton, isLoadingHistory, handleBuildWithOlivia, subscriptionData]);

  const handleBuildWithOliviaClick = () => {
    if (isOliviaOutlineCtaBlocked(subscriptionData)) {
      setShowOliviaPurchaseModal(true);
      return;
    }
    handleBuildWithOlivia();
  };

  const oliviaUpgradeSuccessUrl =
    novelId && agentId === "simone"
      ? `${window.location.origin}/dashboard/agent-chat/simone/novel/${novelId}?action=buildOlivia`
      : window.location.href;

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="ai-agent-chat-page">
      {/* Header */}
      <div className="chat-header">
        <div className="header-left">
          {conceptName && !isPlaceholderThreadTitle(conceptName) && (
            <div className="concept-name">
              <FaStar className="sparkle-icon" />
              <span>Concept name: {conceptName}</span>
            </div>
          )}
        </div>
        {(agentId === "simone" || agentId === "olivia") && (
          <div className="header-right">
            <SupportLink variant="inline" />
          </div>
        )}
      </div>

      {subscriptionPaused && (
        <div className="subscription-paused-banner" role="status">
          <strong>Your subscription is paused.</strong> You cannot send new messages
          until you resume billing.{" "}
          <button
            type="button"
            className="subscription-paused-banner__cta"
            onClick={() => navigate("/dashboard/userprofile?tab=subscription")}
          >
            Resume Subscription
          </button>
        </div>
      )}

      {showIntakeProgress && <IntakeProgressStrip {...intakeProgress} />}

      {/* Chat Container */}
      <div className="chat-container" ref={chatContainerRef}>
        {isLoadingHistory ? (
          <div className="d-flex justify-content-center align-items-center h-100">
            <Spinner animation="border" role="status" variant="primary">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </div>
        ) : !isAgentStarted ? (
          <div className="welcome-screen">
            <div className="welcome-content">
              <div className="agent-avatar">
                <img
                  src={getAgentAvatarSrc(agentId)}
                  alt={currentAgent.name}
                  onError={(e) => {
                    e.target.src = "/assets/images/avatar.jpg";
                  }}
                />
              </div>
              <h2 className="agent-title">{currentAgent.title}</h2>
              <p className="agent-description">{currentAgent.description}</p>
              <Button
                className="enter-office-btn"
                onClick={handleStartAgent}
                disabled={subscriptionPaused}
              >
                Hey there writer! Click here to enter the {currentAgent.name}{" "}
                office.
                <span className="arrow-icon">→</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="messages-list">
            {displayMessages.map((message) => (
              <div
                key={message.id}
                className={`message ${
                  message.type === "user" ? "user-message" : "agent-message"
                }`}
              >
                {message.type === "agent" && (
                  <div className="message-avatar">
                    <img
                      src={getAgentAvatarSrc(agentId)}
                      alt={currentAgent.name}
                      onError={(e) => {
                        e.target.src = "/assets/images/avatar.jpg";
                      }}
                    />
                  </div>
                )}
                <div className="message-bubble">
                  {message.attachments?.length > 0 && (
                    <div className="message-attachments">
                      {message.attachments.map((att, i) => (
                        <ChatFileMessage
                          key={i}
                          fileUrl={att.fileUrl}
                          fileType={att.fileType}
                          fileName={att.fileName}
                        />
                      ))}
                    </div>
                  )}
                  <div className={`message-text${message.type === "agent" ? " markdown-body" : ""}`}>
                    {message.type === "agent" ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkBreaks]}
                        components={markdownComponents}
                      >
                        {preprocessChatMarkdown(message.text || "")}
                      </ReactMarkdown>
                    ) : (
                      message.text
                    )}
                  </div>
                  <div className="message-footer">
                    <div className="message-timestamp">
                      {message.timestamp}
                    </div>
                    {message.type === "agent" && (
                      <ChatMessageCopyButton
                        text={message.text}
                        preprocess={preprocessChatMarkdown}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
            {isProcessing && (
              <div className="typing-indicator-wrapper">
                <div className="typing-avatar">
                  <img
                    src={getAgentAvatarSrc(agentId)}
                    alt={currentAgent.name}
                    onError={(e) => {
                      e.target.src = "/assets/images/avatar.jpg";
                    }}
                  />
                </div>
                <div className="typing-content">
                  <div className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <p className="typing-message" key={loadingMessageIndex}>
                    {loadingMessages[loadingMessageIndex]}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="chat-input-container">
        {shouldShowBuildButton && (
          <div className="action-buttons-container">
            <Button
              className="action-button contained-button border"
              disabled={
                isStreaming ||
                isProcessing ||
                isSimoneOliviaHandoffBusy
              }
              onClick={handleBuildWithOliviaClick}
            >
              {isSimoneOliviaHandoffBusy ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Connecting…
                </>
              ) : (
                BUILD_CTA_LABEL_SIMONE
              )}
            </Button>
            {isOliviaOutlineCtaBlocked(subscriptionData) && (
              <p className="coming-soon-note">
                Upgrade to Builder to continue with OliviaAI® and build your Story Bible from this Starter Kit.
              </p>
            )}
          </div>
        )}
        {shouldShowOliviaBuildButton && (
          <div className="action-buttons-container">
            <Button
              className="action-button contained-button border"
              disabled={isBuildingNovel || isStreaming || isProcessing}
              onClick={async () => {
                if (isBuildingNovel) return;
                const combinedText = getOliviaCombinedOutlineText();
                if (!combinedText.trim()) {
                  toast.error("No outline text found to build from.");
                  return;
                }
                if (outlineNovelId) {
                  const fallbackName =
                    (conceptName && !isPlaceholderThreadTitle(conceptName)
                      ? conceptName
                      : null) || null;
                  const baseTitle = parseOliviaOutlineWorkingTitle(
                    combinedText,
                    fallbackName
                  );
                  // Default seed: assume the primary is v1 → suggest v2. If the
                  // sibling fetch succeeds we replace it with a properly
                  // version-bumped name based on what already exists.
                  let seed = suggestNextOutlineVersionName(baseTitle, []);
                  try {
                    const sibsResp = await getOutlineSiblingsByThread(novelId);
                    const sibs = sibsResp?.data?.outlines || [];
                    seed = suggestNextOutlineVersionName(baseTitle, sibs);
                  } catch (sibErr) {
                    console.error(
                      "Failed to fetch outline siblings for version suggestion",
                      sibErr
                    );
                  }
                  setOutlineAdditionalDraftSeed(seed);
                  setOutlineDraftFieldResetKey((k) => k + 1);
                  setAdditionalDraftTitleError("");
                  setOutlineModalStep(1);
                  setShowOutlineExistsModal(true);
                  return;
                }
                await submitCreateNovelOutline({ forceNew: false });
              }}
            >
              {isBuildingNovel ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  {buildProgress}
                </>
              ) : (
                BUILD_CTA_LABEL_OLIVIA
              )}
            </Button>
          </div>
        )}
        {hasAssistantMessage && !shouldShowBuildButton && !shouldShowOliviaBuildButton && !(agentId === "simone" && simonePaused) && !subscriptionPaused && (
          <>
            {rateLimitBanner && (
              <div className="rate-limit-banner">
                <span>{rateLimitBanner}</span>
                <button
                  type="button"
                  className="rate-limit-banner-close"
                  onClick={() => setRateLimitBanner(null)}
                  aria-label="Dismiss"
                >
                  <MdClose />
                </button>
              </div>
            )}
            <form onSubmit={handleSendMessage} className="chat-input-form">
              <div className="chat-input-box">
                {pendingFiles.length > 0 && (
                  <div className="chat-attachment-strip">
                    {pendingFiles.map((pf) => (
                      <FilePreview
                        key={pf.id}
                        file={pf.file}
                        isUploading={pf.isUploading}
                        uploadProgress={pf.uploadProgress}
                        onRemove={() => handleRemoveFile(pf.id)}
                      />
                    ))}
                    {pendingFiles.length >= CHAT_MAX_ATTACHMENTS && (
                      <span className="chat-attachment-limit-badge">
                        Max {CHAT_MAX_ATTACHMENTS} files
                      </span>
                    )}
                  </div>
                )}
                <div className="chat-input-row">
                  <div className="chat-input-controls">
                    <FileUploadButton
                      onFilesSelected={handleFilesSelected}
                      disabled={!isAgentStarted || isProcessing || isStreaming}
                      currentCount={pendingFiles.length}
                    />
                    {SHOW_WEB_SEARCH_TOGGLE && (
                      <button
                        type="button"
                        className={`chat-web-search-btn${webSearchEnabled ? " active" : ""}`}
                        onClick={() => setWebSearchEnabled((prev) => !prev)}
                        disabled={!isAgentStarted || isProcessing || isStreaming}
                        title={webSearchEnabled ? "Web search enabled" : "Enable web search"}
                        aria-label="Toggle web search"
                      >
                        <MdTravelExplore />
                      </button>
                    )}
                  </div>
                  <textarea
                    ref={inputFieldRef}
                    rows={1}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    placeholder="Ask me anything"
                    className="chat-input"
                    disabled={!isAgentStarted || isProcessing || isStreaming}
                  />
                  <div className="chat-input-actions">
                    <VoiceRecorder
                      onDictationStart={onDictationStart}
                      onDictationProgress={onDictationProgress}
                      onTranscript={onDictationTranscript}
                      disabled={!isAgentStarted || isProcessing || isStreaming}
                    />
                    <button
                      type="submit"
                      className="send-button"
                      disabled={
                        (!inputValue.trim() && !pendingFiles.some((pf) => pf.fileUrl)) ||
                        !isAgentStarted || isProcessing || isStreaming ||
                        pendingFiles.some((pf) => pf.isUploading)
                      }
                    >
                      <MdSend />
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </>
        )}
      </div>

      <Modal
        show={showOutlineExistsModal}
        onHide={() => {
          if (isBuildingNovel) return;
          setShowOutlineExistsModal(false);
          setOutlineModalStep(1);
          setAdditionalDraftTitleError("");
        }}
        centered
        backdrop={isBuildingNovel ? "static" : true}
        keyboard={!isBuildingNovel}
        aria-labelledby="outline-exists-title"
        className="storygroove-theme outline-exists-modal"
      >
        <Modal.Body className="text-center px-4 py-5">
          <div className="modal-icon-wrapper mb-3">
            <MdAutoStories size={36} />
          </div>
          <h4 id="outline-exists-title" className="fw-bold mb-3 text-uppercase">
            {outlineModalStep === 1
              ? "Outline Already Exists"
              : "Create A New Outline"}
          </h4>
          {outlineModalStep === 1 ? (
            <>
              <p className="modal-message fw-semibold mb-2">
                You already started an outline for this novel
              </p>
              <p className="modal-message mb-4">
                You can open your existing outline and continue building from
                where you left off, or create a new outline from this story
                bible if you want a separate version.
              </p>
            </>
          ) : null}
          {showOutlineExistsModal ? (
            <div
              className={outlineModalStep === 2 ? "" : "d-none"}
              aria-hidden={outlineModalStep !== 2}
            >
              <OutlineAdditionalDraftStep
                initialTitle={outlineAdditionalDraftSeed}
                resetKey={outlineDraftFieldResetKey}
                isActive={outlineModalStep === 2}
                serverError={additionalDraftTitleError}
                onClearServerError={() => setAdditionalDraftTitleError("")}
                isBuildingNovel={isBuildingNovel}
                onBack={() => {
                  setOutlineModalStep(1);
                  setAdditionalDraftTitleError("");
                }}
                onCreateDraft={(trimmedTitle) =>
                  submitCreateNovelOutline({
                    forceNew: true,
                    proposedNovelName: trimmedTitle,
                  })
                }
              />
            </div>
          ) : null}
          {outlineModalStep === 1 ? (
            <div className="modal-cta-row">
              <Button
                className="sg-btn-outline sg-btn-outline--danger"
                onClick={() => {
                  setOutlineModalStep(2);
                  setAdditionalDraftTitleError("");
                }}
                disabled={isBuildingNovel}
              >
                Create A New Outline
              </Button>
              <Button
                variant="primary"
                className="sg-btn-fill"
                onClick={() => {
                  setShowOutlineExistsModal(false);
                  setOutlineModalStep(1);
                  if (outlineNovelId) {
                    navigate(`/dashboard/bookeditor/${outlineNovelId}`);
                  }
                }}
                disabled={isBuildingNovel}
              >
                Open Existing Outline
              </Button>
            </div>
          ) : null}
        </Modal.Body>
      </Modal>

      <Modal
        show={showSimoneOliviaExistsModal}
        onHide={() => {
          if (isSimoneOliviaHandoffBusy) return;
          setShowSimoneOliviaExistsModal(false);
          setSimoneOliviaHandoffModal(null);
          setOliviaHandoffStep(1);
          setOliviaHandoffTitleError("");
        }}
        centered
        backdrop={isSimoneOliviaHandoffBusy ? "static" : true}
        keyboard={!isSimoneOliviaHandoffBusy}
        aria-labelledby="olivia-handoff-title"
        className="storygroove-theme olivia-handoff-modal"
      >
        <Modal.Body className="text-center px-4 py-5">
          <div className="modal-icon-wrapper olivia-icon-wrapper mb-3">
            <MdForum size={36} />
          </div>
          <h4 id="olivia-handoff-title" className="fw-bold mb-3 text-uppercase">
            {oliviaHandoffStep === 1
              ? "Olivia Chat Already Exists"
              : "Start A New Olivia Chat"}
          </h4>
          {oliviaHandoffStep === 1 ? (
            <>
              <p className="modal-message fw-semibold mb-2">
                You already started an Olivia chat for this story
              </p>
              <p className="modal-message mb-4">
                You can open your existing chat and continue building from where
                you left off, or start a new Olivia chat from this Story Starter
                Kit if you want a separate conversation.
              </p>
            </>
          ) : null}
          {showSimoneOliviaExistsModal ? (
            <div
              className={oliviaHandoffStep === 2 ? "" : "d-none"}
              aria-hidden={oliviaHandoffStep !== 2}
            >
              <OutlineAdditionalDraftStep
                initialTitle={oliviaHandoffSeedTitle}
                resetKey={oliviaHandoffFieldResetKey}
                isActive={oliviaHandoffStep === 2}
                serverError={oliviaHandoffTitleError}
                onClearServerError={() => setOliviaHandoffTitleError("")}
                isBuildingNovel={isSimoneOliviaHandoffBusy}
                controlId="olivia-handoff-title"
                intro="Pick a title for this new Olivia chat. It must differ from your existing Olivia chat(s) for this Story Starter Kit."
                inputLabel="Title for this Olivia chat"
                ctaLabel="Start A New Olivia Chat"
                ctaBusyLabel="Starting…"
                onBack={() => {
                  setOliviaHandoffStep(1);
                  setOliviaHandoffTitleError("");
                }}
                onCreateDraft={(trimmedTitle) =>
                  confirmNewOliviaHandoffThread(trimmedTitle)
                }
              />
            </div>
          ) : null}
          {oliviaHandoffStep === 1 ? (
            <div className="modal-cta-row">
              <Button
                className="sg-btn-outline sg-btn-outline--danger"
                disabled={isSimoneOliviaHandoffBusy}
                onClick={openOliviaHandoffStep2}
              >
                {isSimoneOliviaHandoffBusy ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Loading…
                  </>
                ) : (
                  "Start A New Olivia Chat"
                )}
              </Button>
              <Button
                variant="primary"
                className="sg-btn-fill"
                disabled={isSimoneOliviaHandoffBusy}
                onClick={() => {
                  const id = simoneOliviaHandoffModal?.existingThreadId;
                  const t = simoneOliviaHandoffModal?.handoffTitle;
                  setShowSimoneOliviaExistsModal(false);
                  setSimoneOliviaHandoffModal(null);
                  setOliviaHandoffStep(1);
                  setOliviaHandoffTitleError("");
                  if (id) {
                    navigate(`/dashboard/agent-chat/olivia/novel/${id}`, {
                      state: { ideaName: t || "New Chat", fromSimone: true },
                    });
                  }
                }}
              >
                Open Existing Olivia Chat
              </Button>
            </div>
          ) : null}
        </Modal.Body>
      </Modal>

      <SubscriptionRequiredModal
        show={showSubscriptionModal}
        onHide={() => setShowSubscriptionModal(false)}
        message={subscriptionModalMessage}
        onViewPlans={() => {
          setShowSubscriptionModal(false);
          const returnUrl = `${window.location.origin}/dashboard/agent-chat/${agentId}/novel/${novelId}?action=buildOlivia`;
          navigate(`/dashboard/userprofile?tab=subscription&successUrl=${encodeURIComponent(returnUrl)}`);
        }}
      />
      <OliviaPurchaseModal
        show={showOliviaPurchaseModal}
        onHide={() => setShowOliviaPurchaseModal(false)}
        successUrl={oliviaUpgradeSuccessUrl}
      />
    </div>
  );
};

export default AIAgentChatPage;
