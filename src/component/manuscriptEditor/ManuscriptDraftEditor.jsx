import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import RichTextEditor from "../richTextEditor/RichTextEditor";
import {
  useDebouncedSceneDraftPersist,
  writeSceneDraft,
} from "../../Pages/BookEditor/sceneDraftStorage";
import {
  DRAFT_AUTOSAVE_DEBOUNCE_MS,
  DRAFT_SAVE_RETRY_MS,
} from "../../constants/editorConstants";
import { areQuillHtmlEquivalent } from "../../utils/quillHtmlNormalize";

/** Delay before broadcasting live HTML to parent (word counts / outline). */
export const MANUSCRIPT_DRAFT_COUNT_DEBOUNCE_MS = 300;

/**
 * Manuscript drafting surface with local HTML state so keystrokes do not
 * re-render the parent page. Parent reads via ref; word-count and dirty
 * signals are debounced or edge-triggered only.
 */
const ManuscriptDraftEditor = forwardRef(function ManuscriptDraftEditor(
  {
    novelId,
    sceneId,
    initialHtml = "",
    savedHtml = "",
    readOnly = false,
    height = "100%",
    placeholder,
    onDictationManualEdit,
    onUserEdit,
    onEditorHydrated,
    onHistoryChange,
    autosaveDebounceMs = DRAFT_AUTOSAVE_DEBOUNCE_MS,
    wordCountDebounceMs = MANUSCRIPT_DRAFT_COUNT_DEBOUNCE_MS,
    isAutosavePaused = false,
    isBootLoading = false,
    isHydrating = false,
    onAutosave,
    onDebouncedHtmlChange,
    onDirtyChange,
    onSavingChange,
    basedOnServerUpdatedAt = null,
  },
  ref
) {
  const [html, setHtml] = useState(initialHtml);
  const htmlRef = useRef(html);
  const savedHtmlRef = useRef(savedHtml);
  const richEditorRef = useRef(null);
  const autosaveTimerRef = useRef(null);
  const novelIdRef = useRef(novelId);
  const sceneIdRef = useRef(sceneId);
  const basedOnServerUpdatedAtRef = useRef(basedOnServerUpdatedAt);
  const onAutosaveRef = useRef(onAutosave);
  const onSavingChangeRef = useRef(onSavingChange);
  const pausedRef = useRef(false);
  const flushingRef = useRef(false);
  const pendingFlushRef = useRef(false);
  const pendingRetryMsRef = useRef(0);

  htmlRef.current = html;
  savedHtmlRef.current = savedHtml;
  novelIdRef.current = novelId;
  sceneIdRef.current = sceneId;
  basedOnServerUpdatedAtRef.current = basedOnServerUpdatedAt;
  onAutosaveRef.current = onAutosave;
  onSavingChangeRef.current = onSavingChange;
  pausedRef.current = Boolean(readOnly || isAutosavePaused || isBootLoading);

  useEffect(() => {
    // Seed the editor once per scene. `initialHtml` is intentionally excluded
    // from the deps: after an autosave the parent patches bookData and
    // recomputes a re-transformed `initialHtml` (via preserveLeadingIndentation
    // / stripChapterHtmlForDisplay). Re-seeding from that value fought the saved
    // baseline and looped the dirty/save cycle, leaving the badge stuck on
    // "Unsaved". Each scene fully remounts (key={sceneId}) so seeding on scene
    // change is sufficient.
    setHtml(initialHtml);
    htmlRef.current = initialHtml;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneId]);

  const isDirty =
    !isBootLoading &&
    !isHydrating &&
    !areQuillHtmlEquivalent(html, savedHtml);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useDebouncedSceneDraftPersist(
    novelId,
    sceneId,
    html,
    basedOnServerUpdatedAt
  );

  useEffect(() => {
    if (!onDebouncedHtmlChange) return undefined;
    const timer = setTimeout(() => {
      onDebouncedHtmlChange(html, sceneId);
    }, wordCountDebounceMs);
    return () => clearTimeout(timer);
  }, [html, sceneId, wordCountDebounceMs, onDebouncedHtmlChange]);

  useEffect(() => {
    if (!onDebouncedHtmlChange || !sceneId) return;
    onDebouncedHtmlChange(html, sceneId);
    // Flush counts immediately when the active scene changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneId]);

  const flushAutosave = useCallback(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    if (
      pausedRef.current ||
      !onAutosaveRef.current ||
      !sceneIdRef.current
    ) {
      return;
    }
    if (areQuillHtmlEquivalent(htmlRef.current, savedHtmlRef.current)) {
      onSavingChangeRef.current?.(false);
      return;
    }
    if (flushingRef.current) {
      pendingFlushRef.current = true;
      return;
    }

    flushingRef.current = true;
    pendingFlushRef.current = false;
    const sent = htmlRef.current;
    const activeSceneId = sceneIdRef.current;
    onSavingChangeRef.current?.(true);
    Promise.resolve(onAutosaveRef.current(sent, activeSceneId))
      .then(() => {
        if (!areQuillHtmlEquivalent(htmlRef.current, sent)) {
          pendingFlushRef.current = true;
          pendingRetryMsRef.current = 0;
        }
      })
      .catch(() => {
        pendingFlushRef.current = true;
        pendingRetryMsRef.current = DRAFT_SAVE_RETRY_MS;
      })
      .finally(() => {
        flushingRef.current = false;
        if (!pendingFlushRef.current) {
          onSavingChangeRef.current?.(false);
          return;
        }
        pendingFlushRef.current = false;
        const delay = pendingRetryMsRef.current || 0;
        autosaveTimerRef.current = setTimeout(() => flushAutosave(), delay);
      });
  }, []);

  useEffect(() => {
    if (
      !sceneId ||
      readOnly ||
      isAutosavePaused ||
      isBootLoading ||
      !onAutosave
    ) {
      return undefined;
    }
    if (areQuillHtmlEquivalent(html, savedHtml)) return undefined;

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(
      () => flushAutosave(),
      autosaveDebounceMs
    );

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [
    html,
    savedHtml,
    sceneId,
    readOnly,
    isAutosavePaused,
    isBootLoading,
    autosaveDebounceMs,
    onAutosave,
    flushAutosave,
  ]);

  const flushLocalDraft = useCallback(() => {
    const n = novelIdRef.current;
    const s = sceneIdRef.current;
    const text = htmlRef.current ?? "";
    if (n && s) writeSceneDraft(n, s, text, basedOnServerUpdatedAtRef.current);
  }, []);

  const saveNow = useCallback(async () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    const text = htmlRef.current ?? "";
    const activeSceneId = sceneIdRef.current;
    if (!onAutosaveRef.current || !activeSceneId) return;
    onSavingChangeRef.current?.(true);
    try {
      await onAutosaveRef.current(text, activeSceneId);
    } finally {
      if (!flushingRef.current && !pendingFlushRef.current) {
        onSavingChangeRef.current?.(false);
      }
    }
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      getHtml: () => htmlRef.current ?? "",
      isDirty: () =>
        !areQuillHtmlEquivalent(
          htmlRef.current ?? "",
          savedHtmlRef.current ?? ""
        ),
      getSavedHtml: () => savedHtmlRef.current ?? "",
      flushLocalDraft,
      saveNow,
      getRichEditor: () => richEditorRef.current,
      insertTextAtCursor: (...args) =>
        richEditorRef.current?.insertTextAtCursor?.(...args),
      beginDictationAtCursor: (...args) =>
        richEditorRef.current?.beginDictationAtCursor?.(...args),
      updateDictationAtCursor: (...args) =>
        richEditorRef.current?.updateDictationAtCursor?.(...args),
      endDictationAtCursor: (...args) =>
        richEditorRef.current?.endDictationAtCursor?.(...args),
      undo: () => richEditorRef.current?.undo?.(),
      redo: () => richEditorRef.current?.redo?.(),
      setHtml: (nextHtml) => {
        const value = nextHtml ?? "";
        setHtml(value);
        htmlRef.current = value;
      },
    }),
    [flushLocalDraft, saveNow]
  );

  return (
    <RichTextEditor
      ref={richEditorRef}
      content={html}
      setContent={readOnly ? undefined : setHtml}
      readOnly={readOnly}
      height={height}
      placeholder={placeholder}
      onDictationManualEdit={onDictationManualEdit}
      onUserEdit={onUserEdit}
      onEditorHydrated={onEditorHydrated}
      onHistoryChange={onHistoryChange}
    />
  );
});

export default ManuscriptDraftEditor;
