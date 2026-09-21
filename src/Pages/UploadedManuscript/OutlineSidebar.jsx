import { PiBookOpen } from "react-icons/pi";
import { FaChevronDown, FaChevronUp, FaPlus } from "react-icons/fa";
import { TbPencil, TbTrash, TbCheck, TbX, TbArchive, TbArchiveOff } from "react-icons/tb";
import { MdDragIndicator } from "react-icons/md";
import { LuDownload, LuLoader2 } from "react-icons/lu";
import React from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  addNewScene,
  addUploadedChapter,
  getABook,
  reorderScene,
  reorderUploadedChapter,
  downloadManuscriptMap,
  downloadEditorialLetter,
} from "../../api/bookGeneration";
import AddSceneModal from "../BookEditor/AddSceneModal";
import { computeActOffsets, getGlobalSceneNumber, nextSceneIndexForAct } from "../BookEditor/utils";
import EditorialLetterPanel from "./EditorialLetterPanel";
import {
  countChapterWords,
  getUploadedChapterRows,
  isUploadedManuscriptBook,
  compareChapterRows,
  getChapterReviewStatus,
  isArchivedChapter,
} from "./utils";

const getChapterBaseTitle = (
  sceneData,
  { storyResponseMap, formatSceneTitle, uploadActOffsets },
  optimisticTitle
) => {
  if (optimisticTitle) return optimisticTitle;
  return (
    sceneData.chapterLabel ||
    sceneData.sceneTitle ||
    (storyResponseMap[sceneData.promptKey]
      ? formatSceneTitle(storyResponseMap[sceneData.promptKey])
      : `Scene ${
          sceneData.sceneIndex
            ? getGlobalSceneNumber(
                sceneData.actNumber || 1,
                sceneData.sceneIndex,
                uploadActOffsets
              )
            : "Untitled"
        }`)
  );
};

/**
 * Display label for an uploaded-manuscript chapter row.
 * Prefers the parsed chapter label + POV/timeline (e.g. "Chapter One — POV: Darien"),
 * falling back to the legacy scene title / numbering for non-uploaded data.
 */
const getChapterDisplayLabel = (
  sceneData,
  { storyResponseMap, formatSceneTitle, uploadActOffsets },
  optimisticTitle
) => {
  const base = getChapterBaseTitle(
    sceneData,
    { storyResponseMap, formatSceneTitle, uploadActOffsets },
    optimisticTitle
  );

  const suffixParts = [];
  if (sceneData.pov) suffixParts.push(`POV: ${sceneData.pov}`);
  if (sceneData.timeline) suffixParts.push(`Timeline: ${sceneData.timeline}`);

  return suffixParts.length ? `${base} — ${suffixParts.join(", ")}` : base;
};

const formatChapterWordCount = (count) =>
  `${Number(count).toLocaleString()} ${count === 1 ? "word" : "words"}`;

const SCENE_ACTION_CONFIRM = {
  delete: {
    label: "Delete chapter?",
    confirm: "Delete",
    busy: "Deleting…",
    confirmClass: "scene-delete-btn--confirm",
  },
  archive: {
    label: "Archive chapter?",
    confirm: "Archive",
    busy: "Archiving…",
    confirmClass: "scene-delete-btn--confirm-safe",
  },
  restore: {
    label: "Restore chapter?",
    confirm: "Restore",
    busy: "Restoring…",
    confirmClass: "scene-delete-btn--confirm-safe",
  },
};

const SceneActionConfirm = ({ type, busy, onConfirm, onCancel }) => {
  const copy = SCENE_ACTION_CONFIRM[type] || SCENE_ACTION_CONFIRM.delete;
  return (
    <div className={`scene-delete-confirm${busy ? " scene-delete-confirm--busy" : ""}`}>
      <span
        className={`scene-delete-confirm-label${
          type !== "delete" ? " scene-delete-confirm-label--safe" : ""
        }`}
      >
        {copy.label}
      </span>
      <div className="scene-delete-confirm-actions">
        <button
          type="button"
          className={`scene-delete-btn ${copy.confirmClass}`}
          disabled={busy}
          onClick={onConfirm}
        >
          {busy ? <span className="scene-delete-spinner" /> : <TbCheck size={13} />}
          {busy ? copy.busy : copy.confirm}
        </button>
        <button
          type="button"
          className="scene-delete-btn scene-delete-btn--cancel"
          disabled={busy}
          onClick={onCancel}
        >
          <TbX size={13} />
          Cancel
        </button>
      </div>
    </div>
  );
};

/** Pixels/frame to scroll the chapter list while dragging near an edge. */
const DRAG_SCROLL_EDGE = 56;
const DRAG_SCROLL_MAX = 18;

