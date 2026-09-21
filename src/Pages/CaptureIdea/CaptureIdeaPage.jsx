import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import { toast } from "react-toastify";
import RichTextEditor from "../../component/richTextEditor/RichTextEditor";
import VoiceRecorder from "../../component/Chat/VoiceRecorder";
import { useEditorDictation } from "../../hooks/useEditorDictation";
import SaveStatusBadge from "../BookEditor/SaveStatusBadge";
import {
  DRAFT_AUTOSAVE_DEBOUNCE_MS,
  DRAFT_SAVE_RETRY_MS,
  DRAFT_SAVE_TIMEOUT_MS,
} from "../../constants/editorConstants";
import { isRetryableDraftSaveError } from "../BookEditor/queuedDraftSave";
import { createIdea, getIdea, updateIdea } from "../../api/ideas";
import { supportsUnspokenPunctuation } from "../../utils/dictationTranscript";
import "./CaptureIdeaPage.scss";

const DEFAULT_TITLE = "Untitled Idea";


const CaptureIdeaPage = () => {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const richEditorRef = useRef(null);
  const titleRef = useRef(DEFAULT_TITLE);
  const contentRef = useRef("");
  const savedTitleRef = useRef(DEFAULT_TITLE);
  const savedContentRef = useRef("");
  const ideaIdRef = useRef(routeId || null);
  const autosaveTimerRef = useRef(null);
  const creatingRef = useRef(false);
  const savingRef = useRef(false);
  const pendingPersistRef = useRef(false);
  const hydratedIdRef = useRef(null);

  const [ideaId, setIdeaId] = useState(routeId || null);
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState("saved"); // saving | saved | error

  const {
    handleEditorVoiceTranscript,
    handleEditorDictationStart,
    handleEditorDictationProgress,
    handleEditorDictationManualEdit,
  } = useEditorDictation({ richEditorRef });

  titleRef.current = title;
  contentRef.current = content;
  ideaIdRef.current = ideaId;

  const voiceTypingHint = supportsUnspokenPunctuation()
    ? "Speak naturally — pauses add punctuation. Or say comma, period, new line."
    : "Say comma, period, question mark, new line — or type punctuation.";

  const getSaveBadge = () => {
    if (saveState === "saving") return { state: "saving", label: "Saving…" };
    if (saveState === "error") return { state: "error", label: "Couldn't save" };
    return { state: "saved", label: "Saved" };
  };

  const persistIdea = useCallback(async () => {
    const id = ideaIdRef.current;
    if (!id) return;
    if (savingRef.current) {
      pendingPersistRef.current = true;
      return;
    }

    savingRef.current = true;
    setSaveState("saving");
    try {
      // ponytail: latest title/body wins; loop once more if the writer typed
      // during the request instead of dropping those keystrokes.
      while (true) {
        pendingPersistRef.current = false;
        const nextTitle = (titleRef.current || "").trim() || DEFAULT_TITLE;
        const nextContent = contentRef.current || "";
        if (
          nextTitle === savedTitleRef.current &&
          nextContent === savedContentRef.current
        ) {
          setSaveState("saved");
          break;
        }

        try {
          const res = await updateIdea(
            id,
            { title: nextTitle, content: nextContent },
            { timeout: DRAFT_SAVE_TIMEOUT_MS }
          );
          if (res.status !== 200 || !res.data?.idea) {
            setSaveState("error");
            break;
          }
          savedTitleRef.current = nextTitle;
          savedContentRef.current = nextContent;
          if (pendingPersistRef.current) continue;
          setSaveState("saved");
          break;
        } catch (err) {
          console.error("Failed to save idea:", err);
          if (isRetryableDraftSaveError(err)) {
            if (autosaveTimerRef.current) {
              clearTimeout(autosaveTimerRef.current);
            }
            autosaveTimerRef.current = setTimeout(() => {
              void persistIdea();
            }, DRAFT_SAVE_RETRY_MS);
            break;
          }
          setSaveState("error");
          break;
        }
      }
    } finally {
      savingRef.current = false;
      if (pendingPersistRef.current) {
        pendingPersistRef.current = false;
        void persistIdea();
      }
    }
  }, []);

  const scheduleAutosave = useCallback(() => {
    if (!ideaIdRef.current) return;
    setSaveState("saving");
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      void persistIdea();
    }, DRAFT_AUTOSAVE_DEBOUNCE_MS);
  }, [persistIdea]);

  // Create a new idea when landing without an id
  useEffect(() => {
    if (routeId) return undefined;
    if (creatingRef.current) return undefined;
    creatingRef.current = true;

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await createIdea({ title: DEFAULT_TITLE, content: "" });
        if (cancelled) return;
        const created = res.data?.idea;
        if (!created?._id) {
          toast.error("Could not create idea. Please try again.");
          navigate("/dashboard", { replace: true });
          return;
        }
        ideaIdRef.current = created._id;
        hydratedIdRef.current = created._id;
        setIdeaId(created._id);
        setTitle(created.title || DEFAULT_TITLE);
        setContent(created.content || "");
        savedTitleRef.current = created.title || DEFAULT_TITLE;
        savedContentRef.current = created.content || "";
        navigate(`/dashboard/capture-idea/${created._id}`, { replace: true });
      } catch (err) {
        console.error("Failed to create idea:", err);
        toast.error(
          err?.response?.data?.message || "Could not create idea. Please try again."
        );
        navigate("/dashboard", { replace: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [routeId, navigate]);

  // Load existing idea (skip when we just created it and already hydrated state)
  useEffect(() => {
    if (!routeId) return undefined;
    if (hydratedIdRef.current === routeId) {
      hydratedIdRef.current = null;
      return undefined;
    }
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const res = await getIdea(routeId);
        if (cancelled) return;
        const idea = res.data?.idea;
        if (!idea) {
          toast.error("Idea not found");
          navigate("/dashboard?view=projects&agent=ideas", { replace: true });
          return;
        }
        ideaIdRef.current = idea._id;
        setIdeaId(idea._id);
        setTitle(idea.title || DEFAULT_TITLE);
        setContent(idea.content || "");
        savedTitleRef.current = idea.title || DEFAULT_TITLE;
        savedContentRef.current = idea.content || "";
        setSaveState("saved");
      } catch (err) {
        console.error("Failed to load idea:", err);
        toast.error(err?.response?.data?.message || "Could not load idea");
        navigate("/dashboard?view=projects&agent=ideas", { replace: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [routeId, navigate]);

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, []);

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    scheduleAutosave();
  };

  const handleTitleBlur = () => {
    const trimmed = (titleRef.current || "").trim() || DEFAULT_TITLE;
    if (trimmed !== title) setTitle(trimmed);
    void persistIdea();
  };

  const handleContentChange = (html) => {
    setContent(html);
    scheduleAutosave();
  };

  const handleBack = () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    void persistIdea().finally(() => {
      navigate("/dashboard?view=projects&agent=ideas");
    });
  };

  const badge = getSaveBadge();

  return (
    <div className="capture-idea-page storygroove-theme">
      <header className="capture-idea-page__header">
        <button
          type="button"
          className="capture-idea-page__back"
          onClick={handleBack}
          aria-label="Back to My Ideas"
        >
          <FaArrowLeft />
          <span>My Ideas</span>
        </button>
        {loading ? (
          <div
            className="capture-idea-page__title-skeleton capture-idea-page__shimmer"
            aria-hidden="true"
          />
        ) : (
          <input
            type="text"
            className="capture-idea-page__title"
            value={title}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            placeholder="Name your idea"
            aria-label="Idea title"
          />
        )}
        {loading ? (
          <div
            className="capture-idea-page__save-skeleton capture-idea-page__shimmer"
            aria-hidden="true"
          />
        ) : (
          <SaveStatusBadge
            state={badge.state}
            label={badge.label}
            className="capture-idea-page__save-status"
          />
        )}
      </header>

      {loading ? (
        <div
          className="capture-idea-page__chrome capture-idea-page__chrome-skeleton"
          aria-hidden="true"
        >
          <div className="capture-idea-page__chrome-skeleton-label capture-idea-page__shimmer" />
          <div className="capture-idea-page__chrome-skeleton-mic capture-idea-page__shimmer" />
          <div className="capture-idea-page__chrome-skeleton-hint capture-idea-page__shimmer" />
        </div>
      ) : (
        <div className="capture-idea-page__chrome" aria-label="Editor tools">
          <div className="book-editor-voice-typing">
            <span className="book-editor-voice-label">Voice typing</span>
            <VoiceRecorder
              onDictationStart={handleEditorDictationStart}
              onDictationProgress={handleEditorDictationProgress}
              onTranscript={handleEditorVoiceTranscript}
              disabled={!ideaId}
            />
            <span className="book-editor-voice-hint" title={voiceTypingHint}>
              {voiceTypingHint}
            </span>
          </div>
        </div>
      )}

      <div className="capture-idea-page__editor">
        {loading ? (
          <div className="capture-idea-page__editor-skeleton" aria-label="Loading notepad">
            <div className="capture-idea-page__skeleton-line capture-idea-page__shimmer w-60" />
            <div className="capture-idea-page__skeleton-line capture-idea-page__shimmer w-90" />
            <div className="capture-idea-page__skeleton-line capture-idea-page__shimmer w-80" />
            <div className="capture-idea-page__skeleton-line capture-idea-page__shimmer w-95" />
            <div className="capture-idea-page__skeleton-line capture-idea-page__shimmer w-70" />
            <div className="capture-idea-page__skeleton-spacer" />
            <div className="capture-idea-page__skeleton-line capture-idea-page__shimmer w-85" />
            <div className="capture-idea-page__skeleton-line capture-idea-page__shimmer w-92" />
            <div className="capture-idea-page__skeleton-line capture-idea-page__shimmer w-75" />
            <div className="capture-idea-page__skeleton-line capture-idea-page__shimmer w-88" />
          </div>
        ) : (
          <RichTextEditor
              key={ideaId || "new"}
              ref={richEditorRef}
              content={content}
              setContent={handleContentChange}
              height="100%"
              placeholder="Your muse is talking. Better write it down. Start anywhere. Type or dictate before the thought disappears."
              onDictationManualEdit={handleEditorDictationManualEdit}
            />
        )}
      </div>
    </div>
  );
};

export default CaptureIdeaPage;
