import React, { useState, useEffect, useRef, useCallback } from "react";
import { getNotesInNovel, updateNotesInNovel } from "../../api/bookGeneration";

const sceneNotesStoryHintKey = (novelId) =>
  `bookEditor:sceneNotesStoryHint:${novelId}`;

const NotesEditor = ({
  bookId,
  scope = "story",
  userContentId,
  promptKey,
  sceneLabel,
}) => {
  const isSceneScoped = scope === "scene";
  const hasSceneSelected = Boolean(userContentId);

  const [noteContent, setNoteContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showStoryNoteHint, setShowStoryNoteHint] = useState(false);

  const textareaRef = useRef(null);
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef(null);
  const lastSavedContentRef = useRef("");
  const hasChangedSinceLastSaveRef = useRef(false);
  const saveContextRef = useRef({ bookId, scope, userContentId, promptKey });
  const prevContextRef = useRef({ bookId, scope, userContentId, promptKey });

  const buildSaveBody = useCallback((content, ctx) => {
    const body = { novelId: ctx.bookId, note: content };
    if (ctx.scope === "scene" && ctx.userContentId) {
      body.userContentId = ctx.userContentId;
      if (ctx.promptKey) {
        body.promptKey = ctx.promptKey;
      }
    }
    return body;
  }, []);

  const flushSave = useCallback(
    (ctx) => {
      if (!ctx?.bookId || !hasChangedSinceLastSaveRef.current) return;
      if (ctx.scope === "scene" && !ctx.userContentId) return;

      const content = textareaRef.current?.value ?? "";
      updateNotesInNovel(buildSaveBody(content, ctx));
      lastSavedContentRef.current = content;
      hasChangedSinceLastSaveRef.current = false;
    },
    [buildSaveBody]
  );

  const dismissStoryNoteHint = useCallback(() => {
    if (bookId) {
      try {
        window.localStorage.setItem(sceneNotesStoryHintKey(bookId), "1");
      } catch {
        // private mode / SSR
      }
    }
    setShowStoryNoteHint(false);
  }, [bookId]);

  const handleContentChange = (e) => {
    const newValue = e.target.value;
    setNoteContent(newValue);
    isTypingRef.current = true;
    hasChangedSinceLastSaveRef.current =
      newValue !== lastSavedContentRef.current;

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
    }, 1000);
  };

  const handleAutoSave = useCallback(() => {
    if (!hasChangedSinceLastSaveRef.current) return;
    const content = textareaRef.current?.value ?? "";
    updateNotesInNovel(buildSaveBody(content, saveContextRef.current));
    lastSavedContentRef.current = content;
    hasChangedSinceLastSaveRef.current = false;
  }, [buildSaveBody]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isTypingRef.current && hasChangedSinceLastSaveRef.current) {
        handleAutoSave();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [handleAutoSave]);

  useEffect(() => {
    const prev = prevContextRef.current;
    const contextChanged =
      prev.bookId !== bookId ||
      prev.scope !== scope ||
      prev.userContentId !== userContentId ||
      prev.promptKey !== promptKey;

    if (contextChanged) {
      clearTimeout(typingTimeoutRef.current);
      isTypingRef.current = false;
      flushSave(prev);
    }

    prevContextRef.current = { bookId, scope, userContentId, promptKey };
    saveContextRef.current = { bookId, scope, userContentId, promptKey };
  }, [bookId, scope, userContentId, promptKey, flushSave]);

  useEffect(() => {
    if (!bookId) return undefined;

    if (isSceneScoped && !hasSceneSelected) {
      setNoteContent("");
      setShowStoryNoteHint(false);
      lastSavedContentRef.current = "";
      hasChangedSinceLastSaveRef.current = false;
      setIsLoading(false);
      return undefined;
    }

    let cancelled = false;
    setIsLoading(true);
    setShowStoryNoteHint(false);

    const fetchNotes = async () => {
      try {
        if (isSceneScoped) {
          const [sceneResponse, storyResponse] = await Promise.all([
            getNotesInNovel(bookId, userContentId),
            getNotesInNovel(bookId),
          ]);
          if (cancelled) return;

          const sceneContent = sceneResponse.data.note?.note || "";
          setNoteContent(sceneContent);
          lastSavedContentRef.current = sceneContent;
          hasChangedSinceLastSaveRef.current = false;

          const storyContent = storyResponse.data.note?.note || "";
          let hintDismissed = false;
          try {
            hintDismissed =
              window.localStorage.getItem(sceneNotesStoryHintKey(bookId)) ===
                "1" ||
              window.localStorage.getItem(
                `bookEditor:sceneNotesBookHint:${bookId}`
              ) === "1";
          } catch {
            hintDismissed = false;
          }
          setShowStoryNoteHint(
            Boolean(storyContent.trim()) &&
              !sceneContent.trim() &&
              !hintDismissed
          );
        } else {
          const response = await getNotesInNovel(bookId);
          if (cancelled || response.status !== 200) return;

          const content = response.data.note?.note || "";
          setNoteContent(content);
          lastSavedContentRef.current = content;
          hasChangedSinceLastSaveRef.current = false;
        }
      } catch (error) {
        console.error("Error fetching notes:", error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchNotes();

    return () => {
      cancelled = true;
    };
  }, [bookId, userContentId, isSceneScoped, hasSceneSelected]);

  useEffect(() => {
    return () => {
      clearTimeout(typingTimeoutRef.current);
      isTypingRef.current = false;
      flushSave(saveContextRef.current);
    };
  }, [flushSave]);

  if (isSceneScoped && !hasSceneSelected) {
    return (
      <div className="sidebar-notes-empty d-flex flex-column justify-content-center align-items-center w-100 text-muted text-center px-3">
        <p className="mb-0">Select a scene in the outline to add notes.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center h-100">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="sidebar-notes-editor d-flex flex-column w-100 flex-grow-1 min-h-0">
      {sceneLabel && <p className="small text-muted mb-2">{sceneLabel}</p>}
      {showStoryNoteHint && (
        <div
          className="alert alert-info py-2 px-3 small mb-2 d-flex align-items-start gap-2"
          role="status"
        >
          <span className="flex-grow-1">
            Your earlier note is saved under Project Notes. Use Scene Notes for
            per-scene writing.
          </span>
          <button
            type="button"
            className="btn-close btn-close-sm"
            aria-label="Dismiss"
            onClick={dismissStoryNoteHint}
          />
        </div>
      )}
      <textarea
        ref={textareaRef}
        className="form-control flex-grow-1 min-h-0"
        value={noteContent}
        onChange={handleContentChange}
        placeholder="Start writing your notes..."
        style={{ resize: "none" }}
      />
    </div>
  );
};

export default NotesEditor;
