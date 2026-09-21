import {
  useRef,
  useEffect,
  useState,
  useCallback,
  memo,
  useMemo,
} from "react";
import { toast } from "react-toastify";
import { MdSend, MdTravelExplore } from "react-icons/md";
import VoiceRecorder from "../Chat/VoiceRecorder";
import FileUploadButton from "../Chat/FileUploadButton";
import FilePreview from "../Chat/FilePreview";
import { uploadChatFile } from "../../api/assistant";
import { CHAT_MAX_ATTACHMENTS } from "../../constants/chatConstants";
import {
  OLIVIA_TEMP_DISABLE_WORD_LIMIT,
  OLIVIA_TEMP_ENABLE_FILE_ATTACH,
  SHOW_WEB_SEARCH_TOGGLE,
} from "../../constants/featureFlags";
import { isOliviaStudioOverWordLimit } from "../../constants/oliviaStudioInput";
import {
  readPersistedDraft,
  writePersistedDraft,
  useDebouncedDraftPersist,
} from "./oliviaDraftStorage";
import { useDictationDraft } from "../../hooks/useDictationDraft";

const OCM_TEXTAREA_MAX_HEIGHT_PX = 180;

const resizeTextarea = (el) => {
  if (!el) return;
  el.style.height = "auto";
  const scrollHeight = el.scrollHeight;
  const capped = Math.min(scrollHeight, OCM_TEXTAREA_MAX_HEIGHT_PX);
  el.style.height = `${capped}px`;
  el.style.overflowY =
    scrollHeight > OCM_TEXTAREA_MAX_HEIGHT_PX ? "auto" : "hidden";
};

