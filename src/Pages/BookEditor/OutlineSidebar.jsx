import { PiBookOpen } from "react-icons/pi";
import { FaChevronDown, FaChevronUp, FaPlus } from "react-icons/fa";
import { TbPencil, TbTrash, TbCheck, TbX, TbMessageCircle, TbArchive, TbArchiveOff } from "react-icons/tb";
import { MdDragIndicator } from "react-icons/md";
import { LuDownload, LuLoader2 } from "react-icons/lu";
import React from "react";
import { Collapse } from "antd";
import { toast } from "react-toastify";
import AddSceneModal from "./AddSceneModal"; // Adjust path as needed
import AddCharacterModal from "./AddCharacterModal";
import { useParams } from "react-router-dom";
import {
  addNewScene,
  getABook,
  reorderScene,
  updateCharacter,
  reorderCharacters,
  updateStoryBible,
  getCharacterDetails,
  createManualCharacter,
  deleteCharacter,
} from "../../api/bookGeneration";
import {
  formatStoryBibleMasterPrompt,
  ensureStoryBibleApproxOnOwnLine,
  extractStoryBibleTitle,
  characterAccordionHeaderLabel,
  extractCharacterNameFromDossier,
  getSceneTitleTextStrict,
  formatSceneTitleStrict,
  computeActOffsets,
  getGlobalSceneNumber,
  normalizeActNumber,
  nextSceneIndexForAct,
  maxSceneIndexInAct,
} from "./utils";
import {
  buildFullActGridFromUserContents,
  sceneHasManuscriptDraft,
  countSceneManuscriptWords,
  isArchivedScene,
  withoutArchivedScenes,
} from "./outlineLayout";
import {
  isHeavyPlainPaste,
  replaceEditableSelectionWithPlainText,
  replaceEditableSelectionWithHtml,
  clipboardHtmlToMarkdown,
  handleHeavyEditableDeleteKey,
  handleHeavyEditableBeforeInput,
  handleHeavyEditableCut,
} from "./editablePlainPaste";

const formatSceneWordCount = (count) =>
  `${Number(count).toLocaleString()} ${count === 1 ? "word" : "words"}`;

const SCENE_ACTION_CONFIRM = {
  delete: {
    label: "Delete scene?",
    confirm: "Delete",
    busy: "Deleting…",
    confirmClass: "scene-delete-btn--confirm",
  },
  archive: {
    label: "Archive scene?",
    confirm: "Archive",
    busy: "Archiving…",
    confirmClass: "scene-delete-btn--confirm-safe",
  },
  restore: {
    label: "Restore scene?",
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
          className={`scene-delete-btn ${copy.confirmClass}`}
          disabled={busy}
          onClick={onConfirm}
        >
          {busy ? <span className="scene-delete-spinner" /> : <TbCheck size={13} />}
          {busy ? copy.busy : copy.confirm}
        </button>
        <button
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

const OutlineDownloadButton = ({
  onClick,
  disabled,
  isBusy,
  label,
  busyLabel = "Preparing…",
  title,
  disabledTitle,
  ariaLabelBusy,
  ariaLabelDisabled,
  ariaLabelReady,
}) => (
  <div className="outline-download-wrap">
    <button
      type="button"
      className={[
        "outline-download-btn",
        isBusy && "outline-download-btn--busy",
        disabled && "outline-download-btn--disabled",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
      disabled={disabled || isBusy}
      title={disabled ? disabledTitle : title}
      aria-label={
        isBusy
          ? ariaLabelBusy
          : disabled
            ? ariaLabelDisabled
            : ariaLabelReady
      }
      aria-busy={isBusy}
    >
      {isBusy ? (
        <LuLoader2 size={15} className="outline-download-btn__spinner" aria-hidden />
      ) : (
        <LuDownload size={15} aria-hidden />
      )}
      <span className="outline-download-btn__label">
        {isBusy ? busyLabel : label}
      </span>
    </button>
  </div>
);

const { Panel } = Collapse;

/** One-time outline reorder coachmark — global across novels. */
const OUTLINE_REORDER_HINT_KEY = "bookEditor:outlineReorderHintDismissed";

/**
 * Convert markdown text to safe HTML for a contentEditable div.
 * Mirrors SidebarTabs.jsx's helper so Characters / Story Bible editors render
 * the same way as Scene Design (users see formatted text, not raw `**markdown**`).
 * Converts per line so a long dossier keeps its bold/italic — `.+?` with /s on an
 * unmatched `**` across the whole blob can backtrack and freeze the tab.
 */
const INLINE_MD_LINE_MAX = 4000;

const inlineMarkdownToHtml = (line) => {
  if (line.length > INLINE_MD_LINE_MAX) return line;
  return line
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+?)\*/g, "<em>$1</em>");
};

const markdownToEditableHtml = (text) => {
  if (!text) return "";
  const escaped = String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped.split("\n").map(inlineMarkdownToHtml).join("<br>");
};

/**
 * Preserve the copied formatting on paste. `text/plain` carries no bold/italic/
 * lists, so when the clipboard has `text/html` we distill it to the markdown we
 * store and insert it as clean formatted HTML (only <strong>/<em>/<br>). Pasting
 * the source HTML verbatim nests thousands of styled spans and locks the tab;
 * the distilled markdown stays tiny at any paste length.
 */
const handleEditablePlainPaste = (e) => {
  const html = e.clipboardData?.getData("text/html");
  const plain = e.clipboardData?.getData("text/plain");
  const fromHtml = html ? clipboardHtmlToMarkdown(html) : "";
  const markdown = fromHtml || plain;
  if (markdown == null || markdown === "") return;
  e.preventDefault();

  // Rich source: show it formatted immediately and round-trip on save.
  // (Falls through to plain when HTML conversion yields nothing, e.g. huge paste.)
  if (fromHtml) {
    replaceEditableSelectionWithHtml(
      e.currentTarget,
      markdownToEditableHtml(fromHtml)
    );
    return;
  }
  // Plain, heavy: one text node (pre-wrap shows the newlines) — no per-line churn.
  if (isHeavyPlainPaste(markdown)) {
    replaceEditableSelectionWithPlainText(e.currentTarget, markdown);
    return;
  }
  if (document.execCommand("insertText", false, markdown)) return;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  range.deleteContents();
  const node = document.createTextNode(markdown);
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
};

const EDITABLE_BLOCK_TAGS = new Set([
  "DIV",
  "P",
  "LI",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
]);

/**
 * Inverse of markdownToEditableHtml. Chrome wraps edited lines in <div>s; innerText
 * then emits extra blank lines, so ReactMarkdown turns Title & Word Count into
 * separate paragraphs. Walk the DOM so <br>/<div> stay single \n and <strong> stays **.
 */
const editableElToMarkdown = (el) => {
  if (!el) return "";

  const serialize = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.nodeValue || "").replace(/\u00a0/g, " ");
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const tag = node.nodeName;
    if (tag === "BR") return "\n";
    if (tag === "SCRIPT" || tag === "STYLE") return "";

    let wrapL = "";
    let wrapR = "";
    if (tag === "STRONG" || tag === "B") {
      wrapL = "**";
      wrapR = "**";
    } else if (tag === "EM" || tag === "I") {
      wrapL = "*";
      wrapR = "*";
    }

    let inner = "";
    for (const child of node.childNodes) {
      inner += serialize(child);
    }

    const body = wrapL + inner + wrapR;
    if (!EDITABLE_BLOCK_TAGS.has(tag)) return body;
    // Chrome blank line: <div><br></div>
    if (inner === "\n" || inner === "") return "\n";
    return `${body.replace(/\n$/, "")}\n`;
  };

  let out = "";
  for (const child of el.childNodes) {
    out += serialize(child);
  }
  return out.replace(/\n+$/, "").replace(/^\n+/, "");
};

/**
 * Strip trailing horizontal-rule separators. Do not cut at a second
 * "1. Archetype" — that truncated long imported character notes on save.
 */
const stripTrailingDossierSeparators = (text) => {
  if (!text || typeof text !== "string") return text;
  return text.replace(/(?:\s*\n\s*(?:-{3,}|_{3,}|\*{3,})\s*)+\s*$/g, "").trimEnd();
};

const defaultGetCharacterDisplayText = (responseText, character) =>
  responseText?.trim() ||
  (character?.name
    ? `${character.character || "Character"}: ${character.name}`
    : "");

/** DB-backed Character docs only — synthetic cast rows cannot persist reorder. */
const isPersistedCharacterId = (id) => /^[a-f0-9]{24}$/i.test(String(id || ""));

