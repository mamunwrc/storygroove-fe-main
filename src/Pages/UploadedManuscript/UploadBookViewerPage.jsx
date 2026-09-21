import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  getABook,
  renameScene,
  deleteUploadedChapter,
  archiveUploadedChapter,
  unarchiveUploadedChapter,
  updateUserContent,
  getEllisReviewProgress,
  getEditorialLetter,
  regenerateEditorialLetter,
  sendEllisChatMessage,
  getEllisChatHistory,
  saveEllisChapterReview,
  downloadManuscript,
} from "../../api/bookGeneration";
import { getAgentAccessAPI } from "../../api/subscriptions";
import { hasEllisAccess, isSubscriptionPaused } from "../../utils";
import { recordRecentWork } from "../../utils/recentWork";
import { Button } from "react-bootstrap";
import {
  LuChevronsLeftRight,
  LuChevronLeft,
  LuChevronRight,
  LuMinimize2,
  LuMaximize2,
} from "react-icons/lu";
import { FiMenu } from "react-icons/fi";
import { TbLayoutSidebarRightExpand } from "react-icons/tb";
import ManuscriptDraftEditor from "../../component/manuscriptEditor/ManuscriptDraftEditor";
import VoiceRecorder from "../../component/Chat/VoiceRecorder";
import { useEditorDictation } from "../../hooks/useEditorDictation";
import { supportsUnspokenPunctuation } from "../../utils/dictationTranscript";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import FinalizeDraftConfirmationModal from "../../component/Modal/FinalizeDraftConfirmationModal";
import NotesEditor from "../../component/bookGeneration/Notes";
import OutlineSidebar from "./OutlineSidebar";
import SidebarTabs from "./SidebarTabs";
import EllisFloatingButton from "./EllisFloatingButton";
import EllisChatModal from "./EllisChatModal";
import EditorialLetterModal from "./EditorialLetterModal";
import BookCoverModal from "../../component/BookCoverModal/BookCoverModal";
import "../BookEditor/bookEditor.scss";
import "../BookEditor/BookEditorPage.scss";
import "./BookEditorPage.scss";
import {
  DRAFT_SAVE_TIMEOUT_MS,
} from "../../constants/editorConstants";
import {
  writeSceneDraft,
  clearSceneDraft,
  resolveDraftForScene,
} from "../BookEditor/sceneDraftStorage";
import {
  createDraftSaveQueue,
  isRetryableDraftSaveError,
} from "../BookEditor/queuedDraftSave";
import WordCountBar from "../BookEditor/WordCountBar";
import SaveStatusBadge from "../BookEditor/SaveStatusBadge";
import EditorHistoryControls from "../BookEditor/EditorHistoryControls";
import { useMobileLayout } from "../BookEditor/useMobileLayout";
import InlineEditorPanelHeader from "../BookEditor/InlineEditorPanelHeader";
import { getStoryResponseMap, formatSceneTitle } from "../BookEditor/utils";
import {
  countChapterWords,
  getUploadedChapterRows,
  getNextRecommendedChapterNum,
  getNextRecommendedChapter,
  compareChapterRows,
  normalizeChapterSuffix,
  isUploadedManuscriptBook,
  isArchivedChapter,
  stripUploadedManuscriptDisplayHtml,
  preserveLeadingIndentation,
} from "./utils";
import {
  clampCoachWidth as clampCoachWidthPx,
  clampOutlineWidth as clampOutlineWidthPx,
  getRootLayout,
  getWorkspaceLayout,
  OUTLINE_MIN_PX,
  OUTLINE_DEFAULT_PX,
} from "../BookEditor/bookEditorResize";
import {
  mapEllisApiMessageToRow,
  buildEllisEmptyChapterMessage,
  chapterHasEllisDraftContent,
  ELLIS_CONVERSATIONAL_KIND,
  resolveEllisChapterLabel,
  resolveEllisInsertChapterRef,
  mergeEllisSavedReviewMessageIds,
  mergeEllisHistoryRows,
  oldestEllisServerHistoryRow,
  computeEllisInsertableReviewMessageIds,
  buildEllisKickoffPlaceholderMetadata,
  consumeEllisChatSseChunk,
  flushEllisChatSseRest,
} from "./ellisChatHelpers";
import {
  ELLIS_CHAT_WORD_LIMIT_TEXT,
  isEllisChatOverWordLimit,
  isEllisChatWordLimitMessage,
} from "../../constants/ellisStudioInput";
import { areQuillHtmlEquivalent } from "../../utils/quillHtmlNormalize";

const ELLIS_HISTORY_INITIAL_LIMIT = 30;
const ELLIS_HISTORY_PAGE_SIZE = 30;

const ENRICHMENT_POLL_MS = 5000;
const LETTER_POLL_INTERVAL_MS = 4000;

// Resize tuning — mirrors the Book Editor shell.
const READING_MODE_RATIO = 0.65;
const READING_MODE_THRESHOLD_RATIO = 0.55;
const CLICK_DRAG_THRESHOLD_PX = 4;
const COACH_WIDTH_TRANSITION_MS = 350;

const focusModeStorageKey = (novelId) => `uploadViewer:focusMode:${novelId}`;
const selectedSceneStorageKey = (novelId) =>
  `uploadViewer:selectedScene:${novelId}`;

const MANUSCRIPT_PANEL_SUBTITLE = (
  <>
    Revise your manuscript here as you work through my chapter-by-chapter
    guidance. Tap my avatar anytime to ask questions as you work.{" "}
    <strong>
      📌 Once you finish revising a chapter, tap my avatar and ask me to
      review your revisions. Example: “Review my revisions for Chapter Six.”
    </strong>
  </>
);

const stripHtmlToText = (html = "") =>
  String(html)
    .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const extractChapterFirstLine = (html = "") => {
  const text = stripHtmlToText(html);
  return (
    text
      .split(/\n+/)
      .map((l) => l.trim())
      .find(Boolean) || ""
  );
};

