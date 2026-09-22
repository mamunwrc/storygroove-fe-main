import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  getABook,
  getAllCharactersOfaBook,
  getUserContentById,
  renameScene,
  deleteScene,
  archiveScene,
  unarchiveScene,
  updateUserContent,
  sendOliviaEditorMessage,
  getOliviaEditorHistory,
  sendOliviaCoachingMessage,
  getOliviaCoachingHistory,
  getOliviaLayeringState,
  insertLayeredScene,
  sendOliviaSceneChatMessage,
  getOliviaSceneChatHistory,
  saveOliviaScene,
} from "../../api/bookGeneration";
import { Button } from "react-bootstrap";
import { FiMenu } from "react-icons/fi";
import { TbLayoutSidebarRightExpand } from "react-icons/tb";
import {
  LuChevronsLeftRight,
  LuChevronLeft,
  LuChevronRight,
  LuMaximize2,
  LuMinimize2,
  LuX,
} from "react-icons/lu";
import ManuscriptDraftEditor from "../../component/manuscriptEditor/ManuscriptDraftEditor";
import { recordRecentWork } from "../../utils/recentWork";
import VoiceRecorder from "../../component/Chat/VoiceRecorder";
import { useEditorDictation } from "../../Hooks/useEditorDictation";
import SaveStatusBadge from "./SaveStatusBadge";
import EditorHistoryControls from "./EditorHistoryControls";
import { supportsUnspokenPunctuation } from "../../utils/dictationTranscript";
import { preserveLeadingIndentation } from "../../utils/preserveLeadingIndentation";
import { areQuillHtmlEquivalent } from "../../utils/quillHtmlNormalize";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
// LuDownload, LuLoader2, LuImage moved to WordCountBar
import OliviaChatModal from "../../component/OliviaChatModal/OliviaChatModal";
import OliviaChatErrorBoundary from "../../component/ErrorBoundary/OliviaChatErrorBoundary";
import FinalizeDraftConfirmationModal from "../../component/Modal/FinalizeDraftConfirmationModal";
import BookCoverModal from "../../component/BookCoverModal/BookCoverModal";
import NotesEditor from "../../component/bookGeneration/Notes";
import OutlineSidebar from "./OutlineSidebar";
import SidebarTabs from "./SidebarTabs";
import WordCountBar from "./WordCountBar";
import OliviaFloatingButton from "./OliviaFloatingButton";
import RenameSceneModal from "./RenameSceneModal";
import OliviaWorkflowGuide from "./OliviaWorkflowGuide";
import { useMobileLayout } from "./useMobileLayout";
import InlineEditorPanelHeader from "./InlineEditorPanelHeader";
import {
  getStoryResponseMap,
  formatSceneText,
  formatCharacterText,
  getCharacterDisplayText,
  formatSceneTitle,
  getSceneTitleText,
  computeActOffsets,
  getGlobalSceneNumber,
  resolveGlobalChapterNumber,
  extractStoryBibleTitle,
} from "./utils";
import {
  buildOutlineLayout,
  computeLayoutPositionHash,
  resolveTargetSceneFromLayout,
  enrichTargetSceneFromUserContents,
  getOutlineChangeForSend,
  resolveManuscriptDraftForScene,
  buildDraftSceneFromSelected,
  countSceneManuscriptWords,
  isArchivedScene,
  withoutArchivedScenes,
} from "./outlineLayout";
import "./BookEditorPage.scss";
import { OLIVIA_TEMP_DISABLE_WORD_LIMIT, SHOW_SAVE_CONTINUE_BUTTON } from "../../constants/featureFlags";
import {
  OLIVIA_STUDIO_WORD_LIMIT_TEXT,
  isOliviaStudioOverWordLimit,
  isOliviaStudioWordLimitMessage,
} from "../../constants/oliviaStudioInput";
import {
  DRAFT_REMOTE_POLL_MS,
  DRAFT_SAVE_TIMEOUT_MS,
  OLIVIA_HISTORY_INITIAL_LIMIT,
  OLIVIA_HISTORY_PAGE_SIZE,
} from "../../constants/editorConstants";
import { getAgentAccessAPI } from "../../api/subscriptions";
import { isSubscriptionPaused } from "../../utils";
import {
  SCENE_COACH_MIN_PX,
  OUTLINE_MIN_PX,
  OUTLINE_DEFAULT_PX,
  getWorkspaceLayout,
  getRootLayout,
  clampCoachWidth as clampCoachWidthPx,
  clampOutlineWidth as clampOutlineWidthPx,
} from "./bookEditorResize";
import {
  clearSceneDraft,
  resolveDraftForScene,
  writeSceneDraft,
} from "./sceneDraftStorage";
import {
  createDraftSaveQueue,
  isRetryableDraftSaveError,
} from "./queuedDraftSave";
import {
  decideRemoteDraftAction,
  getStaleContentPayload,
  toUpdatedAtIso,
} from "./sceneDraftSync";
import DraftConflictModal from "./DraftConflictModal";

const readBrowserOnline = () =>
  typeof navigator === "undefined" ? true : navigator.onLine;

const EMPTY_USER_CONTENTS = [];

/**
 * Scene Coach resize UX constants.
 * - READING_MODE_RATIO: the comfortable single-click "give me more reading
 *   space" width. ~65% of workspace lets writers read long Olivia scenes
 *   without losing the editor entirely (which keeps a 360px floor in CSS).
 * - READING_MODE_THRESHOLD_RATIO: any width ≥ this counts as "in reading
 *   mode" for the topbar toggle so a manual drag into the 60–80% range is
 *   recognised as reading mode without the toggle having to be clicked.
 * - CLICK_DRAG_THRESHOLD_PX: pointer travel below this distance is treated
 *   as a click (single-click toggles default↔reading); above it is a drag.
 * - RESIZE_HINT_KEY: one-time coachmark dismissal flag in localStorage.
 */
const READING_MODE_RATIO = 0.65;
const READING_MODE_THRESHOLD_RATIO = 0.55;
const CLICK_DRAG_THRESHOLD_PX = 4;
const RESIZE_HINT_KEY = "bookEditor:resizeHintDismissed";
const OUTLINE_RESIZE_HINT_KEY = "bookEditor:outlineResizeHintDismissed";
const focusModeStorageKey = (novelId) => `bookEditor:focusMode:${novelId}`;
const selectedSceneStorageKey = (novelId) =>
  `bookEditor:selectedScene:${novelId}`;
const COACH_WIDTH_TRANSITION_MS = 350;

const buildSelectedSceneFromRow = (scene, storyResponseMap, userContents = []) => ({
  promptKey: scene.promptKey || null,
  text:
    storyResponseMap[scene.promptKey] ||
    scene.userContent ||
    "",
  actNumber: scene.actNumber,
  sceneIndex: scene.sceneIndex,
  globalSceneNumber: resolveGlobalChapterNumber(
    scene.actNumber,
    scene.sceneIndex,
    scene.globalSceneNumber,
    computeActOffsets(userContents)
  ),
  id: scene._id,
  isUserAdded: Boolean(scene.isUserAdded),
});

/**
 * Empty-state card shown inside `.editor-surface` whenever the writer isn't
 * ready to draft prose. Pre-outline: 7-card Olivia's Guide on first visit, then
 * a minimal start CTA once the guide is completed. Post-outline: compact card
 * compact card prompting scene selection (rare delete-edge case).
 */