const outlineDragScrollDelta = (
  pointerY,
  listTop,
  listBottom,
  edge = DRAG_SCROLL_EDGE,
  maxSpeed = DRAG_SCROLL_MAX
) => {
  if (pointerY < listTop + edge) {
    const t = Math.min(1, (listTop + edge - pointerY) / edge);
    return -Math.max(1, Math.round(maxSpeed * t));
  }
  if (pointerY > listBottom - edge) {
    const t = Math.min(1, (pointerY - (listBottom - edge)) / edge);
    return Math.max(1, Math.round(maxSpeed * t));
  }
  return 0;
};

/**
 * Small status dot reflecting Ellis' per-chapter review progress
 * (ready / generating / failed). Nothing renders for un-reviewed chapters.
 */
const ReviewStatusDot = ({ status }) => {
  if (!status) return null;
  const map = {
    ready: { color: "#1b7a3d", title: "Reviewed by Ellis" },
    generating: { color: "#9a5b00", title: "Ellis is reviewing…" },
    pending: { color: "#9a5b00", title: "Review queued" },
    failed: { color: "#b3261e", title: "Review failed" },
  };
  const cfg = map[status];
  if (!cfg) return null;
  return (
    <span
      title={cfg.title}
      aria-label={cfg.title}
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: cfg.color,
        flex: "0 0 auto",
        ...(status === "generating"
          ? { animation: "ellisPulse 1.2s ease-in-out infinite" }
          : {}),
      }}
    />
  );
};