const UploadBookViewerPage = () => {
  const { id } = useParams();
  const isMobileLayout = useMobileLayout();
  const [selectedScene, setSelectedScene] = useState({
    promptKey: null,
    text: null,
    index: null,
    id: null,
  });
  const [expandedAct, setExpandedAct] = useState(1);
  const [bookData, setBookData] = useState({ acts: [] });
  const [debouncedLiveHtml, setDebouncedLiveHtml] = useState("");
  const [editorDirty, setEditorDirty] = useState(false);
  const [contentSceneId, setContentSceneId] = useState(null);
  const [lastSavedContent, setLastSavedContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const isSavingRef = useRef(false);
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
  const selectedSceneRef = useRef(selectedScene);
  const contentSceneIdRef = useRef(null);
  const lastSavedContentRef = useRef(lastSavedContent);
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

  const getLiveDraftHtml = useCallback(
    () => manuscriptDraftRef.current?.getHtml?.() ?? "",
    []
  );

  const stripChapterHtmlForDisplay = useCallback(
    (html) =>
      preserveLeadingIndentation(
        isUploadedManuscriptBook(bookData)
          ? stripUploadedManuscriptDisplayHtml(html, {
              preserveBlankParagraphs: true,
              stripLeadingTitle: false,
            })
          : html
      ),
    [bookData]
  );
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const navigate = useNavigate();
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [reviewProgress, setReviewProgress] = useState({});
  const [showEllisChat, setShowEllisChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatIsStreaming, setChatIsStreaming] = useState(false);
  const [chatIsProcessing, setChatIsProcessing] = useState(false);
  const [isEllisHistoryLoading, setIsEllisHistoryLoading] = useState(false);
  const [hasMoreEllisHistory, setHasMoreEllisHistory] = useState(false);
  const [isLoadingEarlierEllis, setIsLoadingEarlierEllis] = useState(false);
  const [ellisSavedReviewMessageIds, setEllisSavedReviewMessageIds] = useState([]);
  const [targetChapterForEllis, setTargetChapterForEllis] = useState(null);
  const [insertingReviewMessageId, setInsertingReviewMessageId] = useState(null);
  const [reviewRefreshToken, setReviewRefreshToken] = useState(0);
  const [ellisSidebarTab, setEllisSidebarTab] = useState("sceneEdit");
  const [bookLoadError, setBookLoadError] = useState(false);
  const ellisHistoryLoadedForIdRef = useRef(null);
  const ellisHistoryHasMoreRef = useRef(false);
  // True after "Show earlier" prepends pages. Latest-page refetches must merge
  // instead of replacing, and must not revive the hasMore cursor from a
  // newest-only response.
  const ellisHistoryExpandedRef = useRef(false);
  const ellisChatWasOpenRef = useRef(false);
  const chatMessagesLenRef = useRef(0);
  const chatMessagesRef = useRef(chatMessages);
  const chatStreamAbortRef = useRef(null);
  const chatPlaceholderIdRef = useRef(null);
  const chatTokenBufferRef = useRef("");
  const chatIsStreamingRef = useRef(false);
  const chatRafIdRef = useRef(null);
  // Reference count of in-flight optimistic chat mutations (send turns + review
  // inserts). While > 0, a history refetch must NOT replace the message list, or
  // the in-flight user/assistant/confirmation messages get wiped (or duplicated)
  // until a later reload re-pulls them from the server. A counter (not a boolean)
  // keeps the guard held when operations overlap — e.g. inserting an older review
  // while a new reply is still streaming.
  const ellisTurnInFlightRef = useRef(0);
  chatMessagesLenRef.current = chatMessages.length;
  chatMessagesRef.current = chatMessages;

  // Initial boot: until the first getABook resolves, bookData has no novelId.
  const isBookLoading = !bookData?.novelId && !bookLoadError;

  // ---------------------------------------------------------------------------
  // Editorial letter (lifted so the left letter tab and the right Scene Edit
  // gate share a single source of truth for `letterReady`).
  // ---------------------------------------------------------------------------
  const [letterStatus, setLetterStatus] = useState("pending");
  const [letter, setLetter] = useState(null);
  const [letterError, setLetterError] = useState(null);
  const [letterDraft, setLetterDraft] = useState(null);
  const [letterModalOpen, setLetterModalOpen] = useState(false);
  const letterModalDismissedRef = useRef(false);
  const letterPollRef = useRef(null);

  // ---------------------------------------------------------------------------
  // Resizable shell (mirrors Book Editor): outline (left) + Scene Coach (right).
  // ---------------------------------------------------------------------------
  const rootRef = useRef(null);
  const outlineAsideRef = useRef(null);
  const workspaceRef = useRef(null);
  const editorColumnRef = useRef(null);
  const manuscriptDraftRef = useRef(null);
  const {
    handleEditorVoiceTranscript,
    handleEditorDictationStart,
    handleEditorDictationProgress,
    handleEditorDictationManualEdit,
  } = useEditorDictation({ richEditorRef: manuscriptDraftRef });
  const sceneCoachAsideRef = useRef(null);
  const sceneCoachWidthRef = useRef(null);
  const outlineWidthRef = useRef(null);
  const hasRightPanelRef = useRef(true);

  const [outlineWidth, setOutlineWidth] = useState(null);
  const [isResizingOutline, setIsResizingOutline] = useState(false);
  const [sceneCoachWidth, setSceneCoachWidth] = useState(null);
  const [isResizingCoach, setIsResizingCoach] = useState(false);
  const [isCoachWidthAnimating, setIsCoachWidthAnimating] = useState(false);
  const [outlineDrawerOpen, setOutlineDrawerOpen] = useState(false);
  const [scenePanelDrawerOpen, setScenePanelDrawerOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [isDownloadingManuscript, setIsDownloadingManuscript] = useState(false);
  const downloadManuscriptInFlightRef = useRef(false);

  const ellisAccessible =
    subscriptionData === null ? true : hasEllisAccess(subscriptionData);
  const subscriptionPaused = isSubscriptionPaused(subscriptionData);
  const blocked = !ellisAccessible || subscriptionPaused;
  const letterReady = letterStatus === "ready";

  const voiceTypingHint = useMemo(
    () =>
      supportsUnspokenPunctuation()
        ? "Tap the mic and speak — words appear as you talk. Say “comma” or “period” when speaking fast; Chrome also adds punctuation from pauses. Tap again to finish."
        : "Tap the mic, speak — words appear as you talk. Say “comma” or “period” for punctuation. Tap again to finish.",
    []
  );

  const hasActGrouping = useMemo(
    () =>
      !isUploadedManuscriptBook(bookData) &&
      (bookData?.userContents || []).some(
        (uc) => uc.actNumber != null && uc.chapterNumber != null
      ),
    [bookData]
  );

  // Chapter currently in focus
  const selectedChapter = useMemo(() => {
    const uc = bookData?.userContents?.find((c) => c._id === selectedScene.id);
    if (!uc) return null;
    const suffix = normalizeChapterSuffix(uc.chapterSuffix);
    return {
      id: uc._id,
      chapterNumber:
        uc.chapterNumber != null ? Number(uc.chapterNumber) : null,
      chapterSuffix: suffix || null,
      label:
        uc.chapterLabel ||
        uc.sceneTitle ||
        (Number.isFinite(Number(uc.chapterNumber)) && Number(uc.chapterNumber) >= 1
          ? `Chapter ${uc.chapterNumber}${suffix ? ` ${suffix}` : ""}`
          : "Chapter"),
      pov: uc.pov || null,
      timeline: uc.timeline || null,
      firstLine: extractChapterFirstLine(uc.userContent),
      archived: isArchivedChapter(uc),
    };
  }, [bookData?.userContents, selectedScene.id]);

  // Olivia-parity: Ellis must not treat an archived chapter as the open target.
  const ellisChatTargetChapter = useMemo(() => {
    const t = targetChapterForEllis || selectedChapter;
    if (!t || t.archived) return null;
    const uc = (bookData?.userContents || []).find(
      (c) => String(c._id) === String(t.id)
    );
    return isArchivedChapter(uc) ? null : t;
  }, [targetChapterForEllis, selectedChapter, bookData?.userContents]);

  // Ordered chapter list (for Ellis' "Ready for the next chapter" advance).
  const chapters = useMemo(() => {
    const rows = isUploadedManuscriptBook(bookData)
      ? getUploadedChapterRows(bookData?.userContents || [])
      : [...(bookData?.userContents || [])]
          .filter((uc) => uc.chapterNumber != null)
          .sort(compareChapterRows);
    return rows.map((uc) => {
      const suffix = normalizeChapterSuffix(uc.chapterSuffix);
      return {
        id: uc._id,
        chapterNumber: Number(uc.chapterNumber),
        chapterSuffix: suffix || null,
        label:
          uc.chapterLabel ||
          uc.sceneTitle ||
          (Number.isFinite(Number(uc.chapterNumber)) && Number(uc.chapterNumber) >= 1
            ? `Chapter ${uc.chapterNumber}${suffix ? ` ${suffix}` : ""}`
            : "Chapter"),
      };
    });
  }, [bookData]);

  // The Revision Plan holds ONE review per chapter, so the Insert button is
  // per-chapter, not per-message: only the LATEST review of a chapter is a
  // candidate, and it stays insertable until that same latest message is saved.
  // A redelivered chapter therefore exposes a fresh CTA on the NEW review (to
  // overwrite the saved one), while superseded older duplicates never show it.
  const insertableReviewMessageIds = useMemo(
    () =>
      computeEllisInsertableReviewMessageIds(
        chatMessages,
        ellisSavedReviewMessageIds,
        chapters,
        {
          readyChapterNumbers: new Set(
            Object.entries(reviewProgress || {})
              .filter(([, entry]) => entry?.status === "ready")
              .map(([key]) => Number(key))
              .filter((n) => Number.isFinite(n))
          ),
        }
      ),
    [chatMessages, ellisSavedReviewMessageIds, chapters, reviewProgress]
  );

  const nextRecommendedChapter = useMemo(
    () => getNextRecommendedChapter(reviewProgress, chapters),
    [reviewProgress, chapters]
  );
  const nextRecommendedChapterNum = useMemo(
    () =>
      nextRecommendedChapter
        ? Number(nextRecommendedChapter.chapterNumber)
        : getNextRecommendedChapterNum(reviewProgress, chapters),
    [nextRecommendedChapter, reviewProgress, chapters]
  );

  const storyResponseMap = useMemo(
    () => getStoryResponseMap(bookData.storyResponses),
    [bookData.storyResponses]
  );

  useEffect(() => {
    selectedSceneRef.current = selectedScene;
  }, [selectedScene]);

  useEffect(() => {
    lastSavedContentRef.current = lastSavedContent;
  }, [lastSavedContent]);

  const patchUserContentInBookData = useCallback((sceneId, userContentText) => {
    if (!sceneId) return;
    setBookData((prev) => {
      const updatedContents = [...(prev.userContents || [])];
      const idx = updatedContents.findIndex((c) => c._id === sceneId);
      if (idx === -1) return prev;
      updatedContents[idx] = {
        ...updatedContents[idx],
        userContent: userContentText,
      };
      return { ...prev, userContents: updatedContents };
    });
  }, []);

  const persistSceneToServer = useCallback(
    async (sceneId, draftText) => {
      if (!sceneId) return;
      const text = preserveLeadingIndentation(draftText ?? "");
      const response = await updateUserContent(
        {
          id: sceneId,
          userContent: text,
        },
        { timeout: DRAFT_SAVE_TIMEOUT_MS }
      );
      if (response.status !== 200) {
        const error = new Error("Save failed");
        error.response = { status: response.status };
        throw error;
      }
      patchUserContentInBookData(sceneId, text);
      clearSceneDraft(id, sceneId);
      setSaveFailed(false);
      if (selectedSceneRef.current?.id === sceneId) {
        setLastSavedContent(draftText ?? "");
      }
    },
    [id, patchUserContentInBookData]
  );

  persistSceneRef.current = async (sceneId, draftText) => {
    try {
      await persistSceneToServer(sceneId, draftText);
    } catch (error) {
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

  const enqueueSceneSave = useCallback((sceneId, draftText) => {
    if (!sceneId) return Promise.resolve();
    return saveQueueRef.current.enqueue(sceneId, draftText ?? "");
  }, []);

  const saveUserContentForScene = useCallback(
    async (sceneId, draftText) => {
      await enqueueSceneSave(sceneId, draftText);
    },
    [enqueueSceneSave]
  );

  /** Flush debounced autosave so Ellis reads the latest editor text from DB. */
  const saveImmediately = useCallback(async () => {
    await manuscriptDraftRef.current?.saveNow?.();
  }, []);

  const bookDataRef = useRef(bookData);
  useEffect(() => {
    bookDataRef.current = bookData;
  }, [bookData]);

  const handleSelectSceneFromOutline = useCallback(
    (sceneData) => {
      if (!sceneData) return;

      const prevId = selectedSceneRef.current?.id ?? null;
      const nextId = sceneData._id ?? null;
      const leavingDraft = getLiveDraftHtml();
      const leavingDirty =
        prevId &&
        prevId !== nextId &&
        !areQuillHtmlEquivalent(
          leavingDraft,
          lastSavedContentRef.current ?? ""
        );

      if (leavingDirty) {
        writeSceneDraft(id, prevId, leavingDraft);
        patchUserContentInBookData(prevId, leavingDraft);
        saveUserContentForScene(prevId, leavingDraft);
      }

      const serverNext = sceneData.userContent ?? "";
      const resolved =
        nextId && id
          ? resolveDraftForScene(id, nextId, serverNext)
          : { text: serverNext, recovered: false };

      if (resolved.recovered && nextId) {
        if (!recoveryToastShownRef.current.has(nextId)) {
          recoveryToastShownRef.current.add(nextId);
          toast.info("Recovered unsaved changes from this device.");
        }
      }

      const idx = bookData.userContents.findIndex((c) => c._id === nextId);
      const savedHtml = stripChapterHtmlForDisplay(serverNext, sceneData);
      setLastSavedContent(savedHtml);
      setDebouncedLiveHtml(
        stripChapterHtmlForDisplay(resolved.text, sceneData)
      );
      setEditorDirty(false);
      editorHydratingRef.current = true;
      setEditorHydrating(true);
      contentSceneIdRef.current = nextId;
      setContentSceneId(nextId);

      setSelectedScene({
        promptKey: sceneData.promptKey,
        text: storyResponseMap[sceneData.promptKey] || "",
        index: idx,
        id: nextId,
      });
    },
    [
      id,
      bookData?.userContents,
      storyResponseMap,
      patchUserContentInBookData,
      saveUserContentForScene,
      stripChapterHtmlForDisplay,
      getLiveDraftHtml,
    ]
  );

  const handleSceneSelect = useCallback(
    (sceneData) => {
      if (!sceneData) return;
      handleSelectSceneFromOutline(sceneData);
    },
    [handleSelectSceneFromOutline]
  );

  const handleOutlineSceneSelect = useCallback(
    (sceneData) => {
      handleSceneSelect(sceneData);
      setOutlineDrawerOpen(false);
    },
    [handleSceneSelect]
  );

  const fetchReviewProgress = async () => {
    if (!id) return {};
    try {
      const data = await getEllisReviewProgress(id);
      const progress = data.progress || {};
      setReviewProgress(progress);
      return progress;
    } catch (error) {
      // Non-fatal; sidebar dots just won't show.
      return {};
    }
  };

  const fetchBookData = async (novelId) => {
    if (!novelId) return null;
    try {
      const response = await getABook(novelId);
      const data = response.data;
      setBookData((prev) => ({
        ...prev,
        ...data,
        novelId: data._id,
      }));
      setBookLoadError(false);
      recordRecentWork({
        kind: "ellis",
        resourceId: data._id,
        name: data.name,
        uploaded: true,
        status: data.status || null,
      });
      return data;
    } catch (error) {
      console.error(error);
      setBookLoadError(true);
      return null;
    }
  };

  const applyServerContentIfClean = useCallback(
    (bookPayload) => {
      const sceneId = selectedSceneRef.current?.id;
      if (!sceneId || !bookPayload?.userContents) return;
      const isDirty = manuscriptDraftRef.current?.isDirty?.() ?? false;
      if (isDirty) return;

      const row = bookPayload.userContents.find(
        (c) => String(c._id) === String(sceneId)
      );
      if (!row) return;

      const serverHtml = stripChapterHtmlForDisplay(
        row.userContent ?? "",
        row
      );
      if (serverHtml === (lastSavedContentRef.current ?? "")) return;

      manuscriptDraftRef.current?.setHtml?.(serverHtml);
      setLastSavedContent(serverHtml);
      setDebouncedLiveHtml(serverHtml);
      setEditorDirty(false);
    },
    [stripChapterHtmlForDisplay]
  );

  const handleRetryBook = useCallback(() => {
    setBookLoadError(false);
    fetchBookData(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ---------------------------------------------------------------------------
  // Editorial letter fetch/poll (lifted from EllisEditsPanel).
  // ---------------------------------------------------------------------------
  const clearLetterPoll = useCallback(() => {
    if (letterPollRef.current) {
      clearInterval(letterPollRef.current);
      letterPollRef.current = null;
    }
  }, []);

  const fetchLetter = useCallback(async () => {
    try {
      const data = await getEditorialLetter(id);
      setLetterStatus(data.status || "pending");
      setLetter(data.editorialLetter || null);
      setLetterDraft(data.editorialLetterDraft || null);
      setLetterError(data.error || null);
      // Once the writer has saved (ready), stop polling. The consent/refine
      // workflow streams generation over SSE, so "generating"/"draft" no longer
      // need the poll — but keep polling harmless until a terminal state.
      if (data.status === "ready") {
        clearLetterPoll();
      }
    } catch (err) {
      /* keep polling */
    }
  }, [id, clearLetterPoll]);

  // Auto-open the editorial-letter consent/refine modal on Manuscript Hub open
  // for uploaded manuscripts whose letter has not been saved yet.
  useEffect(() => {
    if (blocked) return;
    if (!isUploadedManuscriptBook(bookData)) return;
    if (letterStatus === "ready") {
      setLetterModalOpen(false);
      return;
    }
    if (letterModalDismissedRef.current) return;
    setLetterModalOpen(true);
  }, [bookData, blocked, letterStatus]);

  const handleLetterSaved = useCallback(
    (savedLetter) => {
      setLetterStatus("ready");
      setLetter(savedLetter || null);
      setLetterDraft(null);
      setLetterModalOpen(false);
      clearLetterPoll();
      // Refresh the sidebar letter tab (and pick up enrichment kickoff).
      fetchLetter();
    },
    [clearLetterPoll, fetchLetter]
  );

  const handleLetterModalClose = useCallback(() => {
    letterModalDismissedRef.current = true;
    setLetterModalOpen(false);
  }, []);

  const openLetterModal = useCallback(() => {
    letterModalDismissedRef.current = false;
    setLetterModalOpen(true);
  }, []);

  const handleRetryLetter = useCallback(async () => {
    try {
      setLetterStatus("generating");
      setLetterError(null);
      await regenerateEditorialLetter(id);
      clearLetterPoll();
      letterPollRef.current = setInterval(fetchLetter, LETTER_POLL_INTERVAL_MS);
    } catch (err) {
      toast.error("Could not start editorial letter generation.");
    }
  }, [id, clearLetterPoll, fetchLetter]);

  useEffect(() => {
    if (!id || blocked) return;
    fetchLetter();
    letterPollRef.current = setInterval(fetchLetter, LETTER_POLL_INTERVAL_MS);
    return clearLetterPoll;
  }, [id, blocked, fetchLetter, clearLetterPoll]);

  // Fetch book details
  useEffect(() => {
    fetchBookData(id);
  }, [id]);

  // Warn before closing the tab when the editor has unsaved changes.
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      const sceneId = selectedSceneRef.current?.id;
      const draftText = getLiveDraftHtml();
      if (
        id &&
        sceneId &&
        !areQuillHtmlEquivalent(draftText, lastSavedContentRef.current)
      ) {
        writeSceneDraft(id, sceneId, draftText);
      }
      if (!areQuillHtmlEquivalent(draftText, lastSavedContentRef.current)) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [id, getLiveDraftHtml]);

  const loadEllisHistory = useCallback(async () => {
    if (!id || blocked) return;
    if (ellisHistoryLoadedForIdRef.current === id) return;
    // Never overwrite the list while an optimistic chat mutation is active.
    if (ellisTurnInFlightRef.current > 0) return;
    const showFullLoader = chatMessagesLenRef.current === 0;
    if (showFullLoader) setIsEllisHistoryLoading(true);
    try {
      const data = await getEllisChatHistory(id, {
        limit: ELLIS_HISTORY_INITIAL_LIMIT,
      });
      // A mutation may have started while this request was in flight — don't stomp it.
      if (ellisTurnInFlightRef.current > 0) return;
      const rows = (data.messages || []).map((m) => mapEllisApiMessageToRow(m));
      setChatMessages((prev) => mergeEllisHistoryRows(rows, prev));
      if (!ellisHistoryExpandedRef.current) {
        ellisHistoryHasMoreRef.current = Boolean(data.hasMore);
        setHasMoreEllisHistory(Boolean(data.hasMore));
      }
      ellisHistoryLoadedForIdRef.current = id;
    } catch (_) {
      ellisHistoryHasMoreRef.current = false;
      setHasMoreEllisHistory(false);
      // Do not mark loaded on failure — allow retry on next open/focus.
    } finally {
      if (showFullLoader) setIsEllisHistoryLoading(false);
    }
  }, [id, blocked]);

  // Lightweight cross-device sync: when the tab regains focus, flush any dirty
  // local edits then refetch so mobile/desktop edits converge (last-write-wins).
  useEffect(() => {
    if (!id) return undefined;
    let running = false;
    const syncOnFocus = async () => {
      if (document.visibilityState && document.visibilityState !== "visible") {
        return;
      }
      if (running) return;
      running = true;
      try {
        if (manuscriptDraftRef.current?.isDirty?.()) {
          await saveImmediately();
        }
        const data = await fetchBookData(id);
        if (data) applyServerContentIfClean(data);
        // Refresh the latest Ellis page when the panel is open (other device).
        // Skip while earlier pages are on screen — a latest-only refetch used
        // to rebuild the list and yank the writer back to the tail.
        if (showEllisChat && !ellisHistoryExpandedRef.current) {
          ellisHistoryLoadedForIdRef.current = null;
          await loadEllisHistory();
        }
      } finally {
        running = false;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") syncOnFocus();
    };
    window.addEventListener("focus", syncOnFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", syncOnFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [
    id,
    saveImmediately,
    applyServerContentIfClean,
    showEllisChat,
    loadEllisHistory,
  ]);

  useEffect(() => {
    const novelId = bookData?.novelId || bookData?._id;
    if (!id || !novelId || String(novelId) !== String(id)) return;
    const raw = bookData?.ellisSavedChapterReviewMessageIds;
    if (Array.isArray(raw)) {
      setEllisSavedReviewMessageIds((prev) =>
        mergeEllisSavedReviewMessageIds(prev, raw)
      );
    }
  }, [id, bookData?.novelId, bookData?._id, bookData?.ellisSavedChapterReviewMessageIds]);

  const loadEarlierEllisHistory = useCallback(async () => {
    if (!id || blocked || isLoadingEarlierEllis || !ellisHistoryHasMoreRef.current) {
      return;
    }

    const oldestServerRow = oldestEllisServerHistoryRow(chatMessagesRef.current);
    if (!oldestServerRow?.id) return;

    setIsLoadingEarlierEllis(true);
    try {
      const data = await getEllisChatHistory(id, {
        limit: ELLIS_HISTORY_PAGE_SIZE,
        before: oldestServerRow.id,
      });
      const incoming = (data.messages || []).map((m) => mapEllisApiMessageToRow(m));
      if (incoming.length === 0) {
        ellisHistoryHasMoreRef.current = false;
        setHasMoreEllisHistory(false);
        return;
      }
      setChatMessages((prev) => mergeEllisHistoryRows(incoming, prev));
      ellisHistoryExpandedRef.current = true;
      ellisHistoryHasMoreRef.current = Boolean(data.hasMore);
      setHasMoreEllisHistory(Boolean(data.hasMore));
    } catch (_) {
      // keep existing messages
    } finally {
      setIsLoadingEarlierEllis(false);
    }
  }, [id, blocked, isLoadingEarlierEllis]);

  useEffect(() => {
    ellisHistoryLoadedForIdRef.current = null;
    ellisHistoryHasMoreRef.current = false;
    ellisHistoryExpandedRef.current = false;
    setHasMoreEllisHistory(false);
    setChatMessages([]);
  }, [id]);

  useEffect(() => {
    if (!showEllisChat) {
      ellisChatWasOpenRef.current = false;
      return;
    }
    const justOpened = !ellisChatWasOpenRef.current;
    ellisChatWasOpenRef.current = true;
    // Only force a latest-page fetch when the panel actually opens. A change
    // in loadEllisHistory identity (e.g. subscription resolving `blocked`)
    // must not wipe earlier pages the writer already loaded.
    if (justOpened) {
      ellisHistoryLoadedForIdRef.current = null;
    }
    loadEllisHistory();
  }, [showEllisChat, loadEllisHistory]);

  const startEllisTokenFlushing = useCallback(() => {
    if (chatIsStreamingRef.current) return;
    chatIsStreamingRef.current = true;
    const flush = () => {
      if (chatTokenBufferRef.current) {
        const chunk = chatTokenBufferRef.current;
        chatTokenBufferRef.current = "";
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === chatPlaceholderIdRef.current
              ? { ...m, text: m.text + chunk }
              : m
          )
        );
      }
      if (chatIsStreamingRef.current) {
        chatRafIdRef.current = requestAnimationFrame(flush);
      }
    };
    chatRafIdRef.current = requestAnimationFrame(flush);
  }, []);

  const stopEllisTokenFlushing = useCallback(() => {
    chatIsStreamingRef.current = false;
    if (chatRafIdRef.current) {
      cancelAnimationFrame(chatRafIdRef.current);
      chatRafIdRef.current = null;
    }
    if (chatTokenBufferRef.current) {
      const remaining = chatTokenBufferRef.current;
      chatTokenBufferRef.current = "";
      setChatMessages((prev) =>
        prev.map((m) =>
          m.id === chatPlaceholderIdRef.current
            ? { ...m, text: m.text + remaining }
            : m
        )
      );
    }
  }, []);

  const resolveEllisChapterByRef = useCallback(
    ({ chapterNumber, chapterSuffix = null, chapterLabel = null } = {}) => {
      const rows = getUploadedChapterRows(bookData?.userContents || []);
      if (chapterLabel) {
        const labelNorm = String(chapterLabel).trim().toLowerCase();
        const byLabel = rows.find(
          (c) =>
            String(c.chapterLabel || c.sceneTitle || "")
              .trim()
              .toLowerCase() === labelNorm
        );
        if (byLabel) {
          const suf = normalizeChapterSuffix(byLabel.chapterSuffix);
          return {
            id: byLabel._id,
            chapterNumber: Number(byLabel.chapterNumber),
            chapterSuffix: suf || null,
            label:
              byLabel.chapterLabel ||
              byLabel.sceneTitle ||
              `Chapter ${byLabel.chapterNumber}${suf ? ` ${suf}` : ""}`,
          };
        }
      }

      const num = Number(chapterNumber);
      if (!Number.isFinite(num)) return null;
      const wantSuffix = normalizeChapterSuffix(chapterSuffix);
      const uc =
        rows.find(
          (c) =>
            Number(c.chapterNumber ?? c.sceneIndex) === num &&
            normalizeChapterSuffix(c.chapterSuffix) === wantSuffix
        ) ||
        // Fall back to bare base chapter when suffix was empty/unspecified.
        (!wantSuffix
          ? rows.find((c) => Number(c.chapterNumber ?? c.sceneIndex) === num)
          : null) ||
        null;
      if (!uc) return null;
      const suf = normalizeChapterSuffix(uc.chapterSuffix);
      return {
        id: uc._id,
        chapterNumber: num,
        chapterSuffix: suf || null,
        label:
          uc.chapterLabel ||
          uc.sceneTitle ||
          `Chapter ${num}${suf ? ` ${suf}` : ""}`,
      };
    },
    [bookData?.userContents]
  );

  const focusEllisChapter = useCallback(
    (chapterRef) => {
      if (!chapterRef?.id) return;
      const uc = bookData?.userContents?.find(
        (c) => String(c._id) === String(chapterRef.id)
      );
      if (uc) {
        handleSelectSceneFromOutline(uc);
      }
      setTargetChapterForEllis(chapterRef);
    },
    [bookData?.userContents, handleSelectSceneFromOutline]
  );

  const handleEllisWordLimit = useCallback(() => {
    const now = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const ts = Date.now();
    setChatMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === "assistant" && isEllisChatWordLimitMessage(last.text)) {
        return prev;
      }
      return [
        ...prev,
        {
          id: `assistant-word-limit-${ts}`,
          role: "assistant",
          text: ELLIS_CHAT_WORD_LIMIT_TEXT,
          timestamp: now,
          sortTs: ts,
        },
      ];
    });
  }, []);

  const handleSendEllisMessage = useCallback(
    async (text = "", sendOptions = null) => {
      if (blocked) {
        toast.info("Your subscription does not include Ellis' editing.");
        return;
      }
      const trimmed = String(text || "").trim();
      if (chatIsProcessing || chatIsStreaming) return;
      // Ref, not state: a repeated Enter can call this twice in one tick
      // before setChatIsProcessing re-renders, which would append the user
      // row twice. Insert uses the same counter, so send waits out an insert.
      if (ellisTurnInFlightRef.current > 0) return;
      if (!trimmed) return;
      if (isEllisChatOverWordLimit(trimmed)) {
        handleEllisWordLimit();
        return;
      }

      // Lock out history refetches for the whole turn (including the pre-send
      // save and any focus/visibility sync) so the optimistic user message and
      // the streamed reply can't be clobbered by a stale server snapshot.
      ellisTurnInFlightRef.current += 1;

      // Persist dirty editor content before Ellis loads chapter text from DB.
      await saveImmediately();

      const displayText = trimmed;

      const now = new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const userMsgId = `user-${Date.now()}`;
      const assistantMsgId = `assistant-${Date.now()}`;

      const placeholderId = assistantMsgId;
      chatPlaceholderIdRef.current = placeholderId;
      chatTokenBufferRef.current = "";
      let kickoffPlaceholderMeta = null;

      setChatMessages((prev) => [
        ...prev,
        {
          id: userMsgId,
          role: "user",
          text: displayText,
          timestamp: now,
          sortTs: Date.now(),
        },
      ]);
      setChatIsProcessing(true);

      const abortController = new AbortController();
      chatStreamAbortRef.current = abortController;

      let placeholderAdded = false;
      const stampPlaceholderMetadata = (meta) => {
        if (!meta) return;
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === chatPlaceholderIdRef.current || m.id === placeholderId
              ? { ...m, metadata: { ...meta, ...(m.metadata || {}) } }
              : m
          )
        );
      };
      const ensureStreamPlaceholder = () => {
        if (placeholderAdded) {
          stampPlaceholderMetadata(kickoffPlaceholderMeta);
          return;
        }
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
              timestamp: now,
              sortTs: Date.now(),
              metadata: kickoffPlaceholderMeta,
            },
          ];
        });
        startEllisTokenFlushing();
      };

      const applyStreamDoneMessage = (doneMessage) => {
        const finalText = doneMessage.content || doneMessage.text || "";
        const finalId = String(
          doneMessage.id || doneMessage._id || placeholderId
        );
        stopEllisTokenFlushing();
        setChatIsStreaming(false);
        setChatMessages((prev) => {
          const placeholderIdx = prev.findIndex(
            (m) => m.id === placeholderId || m.id === chatPlaceholderIdRef.current
          );
          if (placeholderIdx >= 0) {
            return prev.map((m, i) =>
              i === placeholderIdx
                ? {
                    ...m,
                    id: finalId,
                    text: finalText || m.text,
                    metadata:
                      doneMessage.metadata ||
                      m.metadata ||
                      kickoffPlaceholderMeta ||
                      null,
                  }
                : m
            );
          }
          return prev;
        });
        chatPlaceholderIdRef.current = finalId;
      };

      const handleEmptyKickoffChapter = (navChapter) => {
        const contents = bookDataRef.current?.userContents || [];
        const chapterRow = contents.find(
          (c) => String(c._id) === String(navChapter.id)
        );
        if (isArchivedChapter(chapterRow)) return false;
        // Prefer live editor HTML when the kickoff chapter is the one open now
        // (avoids stale bookData after a just-typed / just-saved edit).
        const liveHtml =
          selectedSceneRef.current?.id &&
          String(selectedSceneRef.current.id) === String(navChapter.id)
            ? getLiveDraftHtml()
            : null;
        const htmlToCheck =
          liveHtml != null ? liveHtml : chapterRow?.userContent;
        if (!chapterRow || chapterHasEllisDraftContent(htmlToCheck)) {
          return false;
        }
        abortController.abort();
        const label = resolveEllisChapterLabel(chapterRow);
        stopEllisTokenFlushing();
        setChatIsProcessing(false);
        setChatIsStreaming(false);
        setChatMessages((prev) => [
          ...prev.filter((m) => m.id !== placeholderId),
          {
            id: assistantMsgId,
            role: "assistant",
            text: buildEllisEmptyChapterMessage(label),
            timestamp: now,
            sortTs: Date.now() + 1,
            metadata: { kind: ELLIS_CONVERSATIONAL_KIND },
          },
        ]);
        return true;
      };

      try {
        const response = await sendEllisChatMessage(
          id,
          displayText,
          abortController.signal
        );

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let streamEnded = false;

        const handleSseEvent = (data) => {
          if (!data || streamEnded) return;
          if (data.turnNavigation?.kickoff) {
            const nav = data.turnNavigation;
            kickoffPlaceholderMeta = buildEllisKickoffPlaceholderMetadata(nav);
            if (kickoffPlaceholderMeta) {
              ensureStreamPlaceholder();
              stampPlaceholderMetadata(kickoffPlaceholderMeta);
            }
            // Only explicit, writer-initiated navigation (kickoff) may move the
            // writer's chapter focus. Conversational/Q&A turns never auto-jump —
            // selectedChapter (the writer's own selection) stays authoritative.
            let navChapter = null;
            if (nav.chapterId) {
              const row = bookData?.userContents?.find(
                (c) => String(c._id) === String(nav.chapterId)
              );
              if (row && !isArchivedChapter(row)) {
                navChapter = resolveEllisChapterByRef({
                  chapterNumber: row.chapterNumber,
                  chapterSuffix: row.chapterSuffix,
                  chapterLabel: row.chapterLabel,
                }) || {
                  id: row._id,
                  chapterNumber: Number(row.chapterNumber),
                  chapterSuffix:
                    normalizeChapterSuffix(row.chapterSuffix) || null,
                  label:
                    row.chapterLabel ||
                    row.sceneTitle ||
                    `Chapter ${row.chapterNumber}`,
                };
              }
            }
            if (!navChapter && nav.chapterNumber != null) {
              navChapter = resolveEllisChapterByRef({
                chapterNumber: nav.chapterNumber,
                chapterSuffix: nav.chapterSuffix || "",
              });
            }
            if (navChapter) {
              focusEllisChapter(navChapter);
              if (handleEmptyKickoffChapter(navChapter)) {
                streamEnded = true;
                return;
              }
            }
          }
          if (data.error) {
            ensureStreamPlaceholder();
            stopEllisTokenFlushing();
            setChatIsStreaming(false);
            throw new Error(data.error);
          }
          if (data.token) {
            ensureStreamPlaceholder();
            chatTokenBufferRef.current += data.token;
          }
          if (data.done && data.message) {
            ensureStreamPlaceholder();
            applyStreamDoneMessage(data.message);
          }
        };

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            buffer += decoder.decode();
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          const consumed = consumeEllisChatSseChunk(buffer);
          buffer = consumed.rest;
          for (const data of consumed.events) {
            handleSseEvent(data);
            if (streamEnded) break;
          }
          if (streamEnded) break;
        }
        if (!streamEnded) {
          const leftover = flushEllisChatSseRest(buffer);
          if (leftover) handleSseEvent(leftover);
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          const errorMessage =
            err.message || "Ellis could not respond. Please try again.";
          toast.error(errorMessage);
          ensureStreamPlaceholder();
          stopEllisTokenFlushing();
          setChatIsStreaming(false);
          setChatMessages((prev) =>
            prev.map((m) =>
              m.id === placeholderId ? { ...m, text: errorMessage } : m
            )
          );
        }
      } finally {
        setChatIsProcessing(false);
        stopEllisTokenFlushing();
        setChatIsStreaming(false);
        chatStreamAbortRef.current = null;
        ellisTurnInFlightRef.current = Math.max(
          0,
          ellisTurnInFlightRef.current - 1
        );
      }
    },
    [
      id,
      blocked,
      chatIsProcessing,
      chatIsStreaming,
      targetChapterForEllis,
      resolveEllisChapterByRef,
      focusEllisChapter,
      startEllisTokenFlushing,
      stopEllisTokenFlushing,
      saveImmediately,
      handleEllisWordLimit,
    ]
  );

  const handleEllisReviewInserted = useCallback(
    async (message) => {
      if (selectedChapter?.archived) {
        toast.error("Restore this chapter before inserting a review.");
        return;
      }
      const chapterRef = resolveEllisInsertChapterRef(message, {
        selectedChapterNumber: selectedChapter?.chapterNumber,
        selectedChapterSuffix: selectedChapter?.chapterSuffix,
        selectedChapterLabel: selectedChapter?.label,
        targetChapterNumber: targetChapterForEllis?.chapterNumber,
        targetChapterSuffix: targetChapterForEllis?.chapterSuffix,
        chapters,
      });
      if (!id || !message?.id || chapterRef?.chapterNumber == null) {
        if (id && message?.id) {
          toast.error(
            "Could not determine which chapter this review belongs to. Select the chapter in the outline and try again."
          );
        }
        return;
      }
      const chapterNumber = chapterRef.chapterNumber;
      const chapterSuffix = chapterRef.chapterSuffix || "";
      const messageId = String(message.id);
      setInsertingReviewMessageId(messageId);
      setEllisSavedReviewMessageIds((prev) =>
        mergeEllisSavedReviewMessageIds(prev, [messageId])
      );
      // Lock out history refetches for the insert round-trip so a focus/visibility
      // sync can't replace the list mid-insert and then let us append the
      // confirmation a second time.
      ellisTurnInFlightRef.current += 1;
      try {
        const result = await saveEllisChapterReview(
          id,
          message.id,
          chapterNumber,
          chapterSuffix
        );
        if (Array.isArray(result?.ellisSavedChapterReviewMessageIds)) {
          const savedIds = result.ellisSavedChapterReviewMessageIds.map((x) =>
            String(x)
          );
          setEllisSavedReviewMessageIds(savedIds);
          setBookData((prev) => ({
            ...prev,
            ellisSavedChapterReviewMessageIds: savedIds,
          }));
        } else {
          setEllisSavedReviewMessageIds((prev) =>
            mergeEllisSavedReviewMessageIds(prev, [messageId])
          );
          setBookData((prev) => ({
            ...prev,
            ellisSavedChapterReviewMessageIds: mergeEllisSavedReviewMessageIds(
              prev?.ellisSavedChapterReviewMessageIds,
              [messageId]
            ),
          }));
        }
        setReviewRefreshToken((v) => v + 1);
        await fetchReviewProgress();
        // Stay on the chapter just reviewed — do not auto-jump to the next gap.

        if (result?.confirmationMessage) {
          const cm = result.confirmationMessage;
          const confirmRow = mapEllisApiMessageToRow({
            _id: cm._id,
            role: cm.role,
            content: cm.content,
            timestamp: cm.timestamp,
            metadata: cm.metadata,
          });
          // Idempotent append: a concurrent history refetch may have already
          // pulled this persisted confirmation, so never add it twice.
          setChatMessages((prev) =>
            prev.some((m) => String(m.id) === String(confirmRow.id))
              ? prev
              : [...prev, confirmRow]
          );
        }

        toast.success("Chapter review inserted into your Revision Plan.");
      } catch (err) {
        setEllisSavedReviewMessageIds((prev) =>
          prev.filter((savedId) => savedId !== messageId)
        );
        toast.error(
          err?.response?.data?.error ||
            err.message ||
            "Could not insert chapter review into your Revision Plan."
        );
      } finally {
        setInsertingReviewMessageId(null);
        ellisTurnInFlightRef.current = Math.max(
          0,
          ellisTurnInFlightRef.current - 1
        );
      }
    },
    [
      id,
      targetChapterForEllis,
      selectedChapter?.chapterNumber,
      selectedChapter?.chapterSuffix,
      selectedChapter?.label,
      selectedChapter?.archived,
      chapters,
      fetchReviewProgress,
    ]
  );

  const handleOpenEllisChat = useCallback(() => {
    // Scene-by-scene chat is locked until the editorial letter is saved.
    if (!letterReady) {
      openLetterModal();
      return;
    }
    const recommended =
      nextRecommendedChapter ||
      resolveEllisChapterByRef({
        chapterNumber: nextRecommendedChapterNum,
      });
    const liveSelected =
      selectedChapter && !selectedChapter.archived ? selectedChapter : null;
    setTargetChapterForEllis(recommended || liveSelected);
    setShowEllisChat(true);
  }, [
    letterReady,
    openLetterModal,
    nextRecommendedChapter,
    nextRecommendedChapterNum,
    resolveEllisChapterByRef,
    selectedChapter,
  ]);

  const handleEllisClose = useCallback(() => {
    if (chatStreamAbortRef.current) {
      chatStreamAbortRef.current.abort();
    }
    setShowEllisChat(false);
  }, []);

  // Fetch Ellis review progress (drives sidebar chapter status dots).
  useEffect(() => {
    fetchReviewProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Fetch agent access (gates the Ellis' editing surfaces).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getAgentAccessAPI();
        if (!cancelled) setSubscriptionData(data);
      } catch (error) {
        // Default to gated if access can't be resolved.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Poll book data while manuscript enrichment runs (summaries + acts).
  useEffect(() => {
    if (bookData?.manuscriptEnrichmentStatus !== "generating") return;
    const timer = setInterval(() => fetchBookData(id), ENRICHMENT_POLL_MS);
    return () => clearInterval(timer);
  }, [id, bookData?.manuscriptEnrichmentStatus]);

  // Set initial selected scene — restore the last-opened chapter, else Chapter One.
  useEffect(() => {
    if (
      bookData?.userContents &&
      bookData.userContents.length > 0 &&
      selectedScene.promptKey === null
    ) {
      const ordered = isUploadedManuscriptBook(bookData)
        ? getUploadedChapterRows(bookData.userContents)
        : [...bookData.userContents]
            .filter((uc) => uc.chapterNumber != null)
            .sort(compareChapterRows);

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

      const firstScene = restored || ordered[0] || bookData.userContents[0];
      setSelectedScene({
        promptKey: firstScene.promptKey,
        text: storyResponseMap[firstScene.promptKey] || "",
        index: bookData.userContents.findIndex((c) => c._id === firstScene._id),
        id: firstScene._id,
      });
    }
  }, [
    id,
    bookData,
    selectedScene.promptKey,
    storyResponseMap,
  ]);

  // Remember the writer's current chapter so a refresh reopens it (not Chapter One).
  useEffect(() => {
    if (!id || !selectedScene.id) return;
    try {
      window.localStorage.setItem(
        selectedSceneStorageKey(id),
        String(selectedScene.id)
      );
    } catch {
      // Best-effort; falls back to Chapter One if storage is unavailable.
    }
  }, [id, selectedScene.id]);

  const manuscriptEditorBootstrap = useMemo(() => {
    if (!bookData?.userContents || !selectedScene.id) return null;

    const scene = bookData.userContents.find(
      (c) => c._id === selectedScene.id
    );
    const serverContent = scene?.userContent || "";
    const resolved =
      id && selectedScene.id
        ? resolveDraftForScene(id, selectedScene.id, serverContent)
        : { text: serverContent, recovered: false };

    return {
      initialHtml: stripChapterHtmlForDisplay(resolved.text, scene),
      savedHtml: stripChapterHtmlForDisplay(serverContent, scene),
    };
  }, [
    id,
    selectedScene.id,
    bookData?.userContents,
    stripChapterHtmlForDisplay,
  ]);

  // Hydrate chapter selection when selectedScene changes (initial load / programmatic).
  useEffect(() => {
    if (!bookData?.userContents) {
      setDebouncedLiveHtml("");
      setEditorDirty(false);
      setContentSceneId(null);
      contentSceneIdRef.current = null;
      setLastSavedContent("");
      return;
    }

    if (contentSceneIdRef.current === selectedScene.id) {
      return;
    }

    const scene = bookData.userContents.find((c) => c._id === selectedScene.id);
    const serverContent = scene?.userContent || "";
    const sceneId = selectedScene.id;
    const resolved =
      sceneId && id
        ? resolveDraftForScene(id, sceneId, serverContent)
        : { text: serverContent, recovered: false };

    if (resolved.recovered && sceneId) {
      if (!recoveryToastShownRef.current.has(sceneId)) {
        recoveryToastShownRef.current.add(sceneId);
        toast.info("Recovered unsaved changes from this device.");
      }
    }

    const savedHtml = stripChapterHtmlForDisplay(serverContent, scene);
    setLastSavedContent(savedHtml);
    setDebouncedLiveHtml(
      stripChapterHtmlForDisplay(resolved.text, scene)
    );
    setEditorDirty(false);
    editorHydratingRef.current = true;
    setEditorHydrating(true);
    contentSceneIdRef.current = sceneId || null;
    setContentSceneId(sceneId || null);
  }, [bookData, selectedScene, id, stripChapterHtmlForDisplay]);

  const totalWordCount = useMemo(() => {
    if (!bookData?.userContents) return 0;
    const uploaded = isUploadedManuscriptBook(bookData);
    return bookData.userContents.reduce((sum, item) => {
      return (
        sum +
        countChapterWords(item, {
          isUploadedManuscript: uploaded,
          liveContent: debouncedLiveHtml,
          contentSceneId,
          selectedSceneId: selectedScene.id,
          storyResponseFallback: storyResponseMap[item.promptKey] || "",
        })
      );
    }, 0);
  }, [
    bookData?.userContents,
    debouncedLiveHtml,
    selectedScene.id,
    contentSceneId,
    storyResponseMap,
  ]);

  const MAX_WORD_COUNT = bookData.wordCount;
  const wordPercent = Math.min(
    Math.round((totalWordCount / MAX_WORD_COUNT) * 100),
    100
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

  const handleDraftAutosave = useCallback(
    async (draftText, sceneId) => {
      if (!sceneId) return;
      await enqueueSceneSave(sceneId, draftText);
    },
    [enqueueSceneSave]
  );

  const getSaveState = () => {
    if (editorHydrating && !isSaving && !editorDirty) {
      return { state: "saved", label: "Saved" };
    }
    if (saveFailed && !isSaving) {
      return { state: "error", label: "Couldn't save" };
    }
    if (isSaving || editorDirty) return { state: "saving", label: "Saving…" };
    return { state: "saved", label: "Saved" };
  };

  // Inline rename from OutlineSidebar
  const handleRenameScene = useCallback(
    async (sceneId, newTitle) => {
      try {
        const response = await renameScene({
          novelId: id,
          id: sceneId,
          sceneTitle: newTitle,
        });
        if (response.status === 200) {
          const apiData = response.data || {};
          const finalTitle = apiData.finalTitle ?? newTitle;
          const { promptKey, responseText, titleWasRenamed } = apiData;

          setBookData((prev) => {
            const updatedContents = [...(prev.userContents || [])];
            const idx = updatedContents.findIndex(
              (c) => String(c._id) === String(sceneId)
            );
            if (idx !== -1) {
              const row = updatedContents[idx];
              updatedContents[idx] = {
                ...row,
                sceneTitle: finalTitle,
                ...(row.chapterNumber != null
                  ? { chapterLabel: finalTitle }
                  : {}),
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

          if (titleWasRenamed && finalTitle) {
            toast.info(
              `A scene titled "${newTitle}" already exists. Your scene was saved as "${finalTitle}".`,
              { autoClose: 5000 }
            );
          } else {
            toast.success("Scene renamed.");
          }
        }
      } catch (err) {
        console.error("handleRenameScene error:", err);
        toast.error("Failed to rename scene.");
        throw err;
      }
    },
    [id]
  );

  const applyChapterSelection = (next, contents) => {
    const html = stripChapterHtmlForDisplay(next.userContent ?? "", next);
    contentSceneIdRef.current = next._id;
    setContentSceneId(next._id);
    setLastSavedContent(html);
    setDebouncedLiveHtml(html);
    setEditorDirty(false);
    setSelectedScene({
      promptKey: next.promptKey,
      text: storyResponseMap[next.promptKey] || "",
      index: (contents || []).findIndex(
        (c) => String(c._id) === String(next._id)
      ),
      id: next._id,
    });
  };

  const clearChapterSelection = () => {
    contentSceneIdRef.current = null;
    setContentSceneId(null);
    setSelectedScene({
      promptKey: null,
      text: null,
      index: null,
      id: null,
    });
    setDebouncedLiveHtml("");
    setEditorDirty(false);
    setLastSavedContent("");
  };

  const reselectAfterChapterRemoved = async (chapterId) => {
    const data = await fetchBookData(id);
    fetchReviewProgress();
    const wasSelected =
      String(selectedSceneRef.current?.id) === String(chapterId);
    if (!wasSelected) return data;
    const rows = getUploadedChapterRows(data?.userContents || []);
    const next = rows[0];
    if (next) applyChapterSelection(next, data?.userContents);
    else clearChapterSelection();
    return data;
  };

  const handleDeleteChapter = async (chapterId) => {
    try {
      await deleteUploadedChapter(chapterId);
      clearSceneDraft(id, chapterId);
      await reselectAfterChapterRemoved(chapterId);
      toast.success("Chapter deleted.");
    } catch (err) {
      console.error("handleDeleteChapter error:", err);
      toast.error(err?.response?.data?.error || "Failed to delete chapter.");
    }
  };

  const handleArchiveChapter = async (chapterId) => {
    try {
      await archiveUploadedChapter(chapterId);
      setTargetChapterForEllis((prev) =>
        String(prev?.id) === String(chapterId) ? null : prev
      );
      if (String(selectedSceneRef.current?.id) === String(chapterId)) {
        clearChapterSelection();
      }
      await fetchBookData(id);
      fetchReviewProgress();
      toast.success("Chapter archived. Find it at the bottom of the map.");
    } catch (err) {
      console.error("handleArchiveChapter error:", err);
      toast.error(err?.response?.data?.error || "Failed to archive chapter.");
    }
  };

  const handleUnarchiveChapter = async (chapterId) => {
    try {
      await unarchiveUploadedChapter(chapterId);
      await fetchBookData(id);
      fetchReviewProgress();
      toast.success("Chapter restored to its original place in the map.");
    } catch (err) {
      console.error("handleUnarchiveChapter error:", err);
      toast.error(err?.response?.data?.error || "Failed to restore chapter.");
    }
  };

  // Finalize
  const handleSaveContinue = () => setShowFinalizeModal(true);
  const handleFinalizeClose = () => setShowFinalizeModal(false);
  const handleFinalizeConfirm = () => {
    setShowFinalizeModal(false);
    navigate(`/dashboard/finaldraft/${id}`);
  };

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

  const focusModeEnabled = Boolean(selectedScene.id);

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

  const handleDownloadManuscript = useCallback(async () => {
    if (downloadManuscriptInFlightRef.current) return;
    downloadManuscriptInFlightRef.current = true;
    setIsDownloadingManuscript(true);
    try {
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

  // ---------------------------------------------------------------------------
  // Resize math + handlers (ported from BookEditorPage).
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

  // Restore persisted widths.
  useEffect(() => {
    if (!id) return;
    let next = null;
    try {
      const stored = window.localStorage.getItem(
        `uploadViewer:sceneCoachWidth:${id}`
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
        `uploadViewer:outlineWidth:${id}`
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
          window.localStorage.removeItem(`uploadViewer:sceneCoachWidth:${id}`);
        } else {
          window.localStorage.setItem(
            `uploadViewer:sceneCoachWidth:${id}`,
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
          window.localStorage.removeItem(`uploadViewer:outlineWidth:${id}`);
        } else {
          window.localStorage.setItem(
            `uploadViewer:outlineWidth:${id}`,
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

    const readingThreshold =
      layout.contentWidth * READING_MODE_THRESHOLD_RATIO;
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
        if (
          !didDrag &&
          Math.abs(ev.clientX - startX) > CLICK_DRAG_THRESHOLD_PX
        ) {
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
        sceneCoachWidthRef.current ?? Math.round(layout.contentWidth * 0.3);
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
        if (
          !didDrag &&
          Math.abs(ev.clientX - startX) > CLICK_DRAG_THRESHOLD_PX
        ) {
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
      const current = outlineWidthRef.current ?? OUTLINE_DEFAULT_PX;
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

  const closeAllDrawers = useCallback(() => {
    setOutlineDrawerOpen(false);
    setScenePanelDrawerOpen(false);
  }, []);

  // Drawer body-scroll lock + Esc handler (tablet/mobile only).
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

  // Auto-close drawers when viewport grows back to desktop.
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

  const isInReadingMode = useMemo(() => {
    if (sceneCoachWidth == null) return false;
    const layout = getWorkspaceLayout(workspaceRef.current, {
      hasRightPanel: hasRightPanelRef.current,
    });
    if (!layout) return false;
    return (
      sceneCoachWidth >= layout.contentWidth * READING_MODE_THRESHOLD_RATIO
    );
  }, [sceneCoachWidth]);

  const showManuscriptHeaderInEditor = !isMobileLayout;
  const showMobileDictationStack = isMobileLayout;
  const showEditorVoiceChrome = !isMobileLayout;
  const showMobileVoiceControl = isMobileLayout;
  const wordCountBarVariant =
    focusMode || isMobileLayout ? "compact" : "default";
  const showDownloadButton = !blocked;
  const showCoverButton = !blocked && letterReady && totalWordCount > 0;
  const downloadManuscriptDisabled = totalWordCount === 0;

  if (bookLoadError) {
    return (
      <div className="d-flex w-100 book-editor-root storygroove-theme">
        <div className="upload-viewer-boot" role="alert">
          <p className="building-spine-title">We couldn&apos;t open this manuscript</p>
          <p className="building-text">
            Something went wrong while loading your manuscript. Please try again.
          </p>
          <button
            type="button"
            className="sg-btn-fill mt-2"
            style={{ height: 42, fontSize: 14 }}
            onClick={handleRetryBook}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (isBookLoading) {
    return (
      <div className="d-flex w-100 book-editor-root storygroove-theme">
        <div className="upload-viewer-boot" aria-live="polite" aria-busy="true">
          <div className="building-spinner" aria-hidden="true" />
          <p className="building-spine-title">Opening your manuscript…</p>
          <p className="building-text">
            Ellis is laying out your chapters and Manuscript Map. This only
            takes a moment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={`d-flex w-100 book-editor-root book-editor-root--has-outline-resize${
        focusMode ? " book-editor-root--focus" : ""
      }${isMobileLayout ? " book-editor-root--mobile-layout" : ""}`}
    >
      <aside
        ref={outlineAsideRef}
        id="book-editor-outline-drawer"
        className={`book-editor-drawer book-editor-drawer--left${
          outlineDrawerOpen ? " is-open" : ""
        }${outlineWidth != null ? " is-resized" : ""}${
          isResizingOutline ? " is-resizing-outline" : ""
        }`}
        style={
          outlineWidth != null ? { flex: `0 0 ${outlineWidth}px` } : undefined
        }
        aria-label="Manuscript Map panel"
      >
        <OutlineSidebar
          bookData={bookData}
          selectedScene={selectedScene}
          onSceneSelect={handleOutlineSceneSelect}
          hasActGrouping={hasActGrouping}
          setBookData={setBookData}
          content={debouncedLiveHtml}
          contentSceneId={contentSceneId}
          storyResponseMap={storyResponseMap}
          expandedAct={expandedAct}
          setExpandedAct={setExpandedAct}
          formatSceneTitle={formatSceneTitle}
          onRenameScene={handleRenameScene}
          onDeleteScene={handleDeleteChapter}
          onArchiveScene={handleArchiveChapter}
          onUnarchiveScene={handleUnarchiveChapter}
          reviewProgress={reviewProgress}
          onChaptersMutated={fetchReviewProgress}
          bookName={bookData?.name}
          letterStatus={letterStatus}
          letter={letter}
          letterError={letterError}
          onRetryLetter={handleRetryLetter}
          blocked={blocked}
        />
      </aside>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Drag to resize Manuscript Map panel. Double-click to reset."
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
        className={`book-editor-resize-handle book-editor-resize-handle--outline${
          isResizingOutline ? " is-active" : ""
        }`}
        onPointerDown={handleOutlineResizeStart}
        onKeyDown={handleOutlineResizeKey}
        onDoubleClick={handleOutlineResizeReset}
        title="Drag to resize Manuscript Map. Double-click to reset."
      >
        <span className="book-editor-resize-handle__grip" aria-hidden>
          <LuChevronsLeftRight
            size={12}
            className="book-editor-resize-handle__icon"
            aria-hidden
          />
          <span className="book-editor-resize-handle__label">Drag</span>
        </span>
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
                wordPercent={wordPercent}
                showDownloadButton={showDownloadButton}
                downloadManuscriptDisabled={downloadManuscriptDisabled}
                isDownloadingManuscript={isDownloadingManuscript}
                onDownloadManuscript={handleDownloadManuscript}
                showCoverButton={showCoverButton}
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
                  <span>Manuscript Map</span>
                </button>
                <SaveStatusBadge
                  {...getSaveState()}
                  className="book-editor-mobile-save-status"
                />
                <EditorHistoryControls
                  className="book-editor-history-controls--mobile"
                  canUndo={editorHistory.canUndo}
                  canRedo={editorHistory.canRedo}
                  onUndo={handleEditorUndo}
                  onRedo={handleEditorRedo}
                />
                <div className="book-editor-mobile-toolbar-trailing">
                  <button
                    type="button"
                    className="book-editor-drawer-toggle"
                    aria-expanded={scenePanelDrawerOpen}
                    aria-controls="book-editor-scene-drawer"
                    onClick={() => setScenePanelDrawerOpen((v) => !v)}
                  >
                    <span>Ellis&apos; Edits</span>
                    <TbLayoutSidebarRightExpand size={16} aria-hidden />
                  </button>
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
                      <span>
                        {focusMode ? "Exit Focus Mode" : "Focus Mode"}
                      </span>
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
                id="upload-viewer-manuscript-header"
                className="panel-header--mobile-dictation"
                title="My Manuscript"
                subtitle={MANUSCRIPT_PANEL_SUBTITLE}
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
          className="book-editor-workspace-row d-flex flex-row w-100 gap-4 book-editor-workspace-row--has-resize-handle"
        >
          <div
            ref={editorColumnRef}
            className={`d-flex flex-column box-shadow position-relative book-editor-editor-column${
              focusMode ? " book-editor-editor-column--full" : ""
            }${
              sceneCoachWidth != null && !focusMode
                ? " book-editor-editor-column--resized"
                : ""
            }${isCoachWidthAnimating ? " is-coach-width-animating" : ""}${
              isResizingCoach ? " is-resizing-coach" : ""
            }`}
          >
            <div className="editor-surface">
              {showManuscriptHeaderInEditor && (
                <InlineEditorPanelHeader
                  title="My Manuscript"
                  subtitle={MANUSCRIPT_PANEL_SUBTITLE}
                />
              )}

              {showEditorVoiceChrome && (
                <div
                  className="book-editor-editor-chrome"
                  aria-label="Editor tools"
                >
                  <div className="book-editor-voice-typing">
                    <span className="book-editor-voice-label">Voice typing</span>
                    <VoiceRecorder
                      onDictationStart={handleEditorDictationStart}
                      onDictationProgress={handleEditorDictationProgress}
                      onTranscript={handleEditorVoiceTranscript}
                    />
                    <span
                      className="book-editor-voice-hint"
                      title={voiceTypingHint}
                    >
                      {voiceTypingHint}
                    </span>
                  </div>
                  <div className="book-editor-editor-chrome__actions">
                    <EditorHistoryControls
                      canUndo={editorHistory.canUndo}
                      canRedo={editorHistory.canRedo}
                      onUndo={handleEditorUndo}
                      onRedo={handleEditorRedo}
                    />
                    <SaveStatusBadge
                      {...getSaveState()}
                      className="book-editor-save-status"
                    />
                  </div>
                </div>
              )}

              <div className="editor-fade is-ready">
                <ManuscriptDraftEditor
                  key={selectedScene.id || "no-scene"}
                  ref={manuscriptDraftRef}
                  novelId={id}
                  sceneId={selectedScene.id}
                  initialHtml={
                    manuscriptEditorBootstrap?.initialHtml ?? ""
                  }
                  savedHtml={lastSavedContent}
                  height="100%"
                  placeholder="Start revising your chapter here."
                  isAutosavePaused={editorHydrating}
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
            </div>
            <EllisFloatingButton
              containerRef={editorColumnRef}
              visible
              disabled={false}
              onOpenChat={handleOpenEllisChat}
              snapToDefaultWhen={focusMode}
            />
          </div>
          {!focusMode && (
            <>
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Drag to resize Ellis' Edits panel. Click to toggle reading width. Double-click to reset."
            aria-valuemin={320}
            aria-valuemax={
              workspaceRef.current
                ? Math.round(
                    workspaceRef.current.getBoundingClientRect().width * 0.8
                  )
                : undefined
            }
            aria-valuenow={
              sceneCoachWidth != null ? Math.round(sceneCoachWidth) : undefined
            }
            tabIndex={0}
            className={`book-editor-resize-handle${
              isResizingCoach ? " is-active" : ""
            }`}
            onPointerDown={handleCoachResizeStart}
            onKeyDown={handleCoachResizeKey}
            onDoubleClick={handleCoachResizeReset}
            title="Drag to resize Ellis' Edits. Click for reading width. Double-click to reset."
          >
            <span className="book-editor-resize-handle__grip" aria-hidden>
              <LuChevronsLeftRight
                size={12}
                className="book-editor-resize-handle__icon"
                aria-hidden
              />
              <span className="book-editor-resize-handle__label">Drag</span>
            </span>
          </div>
          <aside
            ref={sceneCoachAsideRef}
            id="book-editor-scene-drawer"
            className={`book-editor-drawer book-editor-drawer--right${
              scenePanelDrawerOpen ? " is-open" : ""
            }${sceneCoachWidth != null ? " is-resized" : ""}${
              isCoachWidthAnimating ? " is-coach-width-animating" : ""
            }${isResizingCoach ? " is-resizing-coach" : ""}`}
            style={
              sceneCoachWidth != null
                ? { flex: `0 0 ${sceneCoachWidth}px` }
                : undefined
            }
            aria-label="Ellis' Edits panel"
          >
            <button
              type="button"
              className="book-editor-panel-resize-toggle"
              onClick={toggleReadingMode}
              aria-pressed={isInReadingMode}
              aria-label={
                isInReadingMode
                  ? "Collapse Ellis' Edits to default width"
                  : "Expand Ellis' Edits for easier reading"
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
            <div className="d-flex flex-column box-shadow book-editor-container p-4 book-editor-sidebar-column">
              {!bookData?.uploaded && (
                <Button
                  onClick={handleSaveContinue}
                  className="align-self-end border m-2 position-absolute top-0 end-0"
                >
                  Save & Continue &nbsp;<span>➔</span>
                </Button>
              )}
              <SidebarTabs
                NotesEditor={NotesEditor}
                bookId={id}
                bookName={bookData?.name}
                selectedScene={selectedScene}
                selectedChapter={selectedChapter}
                chapters={chapters}
                letterReady={letterReady}
                ellisAccessible={ellisAccessible}
                subscriptionPaused={subscriptionPaused}
                reviewProgress={reviewProgress}
                reviewRefreshToken={reviewRefreshToken}
                activeTab={ellisSidebarTab}
                onTabChange={setEllisSidebarTab}
              />
            </div>
          </aside>
          {scenePanelDrawerOpen && (
            <div
              className="book-editor-drawer-overlay"
              onClick={closeAllDrawers}
              aria-hidden="true"
            />
          )}
            </>
          )}
          <FinalizeDraftConfirmationModal
            show={showFinalizeModal}
            handleClose={handleFinalizeClose}
            handleConfirm={handleFinalizeConfirm}
          />
        </div>
      </div>
      {letterModalOpen && (
        <EditorialLetterModal
          open={letterModalOpen}
          novelId={id}
          initialDraft={letterDraft || letter || ""}
          blocked={blocked}
          onSaved={handleLetterSaved}
          onClose={handleLetterModalClose}
        />
      )}
      {showEllisChat && (
        <EllisChatModal
          messages={chatMessages}
          onSend={handleSendEllisMessage}
          onClose={handleEllisClose}
          onWordLimitBlocked={handleEllisWordLimit}
          targetChapter={ellisChatTargetChapter}
          letterReady={letterReady}
          insertableReviewMessageIds={insertableReviewMessageIds}
          isHistoryLoading={isEllisHistoryLoading}
          hasMoreOnServer={hasMoreEllisHistory}
          onLoadEarlierMessages={loadEarlierEllisHistory}
          isLoadingEarlier={isLoadingEarlierEllis}
          isProcessing={chatIsProcessing}
          isStreaming={chatIsStreaming}
          insertingMessageId={insertingReviewMessageId}
          onInsertReview={handleEllisReviewInserted}
          blocked={blocked}
        />
      )}
      <BookCoverModal
        show={showCoverModal}
        onClose={() => setShowCoverModal(false)}
        novelId={id}
        bookName={bookData?.name}
        onCoverGenerated={(coverRef) =>
          setBookData((prev) => ({ ...prev, coverImage: coverRef }))
        }
      />
    </div>
  );
};

export default UploadBookViewerPage;
