import { useEffect, useState, useCallback, useRef } from "react";
import {
  getABook,
  getAllCharactersOfaBook,
  renameScene,
  updateUserContent,
} from "../../api/bookGeneration";
import { Button } from "react-bootstrap";
import RichTextEditor from "../../component/richTextEditor/RichTextEditor";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { LuDownload } from "react-icons/lu";
import FinalizeDraftConfirmationModal from "../../component/Modal/FinalizeDraftConfirmationModal";
import NotesEditor from "../../component/bookGeneration/Notes";
import OutlineSidebar from "./OutlineSidebar";
import SidebarTabs from "./SidebarTabs";
import WordCountBar from "./WordCountBar";
import RenameSceneModal from "./RenameSceneModal";
import {
  getStoryResponseMap,
  formatSceneText,
  formatCharacterText,
  formatSceneTitle,
} from "./utils";
import "./BookEditorPage.scss";

const BookEditorPage = ({ isReadOnly = false, showSidebarTabs = true, showDownloadButton = false }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Check URL params for view mode
  const searchParams = new URLSearchParams(window.location.search);
  const isViewMode = searchParams.get("view") === "true" || isReadOnly;
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedScene, setSelectedScene] = useState({
    promptKey: null,
    text: null,
    index: null,
    id: null,
  });
  const [expandedAct, setExpandedAct] = useState(1);
  const [bookData, setBookData] = useState({ acts: [] });
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newSceneTitle, setNewSceneTitle] = useState("");
  const [content, setContent] = useState("");
  const [characterListData, setCharacterListData] = useState([]);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [totalWordCount, setTotalWordCount] = useState(0);
  const abortControllerRef = { current: null };
  const [scenes, setScenes] = useState(Array(15).fill(null));

  // New state variables for improved auto-save and first load handling
  const [lastSavedContent, setLastSavedContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasInitialContentSet, setHasInitialContentSet] = useState(false);
  const [hasSelectedInitialScene, setHasSelectedInitialScene] = useState(false);
  const saveTimeoutRef = useRef(null);
  const prevSceneIdRef = useRef(null);

  const storyResponseMap = getStoryResponseMap(bookData.storyResponses);
  const MAX_WORD_COUNT = bookData.wordCount;
  const wordPercent = Math.min(
    Math.round((totalWordCount / MAX_WORD_COUNT) * 100),
    100
  );

  const fetchBookData = async (id) => {
    if (!id) return;
    try {
      const response = await getABook(id);
      setBookData((prev) => ({
        ...prev,
        ...response.data,
        novelId: response.data._id,
      }));
    } catch (error) {
      console.error(error);
    }
  };

  // Fetch book details
  useEffect(() => {
    fetchBookData(id);
  }, [id]);

  // Determine if we should be in view mode based on book status
  const shouldBeReadOnly = isViewMode || bookData?.status === "completed";
  
  // For completed books, hide sidebar tabs and show download button
  const effectiveShowSidebarTabs = shouldBeReadOnly ? false : showSidebarTabs;
  const effectiveShowDownloadButton = shouldBeReadOnly ? true : showDownloadButton;

  // Fetch characters
  useEffect(() => {
    if (!id) return;
    getAllCharactersOfaBook(id)
      .then((response) => setCharacterListData(response.data.characters))
      .catch(console.error);
  }, [id]);

  // Set initial selected scene
  useEffect(() => {
    if (
      !hasSelectedInitialScene &&
      bookData?.userContents &&
      bookData.userContents.length > 0 &&
      selectedScene.promptKey === null &&
      selectedScene.id === null
    ) {
      const firstScene = bookData.userContents[0];
      setSelectedScene({
        promptKey: firstScene.promptKey || null,
        text:
          storyResponseMap[firstScene.promptKey] ||
          firstScene.userContent ||
          "",
        actNumber: firstScene.actNumber,
        sceneIndex: firstScene.sceneIndex,
        id: firstScene._id,
      });
      setHasSelectedInitialScene(true);
    }
  }, [
    bookData?.userContents,
    bookData?.storyResponses,
    selectedScene.promptKey,
    selectedScene.id,
    storyResponseMap,
    hasSelectedInitialScene,
  ]);

  // FIXED: Set content when selectedScene changes - handles first load properly
  useEffect(() => {
    if (!bookData?.userContents) {
      setContent("");
      setLastSavedContent("");
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

    const newContent = scene?.userContent || "";

    if (newContent !== content) {
      setContent(newContent);
      setLastSavedContent(newContent);
    }
  }, [bookData, selectedScene]);

  // Reset flags when scene changes (for proper scene switching)
  useEffect(() => {
    if (selectedScene.promptKey !== null) {
      // Save current content before switching if there are unsaved changes
      if (
        content !== lastSavedContent &&
        selectedScene.id &&
        content.trim() !== "" &&
        !isInitialLoad
      ) {
        saveUserContent();
      }
      // Reset the initial content flag for new scene
      setHasInitialContentSet(false);
    }
  }, [selectedScene.promptKey]);

  // Word count calculation
  useEffect(() => {
    if (!bookData?.userContents) return;
    const total = bookData.userContents.reduce((sum, item) => {
      const isSelected = selectedScene.id && item._id === selectedScene.id;
      const contentToCount = isSelected
        ? content || ""
        : item?.userContent || "";
      return (
        sum +
        contentToCount
          .replace(/<[^>]*>/g, "")
          .replace(/&nbsp;/g, " ")
          .replace(/&[a-zA-Z0-9#]+;/g, "")
          .trim()
          .split(/\s+/)
          .filter((word) => word.length > 0).length
      );
    }, 0);
    setTotalWordCount(total);
  }, [bookData?.userContents, content, selectedScene.id]);

  // IMPROVED Auto-save content - disabled during initial load
  useEffect(() => {
    // Don't auto-save during initial load or if we haven't set initial content yet
    if (!selectedScene.id || content == null || isSaving) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    if (content.trim() !== "" && content !== lastSavedContent) {
      saveTimeoutRef.current = setTimeout(() => {
        saveUserContent();
      }, 2000);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, selectedScene.id, lastSavedContent, isSaving]);

  // SSE logic
  useEffect(() => {
    if (
      bookData &&
      bookData.novelId &&
      (!bookData.storyResponses || bookData.storyResponses.length < 17)
    ) {
      startSSE();
    }
  }, [bookData?.novelId]);

  const startSSE = useCallback(async () => {
    if (isStreaming) return;

    try {
      setIsStreaming(true);
      abortControllerRef.current = new AbortController();

      const response = await fetch(
        `${process.env.REACT_APP_BASE_URL}/api/novel/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
            Authorization: `Bearer ${localStorage.getItem("userToken")}`,
          },
          body: JSON.stringify(bookData),
          signal: abortControllerRef.current.signal,
        }
      );

      // Handle non-SSE errors (validation, not found, etc.)
      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || `Error: ${response.status}`, { autoClose: 6000 });
        setIsStreaming(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const processChunks = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataString = line.substring(6);
              try {
                const data = JSON.parse(dataString);

                // Handle SSE errors
                if (data.error) {
                  toast.error(data.error);
                  setIsStreaming(false);
                  return;
                }

                const sceneKey = Object.keys(data)[0];
                if (sceneKey && sceneKey.startsWith("scene")) {
                  const sceneIndex =
                    parseInt(sceneKey.replace("scene", "")) - 1;
                  if (sceneIndex >= 0 && sceneIndex < 15) {
                    setScenes((prevScenes) => {
                      const newScenes = [...prevScenes];
                      newScenes[sceneIndex] = data[sceneKey];

                      if (sceneIndex === 0 && !selectedScene.text) {
                        setSelectedScene({
                          ...selectedScene,
                          index: sceneIndex,
                          text: data[sceneKey],
                        });
                      }
                      return newScenes;
                    });
                  }
                }
              } catch (e) {
                console.error("Error parsing SSE data:", e);
              }
            }
          }
        }

        fetchBookData(id);
        setIsStreaming(false);
      };

      await processChunks();
    } catch (error) {
      if (error.name !== "AbortError") {
        toast.error("Failed to generate book content");
      }
      setIsStreaming(false);
    }
  }, [bookData, isStreaming, selectedScene, id]);

  // Save user content function
  const saveUserContent = async () => {
    if (!selectedScene.id || isSaving) return;

    setIsSaving(true);

    try {
      let body = { id: selectedScene.id, userContent: content };
      let response = await updateUserContent(body);

      if (response.status !== 200) {
        toast.error("Something went wrong");
      } else {
        // Update lastSavedContent to prevent unnecessary saves
        setLastSavedContent(content);

        // Update bookData without triggering content reset
        setBookData((prev) => {
          const updatedContents = [...(prev.userContents || [])];
          let idx = updatedContents.findIndex(
            (c) =>
              c.promptKey === selectedScene.promptKey ||
              c._id === selectedScene.id
          );
          if (idx !== -1) {
            updatedContents[idx] = {
              ...updatedContents[idx],
              userContent: content,
            };
          }
          return { ...prev, userContents: updatedContents };
        });
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save content");
    } finally {
      setIsSaving(false);
    }
  };

  // Manual save function for immediate saves
  const saveImmediately = async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    await saveUserContent();
  };

  // Get save status for UI feedback
  const getSaveStatus = () => {
    if (isInitialLoad) return "Loading...";
    if (isSaving) return "Saving...";
    if (content === lastSavedContent) return "Saved";
    return "Unsaved changes";
  };

  // Update scene title by promptKey
  const updateSceneTitle = async () => {
    let body = { novelId: id, id: selectedScene.id, sceneTitle: newSceneTitle };
    let response = await renameScene(body);
    if (response.status === 200) {
      setBookData((prev) => {
        const updatedContents = [...(prev.userContents || [])];
        let idx = updatedContents.findIndex(
          (c) =>
            c.promptKey === selectedScene.promptKey ||
            c._id === selectedScene.id
        );
        if (idx !== -1) updatedContents[idx].sceneTitle = newSceneTitle;
        return { ...prev, userContents: updatedContents };
      });
      setShowRenameModal(false);
      setNewSceneTitle("");
    }
  };

  // Finalize
  const handleSaveContinue = () => setShowFinalizeModal(true);
  const handleFinalizeClose = () => setShowFinalizeModal(false);
  const handleFinalizeConfirm = () => {
    setShowFinalizeModal(false);
    navigate(`/dashboard/finaldraft/${id}`);
  };

  // Save content on scene change if there are unsaved changes
  useEffect(() => {
    if (
      prevSceneIdRef.current &&
      prevSceneIdRef.current !== selectedScene.id &&
      content !== lastSavedContent &&
      prevSceneIdRef.current !== null
    ) {
      saveUserContent();
    }
    prevSceneIdRef.current = selectedScene.id;
  }, [selectedScene.id]);

  return (
    <div className="d-flex w-100" style={{ height: "100vh", minHeight: "100vh" }}>
      <OutlineSidebar
        bookData={bookData}
        selectedScene={selectedScene}
        setSelectedScene={setSelectedScene}
        saveUserContent={saveImmediately}
        setBookData={setBookData}
        content={content}
        storyResponseMap={storyResponseMap}
        expandedAct={expandedAct}
        setExpandedAct={setExpandedAct}
        formatSceneTitle={formatSceneTitle}
        setShowRenameModal={setShowRenameModal}
        scenes={scenes}
        isStreaming={isStreaming}
      />
      <div className="w-100 d-flex flex-column storygroove-theme" style={{ height: "100vh", overflow: "hidden" }}>
        <WordCountBar
          bookName={bookData?.name}
          totalWordCount={totalWordCount}
          MAX_WORD_COUNT={MAX_WORD_COUNT}
          wordPercent={wordPercent}
        />
        <div className="d-flex flex-row w-100 gap-4 p-4" style={{ height: "calc(100vh - 80px)", minHeight: 0 }}>
          <div
            style={{ width: effectiveShowSidebarTabs ? "70%" : "100%", height: "100%" }}
            className="d-flex flex-column box-shadow position-relative"
          >
            <RichTextEditor 
              content={content} 
              setContent={shouldBeReadOnly ? () => {} : setContent}
              readOnly={shouldBeReadOnly}
            />
            {/* Optional: Add save status indicator */}
            {!shouldBeReadOnly && (
              <div
                className="save-status position-absolute"
                style={{
                  top: "10px",
                  right: "10px",
                  fontSize: "12px",
                  color: "#666",
                }}
              >
                {getSaveStatus()}
              </div>
            )}
          </div>
          {effectiveShowSidebarTabs && (
            <div
              style={{ width: "30%", height: "100%" }}
              className="d-flex flex-column box-shadow book-editor-container p-4"
            >
              {!shouldBeReadOnly && (
                <Button
                  onClick={handleSaveContinue}
                  className="align-self-end border m-2 position-absolute top-0 end-0"
                >
                  Save & Continue &nbsp;<span>➔</span>
                </Button>
              )}
              {effectiveShowDownloadButton && (
                <Button
                  onClick={async () => {
                    try {
                      const { downloadManuscript } = await import("../../api/bookGeneration");
                      await downloadManuscript(id);
                    } catch (error) {
                      console.error("Download failed:", error);
                    }
                  }}
                  className="align-self-end border m-2 position-absolute top-0 end-0"
                >
                  Download Manuscript &nbsp;
                  <LuDownload />
                </Button>
              )}
              <SidebarTabs
                selectedScene={selectedScene}
                formatSceneText={formatSceneText}
                NotesEditor={NotesEditor}
                bookId={id}
              />
            </div>
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
        </div>
      </div>
    </div>
  );
};

export default BookEditorPage;