const OutlineSidebar = ({
  bookData,
  selectedScene,
  onSceneSelect,
  setBookData,
  /** Debounced live editor HTML for per-chapter word counts (avoids re-render on every keystroke). */
  content,
  contentSceneId = null,
  storyResponseMap,
  expandedAct,
  setExpandedAct,
  formatSceneTitle,
  onRenameScene,
  onDeleteScene,
  onArchiveScene,
  onUnarchiveScene,
  reviewProgress = {},
  onChaptersMutated,
  bookName,
  letterStatus = "pending",
  letter = null,
  letterError = null,
  onRetryLetter,
  blocked = false,
}) => {
  const { id } = useParams();
  const [showAddSceneModal, setShowAddSceneModal] = React.useState(false);
  const [newSceneTitle, setNewSceneTitle] = React.useState("");
  const [activeActNum, setActiveActNum] = React.useState(null);
  const [activeLeftTab, setActiveLeftTab] = React.useState("map");
  const [isDownloadingMap, setIsDownloadingMap] = React.useState(false);
  const [isDownloadingLetter, setIsDownloadingLetter] = React.useState(false);

  const handleDownloadMap = async () => {
    if (isDownloadingMap) return;
    setIsDownloadingMap(true);
    try {
      await downloadManuscriptMap(id, { suggestedTitle: bookName });
    } catch (error) {
      toast.error("Could not download the Manuscript Map.");
    } finally {
      setIsDownloadingMap(false);
    }
  };

  const letterDownloadReady = letterStatus === "ready" && Boolean(letter);

  const handleDownloadLetter = async () => {
    if (isDownloadingLetter || !letterDownloadReady) return;
    setIsDownloadingLetter(true);
    try {
      await downloadEditorialLetter(id, { suggestedTitle: bookName });
    } catch (error) {
      toast.error("Could not download the Editorial Letter.");
    } finally {
      setIsDownloadingLetter(false);
    }
  };
  const [draggedScene, setDraggedScene] = React.useState(null);
  const [dragOverScene, setDragOverScene] = React.useState(null);
  const [dragPreviewPosition, setDragPreviewPosition] = React.useState({
    x: 0,
    y: 0,
  });
  const [isReordering, setIsReordering] = React.useState(false);
  const [renamingScene, setRenamingScene] = React.useState(null);
  const [optimisticTitles, setOptimisticTitles] = React.useState({});
  const [pendingSceneAction, setPendingSceneAction] = React.useState(null);
  const [sceneActionInFlight, setSceneActionInFlight] = React.useState(false);
  const [archiveOpen, setArchiveOpen] = React.useState(false);
  const renameInputRef = React.useRef(null);
  const committingRenameRef = React.useRef(null);
  const outlineBoxRef = React.useRef(null);
  const outlineBodyRef = React.useRef(null);
  const dragPointerRef = React.useRef({ x: 0, y: 0 });
  const draggedSceneRef = React.useRef(null);
  const bookDataRef = React.useRef(bookData);
  const dragScrollRafRef = React.useRef(null);
  draggedSceneRef.current = draggedScene;
  bookDataRef.current = bookData;
  const uploadActOffsets = React.useMemo(
    () => computeActOffsets(bookData?.userContents || []),
    [bookData?.userContents]
  );

  const uploadedManuscript = isUploadedManuscriptBook(bookData);

  // Stored counts only — cheap to recompute when book data changes, not on keystrokes.
  const storedChapterWordCounts = React.useMemo(() => {
    if (!bookData?.userContents) return new Map();
    const rows = uploadedManuscript
      ? getUploadedChapterRows(bookData.userContents)
      : bookData.userContents;
    const map = new Map();
    rows.forEach((sceneData) => {
      map.set(
        sceneData._id,
        countChapterWords(sceneData, {
          isUploadedManuscript: uploadedManuscript,
          storyResponseFallback: storyResponseMap[sceneData.promptKey] || "",
        })
      );
    });
    return map;
  }, [bookData?.userContents, storyResponseMap, uploadedManuscript]);

  // Overlay live editor HTML only for the synced active chapter (debounced `content`).
  const chapterWordCounts = React.useMemo(() => {
    const map = new Map(storedChapterWordCounts);
    const activeId = selectedScene.id;
    if (!activeId || contentSceneId !== activeId || !bookData?.userContents) {
      return map;
    }

    const rows = uploadedManuscript
      ? getUploadedChapterRows(bookData.userContents)
      : bookData.userContents;
    const sceneData = rows.find((row) => row._id === activeId);
    if (!sceneData) return map;

    map.set(
      activeId,
      countChapterWords(sceneData, {
        isUploadedManuscript: uploadedManuscript,
        liveContent: content,
        contentSceneId,
        selectedSceneId: activeId,
        storyResponseFallback: storyResponseMap[sceneData.promptKey] || "",
      })
    );
    return map;
  }, [
    storedChapterWordCounts,
    bookData?.userContents,
    content,
    contentSceneId,
    selectedScene.id,
    storyResponseMap,
    uploadedManuscript,
  ]);

  React.useEffect(() => {
    if (renamingScene?.id && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renamingScene?.id]);

  const commitRename = async (sceneData) => {
    if (committingRenameRef.current === sceneData._id) return;
    const labelOpts = { storyResponseMap, formatSceneTitle, uploadActOffsets };
    const currentTitle = getChapterBaseTitle(sceneData, labelOpts);
    const newTitle = renamingScene?.value?.trim();
    if (!newTitle || newTitle === currentTitle) {
      setRenamingScene(null);
      return;
    }
    committingRenameRef.current = sceneData._id;
    setOptimisticTitles((prev) => ({ ...prev, [sceneData._id]: newTitle }));
    setRenamingScene(null);
    try {
      if (onRenameScene) {
        await onRenameScene(sceneData._id, newTitle);
      }
    } catch (err) {
      console.warn("commitRename failed:", err);
    } finally {
      setOptimisticTitles((prev) => {
        const next = { ...prev };
        delete next[sceneData._id];
        return next;
      });
      if (committingRenameRef.current === sceneData._id) {
        committingRenameRef.current = null;
      }
    }
  };

  const addScene = async () => {
    // Uploaded manuscripts: flat chapter list (no act accordion).
    if (uploadedManuscript) {
      const originalTitle = newSceneTitle.trim();
      try {
        const result = await addUploadedChapter({
          novelId: id,
          sceneTitle: originalTitle,
        });
        const response = await getABook(id);
        setBookData((prev) => ({
          ...prev,
          ...response.data,
          novelId: response.data._id,
        }));
        await onChaptersMutated?.();
        const createdId = result?.chapter?._id;
        const createdRow =
          (response?.data?.userContents || []).find(
            (row) => String(row._id) === String(createdId)
          ) || result?.chapter;
        if (createdRow) {
          onSceneSelect?.(createdRow);
        }
        if (result?.titleWasRenamed && result?.finalTitle) {
          const requestedLabel =
            originalTitle || `Chapter ${result.chapterNumber}`;
          toast.info(
            `A chapter titled "${requestedLabel}" already exists. Your chapter was saved as "${result.finalTitle}".`,
            { autoClose: 5000 }
          );
        }
        setNewSceneTitle("");
        setShowAddSceneModal(false);
      } catch (err) {
        toast.error(err?.response?.data?.error || "Failed to add chapter");
      }
      return;
    }

    if (!newSceneTitle.trim() || activeActNum == null) return;
    const nextIndex = nextSceneIndexForAct(bookData.userContents, activeActNum);
    let body = {
      novelId: id,
      actNumber: activeActNum,
      sceneIndex: nextIndex,
      sceneTitle: newSceneTitle,
    };
    await addNewScene(body);
    const response = await getABook(id);
    setBookData((prev) => ({
      ...prev,
      ...response.data,
      novelId: response.data._id,
    }));

    setNewSceneTitle("");
    setShowAddSceneModal(false);
  };

  const handleDragStart = (e, sceneData) => {
    e.preventDefault();
    dragPointerRef.current = { x: e.clientX, y: e.clientY };
    setDraggedScene(sceneData);
    setDragPreviewPosition({ x: e.clientX, y: e.clientY });
  };

  const handleDragOver = (sceneData) => {
    if (!draggedScene) return;
    if (isArchivedChapter(sceneData)) return;
    // Uploaded: any other chapter is a valid drop target.
    // Olivia act path: same-act only.
    if (
      uploadedManuscript ||
      draggedScene.actNumber === sceneData.actNumber
    ) {
      setDragOverScene(sceneData);
    }
  };

  const handleDrop = async (targetScene) => {
    if (
      !draggedScene ||
      draggedScene._id === targetScene._id ||
      isArchivedChapter(targetScene)
    ) {
      setDraggedScene(null);
      setDragOverScene(null);
      return;
    }

    if (uploadedManuscript) {
      setIsReordering(true);
      try {
        await reorderUploadedChapter({
          novelId: id,
          chapterId: draggedScene._id,
          beforeChapterId: targetScene._id,
        });
        const response = await getABook(id);
        setBookData((prev) => ({
          ...prev,
          ...response.data,
          novelId: response.data._id,
        }));
        await onChaptersMutated?.();
      } catch (err) {
        toast.error(err?.response?.data?.error || "Failed to reorder chapter");
      } finally {
        setDraggedScene(null);
        setDragOverScene(null);
        setIsReordering(false);
      }
      return;
    }

    if (draggedScene.actNumber !== targetScene.actNumber) {
      setDraggedScene(null);
      setDragOverScene(null);
      return;
    }

    setIsReordering(true);

    try {
      let body = {
        sceneId: draggedScene._id,
        newSceneIndex: targetScene.sceneIndex,
      };

      await reorderScene(body);
      const response = await getABook(id);
      setBookData((prev) => ({
        ...prev,
        ...response.data,
        novelId: response.data._id,
      }));
    } finally {
      setDraggedScene(null);
      setDragOverScene(null);
      setIsReordering(false);
    }
  };

  const commitPendingSceneAction = async (e, sceneId, type) => {
    e.stopPropagation();
    setSceneActionInFlight(true);
    try {
      if (type === "delete" && onDeleteScene) {
        await onDeleteScene(sceneId);
      } else if (type === "archive" && onArchiveScene) {
        await onArchiveScene(sceneId);
        setArchiveOpen(true);
      } else if (type === "restore" && onUnarchiveScene) {
        await onUnarchiveScene(sceneId);
      }
    } finally {
      setSceneActionInFlight(false);
      setPendingSceneAction(null);
    }
  };

  // Render acts and scenes by promptKey
  const renderActsAndScenes = () => {
    if (!bookData?.userContents) return null;

    const renderScene = (sceneData, hideDragHandle = false) => {
      const isSelected = selectedScene.id === sceneData._id;
      const hasContent =
        sceneData.userContent || storyResponseMap[sceneData.promptKey];
      const isDragging = draggedScene?._id === sceneData._id;
      const isDropTarget =
        dragOverScene?._id === sceneData._id &&
        draggedScene &&
        draggedScene._id !== sceneData._id &&
        (uploadedManuscript ||
          draggedScene.actNumber === sceneData.actNumber);
      const chapterWordCount = chapterWordCounts.get(sceneData._id) ?? 0;
      const isRenaming = renamingScene?.id === sceneData._id;
      const pendingType =
        pendingSceneAction?.id === sceneData._id
          ? pendingSceneAction.type
          : null;
      const isPendingAction = Boolean(pendingType);
      const labelOpts = { storyResponseMap, formatSceneTitle, uploadActOffsets };
      const optimisticTitle = optimisticTitles[sceneData._id];
      const displayLabel = getChapterDisplayLabel(
        sceneData,
        labelOpts,
        optimisticTitle
      );
      return (
        <div
          key={sceneData._id || sceneData.promptKey}
          data-outline-scene-id={sceneData._id}
          style={{
            cursor: hasContent ? "pointer" : "default",
            backgroundColor: isSelected ? "#03587a" : "transparent",
            opacity: isDragging ? 0.3 : 1,
            border: isDropTarget
              ? "2px dashed #03587a"
              : "2px solid transparent",
            position: "relative",
            transform: isDragging ? "scale(0.95)" : "scale(1)",
            transition: isDragging ? "none" : "all 0.2s ease",
            boxShadow: isDragging ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
            alignItems: "flex-start",
          }}
          className={`scene-item${isPendingAction ? " scene-item--deleting" : ""}`}
          onClick={(e) => {
            if (
              draggedScene ||
              isRenaming ||
              isPendingAction ||
              e.target.closest(".drag-handle") ||
              e.target.closest(".drag-handle-wrap") ||
              e.target.closest(".scene-rename-input") ||
              e.target.closest(".scene-action-btn")
            )
              return;
            onSceneSelect?.(sceneData);
          }}
          onMouseEnter={() => handleDragOver(sceneData)}
          onMouseUp={() => draggedScene && handleDrop(sceneData)}
        >
          {isPendingAction ? (
            <SceneActionConfirm
              type={pendingType}
              busy={sceneActionInFlight}
              onConfirm={(e) =>
                commitPendingSceneAction(e, sceneData._id, pendingType)
              }
              onCancel={(e) => {
                e.stopPropagation();
                setPendingSceneAction(null);
              }}
            />
          ) : (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              width: "100%",
              gap: 8,
            }}
          >
            <div className="outline-scene-item-body" style={{ flex: 1, minWidth: 0 }}>
              {isRenaming ? (
                <input
                  ref={renameInputRef}
                  className="scene-rename-input"
                  value={renamingScene.value}
                  onChange={(e) =>
                    setRenamingScene((prev) => ({ ...prev, value: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename(sceneData);
                    if (e.key === "Escape") setRenamingScene(null);
                  }}
                  onBlur={() => commitRename(sceneData)}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <span
                    className="scene-title-text"
                    title={displayLabel}
                    style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
                  >
                    {Number.isFinite(Number(sceneData.chapterNumber)) && (
                      <ReviewStatusDot
                        status={getChapterReviewStatus(
                          reviewProgress,
                          sceneData
                        )}
                      />
                    )}
                    {displayLabel}
                  </span>
                  <div
                    className={`outline-chapter-word-count${
                      isSelected ? " outline-chapter-word-count--selected" : ""
                    }`}
                  >
                    {formatChapterWordCount(chapterWordCount)}
                  </div>
                </>
              )}
            </div>
            {!isRenaming && (
              <div className="scene-actions">
                <button
                  type="button"
                  className="scene-action-btn"
                  title="Rename chapter"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRenamingScene({
                      id: sceneData._id,
                      value: getChapterBaseTitle(sceneData, labelOpts, optimisticTitle),
                    });
                  }}
                >
                  <TbPencil size={14} />
                </button>
                {onArchiveScene && (
                  <button
                    type="button"
                    className="scene-action-btn"
                    title="Archive chapter"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPendingSceneAction({
                        id: sceneData._id,
                        type: "archive",
                      });
                    }}
                  >
                    <TbArchive size={14} />
                  </button>
                )}
                {onDeleteScene && (
                  <button
                    type="button"
                    className="scene-action-btn scene-action-btn--delete"
                    title="Delete chapter"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPendingSceneAction({
                        id: sceneData._id,
                        type: "delete",
                      });
                    }}
                  >
                    <TbTrash size={14} />
                  </button>
                )}
                {!hideDragHandle && (
                  <span
                    className="drag-handle-wrap drag-handle drag-handle-wrap--affordance"
                    data-tooltip="Drag to reorder"
                    style={{
                      cursor: draggedScene ? "grabbing" : "grab",
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleDragStart(e, sceneData);
                    }}
                  >
                    <MdDragIndicator
                      size={18}
                      aria-label="Drag to reorder chapter"
                      style={{ color: "inherit", pointerEvents: "none" }}
                    />
                  </span>
                )}
              </div>
            )}
          </div>
          )}
        </div>
      );
    };

    // Parsed uploads navigate by chapter only — actNumber from enrichment is
    // Manuscript Map metadata and must not split the sidebar into act groups.
    if (uploadedManuscript) {
      const chapterRows = getUploadedChapterRows(bookData.userContents);
      const archivedChapters = (bookData.userContents || [])
        .filter(
          (uc) => isArchivedChapter(uc) && uc.chapterNumber != null
        )
        .sort(
          (a, b) =>
            Number(a.archivedFromSceneIndex ?? 0) -
              Number(b.archivedFromSceneIndex ?? 0) ||
            compareChapterRows(a, b)
        );
      if (!chapterRows.length && !archivedChapters.length) return null;
      return (
        <div>
          <div className="outline-chapter-toolbar">
            <span className="outline-chapter-toolbar__hint">
              Drag to reorder chapters
            </span>
            <button
              type="button"
              className="outline-add-chapter-btn"
              onClick={() => {
                setActiveActNum(1);
                setShowAddSceneModal(true);
              }}
              title="Add a blank chapter"
            >
              <FaPlus size={11} aria-hidden />
              Add chapter
            </button>
          </div>
          {chapterRows.length > 0 && (
            <div className="scene-item-list">
              {chapterRows.map((sceneData) => renderScene(sceneData, false))}
            </div>
          )}
          {archivedChapters.length > 0 && (
            <div className="mb-2 outline-archived">
              <div
                onClick={() => setArchiveOpen((open) => !open)}
                className="actAccordion outline-archived__header"
              >
                <span className="outline-archived__title">
                  <TbArchive size={20} aria-hidden />
                  Archived
                  <span className="outline-archived__count">
                    {archivedChapters.length}
                  </span>
                </span>
                <span className="outline-archived__chevron">
                  {archiveOpen ? (
                    <FaChevronUp size={16} />
                  ) : (
                    <FaChevronDown size={16} />
                  )}
                </span>
              </div>
              {archiveOpen && (
                <div className="scene-item-list">
                  {archivedChapters.map((sceneData) => {
                    const isSelected = selectedScene.id === sceneData._id;
                    const pendingType =
                      pendingSceneAction?.id === sceneData._id
                        ? pendingSceneAction.type
                        : null;
                    const isPendingAction = Boolean(pendingType);
                    const labelOpts = {
                      storyResponseMap,
                      formatSceneTitle,
                      uploadActOffsets,
                    };
                    const displayLabel = getChapterDisplayLabel(
                      sceneData,
                      labelOpts
                    );
                    const chapterWordCount = countChapterWords(sceneData, {
                      isUploadedManuscript: true,
                      storyResponseFallback:
                        storyResponseMap[sceneData.promptKey] || "",
                    });
                    return (
                      <div
                        key={sceneData._id}
                        data-outline-scene-id={sceneData._id}
                        data-archived="true"
                        className={`scene-item outline-archived__item${
                          isSelected ? " outline-archived__item--selected" : ""
                        }${isPendingAction ? " scene-item--deleting" : ""}`}
                        style={{
                          cursor: "pointer",
                          backgroundColor: isSelected
                            ? "#03587a"
                            : "transparent",
                        }}
                        onClick={(e) => {
                          if (
                            isPendingAction ||
                            e.target.closest(".scene-action-btn")
                          ) {
                            return;
                          }
                          onSceneSelect?.(sceneData);
                        }}
                      >
                        {isPendingAction ? (
                          <SceneActionConfirm
                            type={pendingType}
                            busy={sceneActionInFlight}
                            onConfirm={(e) =>
                              commitPendingSceneAction(
                                e,
                                sceneData._id,
                                pendingType
                              )
                            }
                            onCancel={(e) => {
                              e.stopPropagation();
                              setPendingSceneAction(null);
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              width: "100%",
                              gap: 8,
                            }}
                          >
                            <div
                              className="outline-scene-item-body"
                              style={{ flex: 1, minWidth: 0 }}
                            >
                              <span
                                className="scene-title-text"
                                title={displayLabel}
                              >
                                {displayLabel}
                              </span>
                              <div
                                className={`outline-chapter-word-count${
                                  isSelected
                                    ? " outline-chapter-word-count--selected"
                                    : ""
                                }`}
                              >
                                {formatChapterWordCount(chapterWordCount)}
                              </div>
                            </div>
                            <div className="scene-actions">
                              {onUnarchiveScene && (
                                <button
                                  type="button"
                                  className="scene-action-btn"
                                  title="Restore to manuscript map"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPendingSceneAction({
                                      id: sceneData._id,
                                      type: "restore",
                                    });
                                  }}
                                >
                                  <TbArchiveOff size={14} />
                                </button>
                              )}
                              {onDeleteScene && (
                                <button
                                  type="button"
                                  className="scene-action-btn scene-action-btn--delete"
                                  title="Delete chapter"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPendingSceneAction({
                                      id: sceneData._id,
                                      type: "delete",
                                    });
                                  }}
                                >
                                  <TbTrash size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    // Separate content with and without act numbers
    const contentWithActs = [];
    const contentWithoutActs = [];

    bookData.userContents.forEach((content, index) => {
      if (content.actNumber) {
        contentWithActs.push({ ...content, originalIndex: index });
      } else {
        contentWithoutActs.push({ ...content, originalIndex: index });
      }
    });

    // Group content with acts
    const actGroups = contentWithActs.reduce((acc, content) => {
      const actNum = content.actNumber;
      if (!acc[actNum]) acc[actNum] = [];
      acc[actNum].push(content);
      return acc;
    }, {});

    // Sort helper: chapterNumber + suffix for uploaded manuscripts, else sceneIndex.
    const sortScenes = (a, b) => {
      const aCh = a.chapterNumber != null ? Number(a.chapterNumber) : null;
      const bCh = b.chapterNumber != null ? Number(b.chapterNumber) : null;
      if (aCh != null && bCh != null) return compareChapterRows(a, b);
      return (a.sceneIndex || 0) - (b.sceneIndex || 0);
    };

    return (
      <>
        {/* Render scenes without acts first */}
        {contentWithoutActs.length > 0 && (
          <div className="mb-2">
            <div className="scene-item-list">
              {contentWithoutActs.sort(sortScenes).map(renderScene)}
            </div>
          </div>
        )}

        {/* Render acts with scenes */}
        {Object.keys(actGroups)
          .sort((a, b) => Number(a) - Number(b))
          .map((actNum) => {
            const actScenes = actGroups[actNum].sort(sortScenes);
            return (
              <div key={actNum} className="mb-2">
                <div
                  onClick={() =>
                    setExpandedAct(
                      expandedAct === Number(actNum) ? null : Number(actNum)
                    )
                  }
                  className="actAccordion"
                >
                  <span style={{ fontWeight: "500" }} className="gap-2 d-flex">
                    <PiBookOpen size={20} style={{ minWidth: "20px" }} />
                    ACT {actNum}
                    {bookData.acts[Number(actNum) - 1]?.title
                      ? `: ${bookData.acts[Number(actNum) - 1]?.title}`
                      : ""}
                  </span>
                  <div className="d-flex gap-2">
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveActNum(Number(actNum));
                        setShowAddSceneModal(true);
                      }}
                      style={{ fontSize: "20px", cursor: "pointer" }}
                    >
                      <FaPlus size={12} />
                    </span>
                    <span style={{ fontSize: "20px" }}>
                      {expandedAct === Number(actNum) ? (
                        <FaChevronUp size={16} />
                      ) : (
                        <FaChevronDown size={16} />
                      )}
                    </span>
                  </div>
                </div>
                {expandedAct === Number(actNum) && (
                  <div className="scene-item-list">
                    {actScenes.map(renderScene)}
                  </div>
                )}
              </div>
            );
          })}
      </>
    );
  };

  // While dragging, auto-scroll the chapter list when the pointer sits near
  // the top/bottom edge so a mouse without a wheel can still reach off-screen rows.
  React.useEffect(() => {
    if (!draggedScene) return;

    const handleGlobalMouseUp = () => {
      setDraggedScene(null);
      setDragOverScene(null);
    };

    const handleMouseMove = (e) => {
      dragPointerRef.current = { x: e.clientX, y: e.clientY };
      setDragPreviewPosition({ x: e.clientX, y: e.clientY });
    };

    const tickDragScroll = () => {
      const dragged = draggedSceneRef.current;
      const list = outlineBodyRef.current;
      const box = outlineBoxRef.current;
      if (dragged && list && box) {
        const { x, y } = dragPointerRef.current;
        const boxRect = box.getBoundingClientRect();
        const listRect = list.getBoundingClientRect();
        if (x >= boxRect.left && x <= boxRect.right) {
          const dy = outlineDragScrollDelta(y, listRect.top, listRect.bottom);
          if (dy) list.scrollTop += dy;
        }
        const hit = document.elementFromPoint(x, y);
        const item = hit?.closest?.("[data-outline-scene-id]");
        const targetId = item?.getAttribute("data-outline-scene-id");
        if (targetId && targetId !== String(dragged._id)) {
          const isArchivedHit = item?.getAttribute("data-archived") === "true";
          const target = (bookDataRef.current?.userContents || []).find(
            (row) => String(row._id) === targetId
          );
          const uploaded = isUploadedManuscriptBook(bookDataRef.current);
          if (
            !isArchivedHit &&
            target &&
            !isArchivedChapter(target) &&
            (uploaded || dragged.actNumber === target.actNumber)
          ) {
            setDragOverScene((prev) =>
              prev?._id === target._id ? prev : target
            );
          }
        }
      }
      dragScrollRafRef.current = requestAnimationFrame(tickDragScroll);
    };

    document.addEventListener("mouseup", handleGlobalMouseUp);
    document.addEventListener("mousemove", handleMouseMove);
    dragScrollRafRef.current = requestAnimationFrame(tickDragScroll);
    return () => {
      document.removeEventListener("mouseup", handleGlobalMouseUp);
      document.removeEventListener("mousemove", handleMouseMove);
      if (dragScrollRafRef.current) {
        cancelAnimationFrame(dragScrollRafRef.current);
        dragScrollRafRef.current = null;
      }
    };
  }, [draggedScene]);

  return (
    <div
      ref={outlineBoxRef}
      className="d-flex flex-column outline-box"
      style={{
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
        userSelect: draggedScene ? "none" : undefined,
      }}
    >
      <div className="panel-header panel-header--left outline-hub-header">
        <div className="outline-hub-header__text">
          <p className="panel-header-title">Manuscript Hub</p>
          <p className="panel-header-subtitle">
            Your chapters, Manuscript Map, and Ellis&apos; editorial letter
            live here.
          </p>
        </div>
      </div>
      <div className="outline-tab-toggle">
        <button
          type="button"
          className={activeLeftTab === "map" ? "active" : ""}
          onClick={() => setActiveLeftTab("map")}
        >
          Manuscript Map
        </button>
        <button
          type="button"
          className={activeLeftTab === "letter" ? "active" : ""}
          onClick={() => setActiveLeftTab("letter")}
        >
          Editorial Letter
        </button>
      </div>

      {activeLeftTab === "map" && (
        <div className="outline-download-wrap">
          <button
            type="button"
            className={[
              "outline-download-btn",
              isDownloadingMap && "outline-download-btn--busy",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={handleDownloadMap}
            disabled={isDownloadingMap}
            title="Download your Manuscript Map as a Word document (.docx)"
            aria-label={
              isDownloadingMap
                ? "Preparing Manuscript Map download"
                : "Download Manuscript Map"
            }
            aria-busy={isDownloadingMap}
          >
            {isDownloadingMap ? (
              <LuLoader2
                size={15}
                className="outline-download-btn__spinner"
                aria-hidden
              />
            ) : (
              <LuDownload size={15} aria-hidden />
            )}
            <span className="outline-download-btn__label">
              {isDownloadingMap ? "Preparing…" : "Download Manuscript Map"}
            </span>
          </button>
        </div>
      )}

      {activeLeftTab === "map" && (
        <div
          ref={outlineBodyRef}
          className="outline-outline-body flex-grow-1 d-flex flex-column"
        >
          {renderActsAndScenes()}
        </div>
      )}

      {activeLeftTab === "letter" && (
        <div className="outline-download-wrap">
          <button
            type="button"
            className={[
              "outline-download-btn",
              isDownloadingLetter && "outline-download-btn--busy",
              !letterDownloadReady && "outline-download-btn--disabled",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={handleDownloadLetter}
            disabled={isDownloadingLetter || !letterDownloadReady}
            title={
              letterDownloadReady
                ? "Download your Editorial Letter as a Word document (.docx)"
                : "Save your editorial letter to enable download"
            }
            aria-label={
              isDownloadingLetter
                ? "Preparing Editorial Letter download"
                : letterDownloadReady
                  ? "Download Editorial Letter"
                  : "Download Editorial Letter — save your letter first"
            }
            aria-busy={isDownloadingLetter}
          >
            {isDownloadingLetter ? (
              <LuLoader2
                size={15}
                className="outline-download-btn__spinner"
                aria-hidden
              />
            ) : (
              <LuDownload size={15} aria-hidden />
            )}
            <span className="outline-download-btn__label">
              {isDownloadingLetter ? "Preparing…" : "Download Editorial Letter"}
            </span>
          </button>
        </div>
      )}

      {activeLeftTab === "letter" && (
        <div className="outline-characters-inner flex-grow-1 d-flex flex-column">
          <EditorialLetterPanel
            letterStatus={letterStatus}
            letter={letter}
            letterError={letterError}
            onRetry={onRetryLetter}
            blocked={blocked}
          />
        </div>
      )}

      {/* Drag Preview */}
      {draggedScene && (
        <div
          style={{
            position: "fixed",
            left: dragPreviewPosition.x + 10,
            top: dragPreviewPosition.y + 10,
            zIndex: 1000,
            pointerEvents: "none",
            transform: "rotate(5deg)",
            boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
            backgroundColor: "#03587a",
            borderRadius: "4px",
            padding: "8px 12px",
            color: "white",
            fontSize: "14px",
            maxWidth: "200px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {getChapterDisplayLabel(draggedScene, {
            storyResponseMap,
            formatSceneTitle,
            uploadActOffsets,
          })}
        </div>
      )}

      <AddSceneModal
        show={showAddSceneModal}
        onHide={() => {
          setShowAddSceneModal(false);
          setNewSceneTitle("");
        }}
        newSceneTitle={newSceneTitle}
        setNewSceneTitle={setNewSceneTitle}
        addScene={addScene}
        modalTitle="Add chapter"
        placeholder="Chapter title (optional)"
        allowEmptyTitle
        saveLabel="Add chapter"
      />
      {isReordering && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            backdropFilter: "blur(4px)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div className="spinner-border text-light" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(OutlineSidebar);