const moveCharacterBeforeTarget = (list, draggedId, targetId) => {
  const from = list.findIndex((c) => String(c._id) === String(draggedId));
  const to = list.findIndex((c) => String(c._id) === String(targetId));
  if (from < 0 || to < 0 || from === to) return null;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

const OutlineSidebar = ({
  bookData,
  selectedScene,
  setSelectedScene,
  setBookData,
  selectedSceneHasLiveDraft = false,
  storyResponseMap,
  expandedAct,
  setExpandedAct,
  formatSceneTitle,
  getSceneTitleText,
  onRenameScene,
  onDeleteScene,
  onArchiveScene,
  onUnarchiveScene,
  scenes,
  isStreaming,
  initialOutlineStreamActive = false,
  isBootLoading = false,
  onEmptySceneClick,
  characterListData = [],
  formatCharacterText,
  getCharacterDisplayText = defaultGetCharacterDisplayText,
  showCoachScene = false,
  onCoachScene,
  onCharacterUpdated,
  onCharacterAdded,
  onCharacterDeleted,
  onCharactersReordered,
  onMasterPromptUpdated,
  onOutlineStructureChange,
  onDownloadOutline,
  downloadOutlineDisabled = true,
  isDownloadingOutline = false,
  onDownloadCharacters,
  downloadCharactersDisabled = true,
  isDownloadingCharacters = false,
  onDownloadStoryBible,
  downloadStoryBibleDisabled = true,
  isDownloadingStoryBible = false,
  onOpenGuide,
  /** Debounced live editor HTML for per-scene word counts (avoids re-render on every keystroke). */
  content = "",
  contentSceneId = null,
}) => {
  const { id } = useParams();
  // `storyBible` is the dossier-free Story Bible that every prompt-assembly
  // path reads. The Story Bible tab reads and writes this field. `masterPrompt`
  // is preserved as the original generation record (used only to lazy-heal
  // Characters and to backfill `storyBible` on first read).
  const masterPromptText = (bookData?.storyBible || "").trim();
  const worldBuilding = (bookData?.worldBuilding || "").trim();
  const specialElements = (bookData?.specialElements || "").trim();
  const [showAddSceneModal, setShowAddSceneModal] = React.useState(false);
  const [showAddCharacterModal, setShowAddCharacterModal] = React.useState(false);
  const [newSceneTitle, setNewSceneTitle] = React.useState("");
  const [activeActNum, setActiveActNum] = React.useState(null);
  const [draggedScene, setDraggedScene] = React.useState(null);
  const [dragOverScene, setDragOverScene] = React.useState(null);
  const [dragPreviewPosition, setDragPreviewPosition] = React.useState({
    x: 0,
    y: 0,
  });
  const [isReordering, setIsReordering] = React.useState(false);
  const dragExpandTimerRef = React.useRef(null);
  const [draggedCharacter, setDraggedCharacter] = React.useState(null);
  const [dragOverCharacterId, setDragOverCharacterId] = React.useState(null);

  // Inline rename state: { id: sceneId, value: currentTitle }
  const [renamingScene, setRenamingScene] = React.useState(null);
  // Optimistic title map: { [sceneId]: newTitle } — shown instantly on commit, cleared once parent data updates
  const [optimisticTitles, setOptimisticTitles] = React.useState({});
  // Inline confirm: { id, type: 'delete' | 'archive' | 'restore' }
  const [pendingSceneAction, setPendingSceneAction] = React.useState(null);
  const [sceneActionInFlight, setSceneActionInFlight] = React.useState(false);
  const [archiveOpen, setArchiveOpen] = React.useState(false);
  const renameInputRef = React.useRef(null);
  // Tracks the last sceneId we already committed a rename for (during this turn of the event
  // loop) so a rapid Enter→blur sequence cannot fire the same API call twice and so a thrown
  // backend error from one call cannot bubble through a duplicate call into the error boundary.
  const committingRenameRef = React.useRef(null);
  const prevInitialStreamRef = React.useRef(false);
  const [activeOutlineTab, setActiveOutlineTab] = React.useState("outline");
  /**
   * One-time coachmark for drag-to-reorder. `null` = not hydrated yet (avoid
   * flash); `true`/`false` after localStorage read.
   */
  const [showOutlineReorderCoachmark, setShowOutlineReorderCoachmark] =
    React.useState(null);
  const firstDragHandleRef = React.useRef(null);
  const didAutoExpandForCoachmarkRef = React.useRef(false);

  // Character edit state: one character at a time, structured fields + responseText
  const [editingCharacterId, setEditingCharacterId] = React.useState(null);
  const [characterDraft, setCharacterDraft] = React.useState({});
  const [savingCharacterId, setSavingCharacterId] = React.useState(null);
  const [pendingCharacterDeleteId, setPendingCharacterDeleteId] = React.useState(null);
  const [deletingCharacterId, setDeletingCharacterId] = React.useState(null);
  /** Controls which character Collapse panels are open — we force-open the one being edited. */
  const [openCharacterIds, setOpenCharacterIds] = React.useState(() => new Set());
  const characterDossierEditRef = React.useRef(null);
  const characterDraftRef = React.useRef(characterDraft);
  characterDraftRef.current = characterDraft;
  /** Mirrors editingCharacterId for async guards (avoids stale closures). */
  const editingCharacterIdRef = React.useRef(null);
  editingCharacterIdRef.current = editingCharacterId;

  const seedCharacterDossierEditor = (el) => {
    if (!el || !el.isConnected) return;
    const text = characterDraftRef.current.responseText || "";
    try {
      el.innerHTML = markdownToEditableHtml(text);
    } catch (err) {
      console.warn("Character dossier editor seed failed:", err);
    }
  };

  // Seed when the editor node attaches. Clicking Edit on a collapsed accordion
  // mounts this after the [editingCharacterId] effect would have already run
  // with a null ref — leaving a blank contentEditable.
  const setCharacterDossierEditorRef = React.useCallback((el) => {
    characterDossierEditRef.current = el;
    if (!el || !editingCharacterIdRef.current) return;
    seedCharacterDossierEditor(el);
  }, []);

  // Keep the act containing the selected scene expanded (including after reload restore).
  React.useEffect(() => {
    if (selectedScene.actNumber == null) return;
    setExpandedAct((prev) => {
      if (prev.has(selectedScene.actNumber)) return prev;
      const next = new Set(prev);
      next.add(selectedScene.actNumber);
      return next;
    });
  }, [selectedScene.actNumber, selectedScene.id, setExpandedAct]);

  // Scroll the active scene row into view when selection changes (e.g. page reload).
  React.useEffect(() => {
    if (!selectedScene.id) return;
    const row = document.querySelector(
      `[data-scene-id="${CSS.escape(String(selectedScene.id))}"]`
    );
    row?.scrollIntoView({ block: "nearest", behavior: "auto" });
  }, [selectedScene.id]);

  // Story Bible (masterPrompt) edit state
  const [isEditingStoryBible, setIsEditingStoryBible] = React.useState(false);
  const [masterPromptDraft, setMasterPromptDraft] = React.useState("");
  const [isSavingStoryBible, setIsSavingStoryBible] = React.useState(false);
  const storyBibleEditRef = React.useRef(null);

  const storedSceneWordCounts = React.useMemo(() => {
    const map = new Map();
    (bookData?.userContents || []).forEach((sceneData) => {
      if (sceneData.outlinePlaceholder) return;
      map.set(
        sceneData._id,
        countSceneManuscriptWords(sceneData)
      );
    });
    return map;
  }, [bookData?.userContents]);

  const sceneWordCounts = React.useMemo(() => {
    const map = new Map(storedSceneWordCounts);
    const activeId = selectedScene.id;
    const editorBound =
      activeId &&
      contentSceneId != null &&
      String(contentSceneId) === String(activeId);

    if (!editorBound || !bookData?.userContents) {
      return map;
    }

    const sceneData = bookData.userContents.find((row) => row._id === activeId);
    if (!sceneData) return map;

    map.set(
      activeId,
      countSceneManuscriptWords(sceneData, {
        liveContent: content,
        contentSceneId,
        selectedSceneId: activeId,
      })
    );
    return map;
  }, [
    storedSceneWordCounts,
    bookData?.userContents,
    content,
    contentSceneId,
    selectedScene.id,
  ]);

  const handleStartEditCharacter = async (character) => {
    // Seed immediately from cached state so the editor opens without delay.
    setPendingCharacterDeleteId(null);
    setCharacterDraft({ responseText: character.responseText || "" });
    setEditingCharacterId(character._id);
    // Ensure the Collapse panel is open so the edit form is actually visible
    setOpenCharacterIds((prev) => {
      const next = new Set(prev);
      next.add(String(character._id));
      return next;
    });

    // Defensively re-fetch the latest DB state. This protects against the case where the
    // frontend's characterListData is stale (loaded before the backend heal ran), so the
    // editor always shows the clean DB content, not the initially-cached dirty copy.
    // Only do this for real Mongo ObjectIds (24 hex chars) — synthetic "mp-*" / "cast-*"
    // ids have no detail endpoint.
    const looksLikeObjectId = /^[a-f0-9]{24}$/i.test(String(character._id || ""));
    if (!looksLikeObjectId) return;
    try {
      const result = await getCharacterDetails(character._id);
      const fresh = result?.character;
      if (!fresh || !fresh.responseText) return;
      // Bail if the user canceled or switched characters while the request was in flight.
      if (editingCharacterIdRef.current !== character._id) return;
      // Skip the reseed if the cache is already identical — avoids trashing any edits the
      // user may have typed between the initial seed and this async response.
      if (fresh.responseText === (character.responseText || "")) return;
      setCharacterDraft({ responseText: fresh.responseText });
      if (onCharacterUpdated) {
        onCharacterUpdated({ ...character, responseText: fresh.responseText });
      }
      // Re-check ownership after the async hop: the user may have canceled or switched
      // characters between dispatching and mutating, which would point the ref at a
      // different (or no) editor. Also guard against the node being detached mid-flight.
      const editorEl = characterDossierEditRef.current;
      if (
        editorEl &&
        editorEl.isConnected &&
        editingCharacterIdRef.current === character._id
      ) {
        try {
          editorEl.innerHTML = markdownToEditableHtml(fresh.responseText);
        } catch (mutateErr) {
          console.warn("Character dossier reseed failed:", mutateErr);
        }
      }
    } catch (err) {
      // Non-fatal — editor already has the cached copy.
      console.warn("getCharacterDetails refetch failed:", err);
    }
  };

  const handleCancelEditCharacter = () => {
    setEditingCharacterId(null);
    setCharacterDraft({});
  };

  const handleSaveCharacter = async (character) => {
    if (!character?._id) return;
    setSavingCharacterId(character._id);
    try {
      const rawFromDom = characterDossierEditRef.current
        ? editableElToMarkdown(characterDossierEditRef.current)
        : characterDraft.responseText ?? "";
      const cleanText = stripTrailingDossierSeparators(rawFromDom);
      const payload = { responseText: cleanText };
      const extractedName = extractCharacterNameFromDossier(cleanText);
      if (extractedName) payload.name = extractedName;
      const result = await updateCharacter(character._id, payload);
      const updated = result?.data || { ...character, ...payload };
      if (onCharacterUpdated) onCharacterUpdated(updated);
      toast.success("Character updated.");
      setEditingCharacterId(null);
      setCharacterDraft({});
    } catch (err) {
      console.error("updateCharacter error:", err);
      toast.error(
        err?.response?.data?.error || "Failed to update character."
      );
    } finally {
      setSavingCharacterId(null);
    }
  };

  const handleDeleteCharacter = async (character) => {
    if (!character?._id) return;
    setDeletingCharacterId(character._id);
    try {
      await deleteCharacter(character._id);
      if (onCharacterDeleted) onCharacterDeleted(character._id);
      if (editingCharacterId === character._id) {
        setEditingCharacterId(null);
        setCharacterDraft({});
      }
      toast.success("Character deleted.");
    } catch (err) {
      console.error("deleteCharacter error:", err);
      toast.error(
        err?.response?.data?.error || "Failed to delete character."
      );
    } finally {
      setDeletingCharacterId(null);
      setPendingCharacterDeleteId(null);
    }
  };

  const handleAddCharacter = async ({ name, role, characterType }) => {
    const novelId = bookData?.novelId || bookData?._id || id;
    if (!novelId) {
      toast.error("Could not add character.");
      throw new Error("Missing novelId");
    }
    try {
      const result = await createManualCharacter(novelId, {
        name,
        role,
        characterType,
      });
      const created = result?.character;
      if (!created?._id) {
        throw new Error("Character was not created");
      }
      if (onCharacterAdded) {
        await onCharacterAdded(created);
      }
      setShowAddCharacterModal(false);
      setActiveOutlineTab("characters");
      setOpenCharacterIds((prev) => {
        const next = new Set(prev);
        next.add(String(created._id));
        return next;
      });
      await handleStartEditCharacter(created);
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        "Could not add character.";
      toast.error(message);
      throw err;
    }
  };

  const reorderableCharacterCount = React.useMemo(
    () =>
      characterListData.filter(
        (c) => isPersistedCharacterId(c?._id) && !c?.syntheticFromNovel
      ).length,
    [characterListData]
  );

  const handleCharacterDragStart = (e, character) => {
    if (isStreaming || isReordering || !isPersistedCharacterId(character?._id)) {
      return;
    }
    e.preventDefault();
    setDraggedCharacter(character);
    setDragPreviewPosition({ x: e.clientX, y: e.clientY });
  };

  const handleCharacterTouchStart = (e, character) => {
    if (isStreaming || isReordering || !isPersistedCharacterId(character?._id)) {
      return;
    }
    const t = e.touches?.[0];
    if (!t) return;
    setDraggedCharacter(character);
    setDragPreviewPosition({ x: t.clientX, y: t.clientY });
  };

  const handleCharacterPointerMove = React.useCallback(
    (clientX, clientY) => {
      if (!draggedCharacter) return;
      setDragPreviewPosition({ x: clientX, y: clientY });
      const el = document.elementFromPoint(clientX, clientY);
      const row = el?.closest?.("[data-character-id]");
      const id = row?.getAttribute?.("data-character-id");
      if (!id || id === String(draggedCharacter._id)) {
        setDragOverCharacterId(null);
        return;
      }
      setDragOverCharacterId((prev) => (prev === id ? prev : id));
    },
    [draggedCharacter]
  );

  const handleCharacterMouseMove = React.useCallback(
    (e) => handleCharacterPointerMove(e.clientX, e.clientY),
    [handleCharacterPointerMove]
  );

  const handleCharacterTouchMove = React.useCallback(
    (e) => {
      if (!draggedCharacter) return;
      const t = e.touches?.[0];
      if (!t) return;
      e.preventDefault();
      handleCharacterPointerMove(t.clientX, t.clientY);
    },
    [draggedCharacter, handleCharacterPointerMove]
  );

  const finishCharacterDrop = React.useCallback(
    async (targetId) => {
      if (!draggedCharacter || !targetId) {
        setDraggedCharacter(null);
        setDragOverCharacterId(null);
        return;
      }
      if (String(targetId) === String(draggedCharacter._id)) {
        setDraggedCharacter(null);
        setDragOverCharacterId(null);
        return;
      }

      const next = moveCharacterBeforeTarget(
        characterListData,
        draggedCharacter._id,
        targetId
      );
      setDraggedCharacter(null);
      setDragOverCharacterId(null);
      if (!next) return;

      const previous = characterListData;
      if (onCharactersReordered) onCharactersReordered(next);

      const novelId = id || bookData?._id;
      if (!novelId) {
        toast.error("Could not reorder characters.");
        if (onCharactersReordered) onCharactersReordered(previous);
        return;
      }

      setIsReordering(true);
      try {
        await reorderCharacters(
          novelId,
          next.map((c) => c._id)
        );
      } catch (err) {
        console.error("reorderCharacters error:", err);
        if (onCharactersReordered) onCharactersReordered(previous);
        toast.error(
          err?.response?.data?.error || "Failed to reorder characters."
        );
      } finally {
        setIsReordering(false);
      }
    },
    [
      draggedCharacter,
      characterListData,
      onCharactersReordered,
      id,
      bookData?._id,
    ]
  );

  const handleCharacterDragEnd = React.useCallback(
    (e) => {
      if (!draggedCharacter) return;
      const point =
        e?.changedTouches?.[0] ||
        (typeof e?.clientX === "number" ? e : null);
      const clientX = point?.clientX;
      const clientY = point?.clientY;
      let targetId = dragOverCharacterId;
      if (typeof clientX === "number" && typeof clientY === "number") {
        const el = document.elementFromPoint(clientX, clientY);
        const row = el?.closest?.("[data-character-id]");
        const idFromPoint = row?.getAttribute?.("data-character-id");
        if (idFromPoint) targetId = idFromPoint;
      }
      finishCharacterDrop(targetId);
    },
    [draggedCharacter, dragOverCharacterId, finishCharacterDrop]
  );

  const handleStartEditStoryBible = (currentText) => {
    setMasterPromptDraft(currentText || "");
    setIsEditingStoryBible(true);
  };

  const handleCancelEditStoryBible = () => {
    setIsEditingStoryBible(false);
    setMasterPromptDraft("");
  };

  const handleSaveStoryBible = async () => {
    const novelId = bookData?.novelId || bookData?._id || id;
    if (!novelId) return;
    setIsSavingStoryBible(true);
    try {
      const latestText = ensureStoryBibleApproxOnOwnLine(
        storyBibleEditRef.current
          ? editableElToMarkdown(storyBibleEditRef.current)
          : masterPromptDraft
      );
      const result = await updateStoryBible(novelId, latestText);
      const savedText = result?.data?.storyBible ?? latestText;
      const savedWordCount = result?.data?.wordCount;
      const savedName =
        (typeof result?.data?.name === "string" && result.data.name.trim()) ||
        extractStoryBibleTitle(savedText);
      if (onMasterPromptUpdated) {
        onMasterPromptUpdated(savedText, savedWordCount, savedName);
      }
      toast.success("Story Bible updated.");
      setIsEditingStoryBible(false);
    } catch (err) {
      console.error("updateStoryBible error:", err);
      toast.error("Failed to update Story Bible.");
    } finally {
      setIsSavingStoryBible(false);
    }
  };

  // Backup seed if the editor was already mounted (Edit while the panel is open).
  React.useLayoutEffect(() => {
    if (!editingCharacterId) return;
    seedCharacterDossierEditor(characterDossierEditRef.current);
  }, [editingCharacterId]);

  // Seed the Story Bible contentEditable with the draft markdown-as-HTML when editing begins.
  // Every DOM step is guarded: window.getSelection() can return null (detached docs / shadow
  // DOM / non-focused windows), range APIs can throw on a node that just got unmounted, and
  // any uncaught throw in here propagates to the page-level error boundary as a render error.
  React.useEffect(() => {
    if (!isEditingStoryBible) return;
    const el = storyBibleEditRef.current;
    if (!el || !el.isConnected) return;
    try {
      // Prefer <br> over Chrome's <div> wrappers so Save round-trips as single newlines
      // (markdown "same paragraph") instead of extra blank lines.
      document.execCommand("defaultParagraphSeparator", false, "br");
    } catch {
      // execCommand is best-effort; serializer still handles <div> fallbacks.
    }
    try {
      el.innerHTML = markdownToEditableHtml(masterPromptDraft || "");
    } catch (err) {
      console.warn("Story Bible editor seed failed:", err);
      return;
    }
    try {
      el.focus();
    } catch {
      // focus() can throw on detached/hidden elements — non-fatal.
    }
    try {
      const sel = typeof window !== "undefined" ? window.getSelection() : null;
      if (!sel) return;
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (err) {
      // Selection placement is a nice-to-have — never block editing on it.
      console.warn("Story Bible caret placement failed:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditingStoryBible]);

  // Reset editing state when switching tabs or novels
  React.useEffect(() => {
    setEditingCharacterId(null);
    setCharacterDraft({});
    setPendingCharacterDeleteId(null);
    setIsEditingStoryBible(false);
    setMasterPromptDraft("");
  }, [activeOutlineTab, id]);

  const sidebarActOffsets = React.useMemo(() => {
    const activeContents = withoutArchivedScenes(bookData?.userContents || []);
    if (!activeContents.length) {
      return computeActOffsets([]);
    }
    const actGroups = activeContents.reduce((acc, content, index) => {
      const actNum = normalizeActNumber(content.actNumber);
      if (!acc[actNum]) acc[actNum] = [];
      acc[actNum].push({ ...content, originalIndex: index });
      return acc;
    }, {});
    const novelKey = bookData.novelId || bookData._id || id || "novel";
    const fullActs = buildFullActGridFromUserContents(actGroups, novelKey);
    return computeActOffsets(fullActs);
  }, [bookData?.userContents, bookData?.novelId, bookData?._id, id]);

  const reorderableScenesMeta = React.useMemo(() => {
    const activeContents = withoutArchivedScenes(bookData?.userContents || []);
    if (!activeContents.length) {
      return { count: 0, firstSceneId: null, firstActNum: null };
    }
    const actGroups = activeContents.reduce((acc, content, index) => {
      const actNum = normalizeActNumber(content.actNumber);
      if (!acc[actNum]) acc[actNum] = [];
      acc[actNum].push({ ...content, originalIndex: index });
      return acc;
    }, {});
    const novelKey = bookData.novelId || bookData._id || id || "novel";
    const fullActs = buildFullActGridFromUserContents(actGroups, novelKey);
    let count = 0;
    let firstSceneId = null;
    let firstActNum = null;
    for (const { actNum, actScenes } of fullActs) {
      for (const scene of actScenes) {
        if (!scene.outlinePlaceholder && scene._id && !isArchivedScene(scene)) {
          count += 1;
          if (!firstSceneId) {
            firstSceneId = String(scene._id);
            firstActNum = Number(actNum);
          }
        }
      }
    }
    return { count, firstSceneId, firstActNum };
  }, [bookData?.userContents, bookData?.novelId, bookData?._id, id]);

  const {
    count: reorderableSceneCount,
    firstSceneId: firstReorderableSceneId,
    firstActNum: firstReorderableActNum,
  } = reorderableScenesMeta;

  React.useEffect(() => {
    let dismissed = false;
    try {
      dismissed =
        window.localStorage.getItem(OUTLINE_REORDER_HINT_KEY) === "1";
    } catch {
      dismissed = true;
    }
    setShowOutlineReorderCoachmark(!dismissed);
  }, []);

  React.useEffect(() => {
    if (
      didAutoExpandForCoachmarkRef.current ||
      !showOutlineReorderCoachmark ||
      reorderableSceneCount < 2 ||
      firstReorderableActNum == null
    ) {
      return;
    }
    setExpandedAct((prev) => {
      const next = new Set(prev);
      next.add(firstReorderableActNum);
      return next;
    });
    didAutoExpandForCoachmarkRef.current = true;
  }, [
    showOutlineReorderCoachmark,
    reorderableSceneCount,
    firstReorderableActNum,
    setExpandedAct,
  ]);

  const dismissOutlineReorderCoachmark = React.useCallback(() => {
    setShowOutlineReorderCoachmark(false);
    try {
      window.localStorage.setItem(OUTLINE_REORDER_HINT_KEY, "1");
    } catch {
      // Best effort; private mode / quota errors are not fatal.
    }
  }, []);

  React.useEffect(() => {
    if (renamingScene?.id && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  // Only re-run when a NEW scene starts being renamed (id changes), not on every keystroke
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renamingScene?.id]);

  React.useEffect(() => {
    if (initialOutlineStreamActive && !prevInitialStreamRef.current) {
      setExpandedAct((prev) => {
        const next = new Set(prev);
        next.add(1);
        return next;
      });
    }
    prevInitialStreamRef.current = initialOutlineStreamActive;
  }, [initialOutlineStreamActive, setExpandedAct]);

  const commitRename = async (sceneData) => {
    // Dedupe: Enter triggers commitRename, then the input unmounts which can also fire blur →
    // commitRename again with the same captured closure value. Guard against the duplicate call.
    if (committingRenameRef.current === sceneData._id) return;
    const newTitle = renamingScene?.value?.trim();
    if (!newTitle || newTitle === sceneData.sceneTitle) {
      setRenamingScene(null);
      return;
    }
    committingRenameRef.current = sceneData._id;
    // Optimistically show the new title immediately — no flash of the stale title
    setOptimisticTitles((prev) => ({ ...prev, [sceneData._id]: newTitle }));
    setRenamingScene(null);
    try {
      if (onRenameScene) {
        await onRenameScene(sceneData._id, newTitle);
      }
    } catch (err) {
      // Parent already toasts on failure; swallow here so an unexpected throw can never
      // propagate as an unhandled rejection that bubbles into the error boundary.
      console.warn("commitRename failed:", err);
    } finally {
      // Once the parent has updated bookData the real title takes over; clear the optimistic value.
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
    if (!newSceneTitle.trim() || activeActNum == null) return;
    const nextIndex = nextSceneIndexForAct(bookData.userContents, activeActNum);
    const originalTitle = newSceneTitle.trim();
    let body = {
      novelId: id,
      actNumber: activeActNum,
      sceneIndex: nextIndex,
      sceneTitle: originalTitle,
    };
    const result = await addNewScene(body);
    const response = await getABook(id);
    setBookData((prev) => ({
      ...prev,
      ...response.data,
      novelId: response.data._id,
    }));

    if (result?.titleWasRenamed && result?.finalTitle) {
      toast.info(
        `A scene titled "${originalTitle}" already exists. Your new scene was saved as "${result.finalTitle}".`,
        { autoClose: 5000 }
      );
    }

    // Auto-select the freshly-created scene so the editor + Scene Design pane
    // immediately switch to the empty "This is your custom scene" state.
    const createdScene =
      result?.scene ||
      (response?.data?.userContents || []).find(
        (uc) =>
          normalizeActNumber(uc.actNumber) === normalizeActNumber(activeActNum) &&
          uc.sceneIndex === (result?.finalSceneIndex ?? body.sceneIndex) &&
          uc.isUserAdded
      );
    if (createdScene) {
      onOutlineStructureChange?.({
        type: "add",
        sceneId: String(createdScene._id),
      });
      const newActOffsets = computeActOffsets(response?.data?.userContents || []);
      const newGlobalSceneNumber = getGlobalSceneNumber(
        createdScene.actNumber,
        createdScene.sceneIndex,
        newActOffsets,
      );
      setSelectedScene({
        promptKey: createdScene.promptKey || null,
        text: "",
        actNumber: createdScene.actNumber,
        sceneIndex: createdScene.sceneIndex,
        globalSceneNumber: newGlobalSceneNumber,
        id: createdScene._id,
        isUserAdded: true,
      });
      setExpandedAct((prev) => {
        const next = new Set(prev);
        next.add(Number(createdScene.actNumber));
        return next;
      });
    }

    setNewSceneTitle("");
    setShowAddSceneModal(false);
  };

  const handleDragStart = (e, sceneData) => {
    e.preventDefault();
    if (sceneData.outlinePlaceholder) return;
    setDraggedScene(sceneData);
    setDragPreviewPosition({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = React.useCallback((e) => {
    if (!draggedScene) return;
    setDragPreviewPosition({ x: e.clientX, y: e.clientY });
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (
      el?.closest?.(".scene-action-btn") ||
      el?.closest?.(".scene-rename-input")
    ) {
      return;
    }
    // Auto-expand act when hovering over its header during a drag.
    const actHeader = el?.closest?.(".actAccordion");
    if (actHeader) {
      const actAttr = actHeader.getAttribute("data-act-num");
      const hoveredAct = actAttr ? Number(actAttr) : null;
      if (
        hoveredAct &&
        !expandedAct.has(hoveredAct) &&
        !dragExpandTimerRef.current
      ) {
        dragExpandTimerRef.current = setTimeout(() => {
          setExpandedAct((prev) => {
            const next = new Set(prev);
            next.add(hoveredAct);
            return next;
          });
          dragExpandTimerRef.current = null;
        }, 400);
      }
    } else if (dragExpandTimerRef.current) {
      clearTimeout(dragExpandTimerRef.current);
      dragExpandTimerRef.current = null;
    }
    const row = el?.closest?.("[data-scene-id]");
    if (!row) return;
    const id = row.getAttribute("data-scene-id");
    const actNum = Number(row.getAttribute("data-act-number"));
    if (!id || id === draggedScene._id) return;
    setDragOverScene((prev) =>
      prev?._id === id ? prev : { _id: id, actNumber: actNum }
    );
  }, [draggedScene, expandedAct, setExpandedAct]);

  // Touch parallels of the mouse drag flow. Touch events do not fire
  // mouseenter on hovered targets, so during touchmove we resolve the
  // hit target via document.elementFromPoint and read the data-scene-id
  // attributes added to the .scene-item rows.
  const handleTouchStart = (e, sceneData) => {
    if (sceneData.outlinePlaceholder) return;
    const t = e.touches[0];
    if (!t) return;
    setDraggedScene(sceneData);
    setDragPreviewPosition({ x: t.clientX, y: t.clientY });
  };

  const handleTouchMove = React.useCallback((e) => {
    if (!draggedScene) return;
    if (e.cancelable) e.preventDefault();
    const t = e.touches[0];
    if (!t) return;
    setDragPreviewPosition({ x: t.clientX, y: t.clientY });
    const el = document.elementFromPoint(t.clientX, t.clientY);
    if (
      el?.closest?.(".scene-action-btn") ||
      el?.closest?.(".scene-rename-input")
    ) {
      return;
    }
    // Auto-expand act when touch hovers over its header
    const actHeader = el?.closest?.(".actAccordion");
    if (actHeader) {
      const actAttr = actHeader.getAttribute("data-act-num");
      const hoveredAct = actAttr ? Number(actAttr) : null;
      if (hoveredAct && !expandedAct.has(hoveredAct) && !dragExpandTimerRef.current) {
        dragExpandTimerRef.current = setTimeout(() => {
          setExpandedAct((prev) => {
            const next = new Set(prev);
            next.add(hoveredAct);
            return next;
          });
          dragExpandTimerRef.current = null;
        }, 400);
      }
    } else if (dragExpandTimerRef.current) {
      clearTimeout(dragExpandTimerRef.current);
      dragExpandTimerRef.current = null;
    }
    const row = el?.closest?.("[data-scene-id]");
    if (!row) return;
    const id = row.getAttribute("data-scene-id");
    const actNum = Number(row.getAttribute("data-act-number"));
    if (!id || id === draggedScene._id) return;
    setDragOverScene((prev) =>
      prev?._id === id ? prev : { _id: id, actNumber: actNum }
    );
  }, [draggedScene, expandedAct, setExpandedAct]);

  const handleTouchEnd = React.useCallback(() => {
    if (!draggedScene) return;
    if (dragOverScene && dragOverScene._id !== draggedScene._id) {
      const target = (bookData?.userContents || []).find(
        (c) => String(c._id) === String(dragOverScene._id)
      );
      if (target) {
        handleDrop(target);
        return;
      }
    }
    setDraggedScene(null);
    setDragOverScene(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggedScene, dragOverScene, bookData?.userContents]);

  const handleDropOnActHeader = (actNum) => {
    if (!draggedScene) return;
    const maxIndex = maxSceneIndexInAct(bookData?.userContents, actNum);
    const normalizedAct = normalizeActNumber(actNum);
    // If dropping into the same act with the scene already at the tail,
    // there's nothing to do — short-circuit so we don't make a no-op API call.
    if (
      normalizeActNumber(draggedScene.actNumber) === normalizedAct &&
      maxIndex > 0 &&
      Number(draggedScene.sceneIndex) === maxIndex
    ) {
      setDraggedScene(null);
      setDragOverScene(null);
      return;
    }
    const isCrossAct = normalizeActNumber(draggedScene.actNumber) !== normalizedAct;
    const newSceneIndex = isCrossAct
      ? nextSceneIndexForAct(bookData?.userContents, actNum)
      : maxIndex > 0
        ? maxIndex
        : 1;
    handleDrop({ actNumber: normalizedAct, sceneIndex: newSceneIndex, _id: null });
  };

  const handleDrop = async (targetScene) => {
    if (!draggedScene || draggedScene._id === targetScene._id) {
      setDraggedScene(null);
      setDragOverScene(null);
      return;
    }

    // Placeholders are synthetic UI rows — they have no DB record, so they can be
    // neither dragged nor used as drop targets.
    if (draggedScene.outlinePlaceholder || targetScene.outlinePlaceholder) {
      setDraggedScene(null);
      setDragOverScene(null);
      return;
    }

    setIsReordering(true);

    try {
      const isCrossAct = draggedScene.actNumber !== targetScene.actNumber;
      let body = {
        sceneId: draggedScene._id,
        newSceneIndex: targetScene.sceneIndex,
      };
      if (isCrossAct) {
        body.newActNumber = targetScene.actNumber;
      }

      await reorderScene(body);
      const response = await getABook(id);
      setBookData((prev) => ({
        ...prev,
        ...response.data,
        novelId: response.data._id,
      }));
      onOutlineStructureChange?.({
        type: "reorder",
        sceneId: String(draggedScene._id),
        from: {
          actNumber: draggedScene.actNumber,
          sceneIndex: draggedScene.sceneIndex,
        },
        to: {
          actNumber: isCrossAct ? targetScene.actNumber : draggedScene.actNumber,
          sceneIndex: targetScene.sceneIndex,
        },
      });
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
        onOutlineStructureChange?.({
          type: "delete",
          sceneId: String(sceneId),
        });
      } else if (type === "archive" && onArchiveScene) {
        await onArchiveScene(sceneId);
        onOutlineStructureChange?.({
          type: "archive",
          sceneId: String(sceneId),
        });
        setArchiveOpen(true);
      } else if (type === "restore" && onUnarchiveScene) {
        await onUnarchiveScene(sceneId);
        onOutlineStructureChange?.({
          type: "restore",
          sceneId: String(sceneId),
        });
      }
    } finally {
      setSceneActionInFlight(false);
      setPendingSceneAction(null);
    }
  };

  // Render acts and scenes by promptKey
  const renderActsAndScenes = () => {
    // Pre-outline only: fixed 5×3 grid from legacy SSE `scenes` array.
    // Once userContents exists, buildFullActGridFromUserContents handles 6+ scenes per act.
    if (!bookData?.userContents || bookData.userContents.length === 0) {
      if (bookData?.storyResponses?.length > 0) {
        return null;
      }
      const acts = [1, 2, 3];
      return acts.map((actNum) => {
        const startIdx = (actNum - 1) * 5;
        // Always show all 3 acts so empty scenes are visible as placeholders
        // (including before Act 1 Scene 1 — Olivia chat delivers the first scene).
        return (
          <div key={actNum} className="mb-2">
            <div
              onClick={() =>
                setExpandedAct((prev) => {
                  const next = new Set(prev);
                  if (next.has(actNum)) next.delete(actNum);
                  else next.add(actNum);
                  return next;
                })
              }
              className="actAccordion"
            >
              <span style={{ fontWeight: "500" }} className="gap-2 d-flex">
                <PiBookOpen size={20} style={{ minWidth: "20px" }} />
                ACT {actNum}
                {bookData.acts?.find((a) => a.actNumber === actNum)?.title
                  ? `: ${bookData.acts.find((a) => a.actNumber === actNum).title}`
                  : ""}
              </span>
              <div className="d-flex gap-2 align-items-center">
                <button
                  type="button"
                  className="outline-add-chapter-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!bookData?.userContents?.length) return;
                    setActiveActNum(Number(actNum));
                    setShowAddSceneModal(true);
                  }}
                  disabled={!bookData?.userContents?.length}
                  title={
                    bookData?.userContents?.length
                      ? "Add a blank chapter"
                      : "Available after your outline loads"
                  }
                >
                  <FaPlus size={11} aria-hidden />
                  Add chapter
                </button>
                <span style={{ fontSize: "20px" }}>
                  {expandedAct.has(actNum) ? (
                    <FaChevronUp size={16} />
                  ) : (
                    <FaChevronDown size={16} />
                  )}
                </span>
              </div>
            </div>
            {expandedAct.has(actNum) && (
              <div className="scene-item-list">
                {Array.from({ length: 5 }, (_, i) => {
                  const sceneIdx = startIdx + i;
                  const sceneData = scenes[sceneIdx];
                  const sceneIndex = i + 1;
                  const globalSceneNum = (actNum - 1) * 5 + sceneIndex;
                  const firstNullSceneIdx = scenes.findIndex((s) => s === null);
                  // During initial Act1Sc1 stream, scenes[0] becomes non-null after the first token;
                  // firstNullSceneIdx would then be 1 and wrongly flags Scene 2 as "loading". Only slot 0
                  // may load, and only while scenes[0] is still null.
                  const isSceneLoading =
                    isStreaming &&
                    !sceneData &&
                    (initialOutlineStreamActive
                      ? sceneIdx === 0 && scenes[0] === null
                      : firstNullSceneIdx >= 0 && sceneIdx === firstNullSceneIdx);
                  const act1Scene1StreamPlaceholder =
                    initialOutlineStreamActive &&
                    actNum === 1 &&
                    sceneIndex === 1 &&
                    !sceneData &&
                    isSceneLoading;
                  const pathAShowSkeleton =
                    isSceneLoading && !act1Scene1StreamPlaceholder;
                  const isSelected =
                    selectedScene.index === sceneIdx &&
                    selectedScene.text === sceneData;
                  const isEmpty =
                    !sceneData && !isSceneLoading && !act1Scene1StreamPlaceholder;
                  return (
                    <div
                      key={sceneIdx}
                      style={{
                        cursor: "pointer",
                        backgroundColor: isSelected ? "#03587a" : "transparent",
                      }}
                      className={`scene-item${isEmpty ? " scene-item--empty" : ""}`}
                      onClick={() => {
                        if (isEmpty) {
                          setSelectedScene({
                            index: sceneIdx,
                            text: "",
                            actNumber: actNum,
                            sceneIndex,
                            globalSceneNumber: globalSceneNum,
                          });
                          return;
                        }
                        if (!sceneData && !act1Scene1StreamPlaceholder) return;
                        if (sceneData) {
                          setSelectedScene({
                            index: sceneIdx,
                            text: sceneData,
                          });
                        }
                      }}
                    >
                      <div className="scene-item-row">
                        <span
                          className={`scene-title-text ${sceneData ? "scene-title-enter" : ""}`}
                          title={
                            act1Scene1StreamPlaceholder
                              ? "Chapter 1 Plan…"
                              : sceneData
                                ? getSceneTitleText(sceneData)
                                : `Chapter ${globalSceneNum} Plan`
                          }
                        >
                          {pathAShowSkeleton ? (
                            <span className="scene-skeleton" />
                          ) : act1Scene1StreamPlaceholder ? (
                            <span className="scene-placeholder-label scene-placeholder-label--streaming">
                              Chapter 1 Plan…
                            </span>
                          ) : sceneData ? (
                            <>
                              {isStreaming && !getSceneTitleTextStrict(sceneData) ? (
                                <span className="scene-placeholder-label scene-placeholder-label--streaming">{`Chapter ${globalSceneNum} Plan…`}</span>
                              ) : isStreaming ? (
                                formatSceneTitleStrict(sceneData)
                              ) : (
                                formatSceneTitle(sceneData)
                              )}
                            </>
                          ) : (
                            <span className="scene-placeholder-label">{`Chapter ${globalSceneNum} Plan`}</span>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      });
    }

    if (!bookData?.userContents) return null;
    const activeContents = withoutArchivedScenes(bookData.userContents);
    const actGroups = activeContents.reduce((acc, content, index) => {
      const actNum = normalizeActNumber(content.actNumber);
      if (!acc[actNum]) acc[actNum] = [];
      acc[actNum].push({ ...content, originalIndex: index });
      return acc;
    }, {});

    const novelKey = bookData.novelId || bookData._id || id || "novel";
    const fullActs = buildFullActGridFromUserContents(actGroups, novelKey);
    const actOffsets = computeActOffsets(fullActs);
    const archivedScenes = (bookData.userContents || [])
      .filter((uc) => isArchivedScene(uc) && !uc.outlinePlaceholder)
      .sort(
        (a, b) =>
          Number(a.archivedFromActNumber ?? a.actNumber) -
            Number(b.archivedFromActNumber ?? b.actNumber) ||
          Number(a.archivedFromSceneIndex ?? a.sceneIndex) -
            Number(b.archivedFromSceneIndex ?? b.sceneIndex)
      );

    return (
      <>
        {fullActs.map(({ actNum, actScenes }) => {
        return (
          <div key={actNum} className="mb-2">
            <div
              onClick={() =>
                setExpandedAct((prev) => {
                  const next = new Set(prev);
                  const num = Number(actNum);
                  if (next.has(num)) next.delete(num);
                  else next.add(num);
                  return next;
                })
              }
              className={`actAccordion${draggedScene && draggedScene.actNumber !== actNum ? " actAccordion--drop-target" : ""}`}
              data-act-num={actNum}
            >
              <span style={{ fontWeight: "500" }} className="gap-2 d-flex">
                <PiBookOpen size={20} style={{ minWidth: "20px" }} />
                ACT {actNum}
                {bookData.acts?.find((a) => a.actNumber === Number(actNum))?.title
                  ? `: ${bookData.acts.find((a) => a.actNumber === Number(actNum)).title}`
                  : ""}
              </span>
              <div className="d-flex gap-2 align-items-center">
                <button
                  type="button"
                  className="outline-add-chapter-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveActNum(Number(actNum));
                    setShowAddSceneModal(true);
                  }}
                  title="Add a blank chapter"
                >
                  <FaPlus size={11} aria-hidden />
                  Add chapter
                </button>

                <span style={{ fontSize: "20px" }}>
                  {expandedAct.has(Number(actNum)) ? (
                    <FaChevronUp size={16} />
                  ) : (
                    <FaChevronDown size={16} />
                  )}
                </span>
              </div>
            </div>
            {expandedAct.has(Number(actNum)) && (
              <div className="scene-item-list">
                {actScenes.map((sceneData) => {
                  if (isArchivedScene(sceneData)) return null;
                  const globalSceneNum = getGlobalSceneNumber(sceneData.actNumber, sceneData.sceneIndex, actOffsets);
                  const isSelected =
                    selectedScene.actNumber === sceneData.actNumber &&
                    selectedScene.sceneIndex === sceneData.sceneIndex;

                  const isPlaceholderRow = Boolean(sceneData.outlinePlaceholder);

                  // Placeholders use synthetic promptKeys (scene1…scene15) that can collide with
                  // real scenes after delete/reindex — never treat them as having content.
                  const hasContent = isPlaceholderRow
                    ? false
                    : Boolean(
                        sceneData.userContent ||
                          storyResponseMap[sceneData.promptKey] ||
                          (scenes && scenes[sceneData.originalIndex]),
                      );
                  const hasManuscriptDraft =
                    !isPlaceholderRow &&
                    sceneHasManuscriptDraft(String(sceneData._id), {
                      selectedSceneId: selectedScene.id,
                      selectedSceneHasLiveDraft,
                      userContents: bookData?.userContents || [],
                    });
                  const isDragging = draggedScene?._id === sceneData._id;
                  const isDropTarget =
                    dragOverScene?._id === sceneData._id &&
                    draggedScene &&
                    draggedScene._id !== sceneData._id;

                  // During initial Act 1 Scene 1 SSE only scene1 is generating; do not treat scene 2+ as "loading"
                  // (otherwise scene 2 shows a skeleton bar and looks like a broken progress row).
                  const isSceneLoading =
                    !initialOutlineStreamActive &&
                    isStreaming &&
                    (!hasContent) &&
                    (sceneData.originalIndex === 0 ||
                      (Number.isFinite(sceneData.originalIndex) &&
                        scenes &&
                        scenes.slice(0, sceneData.originalIndex).some((s) => s !== null)));

                  const isAct1Scene1 =
                    sceneData.actNumber === 1 && sceneData.sceneIndex === 1;
                  const isSceneLoadingUi = isSceneLoading;

                  const streamHoldSceneActions =
                    initialOutlineStreamActive &&
                    isAct1Scene1 &&
                    !sceneData.sceneTitle &&
                    !storyResponseMap[sceneData.promptKey];

                  const isCoachmarkTarget =
                    showOutlineReorderCoachmark === true &&
                    !isBootLoading &&
                    reorderableSceneCount >= 2 &&
                    !streamHoldSceneActions &&
                    !isPlaceholderRow &&
                    String(sceneData._id) === firstReorderableSceneId;

                  const isRenaming = renamingScene?.id === sceneData._id;
                  const pendingType =
                    pendingSceneAction?.id === sceneData._id
                      ? pendingSceneAction.type
                      : null;
                  const isPendingAction = Boolean(pendingType);
                  const sceneWordCount = sceneWordCounts.get(sceneData._id) ?? 0;

                  const rawSceneBody = isPlaceholderRow
                    ? ""
                    : storyResponseMap[sceneData.promptKey] ||
                      (scenes && scenes[sceneData.originalIndex]) ||
                      "";

                  const displayTitle = optimisticTitles[sceneData._id] || sceneData.sceneTitle;

                  const outlineTitleTooltip = displayTitle
                    ? displayTitle
                    : isStreaming
                      ? getSceneTitleTextStrict(rawSceneBody) ||
                        `Chapter ${globalSceneNum} Plan…`
                      : getSceneTitleText(rawSceneBody);

                  let outlineTitleNode;
                  if (displayTitle) {
                    outlineTitleNode = displayTitle;
                  } else if (!rawSceneBody) {
                    outlineTitleNode =
                      initialOutlineStreamActive && isAct1Scene1 ? (
                        <span className="scene-placeholder-label scene-placeholder-label--streaming">
                          Chapter 1 Plan…
                        </span>
                      ) : (
                        `Chapter ${globalSceneNum} Plan`
                      );
                  } else if (isStreaming) {
                    const strictTitle = getSceneTitleTextStrict(rawSceneBody);
                    outlineTitleNode = strictTitle
                      ? formatSceneTitleStrict(rawSceneBody)
                      : (
                        <span className="scene-placeholder-label scene-placeholder-label--streaming">
                          {`Chapter ${globalSceneNum} Plan…`}
                        </span>
                      );
                  } else {
                    outlineTitleNode = formatSceneTitle(rawSceneBody);
                  }

                  return (
                    <div
                      key={sceneData._id}
                      data-scene-id={sceneData._id}
                      data-act-number={sceneData.actNumber}
                      style={{
                        cursor: "pointer",
                        backgroundColor: isSelected ? "#03587a" : "transparent",
                        opacity: isDragging ? 0.3 : 1,
                        border: isDropTarget
                          ? "2px dashed #03587a"
                          : "2px solid transparent",
                        position: "relative",
                        transform: isDragging ? "scale(0.95)" : "scale(1)",
                        transition: isDragging ? "none" : "all 0.2s ease",
                        boxShadow: isDragging
                          ? "0 4px 12px rgba(0,0,0,0.15)"
                          : "none",
                      }}
                      className={`scene-item${!hasContent && !sceneData.isUserAdded ? " scene-item--empty" : ""}${isPendingAction ? " scene-item--deleting" : ""}`}
                      onClick={(e) => {
                        if (
                          draggedScene ||
                          isRenaming ||
                          isPendingAction ||
                          e.target.closest(".drag-handle") ||
                          e.target.closest(".drag-handle-wrap") ||
                          e.target.closest(".scene-action-btn")
                        )
                          return;
                        // User-added scenes are fully selectable even with empty body — writer
                        // owns them, so do NOT route through the Olivia "next spine slot" flow.
                        // Scene Design for these scenes is strictly the StoryResponse — never
                        // fall back to userContent (that's manuscript prose, a different field
                        // that belongs in the main editor, not the Scene Design pane).
                        if (sceneData.isUserAdded) {
                          setSelectedScene({
                            promptKey: sceneData.promptKey || null,
                            text: storyResponseMap[sceneData.promptKey] || "",
                            actNumber: sceneData.actNumber,
                            sceneIndex: sceneData.sceneIndex,
                            globalSceneNumber: globalSceneNum,
                            id: sceneData._id,
                            isUserAdded: true,
                          });
                          return;
                        }
                        if (!hasContent) {
                          setSelectedScene({
                            promptKey: sceneData.promptKey || null,
                            text: "",
                            actNumber: sceneData.actNumber,
                            sceneIndex: sceneData.sceneIndex,
                            globalSceneNumber: globalSceneNum,
                            id: isPlaceholderRow ? null : sceneData._id,
                            isUserAdded: false,
                          });
                          return;
                        }
                        setSelectedScene({
                          promptKey: sceneData.promptKey || null,
                          text: storyResponseMap[sceneData.promptKey] || sceneData.userContent || "",
                          actNumber: sceneData.actNumber,
                          sceneIndex: sceneData.sceneIndex,
                          globalSceneNumber: globalSceneNum,
                          id: isPlaceholderRow ? null : sceneData._id,
                          isUserAdded: false,
                        });
                      }}
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
                        <div className="scene-item-row">
                          <div className="outline-scene-item-body">
                            {/* Title / inline rename input */}
                            {isSceneLoadingUi ? (
                              <span className="scene-skeleton" />
                            ) : isRenaming ? (
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
                              <span
                                className={`scene-title-text ${hasContent ? "scene-title-enter" : ""}`}
                                title={outlineTitleTooltip}
                              >
                                {outlineTitleNode}
                              </span>
                            )}
                            {!isSceneLoadingUi && !isRenaming && (
                              <div
                                className={`outline-chapter-word-count${
                                  isSelected ? " outline-chapter-word-count--selected" : ""
                                }`}
                              >
                                {formatSceneWordCount(sceneWordCount)}
                              </div>
                            )}
                          </div>

                          {/* Action icons for all real (non-placeholder) scenes */}
                          {!isPlaceholderRow &&
                            !isRenaming &&
                            !streamHoldSceneActions && (
                            <div className="scene-actions">
                              {showCoachScene && onCoachScene && hasManuscriptDraft && (
                                <button
                                  className="scene-action-btn scene-action-btn--coach"
                                  title="Coach Draft"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const title =
                                      optimisticTitles[sceneData._id] ||
                                      sceneData.sceneTitle ||
                                      getSceneTitleTextStrict(rawSceneBody) ||
                                      getSceneTitleText(storyResponseMap[sceneData.promptKey]) ||
                                      `Chapter ${globalSceneNum} Plan`;
                                    onCoachScene(
                                      sceneData.actNumber,
                                      globalSceneNum,
                                      title,
                                      String(sceneData._id),
                                      sceneData.sceneIndex
                                    );
                                  }}
                                >
                                  <TbMessageCircle size={14} />
                                </button>
                              )}
                              <button
                                className="scene-action-btn"
                                title="Rename scene"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const currentTitle =
                                    optimisticTitles[sceneData._id] ||
                                    sceneData.sceneTitle ||
                                    getSceneTitleTextStrict(rawSceneBody) ||
                                    getSceneTitleText(storyResponseMap[sceneData.promptKey]) ||
                                    `Chapter ${globalSceneNum} Plan`;
                                  setRenamingScene({ id: sceneData._id, value: currentTitle });
                                }}
                              >
                                <TbPencil size={14} />
                              </button>
                              <button
                                className="scene-action-btn"
                                title="Archive scene"
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
                              <button
                                className="scene-action-btn scene-action-btn--delete"
                                title="Delete scene"
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
                              <span
                                ref={
                                  isCoachmarkTarget
                                    ? firstDragHandleRef
                                    : undefined
                                }
                                className={`drag-handle-wrap drag-handle drag-handle-wrap--affordance${isCoachmarkTarget ? " is-nudging" : ""}`}
                                data-tooltip="Drag to reorder"
                                style={{
                                  cursor: draggedScene ? "grabbing" : "grab",
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  handleDragStart(e, sceneData);
                                }}
                                onTouchStart={(e) => {
                                  e.stopPropagation();
                                  handleTouchStart(e, sceneData);
                                }}
                              >
                                <MdDragIndicator
                                  className="drag-handle__icon"
                                  size={16}
                                  aria-label="Drag to reorder scene"
                                  style={{ color: "inherit", pointerEvents: "none" }}
                                />
                                {isCoachmarkTarget && (
                                  <div
                                    className="outline-reorder-coachmark"
                                    role="dialog"
                                    aria-label="How to reorder scenes"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onTouchStart={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      type="button"
                                      className="outline-reorder-coachmark__close"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        dismissOutlineReorderCoachmark();
                                      }}
                                      aria-label="Dismiss tip"
                                    >
                                      <TbX size={12} aria-hidden />
                                    </button>
                                    <p className="outline-reorder-coachmark__title">
                                      Reorder scenes anytime
                                    </p>
                                    <p className="outline-reorder-coachmark__body">
                                      Grab the grip on the right and drag a scene
                                      up or down to change its order.
                                    </p>
                                    <button
                                      type="button"
                                      className="outline-reorder-coachmark__cta"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        dismissOutlineReorderCoachmark();
                                      }}
                                    >
                                      Got it
                                    </button>
                                  </div>
                                )}
                              </span>
                            </div>
                          )}
                          {hasContent && streamHoldSceneActions && (
                            <span
                              className="scene-stream-placeholder-grip"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
        {archivedScenes.length > 0 && (
          <div className="mb-2 outline-archived">
            <div
              onClick={() => setArchiveOpen((open) => !open)}
              className="actAccordion outline-archived__header"
            >
              <span className="outline-archived__title">
                <TbArchive size={20} aria-hidden />
                Archived
                <span className="outline-archived__count">{archivedScenes.length}</span>
              </span>
              <span className="outline-archived__chevron">
                {archiveOpen ? <FaChevronUp size={16} /> : <FaChevronDown size={16} />}
              </span>
            </div>
            {archiveOpen && (
              <div className="scene-item-list">
                {archivedScenes.map((sceneData) => {
                  const labelAct =
                    sceneData.archivedFromActNumber ?? sceneData.actNumber;
                  const labelIndex =
                    sceneData.archivedFromSceneIndex ?? sceneData.sceneIndex;
                  const globalSceneNum = getGlobalSceneNumber(
                    labelAct,
                    labelIndex,
                    actOffsets
                  );
                  const isSelected =
                    selectedScene.id &&
                    String(selectedScene.id) === String(sceneData._id);
                  const rawSceneBody =
                    storyResponseMap[sceneData.promptKey] ||
                    sceneData.userContent ||
                    "";
                  const title =
                    optimisticTitles[sceneData._id] ||
                    sceneData.sceneTitle ||
                    getSceneTitleTextStrict(rawSceneBody) ||
                    getSceneTitleText(storyResponseMap[sceneData.promptKey]) ||
                    `Chapter ${globalSceneNum}`;
                  const sceneWordCount = countSceneManuscriptWords(sceneData, {
                    liveContent: content,
                    contentSceneId,
                    selectedSceneId: selectedScene.id,
                  });
                  const pendingType =
                    pendingSceneAction?.id === sceneData._id
                      ? pendingSceneAction.type
                      : null;
                  const isPendingAction = Boolean(pendingType);
                  return (
                    <div
                      key={sceneData._id}
                      data-scene-id={sceneData._id}
                      data-archived="true"
                      className={`scene-item outline-archived__item${isSelected ? " outline-archived__item--selected" : ""}${isPendingAction ? " scene-item--deleting" : ""}`}
                      style={{
                        cursor: "pointer",
                        backgroundColor: isSelected ? "#03587a" : "transparent",
                      }}
                      onClick={(e) => {
                        if (
                          isPendingAction ||
                          e.target.closest(".scene-action-btn")
                        ) {
                          return;
                        }
                        setSelectedScene({
                          promptKey: sceneData.promptKey || null,
                          text:
                            storyResponseMap[sceneData.promptKey] ||
                            sceneData.userContent ||
                            "",
                          actNumber: sceneData.actNumber,
                          sceneIndex: sceneData.sceneIndex,
                          globalSceneNumber: globalSceneNum,
                          id: sceneData._id,
                          isUserAdded: Boolean(sceneData.isUserAdded),
                        });
                      }}
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
                        <div className="scene-item-row">
                          <div className="outline-scene-item-body">
                            <span
                              className="scene-title-text"
                              title={`Act ${sceneData.actNumber}, Chapter ${globalSceneNum} — ${title}`}
                            >
                              Act {sceneData.actNumber} · {title}
                            </span>
                            <div
                              className={`outline-chapter-word-count${
                                isSelected ? " outline-chapter-word-count--selected" : ""
                              }`}
                            >
                              {formatSceneWordCount(sceneWordCount)}
                            </div>
                          </div>
                          <div className="scene-actions">
                            <button
                              className="scene-action-btn"
                              title="Restore to outline"
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
                            <button
                              className="scene-action-btn scene-action-btn--delete"
                              title="Delete scene"
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
      </>
    );
  };

  // Add global mouse up + touch listeners to handle drag end / movement.
  // touchmove is registered with passive:false so the handler can call
  // preventDefault() to suppress page/drawer scroll while a drag is active.
  React.useEffect(() => {
    const handleGlobalMouseUp = (e) => {
      if (dragExpandTimerRef.current) {
        clearTimeout(dragExpandTimerRef.current);
        dragExpandTimerRef.current = null;
      }
      if (!draggedScene) return;

      // Resolve the drop target via the element under the cursor — this is far
      // more reliable than per-element onMouseUp because the released mouse may
      // be over an act header, a scene row, or empty space inside the sidebar.
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const sceneRow = el?.closest?.("[data-scene-id]");
      const actHeader = !sceneRow ? el?.closest?.(".actAccordion") : null;

      if (sceneRow) {
        const id = sceneRow.getAttribute("data-scene-id");
        if (id && id !== draggedScene._id) {
          const target = (bookData?.userContents || []).find(
            (c) => String(c._id) === String(id)
          );
          if (target) {
            if (isArchivedScene(target)) {
              setDraggedScene(null);
              setDragOverScene(null);
              return;
            }
            handleDrop(target);
            return;
          }
        }
      } else if (actHeader) {
        const actAttr = actHeader.getAttribute("data-act-num");
        const actNum = actAttr ? Number(actAttr) : null;
        if (actNum) {
          handleDropOnActHeader(actNum);
          return;
        }
      }

      setDraggedScene(null);
      setDragOverScene(null);
    };

    document.addEventListener("mouseup", handleGlobalMouseUp);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);
    document.addEventListener("touchcancel", handleTouchEnd);
    return () => {
      document.removeEventListener("mouseup", handleGlobalMouseUp);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("touchcancel", handleTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggedScene, handleMouseMove, handleTouchMove, handleTouchEnd, bookData?.userContents]);

  React.useEffect(() => {
    if (!draggedCharacter) return undefined;
    document.addEventListener("mouseup", handleCharacterDragEnd);
    document.addEventListener("mousemove", handleCharacterMouseMove);
    document.addEventListener("touchmove", handleCharacterTouchMove, {
      passive: false,
    });
    document.addEventListener("touchend", handleCharacterDragEnd);
    document.addEventListener("touchcancel", handleCharacterDragEnd);
    return () => {
      document.removeEventListener("mouseup", handleCharacterDragEnd);
      document.removeEventListener("mousemove", handleCharacterMouseMove);
      document.removeEventListener("touchmove", handleCharacterTouchMove);
      document.removeEventListener("touchend", handleCharacterDragEnd);
      document.removeEventListener("touchcancel", handleCharacterDragEnd);
    };
  }, [
    draggedCharacter,
    handleCharacterDragEnd,
    handleCharacterMouseMove,
    handleCharacterTouchMove,
  ]);

  return (
    <div
      className="d-flex flex-column outline-box"
      style={{
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
        userSelect: draggedScene || draggedCharacter ? "none" : undefined,
      }}
    >
      <div className="panel-header panel-header--left outline-hub-header">
        <div className="outline-hub-header__text">
          <p className="panel-header-title">Story Hub</p>
          <p className="panel-header-subtitle">
            Your outline, characters, and Story Bible live here.
          </p>
        </div>
        {onOpenGuide && (
          <button
            type="button"
            className="outline-hub-guide-btn"
            onClick={onOpenGuide}
            title="Open Olivia's Guide"
            aria-label="Open Olivia's Guide"
          >
            <img
              src="/assets/images/olivia.png"
              alt=""
              className="outline-hub-guide-btn__avatar"
              aria-hidden="true"
              onError={(e) => {
                e.target.src = "/assets/images/avatar.jpg";
              }}
            />
            <span className="outline-hub-guide-btn__label">Olivia&apos;s Guide</span>
          </button>
        )}
      </div>
      <div className="outline-tab-toggle">
        <button
          type="button"
          className={activeOutlineTab === "outline" ? "active" : ""}
          onClick={() => setActiveOutlineTab("outline")}
        >
          Outline
        </button>
        <button
          type="button"
          className={activeOutlineTab === "characters" ? "active" : ""}
          onClick={() => setActiveOutlineTab("characters")}
        >
          Characters
        </button>
        <button
          type="button"
          className={activeOutlineTab === "world" ? "active" : ""}
          onClick={() => setActiveOutlineTab("world")}
        >
          Story Bible
        </button>
      </div>

      {activeOutlineTab === "outline" && (
        <p className="outline-reorder-hint">
          <MdDragIndicator
            className="outline-reorder-hint__icon"
            size={14}
            aria-hidden
          />
          Drag the grip on any chapter to reorder your outline.
        </p>
      )}

      {activeOutlineTab === "outline" && onDownloadOutline && (
        <OutlineDownloadButton
          onClick={onDownloadOutline}
          disabled={downloadOutlineDisabled}
          isBusy={isDownloadingOutline}
          label="Download Outline"
          title="Download your outline and scene designs as a Word document (.docx)"
          disabledTitle="Add scene design with Olivia first."
          ariaLabelBusy="Preparing outline download"
          ariaLabelDisabled="Download outline — add scene design with Olivia first"
          ariaLabelReady="Download outline"
        />
      )}

      {activeOutlineTab === "outline" && (
        <div
          className="outline-outline-body flex-grow-1 d-flex flex-column"
        >
          {isBootLoading && !isStreaming ? (
            <div className="outline-boot-skeleton">
              {[1, 2, 3].map((actNum) => (
                <div key={actNum} className="mb-2">
                  <div className="actAccordion">
                    <span style={{ fontWeight: "500" }} className="gap-2 d-flex">
                      <PiBookOpen size={20} style={{ minWidth: "20px" }} />
                      ACT {actNum}
                    </span>
                    <div className="d-flex gap-2">
                      <span style={{ fontSize: "20px" }}>
                        <FaChevronDown size={16} />
                      </span>
                    </div>
                  </div>
                  {actNum === 1 && (
                    <div className="scene-item-list">
                      {Array.from({ length: 5 }, (_, i) => (
                        <div key={i} className="scene-item" style={{ cursor: "default" }}>
                          <span className="scene-skeleton" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            renderActsAndScenes()
          )}
        </div>
      )}

      {activeOutlineTab === "characters" && (
        <div className="outline-characters-inner flex-grow-1 d-flex flex-column">
          {reorderableCharacterCount >= 2 && (
            <p className="outline-reorder-hint">
              <MdDragIndicator
                className="outline-reorder-hint__icon"
                size={14}
                aria-hidden
              />
              Drag the grip on any character to reorder the list.
            </p>
          )}
          <div className="outline-download-wrap">
            <button
              type="button"
              className={[
                "outline-download-btn",
                (isBootLoading || isStreaming) && "outline-download-btn--disabled",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setShowAddCharacterModal(true)}
              disabled={isBootLoading || isStreaming}
              title="Add a character with a 17-point dossier template"
              aria-label="Add character"
            >
              <FaPlus size={12} aria-hidden />
              <span className="outline-download-btn__label">Add Character</span>
            </button>
          </div>
          {onDownloadCharacters && (
            <OutlineDownloadButton
              onClick={onDownloadCharacters}
              disabled={downloadCharactersDisabled}
              isBusy={isDownloadingCharacters}
              label="Download Characters"
              title="Download your character dossiers as a Word document (.docx)"
              disabledTitle="Add character dossiers first."
              ariaLabelBusy="Preparing characters download"
              ariaLabelDisabled="Download characters — add character dossiers first"
              ariaLabelReady="Download characters"
            />
          )}
          {isBootLoading && !isStreaming && characterListData.length === 0 ? (
            <div className="outline-characters-skeleton" aria-label="Loading characters">
              <div className="outline-characters-skeleton-row" />
              <div className="outline-characters-skeleton-row" />
              <div className="outline-characters-skeleton-row" />
            </div>
          ) : characterListData.length > 0 ? (
            characterListData.map((character) => {
              const isEditing = editingCharacterId === character._id;
              const isSaving = savingCharacterId === character._id;
              const isSyntheticFromNovel = Boolean(character.syntheticFromNovel);
              // syntheticFromNovel entries have no persisted Character document — skip edit.
              // All other characters are DB-backed (getAllCharacters lazy-migrates from masterPrompt).
              const canEdit = !isStreaming && !isSyntheticFromNovel;
              const canReorder =
                canEdit &&
                isPersistedCharacterId(character._id) &&
                reorderableCharacterCount >= 2;
              const panelKey = String(character._id);
              const isPanelOpen = openCharacterIds.has(panelKey) || isEditing;
              const isDragging =
                draggedCharacter &&
                String(draggedCharacter._id) === panelKey;
              const isDragOver =
                dragOverCharacterId === panelKey &&
                draggedCharacter &&
                String(draggedCharacter._id) !== panelKey;
              const headerCharacter =
                isEditing && typeof characterDraft.responseText === "string"
                  ? { ...character, responseText: characterDraft.responseText }
                  : character;
              const headerLabel = characterAccordionHeaderLabel(headerCharacter);
              return (
                <div
                  key={panelKey}
                  data-character-id={panelKey}
                  className={[
                    "outline-character-row",
                    isDragging && "outline-character-row--dragging",
                    isDragOver && "outline-character-row--drag-over",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                <Collapse
                  className="outline-character-collapse mt-1"
                  expandIconPosition="end"
                  activeKey={isPanelOpen ? [panelKey] : []}
                  onChange={(keys) => {
                    if (
                      isEditing ||
                      draggedCharacter ||
                      pendingCharacterDeleteId === character._id
                    ) {
                      return;
                    }
                    const arr = Array.isArray(keys) ? keys : [keys];
                    setOpenCharacterIds((prev) => {
                      const next = new Set(prev);
                      if (arr.includes(panelKey)) next.add(panelKey);
                      else next.delete(panelKey);
                      return next;
                    });
                  }}
                >
                  <Panel
                    header={<span>{headerLabel}</span>}
                    key={panelKey}
                    forceRender={isEditing}
                    extra={
                      <span
                        className="outline-character-header-extra"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {canEdit && (
                          <>
                            <button
                              type="button"
                              className="scene-action-btn"
                              title="Edit character"
                              aria-label="Edit character"
                              onClick={() => handleStartEditCharacter(character)}
                            >
                              <TbPencil size={14} aria-hidden />
                            </button>
                            <button
                              type="button"
                              className="scene-action-btn scene-action-btn--delete"
                              title="Delete character"
                              aria-label="Delete character"
                              onClick={() => {
                                handleCancelEditCharacter();
                                setOpenCharacterIds((prev) => {
                                  const next = new Set(prev);
                                  next.add(panelKey);
                                  return next;
                                });
                                setPendingCharacterDeleteId(character._id);
                              }}
                            >
                              <TbTrash size={14} aria-hidden />
                            </button>
                          </>
                        )}
                        {canReorder ? (
                          <span
                            className="drag-handle-wrap drag-handle drag-handle-wrap--affordance outline-character-drag-handle"
                            data-tooltip="Drag to reorder"
                            style={{
                              cursor: draggedCharacter ? "grabbing" : "grab",
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              handleCharacterDragStart(e, character);
                            }}
                            onTouchStart={(e) => {
                              e.stopPropagation();
                              handleCharacterTouchStart(e, character);
                            }}
                          >
                            <MdDragIndicator
                              className="drag-handle__icon"
                              size={16}
                              aria-label="Drag to reorder character"
                              style={{
                                color: "inherit",
                                pointerEvents: "none",
                              }}
                            />
                          </span>
                        ) : null}
                      </span>
                    }
                  >
                    {canEdit && (
                      <div className="outline-edit-controls d-flex gap-1 justify-content-end mb-2">
                        {pendingCharacterDeleteId === character._id ? (
                          <div className="outline-character-delete-confirm">
                            <span className="outline-character-delete-confirm-label">
                              Delete this character?
                            </span>
                            <button
                              type="button"
                              className="sidebar-scene-edit-btn sidebar-scene-delete-btn"
                              onClick={() => handleDeleteCharacter(character)}
                              disabled={deletingCharacterId === character._id}
                            >
                              {deletingCharacterId === character._id
                                ? "Deleting…"
                                : "Delete"}
                            </button>
                            <button
                              type="button"
                              className="sidebar-scene-edit-btn sidebar-scene-cancel-btn"
                              onClick={() => setPendingCharacterDeleteId(null)}
                              disabled={deletingCharacterId === character._id}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : isEditing ? (
                          <>
                            <button
                              type="button"
                              className="sidebar-scene-edit-btn sidebar-scene-save-btn"
                              onClick={() => handleSaveCharacter(character)}
                              disabled={isSaving}
                            >
                              {isSaving ? "Saving…" : "Save"}
                            </button>
                            <button
                              type="button"
                              className="sidebar-scene-edit-btn sidebar-scene-cancel-btn"
                              onClick={handleCancelEditCharacter}
                              disabled={isSaving}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="sidebar-scene-edit-btn sidebar-scene-edit-secondary-btn"
                              onClick={() => handleStartEditCharacter(character)}
                            >
                              <TbPencil size={14} aria-hidden />
                              Edit
                            </button>
                            <button
                              type="button"
                              className="sidebar-scene-edit-btn sidebar-scene-delete-btn"
                              onClick={() =>
                                setPendingCharacterDeleteId(character._id)
                              }
                            >
                              <TbTrash size={14} aria-hidden />
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    )}
                    {isEditing ? (
                      <div
                        key="character-dossier-editor"
                        ref={setCharacterDossierEditorRef}
                        className="sidebar-scene-inline-edit outline-character-dossier-edit"
                        contentEditable={!isSaving}
                        suppressContentEditableWarning={true}
                        aria-label="Edit character dossier"
                        onPaste={handleEditablePlainPaste}
                        onKeyDown={handleHeavyEditableDeleteKey}
                        onBeforeInput={handleHeavyEditableBeforeInput}
                        onCut={handleHeavyEditableCut}
                        onBlur={(e) => {
                          // CRITICAL: read innerText synchronously. React nulls out
                          // e.currentTarget after the handler returns, so referencing it
                          // inside a setState updater closure later throws "Cannot read
                          // properties of null (reading 'innerText')" during the next render
                          // — which is exactly what was crashing OutlineSidebar into the
                          // page-level error boundary while editing characters.
                          const nextText = e.currentTarget?.innerText ?? "";
                          setCharacterDraft((prev) => ({
                            ...prev,
                            responseText: nextText,
                          }));
                        }}
                      />
                    ) : isStreaming &&
                      !getCharacterDisplayText(character.responseText, character)?.trim() ? (
                      <div
                        key="character-dossier-pending"
                        className="outline-character-pending"
                      >
                        <p>
                          Character details for <strong>{character.name}</strong> will appear here
                          when available from your Story Bible.
                        </p>
                      </div>
                    ) : (
                      <div
                        key="character-dossier-display"
                        className="outline-character-content outline-character-content--dossier"
                      >
                        {formatCharacterText(
                          getCharacterDisplayText(character.responseText, character),
                        )}
                      </div>
                    )}
                  </Panel>
                </Collapse>
                </div>
              );
            })
          ) : (
            <p className="outline-characters-empty mb-0">No characters found.</p>
          )}
        </div>
      )}

      {activeOutlineTab === "world" && onDownloadStoryBible && (
        <OutlineDownloadButton
          onClick={onDownloadStoryBible}
          disabled={downloadStoryBibleDisabled}
          isBusy={isDownloadingStoryBible}
          label="Download Story Bible"
          title="Download your Story Bible as a Word document (.docx)"
          disabledTitle="Add Story Bible content first."
          ariaLabelBusy="Preparing Story Bible download"
          ariaLabelDisabled="Download Story Bible — add Story Bible content first"
          ariaLabelReady="Download Story Bible"
        />
      )}

      {activeOutlineTab === "world" && (
        <div className="outline-characters-inner flex-grow-1 d-flex flex-column">
          {masterPromptText || isEditingStoryBible ? (
            <>
              {!isStreaming && (
                <div className="outline-edit-controls d-flex justify-content-end gap-1 mt-1 mb-1">
                  {isEditingStoryBible ? (
                    <>
                      <button
                        className="sidebar-scene-edit-btn sidebar-scene-save-btn"
                        onClick={handleSaveStoryBible}
                        disabled={isSavingStoryBible}
                      >
                        {isSavingStoryBible ? "Saving…" : "Save"}
                      </button>
                      <button
                        className="sidebar-scene-edit-btn sidebar-scene-cancel-btn"
                        onClick={handleCancelEditStoryBible}
                        disabled={isSavingStoryBible}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      className="sidebar-scene-edit-btn sidebar-scene-edit-secondary-btn"
                      onClick={() => handleStartEditStoryBible(masterPromptText)}
                    >
                      Edit
                    </button>
                  )}
                </div>
              )}
              {isEditingStoryBible ? (
                <div
                  key="story-bible-editor"
                  ref={storyBibleEditRef}
                  className="sidebar-scene-inline-edit outline-story-bible-edit"
                  contentEditable={!isSavingStoryBible}
                  suppressContentEditableWarning={true}
                  aria-label="Edit Story Bible"
                  onBlur={(e) =>
                    setMasterPromptDraft(editableElToMarkdown(e.currentTarget))
                  }
                />
              ) : (
                <div
                  key="story-bible-display"
                  className="outline-character-content outline-story-bible-master flex-grow-1"
                >
                  {formatStoryBibleMasterPrompt(masterPromptText)}
                </div>
              )}
            </>
          ) : !worldBuilding && !specialElements ? (
            <p className="outline-characters-empty mb-0">
              No story bible content yet. It appears when your novel is built and the 📘 Story Bible
              document is saved (Olivia &quot;Build this Novel&quot; flow).
            </p>
          ) : (
            <>
              <Collapse
                className="outline-character-collapse mt-1"
                expandIconPosition="end"
                defaultActiveKey={[
                  ...(worldBuilding ? ["world-building"] : []),
                  ...(specialElements ? ["special-elements"] : []),
                ]}
              >
                <Panel header="World Building" key="world-building">
                  <div className="outline-character-content">
                    {worldBuilding ? (
                      formatCharacterText(worldBuilding)
                    ) : (
                      <p className="outline-world-section-empty mb-0">
                        No world building section was extracted.
                      </p>
                    )}
                  </div>
                </Panel>
                <Panel header="Special Elements" key="special-elements">
                  <div className="outline-character-content">
                    {specialElements ? (
                      formatCharacterText(specialElements)
                    ) : (
                      <p className="outline-world-section-empty mb-0">
                        No special elements section was extracted.
                      </p>
                    )}
                  </div>
                </Panel>
              </Collapse>
            </>
          )}
        </div>
      )}

      {/* Drag Preview — static decoration in .outline-drag-preview class
          (see bookEditor.scss); only the live cursor/touch position stays
          inline so React doesn't churn the class on every move. */}
      {draggedScene && (
        <div
          className="outline-drag-preview"
          style={{
            left: dragPreviewPosition.x,
            top: dragPreviewPosition.y,
          }}
        >
          {draggedScene.sceneTitle
            ? draggedScene.sceneTitle
            : storyResponseMap[draggedScene.promptKey]
            ? formatSceneTitle(storyResponseMap[draggedScene.promptKey])
            : `Chapter ${getGlobalSceneNumber(draggedScene.actNumber, draggedScene.sceneIndex, sidebarActOffsets)} Plan`}
        </div>
      )}
      {draggedCharacter && (
        <div
          className="outline-drag-preview"
          style={{
            left: dragPreviewPosition.x,
            top: dragPreviewPosition.y,
          }}
        >
          {characterAccordionHeaderLabel(draggedCharacter)}
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
        placeholder="Chapter title"
        saveLabel="Add chapter"
      />
      <AddCharacterModal
        show={showAddCharacterModal}
        onHide={() => setShowAddCharacterModal(false)}
        onAdd={handleAddCharacter}
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