const EditorEmptyState = ({
  isPreOutline,
  onOpenOlivia,
  onOpenOutlineDrawer,
  guideCompleted,
  onCompleteGuide,
  onOpenGuide,
}) => {
  if (isPreOutline) {
    // First visit: full 7-card walkthrough. After completion, a minimal CTA only —
    // the guide already delivered onboarding; re-open via Story Hub or the link below.
    if (!guideCompleted) {
      return (
        <OliviaWorkflowGuide
          variant="inline"
          onStartOlivia={onOpenOlivia}
          onComplete={onCompleteGuide}
        />
      );
    }

    return (
      <div
        className="editor-empty-state editor-empty-state--pre-outline"
        role="status"
        aria-live="polite"
      >
        <div className="editor-empty-state-card editor-empty-state-card--pre-outline editor-empty-state-card--pre-outline-ready">
          <div className="editor-empty-state-avatar" aria-hidden="true">
            <img
              src="/assets/images/olivia.png"
              alt=""
              onError={(e) => {
                e.target.src = "/assets/images/avatar.jpg";
              }}
            />
          </div>
          <p className="editor-empty-state-sub editor-empty-state-sub--lg">
            Ready to build your outline? Start with Olivia, or review the guide
            anytime from Story Hub.
          </p>
          <button
            type="button"
            className="editor-empty-state-cta editor-empty-state-cta--primary"
            onClick={onOpenOlivia}
          >
            Start Act 1, Chapter 1 with Olivia
          </button>
          <button
            type="button"
            className="editor-empty-state-guide-link"
            onClick={onOpenGuide}
          >
            Review Olivia&apos;s Guide
          </button>
          <p className="editor-empty-state-foothint">
            You can also tap Olivia&apos;s bubble at the bottom-right anytime.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-empty-state" role="status" aria-live="polite">
      <div className="editor-empty-state-card">
        <div className="editor-empty-state-icon" aria-hidden="true" />
        <p className="editor-empty-state-title">Pick a chapter to start writing</p>
        <p className="editor-empty-state-sub">
          Choose a chapter from your outline on the left, or have Olivia coach
          the next one.
        </p>
        <button
          type="button"
          className="editor-empty-state-cta"
          onClick={onOpenOlivia}
        >
          Open Olivia
        </button>
        <p className="editor-empty-state-hint">
          Or click a chapter in your outline on the left to keep drafting.
        </p>
        <button
          type="button"
          className="editor-empty-state-drawer-btn"
          onClick={onOpenOutlineDrawer}
        >
          Show outline
        </button>
      </div>
    </div>
  );
};

const formatOliviaMessageTime = (ts) =>
  ts
    ? new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : "";

// Persist the active Office 3 coaching session per novel so it survives the
// modal closing/reopening (and a page refresh). Routing follow-ups to the
// coaching thread depends on this; without it, a typed "do another pass" after
// reopening would fall back to the editor/scene thread (Fix 6b).
const coachingStorageKey = (novelId) => `sg:oliviaCoaching:${novelId}`;

const readPersistedCoaching = (novelId) => {
  if (!novelId || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(coachingStorageKey(novelId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.coachTargetScene?.sceneId) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writePersistedCoaching = (novelId, coachTargetScene) => {
  if (!novelId || typeof window === "undefined") return;
  if (!coachTargetScene?.sceneId) return;
  try {
    window.localStorage.setItem(
      coachingStorageKey(novelId),
      JSON.stringify({ coachTargetScene })
    );
  } catch {
    // Non-fatal — coaching still works in-memory for this session.
  }
};

const clearPersistedCoaching = (novelId) => {
  if (!novelId || typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(coachingStorageKey(novelId));
  } catch {
    // Non-fatal.
  }
};

const normalizeOliviaQuickReplies = (quickReplies) => {
  if (!Array.isArray(quickReplies) || quickReplies.length === 0) return undefined;
  return quickReplies.map((item, i) => {
    if (typeof item === "string") {
      return { id: `qr-${i}`, label: item };
    }
    return {
      id: item.id || `qr-${i}`,
      label: item.label || String(item),
    };
  });
};

/** Map API thread message to Olivia modal row (welcome + confirmations live in Mongo). */
const mapOliviaApiMessageToRow = (msg, thread = "scene") => {
  const row = {
    id: String(msg._id || msg.timestamp || ""),
    role: msg.role,
    text: msg.content || "",
    timestamp: formatOliviaMessageTime(msg.timestamp),
    sortTs: msg.timestamp ? new Date(msg.timestamp).getTime() : 0,
    thread,
  };
  const qr = normalizeOliviaQuickReplies(msg.metadata?.quickReplies);
  if (qr) {
    row.quickReplies = qr;
  }
  if (Array.isArray(msg.attachments) && msg.attachments.length > 0) {
    row.attachments = msg.attachments;
  }
  return row;
};

const emptyOliviaHistoryCursor = () => ({ hasMore: false, beforeId: null });

const mergeOliviaThreadRows = (rows) =>
  [...rows].sort(
    (a, b) => a.sortTs - b.sortTs || String(a.id).localeCompare(String(b.id))
  );

const oldestMessageIdForThread = (rows, thread) => {
  const filtered = (rows || []).filter((r) => r.thread === thread);
  if (!filtered.length) return null;
  const oldest = filtered.reduce((a, b) => (a.sortTs <= b.sortTs ? a : b));
  return oldest.id || null;
};

const mergeOliviaRow = (a, b) => {
  if (!a) return b;
  if (!b) return a;
  const quickReplies =
    normalizeOliviaQuickReplies(b.quickReplies) ||
    normalizeOliviaQuickReplies(a.quickReplies);
  return {
    ...a,
    ...b,
    text: b.text || a.text,
    ...(quickReplies ? { quickReplies } : {}),
  };
};

const dedupeMergeOliviaRows = (incoming, existing) => {
  const byId = new Map();
  for (const m of [...incoming, ...existing]) {
    if (!m?.id) continue;
    byId.set(m.id, byId.has(m.id) ? mergeOliviaRow(byId.get(m.id), m) : m);
  }
  return mergeOliviaThreadRows(Array.from(byId.values()));
};

const cursorFromHistoryPage = (messages, hasMore) => ({
  hasMore: Boolean(hasMore),
  beforeId: messages?.[0]?._id ? String(messages[0]._id) : null,
});

const BookEditorPage = ({ isReadOnly = false, showSidebarTabs = true, showDownloadButton = false }) => {
  const isMobileLayout = useMobileLayout();
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Check URL params for view mode
  const searchParams = new URLSearchParams(window.location.search);
  const isViewMode = searchParams.get("view") === "true" || isReadOnly;
  const [selectedScene, setSelectedScene] = useState({
    promptKey: null,
    text: null,
    index: null,
    id: null,
  });
  const [expandedAct, setExpandedAct] = useState(() => new Set([1]));
  const [bookData, setBookData] = useState({ acts: [] });
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newSceneTitle, setNewSceneTitle] = useState("");
  const [debouncedLiveHtml, setDebouncedLiveHtml] = useState("");
  const [editorDirty, setEditorDirty] = useState(false);
  const [characterListData, setCharacterListData] = useState([]);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [showCoverModal, setShowCoverModal] = useState(false);
  /** Legacy parallel to SSE-filled slots; outline now hydrates from API — keep 15 nulls for empty-`userContents` sidebar path. */
  const scenes = useMemo(() => Array(15).fill(null), []);
  const [showOliviaChat, setShowOliviaChat] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const subscriptionPaused = isSubscriptionPaused(subscriptionData);
  /** Mobile/tablet drawer state — hidden via CSS on desktop (>=1200px). */
  const [outlineDrawerOpen, setOutlineDrawerOpen] = useState(false);
  const [scenePanelDrawerOpen, setScenePanelDrawerOpen] = useState(false);
  /**
   * Resizable Scene Coach panel (desktop only). `null` means "use the default
   * flex ratio" so a fresh novel — or one whose stored value was cleared by
   * a double-click reset — keeps the original 30% split. Set to a clamped px
   * value once the writer drags the handle or restores from localStorage.
   */
  const workspaceRef = useRef(null);
  const editorColumnRef = useRef(null);
  const sceneCoachAsideRef = useRef(null);
  const sceneCoachWidthRef = useRef(null);
  const [sceneCoachWidth, setSceneCoachWidth] = useState(null);
  const [isResizingCoach, setIsResizingCoach] = useState(false);
  const [isCoachWidthAnimating, setIsCoachWidthAnimating] = useState(false);
  /**
   * First-time coachmark for the resize handle. We render the popover only
   * once a writer ever sees the Book Editor (across all their novels), then
   * persist dismissal in localStorage so it never reappears.
   * `null` = "unknown yet, don't render" so the popover doesn't flash before
   * the localStorage read completes.
   */
  const [showResizeHint, setShowResizeHint] = useState(null);
  /**
   * Triggers a brief, one-time "wiggle" animation on the handle to draw the
   * eye to it the first time a writer lands on the editor. Tied to the same
   * dismissal flag as the coachmark.
   */
  const [playHandleNudge, setPlayHandleNudge] = useState(false);
  /** Resizable outline panel (desktop only). `null` = default 320px via CSS. */
  const rootRef = useRef(null);
  const outlineAsideRef = useRef(null);
  const outlineWidthRef = useRef(null);
  const [outlineWidth, setOutlineWidth] = useState(null);
  const [isResizingOutline, setIsResizingOutline] = useState(false);
  const [showOutlineResizeHint, setShowOutlineResizeHint] = useState(null);
  const [playOutlineHandleNudge, setPlayOutlineHandleNudge] = useState(false);
  /** Focus mode hides outline + Scene Coach for distraction-free drafting. */
  const [focusMode, setFocusMode] = useState(false);
  const hasRightPanelRef = useRef(showSidebarTabs);
  /** Olivia's Guide (7-card walkthrough). Default to completed so the guide never
   *  flashes before localStorage is read; the effect below flips it false on a
   *  fresh novel the writer hasn't completed yet. `showGuideOverlay` drives the
   *  re-open (modal) variant. */
  const [guideCompleted, setGuideCompleted] = useState(true);
  const [showGuideOverlay, setShowGuideOverlay] = useState(false);
  /** Persists across modal close/reopen — Mongo message ids already saved to outline via Olivia */
  const [oliviaSavedSceneMessageIds, setOliviaSavedSceneMessageIds] = useState([]);
  /** Authoritative layering state from the server; drives deterministic Insert targeting in OliviaChatModal */
  const [layeringState, setLayeringState] = useState(null);
  const [targetSceneForOlivia, setTargetSceneForOlivia] = useState(null);
  const [outlineRevision, setOutlineRevision] = useState(0);
  const [lastOutlineChange, setLastOutlineChange] = useState(null);
  const prevLayoutHashRef = useRef("");
  const skipNextHashRevisionBumpRef = useRef(false);
  // Note: the textarea draft now lives inside OliviaChatModal (with localStorage
  // recovery per novel) so typing in the chat does not re-render this large page.
  const [chatMessages, setChatMessages] = useState([]);
  const [chatIsProcessing, setChatIsProcessing] = useState(false);
  const [chatIsStreaming, setChatIsStreaming] = useState(false);
  const [oliviaHasMoreOnServer, setOliviaHasMoreOnServer] = useState(false);
  const [isLoadingEarlierOlivia, setIsLoadingEarlierOlivia] = useState(false);
  const [oliviaWebSearch, setOliviaWebSearch] = useState(false);
  const [isDownloadingManuscript, setIsDownloadingManuscript] = useState(false);
  const [isDownloadingOutline, setIsDownloadingOutline] = useState(false);
  const [isDownloadingCharacters, setIsDownloadingCharacters] = useState(false);
  const [isDownloadingStoryBible, setIsDownloadingStoryBible] = useState(false);
  const downloadManuscriptInFlightRef = useRef(false);
  const downloadOutlineInFlightRef = useRef(false);
  const downloadCharactersInFlightRef = useRef(false);
  const downloadStoryBibleInFlightRef = useRef(false);
  /** Which novel id the current `chatMessages` / Olivia history fetch corresponds to; null = not loaded for current session target */
  const oliviaHistoryLoadedForIdRef = useRef(null);
  const sceneHistoryCursorRef = useRef(emptyOliviaHistoryCursor());
  const editorHistoryCursorRef = useRef(emptyOliviaHistoryCursor());
  const coachingHistoryCursorRef = useRef(emptyOliviaHistoryCursor());
  const coachingSessionActiveRef = useRef(false);
  const coachingContextRef = useRef(null);
  /** Display-only mirror of the active coaching session (drives the modal mode chip).
   *  Routing still reads coachingSessionActiveRef; this state just triggers re-renders. */
  const [activeCoachingScene, setActiveCoachingScene] = useState(null);
  const latestOliviaNovelIdRef = useRef(id);
  latestOliviaNovelIdRef.current = id;
  const latestBookIdRef = useRef(id);
  latestBookIdRef.current = id;

  const chatStreamAbortRef = useRef(null);
  const chatTokenBufferRef = useRef("");
  const chatPlaceholderIdRef = useRef(null);
  const chatIsStreamingRef = useRef(false);
  const chatRafIdRef = useRef(null);

  /** Suppress the automatic history reload when allScenesComplete transitions during the active 15th-scene insert. */
  const skipAllScenesReloadRef = useRef(false);
  /** After suppressing the auto-reload, merge editor history silently once the user sends their first editor message. */
  const needsEditorHistoryMergeRef = useRef(false);

  // New state variables for improved auto-save and first load handling
  const [lastSavedContent, setLastSavedContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isOnline, setIsOnline] = useState(() => readBrowserOnline());
  const [serverSaveBlocked, setServerSaveBlocked] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasSelectedInitialScene, setHasSelectedInitialScene] = useState(false);
  const isSavingRef = useRef(false);
  const isOnlineRef = useRef(readBrowserOnline());
  const serverSaveBlockedRef = useRef(false);
  const persistSceneRef = useRef(async () => {});
  const saveQueueRef = useRef(null);
  if (!saveQueueRef.current) {
    saveQueueRef.current = createDraftSaveQueue({
      persist: (sceneId, text) => persistSceneRef.current(sceneId, text),
      onSavingChange: (saving) => {
        isSavingRef.current = Boolean(saving);
        setIsSaving(Boolean(saving));
      },
    });
  }
  const recoveryToastShownRef = useRef(new Set());
  const lastKnownUpdatedAtRef = useRef(new Map());
  const syncGenerationRef = useRef(0);
  const [draftConflict, setDraftConflict] = useState(null);
  const draftConflictRef = useRef(null);
  const saveUserContentRef = useRef(async () => {});
  const editorHydratingRef = useRef(true);
  const [editorHydrating, setEditorHydrating] = useState(true);
  const handleEditorUserEdit = useCallback(() => {
    editorHydratingRef.current = false;
    setEditorHydrating(false);
    setSaveFailed(false);
  }, []);
  const handleEditorHydrated = useCallback(() => {
    editorHydratingRef.current = false;
    setEditorHydrating(false);
    const dirty = manuscriptDraftRef.current?.isDirty?.() ?? false;
    setEditorDirty(dirty);
  }, []);
  const [editorHistory, setEditorHistory] = useState({
    canUndo: false,
    canRedo: false,
  });
  const handleEditorHistoryChange = useCallback((next) => {
    const canUndo = Boolean(next?.canUndo);
    const canRedo = Boolean(next?.canRedo);
    setEditorHistory((prev) => {
      if (prev.canUndo === canUndo && prev.canRedo === canRedo) return prev;
      return { canUndo, canRedo };
    });
  }, []);
  const handleEditorUndo = useCallback(() => {
    manuscriptDraftRef.current?.undo?.();
  }, []);
  const handleEditorRedo = useCallback(() => {
    manuscriptDraftRef.current?.redo?.();
  }, []);
  const selectedSceneRef = useRef(selectedScene);
  const contentSceneIdRef = useRef(null);
  const [contentSceneId, setContentSceneId] = useState(null);
  const manuscriptDraftRef = useRef(null);
  const {
    handleEditorVoiceTranscript,
    handleEditorDictationStart,
    handleEditorDictationProgress,
    handleEditorDictationManualEdit,
  } = useEditorDictation({ richEditorRef: manuscriptDraftRef });
  const voiceTypingHint = useMemo(
    () =>
      supportsUnspokenPunctuation()
        ? "Tap the mic and speak — words appear as you talk. Say “comma” or “period” when speaking fast; Chrome also adds punctuation from pauses. Tap again to finish."
        : "Tap the mic, speak — words appear as you talk. Say “comma” or “period” for punctuation. Tap again to finish.",
    []
  );
  // Always-fresh mirror so callbacks that omit editor state from deps (e.g.
  // handleSendOliviaMessage) can read the last server-saved HTML.
  const lastSavedContentRef = useRef(lastSavedContent);

  const getLiveDraftHtml = useCallback(
    () => manuscriptDraftRef.current?.getHtml?.() ?? "",
    []
  );

  useEffect(() => {
    selectedSceneRef.current = selectedScene;
  }, [selectedScene]);

  useEffect(() => {
    lastSavedContentRef.current = lastSavedContent;
  }, [lastSavedContent]);

  useEffect(() => {
    draftConflictRef.current = draftConflict;
  }, [draftConflict]);

  const rememberUpdatedAt = useCallback((sceneId, updatedAt) => {
    const iso = toUpdatedAtIso(updatedAt);
    if (!sceneId || !iso) return iso;
    lastKnownUpdatedAtRef.current.set(String(sceneId), iso);
    return iso;
  }, []);

  const seedUpdatedAtTokens = useCallback((userContents) => {
    for (const row of userContents || []) {
      if (!row?._id || lastKnownUpdatedAtRef.current.has(String(row._id))) {
        continue;
      }
      rememberUpdatedAt(row._id, row.updatedAt);
    }
  }, [rememberUpdatedAt]);

  const knownUpdatedAtFor = useCallback((sceneId) => {
    if (!sceneId) return null;
    return lastKnownUpdatedAtRef.current.get(String(sceneId)) ?? null;
  }, []);

  // Drawer body-scroll lock + Esc handler (tablet/mobile only — drawers are
  // hidden via CSS on desktop, so the locks are no-ops there).
  useEffect(() => {
    const anyOpen = outlineDrawerOpen || scenePanelDrawerOpen;
    if (!anyOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setOutlineDrawerOpen(false);
        setScenePanelDrawerOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [outlineDrawerOpen, scenePanelDrawerOpen]);

  // Auto-close drawers when viewport grows back to desktop so they don't get
  // stuck open behind the now-hidden CSS overlay.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1200px)");
    const handle = (e) => {
      if (e.matches) {
        setOutlineDrawerOpen(false);
        setScenePanelDrawerOpen(false);
      }
    };
    if (mq.addEventListener) mq.addEventListener("change", handle);
    else mq.addListener(handle);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", handle);
      else mq.removeListener(handle);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Resizable outline + Scene Coach panels (desktop)
  // ---------------------------------------------------------------------------
  const clampCoachWidthForWorkspace = useCallback((px) => {
    const node = workspaceRef.current;
    if (!node) return px;
    return clampCoachWidthPx(node, px, {
      hasRightPanel: hasRightPanelRef.current,
    });
  }, []);

  const clampOutlineWidthForRoot = useCallback((px) => {
    const node = rootRef.current;
    if (!node) return px;
    return clampOutlineWidthPx(node, px, {
      hasRightPanel: hasRightPanelRef.current,
      coachWidthPx: sceneCoachWidthRef.current,
    });
  }, []);

  useEffect(() => {
    if (!id) return;
    let next = null;
    try {
      const stored = window.localStorage.getItem(
        `bookEditor:sceneCoachWidth:${id}`
      );
      const parsed = stored ? Number(stored) : NaN;
      if (Number.isFinite(parsed) && parsed > 0) {
        next = clampCoachWidthForWorkspace(parsed);
      }
    } catch {
      next = null;
    }
    sceneCoachWidthRef.current = next;
    setSceneCoachWidth(next);
  }, [id, clampCoachWidthForWorkspace]);

  useEffect(() => {
    if (!id) return;
    let next = null;
    try {
      const stored = window.localStorage.getItem(
        `bookEditor:outlineWidth:${id}`
      );
      const parsed = stored ? Number(stored) : NaN;
      if (Number.isFinite(parsed) && parsed > 0) {
        next = clampOutlineWidthForRoot(parsed);
      }
    } catch {
      next = null;
    }
    outlineWidthRef.current = next;
    setOutlineWidth(next);
  }, [id, clampOutlineWidthForRoot]);

  useEffect(() => {
    sceneCoachWidthRef.current = sceneCoachWidth;
  }, [sceneCoachWidth]);

  useEffect(() => {
    outlineWidthRef.current = outlineWidth;
  }, [outlineWidth]);

  useEffect(() => {
    const onResize = () => {
      const currentCoach = sceneCoachWidthRef.current;
      const currentOutline = outlineWidthRef.current;
      if (currentOutline != null) {
        const clamped = clampOutlineWidthForRoot(currentOutline);
        if (clamped !== currentOutline) {
          outlineWidthRef.current = clamped;
          setOutlineWidth(clamped);
        }
      }
      if (currentCoach != null) {
        const clamped = clampCoachWidthForWorkspace(currentCoach);
        if (clamped !== currentCoach) {
          sceneCoachWidthRef.current = clamped;
          setSceneCoachWidth(clamped);
        }
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clampCoachWidthForWorkspace, clampOutlineWidthForRoot]);

  const persistCoachWidth = useCallback(
    (width) => {
      if (!id) return;
      try {
        if (width == null) {
          window.localStorage.removeItem(`bookEditor:sceneCoachWidth:${id}`);
        } else {
          window.localStorage.setItem(
            `bookEditor:sceneCoachWidth:${id}`,
            String(Math.round(width))
          );
        }
      } catch {
        // Best-effort.
      }
    },
    [id]
  );

  const persistOutlineWidth = useCallback(
    (width) => {
      if (!id) return;
      try {
        if (width == null) {
          window.localStorage.removeItem(`bookEditor:outlineWidth:${id}`);
        } else {
          window.localStorage.setItem(
            `bookEditor:outlineWidth:${id}`,
            String(Math.round(width))
          );
        }
      } catch {
        // Best-effort.
      }
    },
    [id]
  );

  const toggleReadingMode = useCallback(() => {
    const aside = sceneCoachAsideRef.current;
    const workspace = workspaceRef.current;
    if (!aside || !workspace) return;

    const layout = getWorkspaceLayout(workspace, {
      hasRightPanel: hasRightPanelRef.current,
    });
    if (!layout) return;

    const readingThreshold = layout.contentWidth * READING_MODE_THRESHOLD_RATIO;
    const currentStored = sceneCoachWidthRef.current;
    const alreadyWide =
      currentStored != null && currentStored >= readingThreshold;

    const currentPx = Math.round(aside.getBoundingClientRect().width);
    const defaultPx = Math.round(layout.contentWidth * 0.3);
    const targetWide = clampCoachWidthPx(
      workspace,
      layout.contentWidth * READING_MODE_RATIO,
      { hasRightPanel: hasRightPanelRef.current }
    );

    let finished = false;
    const finish = (persistValue) => {
      if (finished) return;
      finished = true;
      aside.removeEventListener("transitionend", onTransitionEnd);
      window.clearTimeout(fallbackTimer);
      setIsCoachWidthAnimating(false);
      if (persistValue === null) {
        sceneCoachWidthRef.current = null;
        setSceneCoachWidth(null);
        persistCoachWidth(null);
      } else {
        sceneCoachWidthRef.current = persistValue;
        setSceneCoachWidth(persistValue);
        persistCoachWidth(persistValue);
      }
    };

    const onTransitionEnd = (e) => {
      if (e.target !== aside || e.propertyName !== "flex-basis") return;
      finish(alreadyWide ? null : targetWide);
    };

    sceneCoachWidthRef.current = currentPx;
    setSceneCoachWidth(currentPx);
    setIsCoachWidthAnimating(true);
    void aside.offsetWidth;

    const fallbackTimer = window.setTimeout(
      () => finish(alreadyWide ? null : targetWide),
      COACH_WIDTH_TRANSITION_MS + 80
    );

    aside.addEventListener("transitionend", onTransitionEnd);

    requestAnimationFrame(() => {
      if (alreadyWide) {
        sceneCoachWidthRef.current = defaultPx;
        setSceneCoachWidth(defaultPx);
      } else {
        sceneCoachWidthRef.current = targetWide;
        setSceneCoachWidth(targetWide);
      }
    });
  }, [persistCoachWidth]);

  const handleCoachResizeStart = useCallback(
    (e) => {
      const node = workspaceRef.current;
      if (!node) return;
      e.preventDefault();
      setIsResizingCoach(true);
      document.body.classList.add("book-editor-resizing");

      const startX = e.clientX;
      let didDrag = false;

      const onMove = (ev) => {
        const workspace = workspaceRef.current;
        const layout = getWorkspaceLayout(workspace, {
          hasRightPanel: hasRightPanelRef.current,
        });
        if (!layout) return;
        if (!didDrag && Math.abs(ev.clientX - startX) > CLICK_DRAG_THRESHOLD_PX) {
          didDrag = true;
        }
        if (!didDrag) return;
        const rawCoachWidth = layout.contentRight - ev.clientX;
        const next = clampCoachWidthPx(workspace, rawCoachWidth, {
          hasRightPanel: hasRightPanelRef.current,
        });
        if (next === sceneCoachWidthRef.current) return;
        sceneCoachWidthRef.current = next;
        setSceneCoachWidth(next);
      };

      const onUp = () => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.removeEventListener("pointercancel", onUp);
        document.body.classList.remove("book-editor-resizing");
        setIsResizingCoach(false);
        if (didDrag) {
          persistCoachWidth(sceneCoachWidthRef.current);
        } else {
          toggleReadingMode();
        }
      };

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", onUp);
    },
    [persistCoachWidth, toggleReadingMode]
  );

  const handleCoachResizeKey = useCallback(
    (e) => {
      const node = workspaceRef.current;
      if (!node) return;
      const layout = getWorkspaceLayout(node, {
        hasRightPanel: hasRightPanelRef.current,
      });
      if (!layout) return;
      const current =
        sceneCoachWidthRef.current ??
        Math.round(layout.contentWidth * 0.3);
      const step = e.shiftKey ? 24 : 16;
      let next = current;
      if (e.key === "ArrowLeft") next = current + step;
      else if (e.key === "ArrowRight") next = current - step;
      else if (e.key === "Home") next = layout.minCoachWidth;
      else if (e.key === "End") next = layout.maxCoachWidth;
      else return;
      e.preventDefault();
      next = clampCoachWidthForWorkspace(next);
      sceneCoachWidthRef.current = next;
      setSceneCoachWidth(next);
      persistCoachWidth(next);
    },
    [clampCoachWidthForWorkspace, persistCoachWidth]
  );

  const handleCoachResizeReset = useCallback(() => {
    sceneCoachWidthRef.current = null;
    setSceneCoachWidth(null);
    persistCoachWidth(null);
  }, [persistCoachWidth]);

  const handleOutlineResizeStart = useCallback(
    (e) => {
      const root = rootRef.current;
      if (!root) return;
      e.preventDefault();
      setIsResizingOutline(true);
      document.body.classList.add("book-editor-resizing");

      const startX = e.clientX;
      let didDrag = false;

      const onMove = (ev) => {
        const layout = getRootLayout(rootRef.current);
        if (!layout) return;
        if (!didDrag && Math.abs(ev.clientX - startX) > CLICK_DRAG_THRESHOLD_PX) {
          didDrag = true;
        }
        if (!didDrag) return;
        const rawOutlineWidth = ev.clientX - layout.contentLeft;
        const next = clampOutlineWidthPx(rootRef.current, rawOutlineWidth, {
          hasRightPanel: hasRightPanelRef.current,
          coachWidthPx: sceneCoachWidthRef.current,
        });
        if (next === outlineWidthRef.current) return;
        outlineWidthRef.current = next;
        setOutlineWidth(next);
      };

      const onUp = () => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.removeEventListener("pointercancel", onUp);
        document.body.classList.remove("book-editor-resizing");
        setIsResizingOutline(false);
        if (didDrag) {
          persistOutlineWidth(outlineWidthRef.current);
        }
      };

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", onUp);
    },
    [persistOutlineWidth]
  );

  const handleOutlineResizeKey = useCallback(
    (e) => {
      const root = rootRef.current;
      if (!root) return;
      const layout = getRootLayout(root);
      if (!layout) return;
      const current =
        outlineWidthRef.current ?? OUTLINE_DEFAULT_PX;
      const step = e.shiftKey ? 24 : 16;
      let next = current;
      if (e.key === "ArrowRight") next = current + step;
      else if (e.key === "ArrowLeft") next = current - step;
      else if (e.key === "Home") next = OUTLINE_MIN_PX;
      else if (e.key === "End") {
        next = clampOutlineWidthPx(root, layout.contentWidth, {
          hasRightPanel: hasRightPanelRef.current,
          coachWidthPx: sceneCoachWidthRef.current,
        });
      } else return;
      e.preventDefault();
      next = clampOutlineWidthForRoot(next);
      outlineWidthRef.current = next;
      setOutlineWidth(next);
      persistOutlineWidth(next);
    },
    [clampOutlineWidthForRoot, persistOutlineWidth]
  );

  const handleOutlineResizeReset = useCallback(() => {
    outlineWidthRef.current = null;
    setOutlineWidth(null);
    persistOutlineWidth(null);
  }, [persistOutlineWidth]);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = window.localStorage.getItem(RESIZE_HINT_KEY) === "1";
    } catch {
      dismissed = true;
    }
    setShowResizeHint(!dismissed);
    setPlayHandleNudge(!dismissed);
  }, []);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = window.localStorage.getItem(OUTLINE_RESIZE_HINT_KEY) === "1";
    } catch {
      dismissed = true;
    }
    setShowOutlineResizeHint(!dismissed);
    setPlayOutlineHandleNudge(!dismissed);
  }, []);

  useEffect(() => {
    if (!playHandleNudge) return;
    const t = window.setTimeout(() => setPlayHandleNudge(false), 2400);
    return () => window.clearTimeout(t);
  }, [playHandleNudge]);

  useEffect(() => {
    if (!playOutlineHandleNudge) return;
    const t = window.setTimeout(() => setPlayOutlineHandleNudge(false), 2400);
    return () => window.clearTimeout(t);
  }, [playOutlineHandleNudge]);

  const dismissResizeHint = useCallback(() => {
    setShowResizeHint(false);
    setPlayHandleNudge(false);
    try {
      window.localStorage.setItem(RESIZE_HINT_KEY, "1");
    } catch {
      // Best-effort.
    }
  }, []);

  const dismissOutlineResizeHint = useCallback(() => {
    setShowOutlineResizeHint(false);
    setPlayOutlineHandleNudge(false);
    try {
      window.localStorage.setItem(OUTLINE_RESIZE_HINT_KEY, "1");
    } catch {
      // Best-effort.
    }
  }, []);

  const isInReadingMode = useMemo(() => {
    if (sceneCoachWidth == null) return false;
    const layout = getWorkspaceLayout(workspaceRef.current, {
      hasRightPanel: hasRightPanelRef.current,
    });
    if (!layout) return false;
    return sceneCoachWidth >= layout.contentWidth * READING_MODE_THRESHOLD_RATIO;
  }, [sceneCoachWidth]);


  const storyResponseMap = getStoryResponseMap(bookData.storyResponses);

  const outlineLayout = useMemo(
    () =>
      buildOutlineLayout({
        userContents: bookData?.userContents || [],
        storyResponseMap,
        novelId: bookData?.novelId || bookData?._id || id,
        getSceneTitleText,
      }),
    [bookData?.userContents, bookData?.novelId, bookData?._id, id, storyResponseMap]
  );

  const selectedChapterNumber = useMemo(
    () =>
      resolveGlobalChapterNumber(
        selectedScene.actNumber,
        selectedScene.sceneIndex,
        selectedScene.globalSceneNumber,
        computeActOffsets(bookData?.userContents || [])
      ),
    [
      selectedScene.actNumber,
      selectedScene.sceneIndex,
      selectedScene.globalSceneNumber,
      bookData?.userContents,
    ]
  );

  const oliviaUserContents = useMemo(
    () => withoutArchivedScenes(bookData?.userContents || EMPTY_USER_CONTENTS),
    [bookData?.userContents]
  );

  const oliviaOutlineLayout = useMemo(
    () =>
      outlineLayout.filter((row) => {
        const uc = (bookData?.userContents || []).find(
          (c) => String(c._id) === String(row.sceneId)
        );
        return !isArchivedScene(uc);
      }),
    [outlineLayout, bookData?.userContents]
  );

  const oliviaTargetScene = useMemo(() => {
    if (!targetSceneForOlivia) return null;
    const contents = bookData?.userContents || [];
    const row = targetSceneForOlivia.sceneId
      ? contents.find(
          (c) => String(c._id) === String(targetSceneForOlivia.sceneId)
        )
      : contents.find(
          (c) =>
            Number(c.actNumber) === Number(targetSceneForOlivia.actNumber) &&
            Number(c.sceneIndex) === Number(targetSceneForOlivia.sceneIndex)
        );
    return isArchivedScene(row) ? null : targetSceneForOlivia;
  }, [targetSceneForOlivia, bookData?.userContents]);

  const layoutPositionHash = useMemo(
    () => computeLayoutPositionHash(outlineLayout),
    [outlineLayout]
  );

  useEffect(() => {
    if (!layoutPositionHash) {
      prevLayoutHashRef.current = "";
      return;
    }
    if (!prevLayoutHashRef.current) {
      prevLayoutHashRef.current = layoutPositionHash;
      return;
    }
    if (prevLayoutHashRef.current === layoutPositionHash) return;

    if (skipNextHashRevisionBumpRef.current) {
      skipNextHashRevisionBumpRef.current = false;
    } else {
      setOutlineRevision((r) => r + 1);
    }
    prevLayoutHashRef.current = layoutPositionHash;
  }, [layoutPositionHash]);

  useEffect(() => {
    setTargetSceneForOlivia((prev) => {
      if (!prev?.sceneId || !outlineLayout.length) return prev;
      const resolved = resolveTargetSceneFromLayout(prev, outlineLayout);
      if (!resolved) return prev;
      if (
        resolved.actNumber === prev.actNumber &&
        resolved.sceneIndex === prev.sceneIndex
      ) {
        return prev;
      }
      return { ...prev, ...resolved };
    });
  }, [outlineLayout]);

  const handleOutlineStructureChange = useCallback((payload) => {
    skipNextHashRevisionBumpRef.current = true;
    setOutlineRevision((r) => r + 1);
    setLastOutlineChange({ ...payload, at: Date.now() });
  }, []);

  const applySceneRenameFromApi = useCallback(
    (sceneId, requestedTitle, apiData = {}) => {
      const finalTitle = apiData.finalTitle ?? requestedTitle;
      const { promptKey, responseText, titleWasRenamed } = apiData;

      setBookData((prev) => {
        const updatedContents = [...(prev.userContents || [])];
        const idx = updatedContents.findIndex(
          (c) => String(c._id) === String(sceneId)
        );
        if (idx !== -1) {
          updatedContents[idx] = {
            ...updatedContents[idx],
            sceneTitle: finalTitle,
          };
        }

        let storyResponses = prev.storyResponses;
        if (promptKey && responseText != null) {
          storyResponses = (prev.storyResponses || []).map((sr) =>
            sr.promptKey === promptKey ? { ...sr, responseText } : sr
          );
        }

        return {
          ...prev,
          userContents: updatedContents,
          ...(storyResponses !== prev.storyResponses
            ? { storyResponses }
            : {}),
        };
      });

      handleOutlineStructureChange({
        type: "rename",
        sceneId: String(sceneId),
        sceneTitle: finalTitle,
      });

      if (titleWasRenamed && finalTitle) {
        toast.info(
          `A scene titled "${requestedTitle}" already exists. Your scene was saved as "${finalTitle}".`,
          { autoClose: 5000 }
        );
      } else {
        toast.success("Scene renamed.");
      }
    },
    [handleOutlineStructureChange]
  );

  const resolveOliviaTargetScene = useCallback(
    (target) => {
      if (!target) return target;
      let next = enrichTargetSceneFromUserContents(
        target,
        bookData?.userContents || []
      );
      if (outlineLayout.length) {
        const fromLayout = resolveTargetSceneFromLayout(next, outlineLayout);
        if (fromLayout) next = fromLayout;
      }
      return next;
    },
    [bookData?.userContents, outlineLayout]
  );

  const shouldBeReadOnly = isViewMode || bookData?.status === "completed";

  useEffect(() => {
    if (!subscriptionData || !subscriptionPaused) return;
    toast.error(
      "Your subscription is paused. Resume billing to access your novels.",
      { autoClose: 4500 }
    );
    navigate("/dashboard/userprofile?tab=subscription", { replace: true });
  }, [subscriptionPaused, subscriptionData, navigate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getAgentAccessAPI();
        if (!cancelled) setSubscriptionData(data);
      } catch (error) {
        if (!cancelled) {
          console.error("Error fetching subscription access:", error);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    hasRightPanelRef.current = !shouldBeReadOnly && showSidebarTabs;
  }, [shouldBeReadOnly, showSidebarTabs]);

  const scenesGenerated = scenes.filter((s) => s !== null).length;
  /** Use null checks, not truthiness — `sceneIndex === 0` is valid (Olivia 0-based slots) but falsy with `&&`. */
  const completedSceneCount = (bookData?.userContents || []).filter(
    (c) => c.actNumber != null && c.sceneIndex != null
  ).length;
  const shouldShowOliviaButton =
    scenesGenerated >= 1 ||
    completedSceneCount >= 1 ||
    (Boolean(bookData?.novelId) &&
      completedSceneCount === 0 &&
      scenesGenerated === 0 &&
      !shouldBeReadOnly);
  const showOliviaFloatingButton = shouldShowOliviaButton;
  const allScenesComplete = completedSceneCount >= 15;
  const layeringComplete = Boolean(bookData?.layeringComplete);

  // Find the next empty scene slot from book data.
  // Two promptKey schemes exist:
  //   - Initial generation (responsesApiService): 1-indexed → scene1…scene15
  //   - saveOliviaScene: 0-indexed → scene0…scene14
  // Also check the `scenes` state array populated by SSE (index 0-14).
  const getNextEmptyScene = useCallback((data) => {
    const contents = data?.userContents || bookData?.userContents || [];
    const responses = data?.storyResponses || bookData?.storyResponses || [];

    // Build a lookup of promptKeys that have actual response content
    const responseTextByKey = {};
    for (const sr of responses) {
      if (sr.promptKey && sr.responseText) responseTextByKey[sr.promptKey] = true;
    }

    // Mark filled slots using actNumber/sceneIndex from userContents (avoids promptKey scheme collisions).
    // User-added scenes also occupy their slot even with empty body — otherwise Olivia's
    // "next empty spine slot" math would jump over them and mis-target the toast.
    const filledSlots = new Set();
    for (const uc of contents) {
      if (uc.actNumber == null || uc.sceneIndex == null) continue;
      if (uc.isUserAdded) {
        filledSlots.add(`${uc.actNumber}-${uc.sceneIndex}`);
        continue;
      }
      if (responseTextByKey[uc.promptKey] || uc.userContent) {
        filledSlots.add(`${uc.actNumber}-${uc.sceneIndex}`);
      }
    }

    // Also mark scenes populated via SSE (positionally correct, 0-indexed)
    for (let i = 0; i < scenes.length; i++) {
      if (scenes[i] != null) {
        filledSlots.add(`${Math.floor(i / 5) + 1}-${(i % 5) + 1}`);
      }
    }

    for (let act = 1; act <= 3; act++) {
      for (let sc = 1; sc <= 5; sc++) {
        if (!filledSlots.has(`${act}-${sc}`)) {
          return { actNumber: act, sceneIndex: sc };
        }
      }
    }
    return null;
  }, [bookData?.userContents, bookData?.storyResponses, scenes]);

  const [oliviaAttention, setOliviaAttention] = useState(false);
  const prevShowOliviaRef = useRef(false);
  useEffect(() => {
    if (showOliviaFloatingButton && !prevShowOliviaRef.current) {
      setOliviaAttention(true);
      const timer = setTimeout(() => setOliviaAttention(false), 6000);
      return () => clearTimeout(timer);
    }
    prevShowOliviaRef.current = showOliviaFloatingButton;
  }, [showOliviaFloatingButton]);

  const fetchBookData = async (id) => {
    if (!id) return null;
    try {
      const response = await getABook(id);
      const data = response.data;
      seedUpdatedAtTokens(data.userContents);
      setBookData((prev) => ({
        ...prev,
        ...data,
        novelId: data._id,
      }));
      recordRecentWork({
        kind: "novel",
        resourceId: data._id,
        name: data.name,
        uploaded: false,
        status: data.status || null,
      });
      return data;
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  // Fetch book details
  useEffect(() => {
    lastKnownUpdatedAtRef.current = new Map();
    syncGenerationRef.current += 1;
    setDraftConflict(null);
    fetchBookData(id);
  }, [id]);

  // Boot loading: keep layout stable while initial book + first scene hydrate.
  // This avoids an empty editor that suddenly "jumps" when content arrives.
  const isBootLoading = !bookData?.novelId || isInitialLoad;

  const manuscriptEditorBootstrap = useMemo(() => {
    if (!bookData?.userContents || !selectedScene.id) return null;

    const scene = bookData.userContents.find(
      (c) => c._id === selectedScene.id
    );
    const serverContent = scene?.userContent || "";
    const resolved =
      id && selectedScene.id
        ? resolveDraftForScene(
            id,
            selectedScene.id,
            serverContent,
            toUpdatedAtIso(scene?.updatedAt) ||
              knownUpdatedAtFor(selectedScene.id)
          )
        : { text: serverContent, recovered: false };

    return {
      initialHtml: preserveLeadingIndentation(resolved.text),
      savedHtml: preserveLeadingIndentation(serverContent),
      recovered: resolved.recovered,
    };
  }, [id, selectedScene.id, bookData?.userContents, knownUpdatedAtFor]);

  const totalWordCount = useMemo(() => {
    if (!bookData?.userContents) return 0;
    return bookData.userContents.reduce(
      (sum, item) =>
        sum +
        countSceneManuscriptWords(item, {
          liveContent: debouncedLiveHtml,
          contentSceneId,
          selectedSceneId: selectedScene.id,
        }),
      0
    );
  }, [
    bookData?.userContents,
    debouncedLiveHtml,
    contentSceneId,
    selectedScene.id,
  ]);

  const effectiveShowSidebarTabs = shouldBeReadOnly ? false : showSidebarTabs;
  const canShowEditorActions = Boolean(bookData?.novelId) && !shouldBeReadOnly;
  /** Download is always visible once the novel loads; disabled until prose exists. */
  const effectiveShowDownloadButton = canShowEditorActions || showDownloadButton;
  const downloadManuscriptDisabled = totalWordCount === 0;
  const downloadOutlineDisabled = useMemo(() => {
    const responses = bookData?.storyResponses || [];
    return !responses.some((r) => r.responseText?.trim());
  }, [bookData?.storyResponses]);
  const downloadCharactersDisabled = useMemo(
    () =>
      !characterListData.some((character) =>
        (character.responseText || "").trim()
      ),
    [characterListData]
  );
  const downloadStoryBibleDisabled = useMemo(() => {
    const storyBible = (bookData?.storyBible || "").trim();
    const worldBuilding = (bookData?.worldBuilding || "").trim();
    const specialElements = (bookData?.specialElements || "").trim();
    return !storyBible && !worldBuilding && !specialElements;
  }, [bookData?.storyBible, bookData?.worldBuilding, bookData?.specialElements]);

  // Fetch characters
  useEffect(() => {
    if (!id) return;
    getAllCharactersOfaBook(id)
      .then((response) => setCharacterListData(response.data?.characters || []))
      .catch(() => setCharacterListData([]));
  }, [id]);

  useEffect(() => {
    setOliviaSavedSceneMessageIds([]);
  }, [id]);

  // Hydrate per-novel Olivia's Guide completion from localStorage. Default to
  // completed (true) so the 7-card walkthrough never flashes before this read;
  // only flip false when the novel id is known AND no completion is stored.
  useEffect(() => {
    setShowGuideOverlay(false);
    if (!id) {
      setGuideCompleted(true);
      return;
    }
    try {
      const stored = window.localStorage.getItem(
        `bookEditor:oliviaGuideCompleted:${id}`
      );
      setGuideCompleted(Boolean(stored));
    } catch {
      // localStorage can throw in private mode / SSR — fall back to completed.
      setGuideCompleted(true);
    }
  }, [id]);

  useEffect(() => {
    if (!id) {
      setFocusMode(false);
      return;
    }
    try {
      setFocusMode(
        window.localStorage.getItem(focusModeStorageKey(id)) === "1"
      );
    } catch {
      setFocusMode(false);
    }
  }, [id]);

  // Hydrate from server (survives full page refresh)
  useEffect(() => {
    const novelId = bookData?.novelId || bookData?._id;
    if (!id || !novelId || String(novelId) !== String(id)) return;
    const raw = bookData.oliviaSavedOutlineMessageIds;
    if (Array.isArray(raw)) {
      setOliviaSavedSceneMessageIds(raw.map((x) => String(x)));
    }
  }, [id, bookData?.novelId, bookData?._id, bookData?.oliviaSavedOutlineMessageIds]);

  // Set initial selected scene — restore last-opened scene, else first scene.
  useEffect(() => {
    if (
      !hasSelectedInitialScene &&
      bookData?.userContents &&
      bookData.userContents.length > 0 &&
      selectedScene.promptKey === null &&
      selectedScene.id === null
    ) {
      let restored = null;
      if (id) {
        try {
          const storedId = window.localStorage.getItem(
            selectedSceneStorageKey(id)
          );
          if (storedId) {
            restored =
              bookData.userContents.find(
                (c) => String(c._id) === String(storedId)
              ) || null;
          }
        } catch {
          restored = null;
        }
      }

      const initialScene = restored || bookData.userContents[0];
      setSelectedScene(
        buildSelectedSceneFromRow(
          initialScene,
          storyResponseMap,
          bookData.userContents
        )
      );

      if (initialScene.actNumber != null) {
        setExpandedAct((prev) => {
          const next = new Set(prev);
          next.add(initialScene.actNumber);
          return next;
        });
      }

      setHasSelectedInitialScene(true);
    }
  }, [
    id,
    bookData?.userContents,
    bookData?.storyResponses,
    selectedScene.promptKey,
    selectedScene.id,
    storyResponseMap,
    hasSelectedInitialScene,
  ]);

  // Remember the writer's current scene so a refresh reopens it (not scene one).
  useEffect(() => {
    if (!id || !selectedScene.id) return;
    try {
      window.localStorage.setItem(
        selectedSceneStorageKey(id),
        String(selectedScene.id)
      );
    } catch {
      // Best-effort; falls back to the first scene if storage is unavailable.
    }
  }, [id, selectedScene.id]);

  useEffect(() => {
    if (!bookData?.userContents) {
      setDebouncedLiveHtml("");
      setEditorDirty(false);
      setLastSavedContent("");
      contentSceneIdRef.current = null;
      setContentSceneId(null);
      return;
    }

    // Outline clicks already set contentSceneIdRef in handleSelectSceneFromOutline.
    if (contentSceneIdRef.current === selectedScene.id) {
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
      return;
    }

    let scene;
    if (selectedScene.id) {
      scene = bookData.userContents.find((c) => c._id === selectedScene.id);
    } else if (
      selectedScene.actNumber != null &&
      selectedScene.sceneIndex != null
    ) {
      scene = bookData.userContents.find(
        (c) =>
          c.actNumber === selectedScene.actNumber &&
          c.sceneIndex === selectedScene.sceneIndex
      );
    }

    const serverContent = scene?.userContent || "";
    const sceneId = selectedScene.id ?? scene?._id;
    const serverUpdatedAt =
      toUpdatedAtIso(scene?.updatedAt) || knownUpdatedAtFor(sceneId);
    const resolved =
      sceneId && id
        ? resolveDraftForScene(id, sceneId, serverContent, serverUpdatedAt)
        : { text: serverContent, recovered: false };
    if (sceneId && serverUpdatedAt) {
      rememberUpdatedAt(sceneId, serverUpdatedAt);
    }

    if (resolved.recovered && sceneId) {
      if (!recoveryToastShownRef.current.has(sceneId)) {
        recoveryToastShownRef.current.add(sceneId);
        toast.info("Recovered unsaved changes from this device.");
      }
    }

    const savedHtml = preserveLeadingIndentation(serverContent);
    setLastSavedContent(savedHtml);
    contentSceneIdRef.current = selectedScene.id;
    setContentSceneId(selectedScene.id ?? null);
    setDebouncedLiveHtml(preserveLeadingIndentation(resolved.text));
    setEditorDirty(false);
    editorHydratingRef.current = true;
    setEditorHydrating(true);

    if (isInitialLoad) {
      setIsInitialLoad(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookData, selectedScene]);

  const markServerSaveBlocked = useCallback(() => {
    serverSaveBlockedRef.current = true;
    setServerSaveBlocked(true);
    isSavingRef.current = false;
    setIsSaving(false);
  }, []);

  const clearServerSaveBlocked = useCallback(() => {
    serverSaveBlockedRef.current = false;
    setServerSaveBlocked(false);
  }, []);

  const isDraftSaveDeferred = useCallback(
    () => !readBrowserOnline() || !isOnlineRef.current,
    []
  );

  const handleDebouncedDraftHtmlChange = useCallback((html, sceneId) => {
    setDebouncedLiveHtml(html ?? "");
    if (sceneId) {
      contentSceneIdRef.current = sceneId;
      setContentSceneId(sceneId);
    }
  }, []);

  const handleEditorDirtyChange = useCallback((dirty) => {
    setEditorDirty(Boolean(dirty));
  }, []);

  useEffect(() => {
    const browserOnline = readBrowserOnline();
    if (browserOnline !== isOnlineRef.current) {
      isOnlineRef.current = browserOnline;
      setIsOnline(browserOnline);
      if (!browserOnline) {
        markServerSaveBlocked();
      } else {
        clearServerSaveBlocked();
      }
    }
  }, [isOnline, markServerSaveBlocked, clearServerSaveBlocked]);

  // Act 1 Scene 1 is delivered via Olivia scene chat, not POST /api/novel/generate.

  const patchUserContentInBookData = useCallback(
    (sceneId, userContentText, updatedAt) => {
      if (!sceneId) return;
      const iso = toUpdatedAtIso(updatedAt);
      setBookData((prev) => {
        const updatedContents = [...(prev.userContents || [])];
        const idx = updatedContents.findIndex((c) => c._id === sceneId);
        if (idx === -1) return prev;
        updatedContents[idx] = {
          ...updatedContents[idx],
          userContent: userContentText,
          ...(iso ? { updatedAt: iso } : {}),
        };
        return { ...prev, userContents: updatedContents };
      });
    },
    []
  );

  const applyRemoteSceneContent = useCallback(
    (sceneId, html, updatedAt) => {
      if (!sceneId) return;
      const text = preserveLeadingIndentation(html ?? "");
      const iso = rememberUpdatedAt(sceneId, updatedAt);
      patchUserContentInBookData(sceneId, text, iso);
      clearSceneDraft(id, sceneId);
      if (String(selectedSceneRef.current?.id) !== String(sceneId)) return;

      editorHydratingRef.current = true;
      setEditorHydrating(true);
      setLastSavedContent(text);
      setDebouncedLiveHtml(text);
      setEditorDirty(false);
      manuscriptDraftRef.current?.setHtml?.(text);
    },
    [id, patchUserContentInBookData, rememberUpdatedAt]
  );

  const persistSceneToServer = useCallback(
    async (sceneId, draftText, { force = false } = {}) => {
      if (!sceneId) return;
      if (isDraftSaveDeferred()) {
        const error = new Error("offline");
        error.code = "OFFLINE";
        throw error;
      }

      const text = preserveLeadingIndentation(draftText ?? "");
      const body = {
        id: sceneId,
        userContent: text,
      };
      const expected = knownUpdatedAtFor(sceneId);
      if (expected) body.expectedUpdatedAt = expected;
      if (force) body.force = true;

      const response = await updateUserContent(body, {
        timeout: DRAFT_SAVE_TIMEOUT_MS,
      });
      if (response.status !== 200) {
        const error = new Error("Save failed");
        error.response = { status: response.status };
        throw error;
      }
      const iso = rememberUpdatedAt(sceneId, response.data?.updatedAt);
      patchUserContentInBookData(sceneId, text, iso);
      clearSceneDraft(id, sceneId);
      clearServerSaveBlocked();
      setSaveFailed(false);
      if (String(selectedSceneRef.current?.id) === String(sceneId)) {
        setLastSavedContent(draftText ?? "");
      }
    },
    [
      id,
      patchUserContentInBookData,
      clearServerSaveBlocked,
      isDraftSaveDeferred,
      knownUpdatedAtFor,
      rememberUpdatedAt,
    ]
  );

  const handleStaleSave = useCallback(
    (sceneId, draftText, stale) => {
      const isCurrent =
        String(selectedSceneRef.current?.id) === String(sceneId);
      const localHtml = isCurrent ? getLiveDraftHtml() : draftText ?? "";
      if (!isCurrent) {
        applyRemoteSceneContent(
          sceneId,
          stale.userContent,
          stale.updatedAt
        );
        toast.info("This scene was updated on another device.");
        return;
      }

      const action = decideRemoteDraftAction({
        serverUpdatedAt: stale.updatedAt,
        lastKnownUpdatedAt: knownUpdatedAtFor(sceneId),
        isDirty: Boolean(manuscriptDraftRef.current?.isDirty?.()),
        serverHtml: stale.userContent,
        localHtml,
      });

      if (action === "ignore" || action === "adopt-token") {
        rememberUpdatedAt(sceneId, stale.updatedAt);
        patchUserContentInBookData(
          sceneId,
          stale.userContent,
          stale.updatedAt
        );
        return;
      }
      if (action === "apply") {
        applyRemoteSceneContent(sceneId, stale.userContent, stale.updatedAt);
        return;
      }

      setDraftConflict({
        sceneId,
        localText: localHtml,
        remoteText: stale.userContent,
        remoteUpdatedAt: stale.updatedAt,
      });
    },
    [
      applyRemoteSceneContent,
      getLiveDraftHtml,
      knownUpdatedAtFor,
      patchUserContentInBookData,
      rememberUpdatedAt,
    ]
  );

  persistSceneRef.current = async (sceneId, draftText) => {
    try {
      await persistSceneToServer(sceneId, draftText);
    } catch (error) {
      const stale = getStaleContentPayload(error);
      if (stale) {
        handleStaleSave(sceneId, draftText, stale);
        return;
      }
      console.error("Save error:", error);
      if (!isRetryableDraftSaveError(error)) {
        setSaveFailed(true);
        if (error?.response) {
          toast.error("Failed to save content");
        }
        return;
      }
      throw error;
    }
  };

  const syncSceneFromServer = useCallback(
    async (sceneId) => {
      if (!sceneId || isViewMode || isDraftSaveDeferred()) return;
      if (draftConflictRef.current) return;
      if (editorHydratingRef.current) return;

      const generation = ++syncGenerationRef.current;
      try {
        const response = await getUserContentById(sceneId);
        if (generation !== syncGenerationRef.current) return;
        if (String(selectedSceneRef.current?.id) !== String(sceneId)) return;

        const serverHtml = response.data?.userContent ?? "";
        const serverUpdatedAt = response.data?.updatedAt;
        const action = decideRemoteDraftAction({
          serverUpdatedAt,
          lastKnownUpdatedAt: knownUpdatedAtFor(sceneId),
          isDirty: Boolean(manuscriptDraftRef.current?.isDirty?.()),
          serverHtml,
          localHtml: getLiveDraftHtml(),
        });

        if (action === "ignore") return;
        if (action === "adopt-token") {
          rememberUpdatedAt(sceneId, serverUpdatedAt);
          patchUserContentInBookData(sceneId, serverHtml, serverUpdatedAt);
          return;
        }
        if (action === "apply") {
          applyRemoteSceneContent(sceneId, serverHtml, serverUpdatedAt);
          return;
        }
        setDraftConflict({
          sceneId,
          localText: getLiveDraftHtml(),
          remoteText: serverHtml,
          remoteUpdatedAt: serverUpdatedAt,
        });
      } catch (error) {
        if (error?.response?.status === 404) return;
        console.error("Draft sync error:", error);
      }
    },
    [
      applyRemoteSceneContent,
      getLiveDraftHtml,
      isDraftSaveDeferred,
      isViewMode,
      knownUpdatedAtFor,
      patchUserContentInBookData,
      rememberUpdatedAt,
    ]
  );

  const syncSceneFromServerRef = useRef(syncSceneFromServer);
  syncSceneFromServerRef.current = syncSceneFromServer;

  const enqueueSceneSave = useCallback((sceneId, draftText) => {
    if (!sceneId || isDraftSaveDeferred()) return Promise.resolve();
    return saveQueueRef.current.enqueue(sceneId, draftText ?? "");
  }, [isDraftSaveDeferred]);

  /** Persist draft for a specific scene (used when leaving a scene on outline click). */
  const saveUserContentForScene = useCallback(
    async (sceneId, draftText) => {
      await enqueueSceneSave(sceneId, draftText);
    },
    [enqueueSceneSave]
  );

  const findUserContentRow = useCallback((scene, userContents = []) => {
    if (!scene) return null;
    if (scene.id) {
      return userContents.find((c) => c._id === scene.id) ?? null;
    }
    if (scene.actNumber != null && scene.sceneIndex != null) {
      return (
        userContents.find(
          (c) =>
            c.actNumber === scene.actNumber && c.sceneIndex === scene.sceneIndex
        ) ?? null
      );
    }
    return null;
  }, []);

  const resolveDraftFromBookData = useCallback(
    (scene) => {
      const row = findUserContentRow(scene, bookData?.userContents || []);
      return row?.userContent || "";
    },
    [bookData?.userContents, findUserContentRow]
  );

  // Save user content function (current scene — autosave / explicit save)
  const saveUserContent = useCallback(async (overrideDraftText) => {
    const sceneId = selectedSceneRef.current?.id;
    if (!sceneId) return;
    const draftText =
      overrideDraftText ?? manuscriptDraftRef.current?.getHtml?.() ?? "";
    await enqueueSceneSave(sceneId, draftText);
  }, [enqueueSceneSave]);

  const handleDraftAutosave = useCallback(
    async (draftText, sceneId) => {
      if (!sceneId || isDraftSaveDeferred()) return;
      await enqueueSceneSave(sceneId, draftText);
    },
    [enqueueSceneSave, isDraftSaveDeferred]
  );

  useEffect(() => {
    saveUserContentRef.current = saveUserContent;
  }, [saveUserContent]);

  useEffect(() => {
    const onOnline = () => {
      isOnlineRef.current = true;
      setIsOnline(true);
      clearServerSaveBlocked();
      const sceneId = selectedSceneRef.current?.id;
      if (
        sceneId &&
        manuscriptDraftRef.current?.isDirty?.()
      ) {
        saveUserContentRef.current();
      } else {
        saveQueueRef.current?.kick?.();
      }
    };
    const onOffline = () => {
      isOnlineRef.current = false;
      setIsOnline(false);
      markServerSaveBlocked();
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [clearServerSaveBlocked, markServerSaveBlocked]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      const sceneId = selectedSceneRef.current?.id;
      const draftText = getLiveDraftHtml();
      if (id && sceneId && !areQuillHtmlEquivalent(draftText, lastSavedContentRef.current)) {
        writeSceneDraft(id, sceneId, draftText, knownUpdatedAtFor(sceneId));
      }
      if (isDraftSaveDeferred()) return;
      if (!areQuillHtmlEquivalent(draftText, lastSavedContentRef.current)) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [id, isDraftSaveDeferred, getLiveDraftHtml, knownUpdatedAtFor]);

  useEffect(() => {
    const pullIfVisible = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      const sceneId = selectedSceneRef.current?.id;
      if (sceneId) syncSceneFromServerRef.current(sceneId);
    };

    const onFocus = () => pullIfVisible();
    const onVisibility = () => {
      if (document.visibilityState === "visible") pullIfVisible();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    const timer = setInterval(pullIfVisible, DRAFT_REMOTE_POLL_MS);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!selectedScene.id || isViewMode || isBootLoading) return;
    syncSceneFromServer(selectedScene.id);
  }, [selectedScene.id, isViewMode, isBootLoading, syncSceneFromServer]);

  // Manual save function for immediate saves
  const saveImmediately = async () => {
    await manuscriptDraftRef.current?.saveNow?.();
  };

  const handleKeepThisDevice = useCallback(async () => {
    const conflict = draftConflictRef.current;
    if (!conflict?.sceneId) return;
    setDraftConflict(null);
    try {
      await persistSceneToServer(conflict.sceneId, conflict.localText, {
        force: true,
      });
    } catch (error) {
      console.error("Force save error:", error);
      toast.error("Failed to save content");
      setSaveFailed(true);
    }
  }, [persistSceneToServer]);

  const handleLoadOtherDevice = useCallback(() => {
    const conflict = draftConflictRef.current;
    if (!conflict?.sceneId) return;
    applyRemoteSceneContent(
      conflict.sceneId,
      conflict.remoteText,
      conflict.remoteUpdatedAt
    );
    setDraftConflict(null);
  }, [applyRemoteSceneContent]);

  // Save state: structured so the badge can pick its colour + icon, instead
  // of duck-typing on a UI string.
  const getSaveState = () => {
    const isDirty = editorDirty;
    const actuallyOffline = !readBrowserOnline() || !isOnline;

    if (isInitialLoad) return { state: "loading", label: "Loading" };
    if (editorHydrating && !isSaving && !isDirty) {
      return { state: "saved", label: "Saved" };
    }
    if (actuallyOffline) {
      if (isDirty) return { state: "offline", label: "Saved on device" };
      return { state: "offline", label: "Offline" };
    }
    if (saveFailed && !isSaving) {
      return { state: "error", label: "Couldn't save" };
    }
    if (isSaving || isDirty) return { state: "saving", label: "Saving…" };
    return { state: "saved", label: "Saved" };
  };

  const showOfflineDraftBanner =
    (!readBrowserOnline() || !isOnline) &&
    editorDirty &&
    Boolean(selectedScene.id);

  // Update scene title by promptKey (legacy modal path)
  const updateSceneTitle = async () => {
    let body = { novelId: id, id: selectedScene.id, sceneTitle: newSceneTitle };
    let response = await renameScene(body);
    if (response.status === 200) {
      applySceneRenameFromApi(selectedScene.id, newSceneTitle, response.data);
      setShowRenameModal(false);
      setNewSceneTitle("");
    }
  };

  // Inline rename from OutlineSidebar
  const handleRenameScene = async (sceneId, newTitle) => {
    try {
      const response = await renameScene({ novelId: id, id: sceneId, sceneTitle: newTitle });
      if (response.status === 200) {
        applySceneRenameFromApi(sceneId, newTitle, response.data);
      }
    } catch (err) {
      console.error("handleRenameScene error:", err);
      toast.error("Failed to rename scene.");
    }
  };

  // Delete scene from OutlineSidebar
  const handleDeleteScene = async (sceneId) => {
    try {
      await deleteScene(sceneId);
      clearSceneDraft(id, sceneId);
      if (selectedScene.id === sceneId) {
        contentSceneIdRef.current = null;
        setContentSceneId(null);
        setSelectedScene({ promptKey: null, text: null, index: null, id: null });
        setDebouncedLiveHtml("");
        setEditorDirty(false);
        setLastSavedContent("");
      }
      await fetchBookData(id);
      toast.success("Scene deleted.");
    } catch (err) {
      console.error("handleDeleteScene error:", err);
      toast.error("Failed to delete scene.");
    }
  };

  const handleArchiveScene = async (sceneId) => {
    try {
      await archiveScene(sceneId);
      if (selectedScene.id === sceneId) {
        contentSceneIdRef.current = null;
        setContentSceneId(null);
        setSelectedScene({ promptKey: null, text: null, index: null, id: null });
        setDebouncedLiveHtml("");
        setEditorDirty(false);
        setLastSavedContent("");
      }
      await fetchBookData(id);
      toast.success("Scene archived. Find it at the bottom of the outline.");
    } catch (err) {
      console.error("handleArchiveScene error:", err);
      toast.error("Failed to archive scene.");
    }
  };

  const handleUnarchiveScene = async (sceneId) => {
    try {
      await unarchiveScene(sceneId);
      await fetchBookData(id);
      toast.success("Scene restored to its original place in the outline.");
    } catch (err) {
      console.error("handleUnarchiveScene error:", err);
      toast.error("Failed to restore scene.");
    }
  };

  // Finalize
  const handleSaveContinue = () => setShowFinalizeModal(true);
  const handleFinalizeClose = () => setShowFinalizeModal(false);
  const handleFinalizeConfirm = () => {
    setShowFinalizeModal(false);
    navigate(`/dashboard/finaldraft/${id}`);
  };

  const handleDownloadManuscript = useCallback(async () => {
    if (downloadManuscriptInFlightRef.current) return;
    downloadManuscriptInFlightRef.current = true;
    setIsDownloadingManuscript(true);
    try {
      const { downloadManuscript } = await import("../../api/bookGeneration");
      await downloadManuscript(id, { suggestedTitle: bookData?.name });
      toast.success("Manuscript ready — check your downloads folder.");
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Could not download manuscript. Try again.");
    } finally {
      downloadManuscriptInFlightRef.current = false;
      setIsDownloadingManuscript(false);
    }
  }, [id, bookData?.name]);

  const handleDownloadOutline = useCallback(async () => {
    if (downloadOutlineInFlightRef.current || downloadOutlineDisabled) return;
    downloadOutlineInFlightRef.current = true;
    setIsDownloadingOutline(true);
    try {
      const { downloadOutline } = await import("../../api/bookGeneration");
      await downloadOutline(id, { suggestedTitle: bookData?.name });
      toast.success("Outline ready — check your downloads folder.");
    } catch (error) {
      console.error("Download outline failed:", error);
      toast.error("Could not download outline. Try again.");
    } finally {
      downloadOutlineInFlightRef.current = false;
      setIsDownloadingOutline(false);
    }
  }, [id, bookData?.name, downloadOutlineDisabled]);

  const handleDownloadCharacters = useCallback(async () => {
    if (downloadCharactersInFlightRef.current || downloadCharactersDisabled) return;
    downloadCharactersInFlightRef.current = true;
    setIsDownloadingCharacters(true);
    try {
      const { downloadCharacters } = await import("../../api/bookGeneration");
      await downloadCharacters(id, { suggestedTitle: bookData?.name });
      toast.success("Characters ready — check your downloads folder.");
    } catch (error) {
      console.error("Download characters failed:", error);
      toast.error("Could not download characters. Try again.");
    } finally {
      downloadCharactersInFlightRef.current = false;
      setIsDownloadingCharacters(false);
    }
  }, [id, bookData?.name, downloadCharactersDisabled]);

  const handleDownloadStoryBible = useCallback(async () => {
    if (downloadStoryBibleInFlightRef.current || downloadStoryBibleDisabled) return;
    downloadStoryBibleInFlightRef.current = true;
    setIsDownloadingStoryBible(true);
    try {
      const { downloadStoryBible } = await import("../../api/bookGeneration");
      await downloadStoryBible(id, { suggestedTitle: bookData?.name });
      toast.success("Story Bible ready — check your downloads folder.");
    } catch (error) {
      console.error("Download Story Bible failed:", error);
      toast.error("Could not download Story Bible. Try again.");
    } finally {
      downloadStoryBibleInFlightRef.current = false;
      setIsDownloadingStoryBible(false);
    }
  }, [id, bookData?.name, downloadStoryBibleDisabled]);

  const handleCharacterAdded = useCallback(
    async (character) => {
      try {
        const response = await getAllCharactersOfaBook(id);
        const list = response.data?.characters || [];
        const hasCreated = list.some(
          (c) => String(c._id) === String(character._id)
        );
        setCharacterListData(
          hasCreated
            ? list
            : [...list.filter((c) => !c.syntheticFromNovel), character]
        );
      } catch {
        setCharacterListData((prev) => {
          const withoutSynthetic = prev.filter((c) => !c.syntheticFromNovel);
          if (
            withoutSynthetic.some(
              (c) => String(c._id) === String(character._id)
            )
          ) {
            return withoutSynthetic;
          }
          return [...withoutSynthetic, character];
        });
      }
      toast.success("Character added.");
    },
    [id]
  );

  // ---------------------------------------------------------------------------
  // Olivia Editor chat — token flushing helpers
  // ---------------------------------------------------------------------------

  const startChatTokenFlushing = useCallback(() => {
    if (chatIsStreamingRef.current) return;
    chatIsStreamingRef.current = true;
    const flush = () => {
      if (chatTokenBufferRef.current) {
        const chunk = chatTokenBufferRef.current;
        chatTokenBufferRef.current = "";
        setChatMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.id === chatPlaceholderIdRef.current) {
            const updated = [...prev];
            updated[updated.length - 1] = { ...last, text: last.text + chunk };
            return updated;
          }
          return prev.map((m) =>
            m.id === chatPlaceholderIdRef.current ? { ...m, text: m.text + chunk } : m
          );
        });
      }
      if (chatIsStreamingRef.current) chatRafIdRef.current = requestAnimationFrame(flush);
    };
    chatRafIdRef.current = requestAnimationFrame(flush);
  }, []);

  const stopChatTokenFlushing = useCallback(() => {
    chatIsStreamingRef.current = false;
    if (chatRafIdRef.current) {
      cancelAnimationFrame(chatRafIdRef.current);
      chatRafIdRef.current = null;
    }
    if (chatTokenBufferRef.current) {
      const remaining = chatTokenBufferRef.current;
      chatTokenBufferRef.current = "";
      setChatMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.id === chatPlaceholderIdRef.current) {
          const updated = [...prev];
          updated[updated.length - 1] = { ...last, text: last.text + remaining };
          return updated;
        }
        return prev.map((m) =>
          m.id === chatPlaceholderIdRef.current ? { ...m, text: m.text + remaining } : m
        );
      });
    }
  }, []);

  const syncOliviaHasMoreFromCursors = useCallback(() => {
    setOliviaHasMoreOnServer(
      Boolean(
        sceneHistoryCursorRef.current.hasMore ||
          editorHistoryCursorRef.current.hasMore ||
          coachingHistoryCursorRef.current.hasMore
      )
    );
  }, []);

  const resetOliviaHistoryCursors = useCallback(() => {
    sceneHistoryCursorRef.current = emptyOliviaHistoryCursor();
    editorHistoryCursorRef.current = emptyOliviaHistoryCursor();
    coachingHistoryCursorRef.current = emptyOliviaHistoryCursor();
    setOliviaHasMoreOnServer(false);
  }, []);

  const loadOliviaHistory = useCallback(async () => {
    if (!id) return;
    if (oliviaHistoryLoadedForIdRef.current === id) return;
    const fetchNovelId = id;

    try {
      if (!allScenesComplete) {
        const fetches = [
          getOliviaSceneChatHistory(fetchNovelId, {
            limit: OLIVIA_HISTORY_INITIAL_LIMIT,
          }),
        ];
        if (layeringComplete) {
          fetches.push(
            getOliviaCoachingHistory(fetchNovelId, {
              limit: OLIVIA_HISTORY_INITIAL_LIMIT,
            })
          );
        }
        const results = await Promise.allSettled(fetches);
        if (latestOliviaNovelIdRef.current !== fetchNovelId) return;
        const sceneRes = results[0];
        const coachingRes = layeringComplete ? results[1] : null;

        let sceneRows = [];
        if (sceneRes.status === "fulfilled") {
          const messages = Array.isArray(sceneRes.value?.messages)
            ? sceneRes.value.messages
            : [];
          sceneHistoryCursorRef.current = cursorFromHistoryPage(
            messages,
            sceneRes.value?.hasMore
          );
          sceneRows = messages.map((m) => mapOliviaApiMessageToRow(m, "scene"));
        } else {
          sceneHistoryCursorRef.current = emptyOliviaHistoryCursor();
        }

        let coachingRows = [];
        if (coachingRes?.status === "fulfilled") {
          const msgs = Array.isArray(coachingRes.value?.messages)
            ? coachingRes.value.messages
            : [];
          coachingHistoryCursorRef.current = cursorFromHistoryPage(
            msgs,
            coachingRes.value?.hasMore
          );
          coachingRows = msgs.map((m) => mapOliviaApiMessageToRow(m, "coaching"));
        } else if (layeringComplete) {
          coachingHistoryCursorRef.current = emptyOliviaHistoryCursor();
        }

        editorHistoryCursorRef.current = emptyOliviaHistoryCursor();
        const historyRows = mergeOliviaThreadRows([...sceneRows, ...coachingRows]);
        setChatMessages((prev) => dedupeMergeOliviaRows(historyRows, prev));
        syncOliviaHasMoreFromCursors();
        oliviaHistoryLoadedForIdRef.current = fetchNovelId;
        return;
      }

      const fetchPromises = [
        getOliviaSceneChatHistory(fetchNovelId, {
          limit: OLIVIA_HISTORY_INITIAL_LIMIT,
        }),
        getOliviaEditorHistory(fetchNovelId, {
          limit: OLIVIA_HISTORY_INITIAL_LIMIT,
        }),
      ];
      if (layeringComplete) {
        fetchPromises.push(
          getOliviaCoachingHistory(fetchNovelId, {
            limit: OLIVIA_HISTORY_INITIAL_LIMIT,
          })
        );
      }
      const settled = await Promise.allSettled(fetchPromises);
      const sceneRes = settled[0];
      const editorRes = settled[1];
      const coachingRes = layeringComplete ? settled[2] : null;

      if (latestOliviaNovelIdRef.current !== fetchNovelId) return;

      let sceneRows = [];
      if (sceneRes.status === "fulfilled") {
        const msgs = Array.isArray(sceneRes.value?.messages)
          ? sceneRes.value.messages
          : [];
        sceneHistoryCursorRef.current = cursorFromHistoryPage(
          msgs,
          sceneRes.value?.hasMore
        );
        sceneRows = msgs.map((m) => mapOliviaApiMessageToRow(m, "scene"));
      } else {
        sceneHistoryCursorRef.current = emptyOliviaHistoryCursor();
      }

      let editorRows = [];
      if (editorRes.status === "fulfilled") {
        const msgs = Array.isArray(editorRes.value?.messages)
          ? editorRes.value.messages
          : [];
        editorHistoryCursorRef.current = cursorFromHistoryPage(
          msgs,
          editorRes.value?.hasMore
        );
        editorRows = msgs.map((m) => mapOliviaApiMessageToRow(m, "editor"));
        setLayeringState(editorRes.value?.layeringState ?? null);
      } else {
        editorHistoryCursorRef.current = emptyOliviaHistoryCursor();
      }

      let coachingRows = [];
      if (coachingRes?.status === "fulfilled") {
        const msgs = Array.isArray(coachingRes.value?.messages)
          ? coachingRes.value.messages
          : [];
        coachingHistoryCursorRef.current = cursorFromHistoryPage(
          msgs,
          coachingRes.value?.hasMore
        );
        coachingRows = msgs.map((m) => mapOliviaApiMessageToRow(m, "coaching"));
      } else if (layeringComplete) {
        coachingHistoryCursorRef.current = emptyOliviaHistoryCursor();
      }

      const historyRows = mergeOliviaThreadRows([
        ...sceneRows,
        ...editorRows,
        ...coachingRows,
      ]);
      setChatMessages((prev) => dedupeMergeOliviaRows(historyRows, prev));
      syncOliviaHasMoreFromCursors();
      oliviaHistoryLoadedForIdRef.current = fetchNovelId;
    } catch {
      if (latestOliviaNovelIdRef.current !== fetchNovelId) return;
      setChatMessages((prev) => (prev.length > 0 ? prev : []));
      resetOliviaHistoryCursors();
      oliviaHistoryLoadedForIdRef.current = fetchNovelId;
    }
  }, [
    id,
    allScenesComplete,
    layeringComplete,
    resetOliviaHistoryCursors,
    syncOliviaHasMoreFromCursors,
  ]);

  const loadEarlierOliviaHistory = useCallback(async () => {
    if (!id || isLoadingEarlierOlivia) return;

    const sceneBefore = sceneHistoryCursorRef.current.hasMore
      ? oldestMessageIdForThread(chatMessages, "scene")
      : null;
    const editorBefore = editorHistoryCursorRef.current.hasMore
      ? oldestMessageIdForThread(chatMessages, "editor")
      : null;
    const coachingBefore = coachingHistoryCursorRef.current.hasMore
      ? oldestMessageIdForThread(chatMessages, "coaching")
      : null;

    if (!sceneBefore && !editorBefore && !coachingBefore) {
      syncOliviaHasMoreFromCursors();
      return;
    }

    setIsLoadingEarlierOlivia(true);
    const fetchNovelId = id;

    try {
      const [sceneRes, editorRes, coachingRes] = await Promise.allSettled([
        sceneBefore
          ? getOliviaSceneChatHistory(fetchNovelId, {
              limit: OLIVIA_HISTORY_PAGE_SIZE,
              before: sceneBefore,
            })
          : Promise.resolve(null),
        editorBefore
          ? getOliviaEditorHistory(fetchNovelId, {
              limit: OLIVIA_HISTORY_PAGE_SIZE,
              before: editorBefore,
            })
          : Promise.resolve(null),
        coachingBefore
          ? getOliviaCoachingHistory(fetchNovelId, {
              limit: OLIVIA_HISTORY_PAGE_SIZE,
              before: coachingBefore,
            })
          : Promise.resolve(null),
      ]);

      if (latestOliviaNovelIdRef.current !== fetchNovelId) return;

      let incoming = [];

      if (sceneBefore && sceneRes.status === "fulfilled" && sceneRes.value) {
        const msgs = Array.isArray(sceneRes.value.messages)
          ? sceneRes.value.messages
          : [];
        sceneHistoryCursorRef.current = cursorFromHistoryPage(
          msgs,
          sceneRes.value.hasMore
        );
        incoming = incoming.concat(
          msgs.map((m) => mapOliviaApiMessageToRow(m, "scene"))
        );
      }

      if (editorBefore && editorRes.status === "fulfilled" && editorRes.value) {
        const msgs = Array.isArray(editorRes.value.messages)
          ? editorRes.value.messages
          : [];
        editorHistoryCursorRef.current = cursorFromHistoryPage(
          msgs,
          editorRes.value.hasMore
        );
        incoming = incoming.concat(
          msgs.map((m) => mapOliviaApiMessageToRow(m, "editor"))
        );
      }

      if (
        coachingBefore &&
        coachingRes.status === "fulfilled" &&
        coachingRes.value
      ) {
        const msgs = Array.isArray(coachingRes.value.messages)
          ? coachingRes.value.messages
          : [];
        coachingHistoryCursorRef.current = cursorFromHistoryPage(
          msgs,
          coachingRes.value.hasMore
        );
        incoming = incoming.concat(
          msgs.map((m) => mapOliviaApiMessageToRow(m, "coaching"))
        );
      }

      if (incoming.length > 0) {
        setChatMessages((prev) => dedupeMergeOliviaRows(incoming, prev));
      }
      syncOliviaHasMoreFromCursors();
    } catch (err) {
      console.error("loadEarlierOliviaHistory error:", err);
    } finally {
      setIsLoadingEarlierOlivia(false);
    }
  }, [id, chatMessages, isLoadingEarlierOlivia, syncOliviaHasMoreFromCursors]);

  // Reset Olivia thread state when switching novels so history refetches
  useEffect(() => {
    oliviaHistoryLoadedForIdRef.current = null;
    setChatMessages([]);
    setLayeringState(null);
    resetOliviaHistoryCursors();
    // Drop any in-memory coaching session so it cannot leak across novels;
    // the new novel restores its own persisted session on next modal open.
    coachingSessionActiveRef.current = false;
    coachingContextRef.current = null;
    setActiveCoachingScene(null);
  }, [id, resetOliviaHistoryCursors]);

  // Scene vs layering mode uses different thread endpoints — refetch history on transition.
  // Skip when the 15th scene was just inserted so the confirmation message stays visible
  // and the user can respond before seeing the layering welcome (with table).
  useEffect(() => {
    if (skipAllScenesReloadRef.current) {
      skipAllScenesReloadRef.current = false;
      return;
    }
    oliviaHistoryLoadedForIdRef.current = null;
    setChatMessages([]);
    resetOliviaHistoryCursors();
  }, [allScenesComplete, resetOliviaHistoryCursors]);

  // Load history when chat modal opens
  useEffect(() => {
    if (showOliviaChat) loadOliviaHistory();
  }, [showOliviaChat, loadOliviaHistory]);

  // Resume a persisted coaching session when the modal reopens (Fix 6b). The
  // send path re-resolves the freshest manuscriptDraft from the coached sceneId,
  // so we only need to re-arm the routing flag + context here.
  useEffect(() => {
    if (!showOliviaChat) return;
    if (coachingSessionActiveRef.current) return;
    if (!allScenesComplete) return;
    const persisted = readPersistedCoaching(id);
    if (persisted?.coachTargetScene?.sceneId) {
      coachingSessionActiveRef.current = true;
      coachingContextRef.current = {
        coachTargetScene: persisted.coachTargetScene,
      };
      setActiveCoachingScene(persisted.coachTargetScene);
    }
  }, [showOliviaChat, allScenesComplete, id]);

  // Cleanup streaming on unmount
  useEffect(() => {
    return () => {
      chatStreamAbortRef.current?.abort();
      stopChatTokenFlushing();
    };
  }, [stopChatTokenFlushing]);

  const handleInsertScene = useCallback(
    async (
      sceneSuggestionText,
      actNumber,
      afterSceneIndex,
      sceneTitle,
      layeringStableKey,
      sourceMessageId
    ) => {
      try {
        const result = await insertLayeredScene({
          novelId: id,
          actNumber,
          afterSceneIndex,
          sceneTitle,
          sceneSuggestionText,
          ...(layeringStableKey ? { layeringStableKey } : {}),
          ...(sourceMessageId ? { sourceMessageId } : {}),
        });
        await fetchBookData(id);
        if (Array.isArray(result?.oliviaSavedOutlineMessageIds)) {
          setOliviaSavedSceneMessageIds(result.oliviaSavedOutlineMessageIds.map((x) => String(x)));
        }
        if (result?.layeringState) {
          setLayeringState(result.layeringState);
        }
        if (result?.confirmationMessage) {
          const cm = result.confirmationMessage;
          setChatMessages((prev) => [
            ...prev,
            mapOliviaApiMessageToRow(
              {
                _id: cm._id,
                role: cm.role,
                content: cm.content,
                timestamp: cm.timestamp,
                metadata: cm.metadata,
              },
              "editor"
            ),
          ]);
        }
        toast.success("Scene inserted into outline!");
      } catch (error) {
        console.error("Insert scene error:", error);
        toast.error("Failed to insert scene. Please try again.");
      }
    },
    [id]
  );

  const handleEmptySceneClick = useCallback(
    (actNumber, sceneIndex) => {
      const next = getNextEmptyScene();
      if (!next) {
        toast.info("All core scenes are already in your outline.");
        return;
      }
      const clickedKey = `${actNumber}-${sceneIndex}`;
      const nextKey = `${next.actNumber}-${next.sceneIndex}`;
      if (clickedKey !== nextKey) {
        const toastOffsets = computeActOffsets(bookData?.userContents || []);
        const toastGlobal = getGlobalSceneNumber(next.actNumber, next.sceneIndex, toastOffsets);
        toast.info(
          `Chapters are built in order. Olivia is set up for Act ${next.actNumber}, Chapter ${toastGlobal}.`,
          { autoClose: 4500 }
        );
      }
      setTargetSceneForOlivia(
        enrichTargetSceneFromUserContents(next, bookData?.userContents || [])
      );
      setShowOliviaChat(true);
    },
    [getNextEmptyScene, bookData?.userContents]
  );

  const handleOliviaWordLimit = useCallback(() => {
    const useCoachingChat = coachingSessionActiveRef.current;
    const chatThread = useCoachingChat
      ? "coaching"
      : allScenesComplete
        ? "editor"
        : "scene";
    const now = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const ts = Date.now();
    setChatMessages((prev) => {
      const last = prev[prev.length - 1];
      if (
        last?.role === "assistant" &&
        isOliviaStudioWordLimitMessage(last.text)
      ) {
        return prev;
      }
      return [
        ...prev,
        {
          id: `assistant-word-limit-${ts}`,
          role: "assistant",
          text: OLIVIA_STUDIO_WORD_LIMIT_TEXT,
          timestamp: now,
          sortTs: ts,
          thread: chatThread,
        },
      ];
    });
  }, [allScenesComplete]);

  const handleSendOliviaMessage = useCallback(async (text = "", sendOptions = null) => {
    if (subscriptionPaused) {
      toast.error(
        "Your subscription is paused. Resume billing to chat with Olivia.",
        { autoClose: 4500 }
      );
      return;
    }
    const trimmed = (text || "").trim();
    const attachmentsSnapshot = Array.isArray(sendOptions?.attachments)
      ? sendOptions.attachments
      : [];
    if (chatIsProcessing || chatIsStreaming) return;
    if (!trimmed && attachmentsSnapshot.length === 0) return;
    if (
      !OLIVIA_TEMP_DISABLE_WORD_LIMIT &&
      trimmed &&
      isOliviaStudioOverWordLimit(trimmed)
    ) {
      handleOliviaWordLimit();
      return;
    }

    const displayText = trimmed;

    const useCoachingChat = coachingSessionActiveRef.current;
    const chatThread = useCoachingChat
      ? "coaching"
      : allScenesComplete
        ? "editor"
        : "scene";
    const now = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    const userMsgId = `user-${Date.now()}`;

    setChatMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        role: "user",
        text: displayText,
        timestamp: now,
        sortTs: Date.now(),
        thread: chatThread,
        ...(attachmentsSnapshot.length > 0
          ? { attachments: attachmentsSnapshot }
          : {}),
      },
    ]);
    setChatIsProcessing(true);

    const placeholderId = `assistant-${Date.now()}`;
    chatPlaceholderIdRef.current = placeholderId;
    chatTokenBufferRef.current = "";

    const abortController = new AbortController();
    chatStreamAbortRef.current = abortController;

    try {
      const useSceneChat = !useCoachingChat && !allScenesComplete;
      let sceneTarget = targetSceneForOlivia;
      if (useSceneChat && !sceneTarget) {
        sceneTarget = getNextEmptyScene();
        if (sceneTarget) {
          sceneTarget = enrichTargetSceneFromUserContents(
            sceneTarget,
            bookData?.userContents || []
          );
          setTargetSceneForOlivia(sceneTarget);
        }
      }
      if (useSceneChat && sceneTarget) {
        sceneTarget = resolveOliviaTargetScene(sceneTarget);
      }
      const isOliviaArchivedSlot = (sceneId, actNumber, sceneIndex) => {
        const contents = bookData?.userContents || [];
        if (sceneId) {
          return isArchivedScene(
            contents.find((c) => String(c._id) === String(sceneId))
          );
        }
        if (actNumber != null && sceneIndex != null) {
          return isArchivedScene(
            contents.find(
              (c) =>
                Number(c.actNumber) === Number(actNumber) &&
                Number(c.sceneIndex) === Number(sceneIndex)
            )
          );
        }
        return false;
      };
      if (
        sceneTarget &&
        isOliviaArchivedSlot(
          sceneTarget.sceneId,
          sceneTarget.actNumber,
          sceneTarget.sceneIndex
        )
      ) {
        sceneTarget = null;
      }
      const outlineChangeForSend = getOutlineChangeForSend(lastOutlineChange);
      const outlineContext = {
        outlineLayout: oliviaOutlineLayout,
        outlineRevision,
        outlineChange: outlineChangeForSend,
      };
      const storedCoach = coachingContextRef.current;
      const coachTargetScene =
        sendOptions?.coachTargetScene || storedCoach?.coachTargetScene || null;
      const coachSceneId = coachTargetScene?.sceneId;
      // Read the freshest editor state via refs — this callback deliberately
      // omits `content`/`selectedScene`/`lastSavedContent` from its deps, so the
      // closure values can be stale between a keystroke and the next autosave.
      const liveSelectedSceneId = selectedSceneRef.current?.id ?? null;
      const liveContent = getLiveDraftHtml();
      const draftScene = useCoachingChat
        ? null
        : buildDraftSceneFromSelected(
            selectedSceneRef.current,
            bookData?.userContents || []
          );
      const selectedDraftId =
        draftScene?.sceneId ||
        (liveSelectedSceneId &&
        !String(liveSelectedSceneId).startsWith("outline-ph-")
          ? String(liveSelectedSceneId)
          : null);
      const draftSceneId = coachSceneId || (!useCoachingChat ? selectedDraftId : null);
      // Persist unsaved editor prose before sending so Coach Scene snapshots
      // and avatar draft context match the live buffer.
      if (
        draftSceneId &&
        String(liveSelectedSceneId) === String(draftSceneId) &&
        String(liveContent).trim() &&
        !areQuillHtmlEquivalent(liveContent, lastSavedContentRef.current)
      ) {
        try {
          await saveUserContentForScene(String(draftSceneId), liveContent);
        } catch (saveErr) {
          // Non-fatal — we still send the live buffer below.
          console.warn("Olivia draft pre-send save failed:", saveErr);
        }
      }
      const manuscriptDraft = coachSceneId
        ? resolveManuscriptDraftForScene(String(coachSceneId), {
            selectedSceneId: liveSelectedSceneId,
            editorContent: liveContent,
            userContents: bookData?.userContents || [],
          })
        : useCoachingChat
          ? sendOptions?.manuscriptDraft || storedCoach?.manuscriptDraft || ""
          : draftSceneId
            ? resolveManuscriptDraftForScene(String(draftSceneId), {
                selectedSceneId: liveSelectedSceneId,
                editorContent: liveContent,
                userContents: bookData?.userContents || [],
              })
            : "";
      const coachIsArchived = isOliviaArchivedSlot(
        coachTargetScene?.sceneId,
        coachTargetScene?.actNumber,
        coachTargetScene?.sceneIndex
      );
      const selectedIsArchived = isOliviaArchivedSlot(liveSelectedSceneId);
      const safeCoachTarget = coachIsArchived ? null : coachTargetScene;
      const safeDraft =
        coachIsArchived || (selectedIsArchived && !useCoachingChat)
          ? ""
          : manuscriptDraft;
      const safeDraftScene = selectedIsArchived ? null : draftScene;
      if (useCoachingChat && safeCoachTarget) {
        coachingContextRef.current = {
          coachTargetScene: safeCoachTarget,
          manuscriptDraft: safeDraft,
        };
      }
      const coachingIntent =
        sendOptions?.coachingIntent ||
        (useCoachingChat ? "follow_up" : undefined);
      const coachingContext = useCoachingChat
        ? {
            targetScene: safeCoachTarget || undefined,
            manuscriptDraft: safeDraft,
            coachingIntent,
            ...(safeCoachTarget && !String(safeDraft).trim()
              ? { manuscriptDraftMissing: true }
              : {}),
          }
        : null;
      const hasAvatarDraft = Boolean(String(safeDraft).trim());
      const editorContext =
        !useSceneChat && !useCoachingChat && hasAvatarDraft
          ? {
              targetScene: safeDraftScene || undefined,
              draftScene: safeDraftScene || undefined,
              manuscriptDraft: safeDraft,
            }
          : null;
      const sceneDraftContext =
        useSceneChat && hasAvatarDraft
          ? {
              draftScene: safeDraftScene || undefined,
              manuscriptDraft: safeDraft,
            }
          : null;
      const response = useCoachingChat
        ? await sendOliviaCoachingMessage(
            id,
            displayText,
            attachmentsSnapshot,
            abortController.signal,
            oliviaWebSearch,
            outlineContext,
            coachingContext
          )
        : useSceneChat
          ? await sendOliviaSceneChatMessage(
              id,
              displayText,
              sceneTarget,
              abortController.signal,
              oliviaWebSearch,
              outlineContext,
              attachmentsSnapshot,
              sceneDraftContext
            )
          : await sendOliviaEditorMessage(
              id,
              displayText,
              attachmentsSnapshot,
              abortController.signal,
              oliviaWebSearch,
              outlineContext,
              editorContext
            );
      if (outlineChangeForSend) {
        setLastOutlineChange(null);
      }

      let placeholderAdded = false;
      const ensureStreamPlaceholder = () => {
        if (placeholderAdded) return;
        placeholderAdded = true;
        setChatIsProcessing(false);
        setChatIsStreaming(true);
        setChatMessages((prev) => {
          if (prev.some((m) => m.id === placeholderId)) return prev;
          return [
            ...prev,
            {
              id: placeholderId,
              role: "assistant",
              text: "",
              timestamp: new Date().toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              sortTs: Date.now(),
              thread: chatThread,
            },
          ];
        });
        startChatTokenFlushing();
      };

      const applyStreamDoneMessage = (doneMessage) => {
        const doneQuickReplies = normalizeOliviaQuickReplies(
          doneMessage.quickReplies
        );
        const doneTs = doneMessage.timestamp || doneMessage.created_at;
        const assistantRow = {
          id: String(doneMessage.id),
          role: "assistant",
          text: doneMessage.content || "",
          timestamp: doneTs
            ? formatOliviaMessageTime(doneTs)
            : new Date().toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              }),
          sortTs: doneTs ? new Date(doneTs).getTime() : Date.now(),
          thread: chatThread,
          ...(doneQuickReplies ? { quickReplies: doneQuickReplies } : {}),
        };
        stopChatTokenFlushing();
        setChatIsStreaming(false);
        setChatMessages((prev) => {
          const placeholderIdx = prev.findIndex((m) => m.id === placeholderId);
          if (placeholderIdx >= 0) {
            return prev.map((m, i) =>
              i === placeholderIdx ? { ...m, ...assistantRow } : m
            );
          }
          const existingIdx = prev.findIndex(
            (m) => m.id === assistantRow.id
          );
          if (existingIdx >= 0) {
            return prev.map((m, i) =>
              i === existingIdx ? mergeOliviaRow(m, assistantRow) : m
            );
          }
          return [...prev, assistantRow];
        });
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
              ensureStreamPlaceholder();
              stopChatTokenFlushing();
              setChatIsStreaming(false);
              setChatMessages((prev) =>
                prev.map((m) =>
                  m.id === placeholderId
                    ? { ...m, text: "Sorry, I encountered an error. Please try again." }
                    : m
                )
              );
              break;
            }
            if (data.token) {
              ensureStreamPlaceholder();
              chatTokenBufferRef.current += data.token;
            }
            if (data.done && data.message) {
              ensureStreamPlaceholder();
              applyStreamDoneMessage(data.message);
            }
          } catch {
            // ignore malformed SSE lines
          }
        }
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Olivia chat error:", error);
        setChatIsProcessing(false);
        stopChatTokenFlushing();
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === placeholderId
              ? { ...m, text: "Sorry, I encountered an error. Please try again." }
              : m
          )
        );
      }
    } finally {
      setChatIsProcessing(false);
      setChatIsStreaming(false);
      chatStreamAbortRef.current = null;

      // After the first editor message completes, silently reload full history
      // so the layering welcome (with the scene summary table) merges into the chat.
      if (allScenesComplete && needsEditorHistoryMergeRef.current) {
        needsEditorHistoryMergeRef.current = false;
        try {
          const [sceneRes, editorRes] = await Promise.allSettled([
            getOliviaSceneChatHistory(id, { limit: OLIVIA_HISTORY_INITIAL_LIMIT }),
            getOliviaEditorHistory(id, { limit: OLIVIA_HISTORY_INITIAL_LIMIT }),
          ]);
          let sceneRows = [];
          if (sceneRes.status === "fulfilled") {
            const msgs = Array.isArray(sceneRes.value?.messages)
              ? sceneRes.value.messages
              : [];
            sceneHistoryCursorRef.current = cursorFromHistoryPage(
              msgs,
              sceneRes.value?.hasMore
            );
            sceneRows = msgs.map((m) => mapOliviaApiMessageToRow(m, "scene"));
          }
          let editorRows = [];
          if (editorRes.status === "fulfilled") {
            const msgs = Array.isArray(editorRes.value?.messages)
              ? editorRes.value.messages
              : [];
            editorHistoryCursorRef.current = cursorFromHistoryPage(
              msgs,
              editorRes.value?.hasMore
            );
            editorRows = msgs.map((m) => mapOliviaApiMessageToRow(m, "editor"));
          }
          if (sceneRows.length > 0 || editorRows.length > 0) {
            setChatMessages(mergeOliviaThreadRows([...sceneRows, ...editorRows]));
            syncOliviaHasMoreFromCursors();
            oliviaHistoryLoadedForIdRef.current = id;
          }
          if (editorRes.status === "fulfilled") {
            setLayeringState(editorRes.value?.layeringState ?? null);
          }
        } catch {
          // Non-critical — history will merge on next chat open
        }
      } else if (allScenesComplete && !targetSceneForOlivia) {
        // Phase 2 (layering): refresh the authoritative layering state so the
        // Insert button can resolve Tier-0 targets after this turn.
        try {
          const res = await getOliviaLayeringState(id);
          if (res?.layeringState) setLayeringState(res.layeringState);
        } catch {
          // Non-critical — Insert button still has in-chat fallbacks.
        }
      }
    }
  }, [
    chatIsProcessing,
    chatIsStreaming,
    id,
    startChatTokenFlushing,
    stopChatTokenFlushing,
    allScenesComplete,
    targetSceneForOlivia,
    oliviaWebSearch,
    getNextEmptyScene,
    bookData?.userContents,
    outlineLayout,
    oliviaOutlineLayout,
    outlineRevision,
    lastOutlineChange,
    resolveOliviaTargetScene,
    syncOliviaHasMoreFromCursors,
    saveUserContentForScene,
    subscriptionPaused,
    handleOliviaWordLimit,
  ]);

  /** Send a programmatic message from quick-reply buttons or the scene selection panel. */
  const handleQuickReply = useCallback(
    (reply) => {
      const label =
        typeof reply === "string" ? reply : reply?.label ?? String(reply ?? "");
      return handleSendOliviaMessage(label);
    },
    [handleSendOliviaMessage]
  );

  /** Open Olivia chat and auto-send a coaching request for a specific scene. */
  const handleCoachScene = useCallback(
    async (actNumber, globalSceneNum, sceneTitle, sceneId, sceneIndex) => {
      const row = (bookData?.userContents || []).find(
        (c) => String(c._id) === String(sceneId)
      );
      if (row) {
        const storyResponseMap = getStoryResponseMap(bookData?.storyResponses || []);
        if (
          getLiveDraftHtml().trim() &&
          selectedScene.id &&
          selectedScene.id !== row._id
        ) {
          await saveImmediately();
        }
        setSelectedScene({
          promptKey: row.promptKey || null,
          text:
            storyResponseMap[row.promptKey] ||
            row.userContent ||
            "",
          actNumber: row.actNumber,
          sceneIndex: row.sceneIndex,
          globalSceneNumber: globalSceneNum,
          id: row._id,
          isUserAdded: Boolean(row.isUserAdded),
        });
      }

      if (
        selectedScene.id === sceneId &&
        editorDirty
      ) {
        await saveImmediately();
      }

      const liveDraftHtml =
        selectedScene.id === sceneId ? getLiveDraftHtml() : "";

      const draft = resolveManuscriptDraftForScene(sceneId, {
        selectedSceneId: sceneId,
        editorContent: liveDraftHtml,
        userContents: bookData?.userContents || [],
      });

      const coachMessage = `Coach me on Act ${actNumber}, Chapter ${globalSceneNum} — ${sceneTitle}`;
      const coachTargetScene = {
        actNumber: Number(actNumber),
        sceneIndex: Number(sceneIndex),
        sceneId: String(sceneId),
        globalSceneNumber: Number(globalSceneNum),
        sceneTitle,
      };

      coachingSessionActiveRef.current = true;
      coachingContextRef.current = {
        coachTargetScene,
        manuscriptDraft: draft,
      };
      setActiveCoachingScene(coachTargetScene);
      writePersistedCoaching(id, coachTargetScene);

      setShowOliviaChat(true);
      setTimeout(
        () =>
          handleSendOliviaMessage(coachMessage, {
            coachTargetScene,
            manuscriptDraft: draft,
            coachingIntent: "coach_scene",
          }),
        300
      );
    },
    [
      id,
      bookData?.userContents,
      bookData?.storyResponses,
      editorDirty,
      selectedScene.id,
      saveImmediately,
      handleSendOliviaMessage,
      getLiveDraftHtml,
    ]
  );

  // Stable callbacks for OliviaChatModal so the memoized modal doesn't
  // re-render on every parent state change.
  const handleLoadEarlierOliviaHistory = useCallback(() => {
    loadEarlierOliviaHistory();
  }, [loadEarlierOliviaHistory]);

  const handleOliviaClose = useCallback(() => {
    setShowOliviaChat(false);
    setTargetSceneForOlivia(null);
    // Intentionally keep coachingSessionActiveRef / coachingContextRef so the
    // coaching session resumes when the modal reopens (Fix 6b). The session is
    // cleared only when the writer switches to a different scene or starts a new
    // Coach session.
  }, []);

  /** Explicit "Back to general chat" exit from the coaching mode chip. Ends the
   *  coaching session so the next send routes to editor/scene, without closing
   *  the modal or changing the selected scene. */
  const handleExitCoaching = useCallback(() => {
    coachingSessionActiveRef.current = false;
    coachingContextRef.current = null;
    clearPersistedCoaching(id);
    setActiveCoachingScene(null);
  }, [id]);

  const handleOliviaWebSearchToggle = useCallback(() => {
    setOliviaWebSearch((prev) => !prev);
  }, []);

  const handleOliviaSceneDelivered = useCallback(
    async (sceneData) => {
      try {
        const resolvedTarget = resolveOliviaTargetScene({
          actNumber: sceneData.actNumber,
          sceneIndex: sceneData.sceneIndex,
          sceneId: targetSceneForOlivia?.sceneId,
          promptKey: targetSceneForOlivia?.promptKey,
        });
        const result = await saveOliviaScene(id, sceneData.messageId, {
          actNumber: resolvedTarget?.actNumber ?? sceneData.actNumber,
          sceneIndex: resolvedTarget?.sceneIndex ?? sceneData.sceneIndex,
          sceneId: resolvedTarget?.sceneId,
        });
        const refreshed = await fetchBookData(id);
        const nextTarget = getNextEmptyScene(refreshed);
        if (!nextTarget) {
          skipAllScenesReloadRef.current = true;
          needsEditorHistoryMergeRef.current = true;
        }
        setTargetSceneForOlivia(
          nextTarget
            ? enrichTargetSceneFromUserContents(
                nextTarget,
                refreshed?.userContents || []
              )
            : null
        );
        if (result?.confirmationMessage) {
          const cm = result.confirmationMessage;
          setChatMessages((prev) => [
            ...prev,
            mapOliviaApiMessageToRow(
              {
                _id: cm._id,
                role: cm.role,
                content: cm.content,
                timestamp: cm.timestamp,
                metadata: cm.metadata,
              },
              "scene"
            ),
          ]);
        }
      } catch (err) {
        console.error("Failed to save scene:", err);
        toast.error("Failed to save scene to outline. Please try again.");
      }
    },
    [id, getNextEmptyScene, resolveOliviaTargetScene, targetSceneForOlivia]
  );

  // Hide the Quill editor + tools whenever the writer isn't actually ready to
  // draft — either no scene is selected, or we're still in the pre-outline
  // state (no scenes generated and no completed scenes yet). The pre-outline
  // gate is important because the initial-scene auto-select effect can pick a
  // first userContents row even when its actNumber/sceneIndex are not set
  // yet, which would otherwise leave a typeable editor visible. The autosave
  // guard would silently drop those keystrokes.
  const isPreOutline = scenesGenerated === 0 && completedSceneCount === 0;
  const showEditorEmptyState =
    (!selectedScene.id || isPreOutline) &&
    !isBootLoading &&
    !shouldBeReadOnly;

  const focusModeEnabled =
    !showEditorEmptyState && !shouldBeReadOnly && Boolean(selectedScene.id);

  useEffect(() => {
    if (!focusModeEnabled && focusMode) {
      setFocusMode(false);
      if (id) {
        try {
          window.localStorage.removeItem(focusModeStorageKey(id));
        } catch {
          // best-effort
        }
      }
    }
  }, [focusModeEnabled, focusMode, id]);

  useEffect(() => {
    if (!focusMode) return;
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      setFocusMode(false);
      if (id) {
        try {
          window.localStorage.removeItem(focusModeStorageKey(id));
        } catch {
          // best-effort
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focusMode, id]);

  const handleToggleFocusMode = useCallback(() => {
    if (!focusModeEnabled) return;
    setFocusMode((prev) => {
      const next = !prev;
      if (id) {
        try {
          if (next) {
            window.localStorage.setItem(focusModeStorageKey(id), "1");
          } else {
            window.localStorage.removeItem(focusModeStorageKey(id));
          }
        } catch {
          // best-effort
        }
      }
      return next;
    });
  }, [focusModeEnabled, id]);

  const canShowDraftingSpaceBlock = !(showEditorEmptyState && isPreOutline);

  const showDraftingSpaceHeaderInEditor =
    canShowDraftingSpaceBlock && !isMobileLayout;

  const showMobileDictationStack =
    isMobileLayout && canShowDraftingSpaceBlock && !showEditorEmptyState;

  const wordCountBarVariant =
    focusMode || isMobileLayout ? "compact" : "default";

  const showEditorVoiceChrome =
    !shouldBeReadOnly && !showEditorEmptyState && !isMobileLayout;

  const showMobileVoiceControl =
    isMobileLayout && !shouldBeReadOnly && !showEditorEmptyState;

  const handleCompleteGuide = useCallback(() => {
    if (id) {
      try {
        window.localStorage.setItem(
          `bookEditor:oliviaGuideCompleted:${id}`,
          "1"
        );
      } catch {
        // Persistence is best-effort; UI completion still happens below.
      }
    }
    setGuideCompleted(true);
  }, [id]);

  const handleOpenGuide = useCallback(() => setShowGuideOverlay(true), []);
  const handleCloseGuide = useCallback(() => setShowGuideOverlay(false), []);

  const handleOpenOliviaFromEmptyState = useCallback(() => {
    if (!allScenesComplete) {
      const next = getNextEmptyScene();
      setTargetSceneForOlivia(
        next ? enrichTargetSceneFromUserContents(next, bookData?.userContents || []) : null
      );
    }
    setShowOliviaChat(true);
  }, [allScenesComplete, getNextEmptyScene, bookData?.userContents]);

  const handleOpenOutlineDrawerFromEmptyState = useCallback(() => {
    setOutlineDrawerOpen(true);
  }, []);

  // Wrap setSelectedScene so picking a scene from the (mobile/tablet) outline
  // drawer auto-closes it. Behaves as the raw setter on desktop because
  // outlineDrawerOpen never flips on >=1200px.
  const handleSelectSceneFromOutline = useCallback(
    (next) => {
      const prevId = selectedSceneRef.current?.id ?? null;
      const nextId = next?.id ?? null;
      const leavingDraft = getLiveDraftHtml();
      const leavingDirty =
        prevId &&
        prevId !== nextId &&
        !areQuillHtmlEquivalent(leavingDraft, lastSavedContent);

      if (leavingDirty) {
        writeSceneDraft(id, prevId, leavingDraft, knownUpdatedAtFor(prevId));
        patchUserContentInBookData(prevId, leavingDraft);
        saveUserContentForScene(prevId, leavingDraft);
      }

      const row = findUserContentRow(next, bookData?.userContents || []);
      const serverNext = row?.userContent || "";
      const serverUpdatedAt =
        toUpdatedAtIso(row?.updatedAt) || knownUpdatedAtFor(nextId);
      const resolved =
        nextId && id
          ? resolveDraftForScene(id, nextId, serverNext, serverUpdatedAt)
          : { text: serverNext, recovered: false };

      if (resolved.recovered && nextId) {
        if (!recoveryToastShownRef.current.has(nextId)) {
          recoveryToastShownRef.current.add(nextId);
          toast.info("Recovered unsaved changes from this device.");
        }
      }

      if (nextId && serverUpdatedAt) {
        rememberUpdatedAt(nextId, serverUpdatedAt);
      }

      const savedHtml = preserveLeadingIndentation(serverNext);
      setLastSavedContent(savedHtml);
      setDebouncedLiveHtml(preserveLeadingIndentation(resolved.text));
      setEditorDirty(false);
      editorHydratingRef.current = true;
      setEditorHydrating(true);

      // Switching to a different scene exits coaching (Fix 6b). Selecting the
      // coached scene itself keeps the session armed so the revision flow works.
      const coachedSceneId =
        coachingContextRef.current?.coachTargetScene?.sceneId ?? null;
      if (
        coachingSessionActiveRef.current &&
        coachedSceneId &&
        String(nextId) !== String(coachedSceneId)
      ) {
        coachingSessionActiveRef.current = false;
        coachingContextRef.current = null;
        clearPersistedCoaching(id);
        setActiveCoachingScene(null);
      }

      const offsets = computeActOffsets(bookData?.userContents || []);
      setSelectedScene({
        ...next,
        globalSceneNumber: resolveGlobalChapterNumber(
          next?.actNumber,
          next?.sceneIndex,
          next?.globalSceneNumber,
          offsets
        ),
      });
      contentSceneIdRef.current = nextId;
      setContentSceneId(nextId);
      if (outlineDrawerOpen) setOutlineDrawerOpen(false);
    },
    [
      id,
      lastSavedContent,
      outlineDrawerOpen,
      bookData?.userContents,
      patchUserContentInBookData,
      findUserContentRow,
      knownUpdatedAtFor,
      rememberUpdatedAt,
      saveUserContentForScene,
      getLiveDraftHtml,
    ]
  );

  const closeAllDrawers = useCallback(() => {
    setOutlineDrawerOpen(false);
    setScenePanelDrawerOpen(false);
  }, []);

  const selectedSceneHasLiveDraft = useMemo(
    () => Boolean(String(debouncedLiveHtml || "").trim()),
    [debouncedLiveHtml]
  );

  return (
    <div
      ref={rootRef}
      className={`d-flex w-100 book-editor-root book-editor-root--has-outline-resize${focusMode ? " book-editor-root--focus" : ""}${isMobileLayout ? " book-editor-root--mobile-layout" : ""}`}
    >
      <aside
        ref={outlineAsideRef}
        id="book-editor-outline-drawer"
        className={`book-editor-drawer book-editor-drawer--left${outlineDrawerOpen ? " is-open" : ""}${outlineWidth != null ? " is-resized" : ""}${isResizingOutline ? " is-resizing-outline" : ""}`}
        style={
          outlineWidth != null
            ? { flex: `0 0 ${outlineWidth}px` }
            : undefined
        }
        aria-label="Outline panel"
      >
        <OutlineSidebar
          bookData={bookData}
          selectedScene={selectedScene}
          setSelectedScene={handleSelectSceneFromOutline}
          setBookData={setBookData}
          selectedSceneHasLiveDraft={selectedSceneHasLiveDraft}
          storyResponseMap={storyResponseMap}
          expandedAct={expandedAct}
          setExpandedAct={setExpandedAct}
          formatSceneTitle={formatSceneTitle}
          getSceneTitleText={getSceneTitleText}
          onRenameScene={handleRenameScene}
          onDeleteScene={handleDeleteScene}
          onArchiveScene={handleArchiveScene}
          onUnarchiveScene={handleUnarchiveScene}
          scenes={scenes}
          isStreaming={false}
          initialOutlineStreamActive={false}
          isBootLoading={isBootLoading}
          onEmptySceneClick={(actNum, sceneIndex) => {
            handleEmptySceneClick(actNum, sceneIndex);
            if (outlineDrawerOpen) setOutlineDrawerOpen(false);
          }}
          characterListData={characterListData}
          formatCharacterText={formatCharacterText}
          getCharacterDisplayText={getCharacterDisplayText}
          showCoachScene={allScenesComplete}
          onCoachScene={(actNum, globalSceneNum, title, sceneId, sceneIndex) => {
            handleCoachScene(actNum, globalSceneNum, title, sceneId, sceneIndex);
            if (outlineDrawerOpen) setOutlineDrawerOpen(false);
          }}
          onOutlineStructureChange={handleOutlineStructureChange}
          onCharacterUpdated={(updated) =>
            setCharacterListData((prev) =>
              prev.map((c) =>
                String(c._id) === String(updated._id) ? { ...c, ...updated } : c
              )
            )
          }
          onCharactersReordered={setCharacterListData}
          onCharacterAdded={handleCharacterAdded}
          onCharacterDeleted={(characterId) =>
            setCharacterListData((prev) =>
              prev.filter((c) => String(c._id) !== String(characterId))
            )
          }
          onMasterPromptUpdated={(text, wordCount, name) => {
            const nextName = (
              (typeof name === "string" && name.trim()) ||
              extractStoryBibleTitle(text) ||
              ""
            ).trim();
            setBookData((prev) => ({
              ...prev,
              storyBible: text,
              ...(Number.isFinite(Number(wordCount)) && Number(wordCount) > 0
                ? { wordCount: Number(wordCount) }
                : {}),
              ...(nextName ? { name: nextName } : {}),
            }));
          }}
          onDownloadOutline={handleDownloadOutline}
          downloadOutlineDisabled={downloadOutlineDisabled}
          isDownloadingOutline={isDownloadingOutline}
          onDownloadCharacters={handleDownloadCharacters}
          downloadCharactersDisabled={downloadCharactersDisabled}
          isDownloadingCharacters={isDownloadingCharacters}
          onDownloadStoryBible={handleDownloadStoryBible}
          downloadStoryBibleDisabled={downloadStoryBibleDisabled}
          isDownloadingStoryBible={isDownloadingStoryBible}
          onOpenGuide={handleOpenGuide}
          content={debouncedLiveHtml}
          contentSceneId={contentSceneId}
        />
      </aside>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Drag to resize Outline panel. Double-click to reset."
        aria-valuemin={OUTLINE_MIN_PX}
        aria-valuemax={
          rootRef.current
            ? Math.round(rootRef.current.getBoundingClientRect().width * 0.45)
            : undefined
        }
        aria-valuenow={
          outlineWidth != null ? Math.round(outlineWidth) : OUTLINE_DEFAULT_PX
        }
        tabIndex={0}
        className={`book-editor-resize-handle book-editor-resize-handle--outline${isResizingOutline ? " is-active" : ""}${playOutlineHandleNudge ? " is-nudging" : ""}`}
        onPointerDown={handleOutlineResizeStart}
        onKeyDown={handleOutlineResizeKey}
        onDoubleClick={handleOutlineResizeReset}
        title="Drag to resize Outline. Double-click to reset."
      >
        <span className="book-editor-resize-handle__grip" aria-hidden>
          <LuChevronsLeftRight
            size={12}
            className="book-editor-resize-handle__icon"
            aria-hidden
          />
          <span className="book-editor-resize-handle__label">Drag</span>
        </span>
        {showOutlineResizeHint && (
          <div
            className="book-editor-resize-coachmark book-editor-resize-coachmark--outline"
            role="dialog"
            aria-label="Outline can be resized"
            onPointerDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="book-editor-resize-coachmark__close"
              onClick={(e) => {
                e.stopPropagation();
                dismissOutlineResizeHint();
              }}
              aria-label="Dismiss tip"
            >
              <LuX size={12} aria-hidden />
            </button>
            <p className="book-editor-resize-coachmark__title">
              Resize your outline
            </p>
            <p className="book-editor-resize-coachmark__body">
              Drag this divider to give your outline more or less room while you
              draft.
            </p>
            <button
              type="button"
              className="book-editor-resize-coachmark__cta"
              onClick={(e) => {
                e.stopPropagation();
                dismissOutlineResizeHint();
              }}
            >
              Got it
            </button>
          </div>
        )}
      </div>
      {outlineDrawerOpen && (
        <div
          className="book-editor-drawer-overlay"
          onClick={closeAllDrawers}
          aria-hidden="true"
        />
      )}
      <div className="book-editor-main-stack d-flex flex-column storygroove-theme">
        <div className="book-editor-mobile-top-chrome">
        {!(isMobileLayout && focusMode) && (
          <>
            <WordCountBar
              bookName={bookData?.name}
              totalWordCount={totalWordCount}
              MAX_WORD_COUNT={bookData.wordCount}
              wordPercent={Math.min(
                Math.round((totalWordCount / bookData.wordCount) * 100),
                100
              )}
              showDownloadButton={effectiveShowDownloadButton}
              downloadManuscriptDisabled={downloadManuscriptDisabled}
              isDownloadingManuscript={isDownloadingManuscript}
              onDownloadManuscript={handleDownloadManuscript}
              showCoverButton={canShowEditorActions && allScenesComplete}
              onOpenCoverModal={() => setShowCoverModal(true)}
              dense
              variant={wordCountBarVariant}
              isMobileLayout={isMobileLayout}
              focusMode={focusMode}
              onToggleFocusMode={handleToggleFocusMode}
              focusModeDisabled={!focusModeEnabled}
            />
            <div
              className="book-editor-mobile-toolbar"
              role="toolbar"
              aria-label="Editor panels"
            >
              <button
                type="button"
                className="book-editor-drawer-toggle"
                aria-expanded={outlineDrawerOpen}
                aria-controls="book-editor-outline-drawer"
                onClick={() => setOutlineDrawerOpen((v) => !v)}
              >
                <FiMenu size={16} aria-hidden />
                <span>Outline</span>
              </button>
              {!shouldBeReadOnly && (
                <SaveStatusBadge
                  {...getSaveState()}
                  className="book-editor-mobile-save-status"
                />
              )}
              {!shouldBeReadOnly && (
                <EditorHistoryControls
                  className="book-editor-history-controls--mobile"
                  canUndo={editorHistory.canUndo}
                  canRedo={editorHistory.canRedo}
                  onUndo={handleEditorUndo}
                  onRedo={handleEditorRedo}
                  disabled={isBootLoading || shouldBeReadOnly}
                />
              )}
              <div className="book-editor-mobile-toolbar-trailing">
                {effectiveShowSidebarTabs && (
                  <button
                    type="button"
                    className="book-editor-drawer-toggle"
                    aria-expanded={scenePanelDrawerOpen}
                    aria-controls="book-editor-scene-drawer"
                    onClick={() => setScenePanelDrawerOpen((v) => !v)}
                  >
                    <span>Chapter Design</span>
                    <TbLayoutSidebarRightExpand size={16} aria-hidden />
                  </button>
                )}
                {focusModeEnabled && (
                  <button
                    type="button"
                    className="book-editor-drawer-toggle book-editor-drawer-toggle--focus"
                    aria-pressed={focusMode}
                    aria-label={
                      focusMode ? "Exit Focus Mode (Esc)" : "Focus Mode"
                    }
                    title={
                      focusMode
                        ? "Exit Focus Mode (Esc)"
                        : "Focus Mode — maximize writing space"
                    }
                    onClick={handleToggleFocusMode}
                  >
                    {focusMode ? (
                      <LuMinimize2 size={16} aria-hidden />
                    ) : (
                      <LuMaximize2 size={16} aria-hidden />
                    )}
                    <span>{focusMode ? "Exit Focus Mode" : "Focus Mode"}</span>
                  </button>
                )}
              </div>
            </div>
          </>
        )}
        {isMobileLayout && focusMode && focusModeEnabled && (
          <div className="book-editor-mobile-focus-exit-bar">
            <button
              type="button"
              className="book-editor-mobile-focus-exit-btn"
              aria-pressed
              aria-label="Exit Focus Mode"
              title="Exit Focus Mode"
              onClick={handleToggleFocusMode}
            >
              <LuMinimize2 size={16} aria-hidden />
              <span>Exit Focus Mode</span>
            </button>
          </div>
        )}
        {showMobileDictationStack && (
          <div className="book-editor-mobile-dictation-stack">
            <InlineEditorPanelHeader
              id="book-editor-drafting-space-header"
              className="panel-header--mobile-dictation"
            />
            {showMobileVoiceControl && (
              <div
                className="book-editor-mobile-voice-bar"
                aria-label="Voice typing"
              >
                <VoiceRecorder
                  onDictationStart={handleEditorDictationStart}
                  onDictationProgress={handleEditorDictationProgress}
                  onTranscript={handleEditorVoiceTranscript}
                  disabled={isBootLoading}
                />
                <p
                  className="book-editor-mobile-voice-hint"
                  role="note"
                  title={voiceTypingHint}
                >
                  {voiceTypingHint}
                </p>
              </div>
            )}
          </div>
        )}
        </div>
        <div
          ref={workspaceRef}
          className={`book-editor-workspace-row d-flex flex-row w-100 gap-4${
            effectiveShowSidebarTabs && !shouldBeReadOnly && !focusMode
              ? " book-editor-workspace-row--has-resize-handle"
              : ""
          }`}
        >
          <div
            ref={editorColumnRef}
            className={`d-flex flex-column box-shadow position-relative book-editor-editor-column${!effectiveShowSidebarTabs || focusMode ? " book-editor-editor-column--full" : ""}${sceneCoachWidth != null && !focusMode ? " book-editor-editor-column--resized" : ""}${isCoachWidthAnimating ? " is-coach-width-animating" : ""}${isResizingCoach ? " is-resizing-coach" : ""}`}
          >
            <div className="editor-surface">
              {/* "Drafting Space" identity is implied by the surface itself in
                  pre-outline state — hide the header so the richer empty state
                  fills the visual space and writers don't see a label that
                  contradicts the "you're not ready to draft yet" message. */}
              {showDraftingSpaceHeaderInEditor && <InlineEditorPanelHeader />}
              {showEditorEmptyState ? (
                <EditorEmptyState
                  isPreOutline={isPreOutline}
                  onOpenOlivia={handleOpenOliviaFromEmptyState}
                  onOpenOutlineDrawer={handleOpenOutlineDrawerFromEmptyState}
                  guideCompleted={guideCompleted}
                  onCompleteGuide={handleCompleteGuide}
                  onOpenGuide={handleOpenGuide}
                />
              ) : (
                <>
                  {showEditorVoiceChrome && (
                    <div
                      className="book-editor-editor-chrome"
                      aria-label="Editor tools"
                    >
                      <div className="book-editor-voice-typing">
                        <span className="book-editor-voice-label">
                          Voice typing
                        </span>
                        <VoiceRecorder
                          onDictationStart={handleEditorDictationStart}
                          onDictationProgress={handleEditorDictationProgress}
                          onTranscript={handleEditorVoiceTranscript}
                          disabled={isBootLoading}
                        />
                        <span className="book-editor-voice-hint" title={voiceTypingHint}>
                          {voiceTypingHint}
                        </span>
                      </div>
                      <div className="book-editor-editor-chrome__actions">
                        <EditorHistoryControls
                          canUndo={editorHistory.canUndo}
                          canRedo={editorHistory.canRedo}
                          onUndo={handleEditorUndo}
                          onRedo={handleEditorRedo}
                          disabled={isBootLoading || shouldBeReadOnly}
                        />
                        <SaveStatusBadge {...getSaveState()} className="book-editor-save-status" />
                      </div>
                    </div>
                  )}
                  {showOfflineDraftBanner && (
                    <div
                      className="book-editor-offline-banner"
                      role="status"
                      aria-live="polite"
                    >
                      You&apos;re offline. Changes are saved on this device and
                      will sync when you&apos;re back online.
                    </div>
                  )}
                  <div
                    className={`editor-fade ${isBootLoading ? "is-loading" : "is-ready"}`}
                  >
                    <ManuscriptDraftEditor
                      key={selectedScene.id || "no-scene"}
                      ref={manuscriptDraftRef}
                      novelId={id}
                      sceneId={selectedScene.id}
                      initialHtml={
                        manuscriptEditorBootstrap?.initialHtml ?? ""
                      }
                      savedHtml={lastSavedContent}
                      basedOnServerUpdatedAt={knownUpdatedAtFor(selectedScene.id)}
                      readOnly={shouldBeReadOnly}
                      height="100%"
                      placeholder="Start writing your chapter here."
                      isAutosavePaused={
                        isDraftSaveDeferred() ||
                        isBootLoading ||
                        editorHydrating ||
                        Boolean(draftConflict)
                      }
                      isBootLoading={isBootLoading}
                      isHydrating={editorHydrating}
                      onAutosave={handleDraftAutosave}
                      onDebouncedHtmlChange={handleDebouncedDraftHtmlChange}
                      onDirtyChange={handleEditorDirtyChange}
                      onSavingChange={(saving) => {
                        if (saving) {
                          isSavingRef.current = true;
                          setIsSaving(true);
                          return;
                        }
                        if (!saveQueueRef.current?.inflight) {
                          isSavingRef.current = false;
                          setIsSaving(false);
                        }
                      }}
                      onDictationManualEdit={handleEditorDictationManualEdit}
                      onUserEdit={handleEditorUserEdit}
                      onEditorHydrated={handleEditorHydrated}
                      onHistoryChange={handleEditorHistoryChange}
                    />
                  </div>
                  {isBootLoading && (
                    <div className="editor-skeleton" aria-label="Loading editor">
                      <div className="skeleton-line w-60" />
                      <div className="skeleton-line w-90" />
                      <div className="skeleton-line w-80" />
                      <div className="skeleton-line w-95" />
                      <div className="skeleton-line w-70" />
                      <div className="skeleton-spacer" />
                      <div className="skeleton-line w-85" />
                      <div className="skeleton-line w-92" />
                      <div className="skeleton-line w-75" />
                      <div className="skeleton-line w-88" />
                    </div>
                  )}
                </>
              )}
            </div>
            <OliviaFloatingButton
              containerRef={editorColumnRef}
              visible={showOliviaFloatingButton}
              attention={oliviaAttention}
              disabled={!showOliviaFloatingButton}
              onOpenChat={handleOpenOliviaFromEmptyState}
              snapToDefaultWhen={focusMode}
            />
          </div>
          {effectiveShowSidebarTabs && !shouldBeReadOnly && !focusMode && (
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Drag to resize Chapter Coach panel. Click to toggle reading width. Double-click to reset."
              aria-valuemin={320}
              aria-valuemax={
                workspaceRef.current
                  ? Math.round(
                      workspaceRef.current.getBoundingClientRect().width * 0.8
                    )
                  : undefined
              }
              aria-valuenow={
                sceneCoachWidth != null
                  ? Math.round(sceneCoachWidth)
                  : undefined
              }
              tabIndex={0}
              className={`book-editor-resize-handle${isResizingCoach ? " is-active" : ""}${playHandleNudge ? " is-nudging" : ""}`}
              onPointerDown={handleCoachResizeStart}
              onKeyDown={handleCoachResizeKey}
              onDoubleClick={handleCoachResizeReset}
              title="Drag to resize Chapter Coach. Click for reading width. Double-click to reset."
            >
              <span className="book-editor-resize-handle__grip" aria-hidden>
                <LuChevronsLeftRight
                  size={12}
                  className="book-editor-resize-handle__icon"
                  aria-hidden
                />
                <span className="book-editor-resize-handle__label">Drag</span>
              </span>
              {showResizeHint && (
                <div
                  className="book-editor-resize-coachmark"
                  role="dialog"
                  aria-label="Chapter Coach can be resized"
                  onPointerDown={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className="book-editor-resize-coachmark__close"
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissResizeHint();
                    }}
                    aria-label="Dismiss tip"
                  >
                    <LuX size={12} aria-hidden />
                  </button>
                  <p className="book-editor-resize-coachmark__title">
                    Want more reading space?
                  </p>
                  <p className="book-editor-resize-coachmark__body">
                    Drag this divider left to expand Chapter Coach, or click it
                    once for a comfortable reading width.
                  </p>
                  <button
                    type="button"
                    className="book-editor-resize-coachmark__cta"
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissResizeHint();
                    }}
                  >
                    Got it
                  </button>
                </div>
              )}
            </div>
          )}
          {effectiveShowSidebarTabs && (
            <aside
              ref={sceneCoachAsideRef}
              id="book-editor-scene-drawer"
              className={`book-editor-drawer book-editor-drawer--right${scenePanelDrawerOpen ? " is-open" : ""}${sceneCoachWidth != null ? " is-resized" : ""}${isCoachWidthAnimating ? " is-coach-width-animating" : ""}${isResizingCoach ? " is-resizing-coach" : ""}`}
              style={
                sceneCoachWidth != null
                  ? { flex: `0 0 ${sceneCoachWidth}px` }
                  : undefined
              }
              aria-label="Chapter design panel"
            >
              {!shouldBeReadOnly && (
                <button
                  type="button"
                  className="book-editor-panel-resize-toggle"
                  onClick={toggleReadingMode}
                  aria-pressed={isInReadingMode}
                  aria-label={
                    isInReadingMode
                      ? "Collapse Chapter Coach to default width"
                      : "Expand Chapter Coach for easier reading"
                  }
                  title={
                    isInReadingMode
                      ? "Collapse panel"
                      : "Expand panel for easier reading"
                  }
                >
                  {isInReadingMode ? (
                    <LuChevronRight size={16} aria-hidden />
                  ) : (
                    <LuChevronLeft size={16} aria-hidden />
                  )}
                </button>
              )}
              <div className="d-flex flex-column box-shadow book-editor-container p-4 book-editor-sidebar-column">
                {SHOW_SAVE_CONTINUE_BUTTON && !shouldBeReadOnly && (
                  <Button
                    onClick={handleSaveContinue}
                    className="align-self-end border m-2 position-absolute top-0 end-0"
                  >
                    Save & Continue &nbsp;<span>➔</span>
                  </Button>
                )}
                <SidebarTabs
                  selectedScene={selectedScene}
                  chapterNumber={selectedChapterNumber}
                  formatSceneText={formatSceneText}
                  NotesEditor={NotesEditor}
                  isStreaming={false}
                  isBootLoading={isBootLoading}
                  bookId={id}
                  onSceneSuggestionUpdated={(promptKey, newText) => {
                    setBookData((prev) => {
                      const prevResponses = prev.storyResponses || [];
                      const exists = prevResponses.some(
                        (sr) => sr.promptKey === promptKey
                      );
                      const updated = exists
                        ? prevResponses.map((sr) =>
                            sr.promptKey === promptKey
                              ? { ...sr, responseText: newText }
                              : sr
                          )
                        : [...prevResponses, { promptKey, responseText: newText }];
                      return { ...prev, storyResponses: updated };
                    });
                    // Guard the selectedScene text update against a race: if the user
                    // navigates to a different scene while the save is in-flight,
                    // the outer closure's `selectedScene.promptKey` is stale and
                    // would wrongly overwrite the newly-selected scene's text.
                    // Check `prev.promptKey` inside the updater so we only touch
                    // the scene whose save we're confirming.
                    setSelectedScene((prev) => {
                      if (prev.promptKey !== promptKey) return prev;
                      return { ...prev, text: newText };
                    });
                  }}
                />
              </div>
            </aside>
          )}
          {scenePanelDrawerOpen && (
            <div
              className="book-editor-drawer-overlay"
              onClick={closeAllDrawers}
              aria-hidden="true"
            />
          )}
          <RenameSceneModal
            show={showRenameModal}
            onHide={() => setShowRenameModal(false)}
            newSceneTitle={newSceneTitle}
            setNewSceneTitle={setNewSceneTitle}
            updateSceneTitle={updateSceneTitle}
          />
          <FinalizeDraftConfirmationModal
            show={showFinalizeModal}
            handleClose={handleFinalizeClose}
            handleConfirm={handleFinalizeConfirm}
          />
          <DraftConflictModal
            show={Boolean(draftConflict)}
            onKeepThisDevice={handleKeepThisDevice}
            onLoadOtherDevice={handleLoadOtherDevice}
          />
          <BookCoverModal
            show={showCoverModal}
            onClose={() => setShowCoverModal(false)}
            novelId={id}
            bookName={bookData?.name}
            onCoverGenerated={(coverRef) =>
              setBookData((prev) => ({ ...prev, coverImage: coverRef }))
            }
          />
          {showGuideOverlay && (
            <OliviaWorkflowGuide
              variant="overlay"
              onClose={handleCloseGuide}
            />
          )}
          {showOliviaChat && (
            <OliviaChatErrorBoundary variant="modal">
              <OliviaChatModal
                novelId={id}
                messages={chatMessages}
                onSend={handleSendOliviaMessage}
                onWordLimitBlocked={handleOliviaWordLimit}
                onClose={handleOliviaClose}
                savedSceneMessageIds={oliviaSavedSceneMessageIds}
                isHistoryLoading={
                  showOliviaChat && oliviaHistoryLoadedForIdRef.current !== id
                }
                isProcessing={chatIsProcessing}
                isStreaming={chatIsStreaming}
                onInsertScene={handleInsertScene}
                onQuickReply={handleQuickReply}
                userContents={oliviaUserContents}
                targetScene={oliviaTargetScene}
                layeringState={layeringState}
                webSearchEnabled={oliviaWebSearch}
                onWebSearchToggle={handleOliviaWebSearchToggle}
                onSceneDelivered={handleOliviaSceneDelivered}
                onLoadEarlierMessages={handleLoadEarlierOliviaHistory}
                hasMoreOnServer={oliviaHasMoreOnServer}
                isLoadingEarlier={isLoadingEarlierOlivia}
                coachingScene={activeCoachingScene}
                onExitCoaching={handleExitCoaching}
              />
            </OliviaChatErrorBoundary>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookEditorPage;