const OliviaChatComposer = ({
  novelId = null,
  onSend,
  onWordLimitBlocked,
  inputLocked = false,
  webSearchEnabled = false,
  onWebSearchToggle,
}) => {
  const [draft, setDraft] = useState(() => readPersistedDraft(novelId));
  const draftRef = useRef(draft);
  const lastNovelIdRef = useRef(novelId);
  const textareaRef = useRef(null);
  const resizeRafRef = useRef(null);
  const wasLockedRef = useRef(false);
  const uploadIntervalsRef = useRef(new Set());
  const [pendingFiles, setPendingFiles] = useState([]);

  useDebouncedDraftPersist(novelId, draft);

  draftRef.current = draft;

  const isOverWordLimit = useMemo(
    () =>
      OLIVIA_TEMP_DISABLE_WORD_LIMIT
        ? false
        : isOliviaStudioOverWordLimit(draft),
    [draft]
  );

  const triggerWordLimitBlock = useCallback(() => {
    onWordLimitBlocked?.();
  }, [onWordLimitBlocked]);

  const getDraft = useCallback(() => draftRef.current, []);
  const {
    onDictationStart,
    onDictationProgress,
    onTranscript: onDictationTranscript,
  } = useDictationDraft({ getDraft, setDraft });

  useEffect(() => {
    if (lastNovelIdRef.current === novelId) return;
    lastNovelIdRef.current = novelId;
    setDraft(readPersistedDraft(novelId));
  }, [novelId]);

  useEffect(() => {
    resizeTextarea(textareaRef.current);
  }, [draft]);

  useEffect(() => {
    if (wasLockedRef.current && !inputLocked) {
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    }
    wasLockedRef.current = inputLocked;
  }, [inputLocked]);

  useEffect(
    () => () => {
      if (resizeRafRef.current) {
        cancelAnimationFrame(resizeRafRef.current);
      }
      uploadIntervalsRef.current.forEach(clearInterval);
      uploadIntervalsRef.current.clear();
    },
    []
  );

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

  const handleRemoveFile = useCallback((fileId) => {
    setPendingFiles((prev) => prev.filter((pf) => pf.id !== fileId));
  }, []);

  const scheduleTextareaResize = useCallback(() => {
    if (resizeRafRef.current) {
      cancelAnimationFrame(resizeRafRef.current);
    }
    resizeRafRef.current = requestAnimationFrame(() => {
      resizeRafRef.current = null;
      resizeTextarea(textareaRef.current);
    });
  }, []);

  const handleDraftChange = useCallback(
    (e) => {
      setDraft(e.target.value);
      scheduleTextareaResize();
    },
    [scheduleTextareaResize]
  );

  const handlePaste = useCallback(
    (e) => {
      if (OLIVIA_TEMP_DISABLE_WORD_LIMIT) return;

      const pasted = e.clipboardData?.getData("text") ?? "";
      if (!pasted) return;

      const el = e.target;
      const start = el.selectionStart ?? draft.length;
      const end = el.selectionEnd ?? draft.length;
      const combined = `${draft.slice(0, start)}${pasted}${draft.slice(end)}`;

      if (isOliviaStudioOverWordLimit(combined)) {
        e.preventDefault();
        triggerWordLimitBlock();
      }
    },
    [draft, triggerWordLimitBlock]
  );

  const submitDraft = useCallback(() => {
    if (inputLocked) return;

    const trimmed = draft.trim();
    const readyAttachments = pendingFiles
      .filter((pf) => pf.fileUrl && !pf.isUploading)
      .map(({ fileUrl, fileKey, fileType, fileName }) => ({
        fileUrl,
        fileKey,
        fileType,
        fileName,
      }));
    const isAnyUploading = pendingFiles.some((pf) => pf.isUploading);

    if ((!trimmed && readyAttachments.length === 0) || isAnyUploading) return;

    if (
      !OLIVIA_TEMP_DISABLE_WORD_LIMIT &&
      trimmed &&
      isOliviaStudioOverWordLimit(trimmed)
    ) {
      triggerWordLimitBlock();
      return;
    }

    setDraft("");
    writePersistedDraft(novelId, "");
    setPendingFiles([]);
    onSend(trimmed, { attachments: readyAttachments });
  }, [
    draft,
    pendingFiles,
    onSend,
    novelId,
    inputLocked,
    triggerWordLimitBlock,
  ]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submitDraft();
      }
    },
    [submitDraft]
  );

  const hasReadyAttachments = pendingFiles.some(
    (pf) => pf.fileUrl && !pf.isUploading
  );
  const isAnyFileUploading = pendingFiles.some((pf) => pf.isUploading);
  const canSend =
    !inputLocked &&
    !isAnyFileUploading &&
    (draft.trim().length > 0 || hasReadyAttachments) &&
    !isOverWordLimit;
  const showInputControls =
    SHOW_WEB_SEARCH_TOGGLE || OLIVIA_TEMP_ENABLE_FILE_ATTACH;

  return (
    <div className="ocm-input-container">
      <div className="ocm-input-form">
        <div className="ocm-input-box">
          {OLIVIA_TEMP_ENABLE_FILE_ATTACH && pendingFiles.length > 0 && (
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

          <div className="ocm-input-row">
            {showInputControls && (
              <div className="ocm-input-controls">
                {OLIVIA_TEMP_ENABLE_FILE_ATTACH && (
                  <FileUploadButton
                    onFilesSelected={handleFilesSelected}
                    disabled={inputLocked}
                    currentCount={pendingFiles.length}
                  />
                )}
                {SHOW_WEB_SEARCH_TOGGLE && (
                  <button
                    type="button"
                    className={`ocm-web-search-btn${webSearchEnabled ? " active" : ""}`}
                    onClick={onWebSearchToggle}
                    disabled={inputLocked}
                    title={
                      webSearchEnabled ? "Web search enabled" : "Enable web search"
                    }
                    aria-label="Toggle web search"
                  >
                    <MdTravelExplore />
                  </button>
                )}
              </div>
            )}

            <textarea
              ref={textareaRef}
              rows={1}
              className="ocm-input"
              placeholder="Ask Olivia anything..."
              value={draft}
              onChange={handleDraftChange}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
              disabled={inputLocked}
              style={{ overflowY: "hidden" }}
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
                onClick={submitDraft}
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
  );
};

export default memo(OliviaChatComposer);
