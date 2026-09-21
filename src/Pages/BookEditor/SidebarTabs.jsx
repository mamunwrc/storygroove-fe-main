import { Tabs } from "antd";
import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "react-toastify";
import { updateSceneSuggestion } from "../../api/bookGeneration";

/**
 * Convert markdown text to safe HTML for a contentEditable div.
 * React sets this via innerHTML (imperatively), so React never manages children
 * inside the contentEditable — avoiding the removeChild reconciliation crash.
 */
const markdownToEditableHtml = (text) => {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*\*(.+?)\*\*\*/gs, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/gs, "<strong>$1</strong>")
    .replace(/\*([^*\n]+?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");
};

const SidebarTabs = ({
  selectedScene,
  chapterNumber,
  formatSceneText,
  NotesEditor,
  bookId,
  isStreaming = false,
  isBootLoading = false,
  isGeneratingSceneSuggestion = false,
  sceneGenProgress = { current: 0, total: 0 },
  onSceneSuggestionUpdated,
}) => {
  const scenesContentRef = useRef(null);
  const inlineEditRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (scenesContentRef.current) {
      scenesContentRef.current.scrollTop = 0;
    }
    // Reset edit state when scene changes
    setIsEditing(false);
    setEditText("");
  }, [selectedScene.promptKey]);

  useEffect(() => {
    if (!isEditing || !inlineEditRef.current) return;
    const el = inlineEditRef.current;
    el.innerHTML = markdownToEditableHtml(editText);
    el.focus();
    // Place cursor at end
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  // editText intentionally excluded — only run when entering edit mode
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  // User-added scenes are editable even when empty so the writer can author their
  // own scene design from scratch — spine scenes still wait for Olivia-generated text.
  const isEditableScene =
    selectedScene.promptKey &&
    (selectedScene.text || selectedScene.isUserAdded);

  const handleEditToggle = () => {
    if (!isEditing) {
      setEditText(selectedScene.text || "");
    }
    setIsEditing((prev) => !prev);
  };

  const handleSave = useCallback(async () => {
    if (!bookId || !selectedScene.promptKey) return;
    // Snapshot the target promptKey at the moment the save is issued — the
    // user may switch scenes while the request is in-flight; without this
    // snapshot the async resolution could apply newText to whatever scene
    // they ended up on.
    const targetPromptKey = selectedScene.promptKey;
    setIsSaving(true);
    try {
      const latestText = inlineEditRef.current
        ? inlineEditRef.current.innerText
        : editText;
      await updateSceneSuggestion({
        novelId: bookId,
        promptKey: targetPromptKey,
        responseText: latestText,
      });
      toast.success("Chapter Design saved.");
      setIsEditing(false);
      if (onSceneSuggestionUpdated) {
        onSceneSuggestionUpdated(targetPromptKey, latestText);
      }
    } catch (error) {
      console.error("Save Chapter Design error:", error);
      toast.error("Failed to save Chapter Design.");
    } finally {
      setIsSaving(false);
    }
  }, [bookId, selectedScene.promptKey, editText, onSceneSuggestionUpdated]);

  const renderTabBar = (props, DefaultTabBar) => (
    <div className="sidebar-tabs-bar-with-avatar">
      <div className="sidebar-tabs-avatar">
        <img
          src="/assets/images/olivia.png"
          alt="Olivia"
          onError={(e) => {
            e.target.src = "/assets/images/avatar.jpg";
          }}
        />
      </div>
      <DefaultTabBar {...props} />
    </div>
  );

  return (
    <div className="sidebar-tabs-root">
      <div className="panel-header panel-header--right">
        <p className="panel-header-title">Chapter Coach</p>
        <p className="panel-header-subtitle">
          Olivia&apos;s guidance for the chapter selected in your outline.
        </p>
      </div>
      <Tabs
        defaultActiveKey="scenes"
        renderTabBar={renderTabBar}
        tabBarGutter={0}
        size="small"
        centered={true}
        items={[
          {
            key: "scenes",
            label: <div className="sidebar-tab-label">Chapter Design</div>,
            children: (
              <div className="sidebar-scene-pane d-flex flex-column flex-grow-1">
                <div className="sidebar-scene-pane-header d-flex align-items-center justify-content-between">
                  <div>
                    {selectedScene.actNumber != null &&
                      selectedScene.sceneIndex != null && (
                        <h2 className="sidebar-scene-heading mb-0">
                          Act {selectedScene.actNumber} | Chapter {chapterNumber ?? selectedScene.globalSceneNumber}
                        </h2>
                      )}
                  </div>
                  {isEditableScene && !isStreaming && !isGeneratingSceneSuggestion && (
                    <div className="sidebar-scene-edit-controls d-flex gap-1">
                      {isEditing ? (
                        <>
                          <button
                            className="sidebar-scene-edit-btn sidebar-scene-save-btn"
                            onClick={handleSave}
                            disabled={isSaving}
                          >
                            {isSaving ? "Saving…" : "Save"}
                          </button>
                          <button
                            className="sidebar-scene-edit-btn sidebar-scene-cancel-btn"
                            onClick={() => setIsEditing(false)}
                            disabled={isSaving}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          className="sidebar-scene-edit-btn sidebar-scene-edit-secondary-btn"
                          onClick={handleEditToggle}
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div
                  key={`scene-design-${selectedScene.promptKey || "none"}-${selectedScene.id || "none"}`}
                  ref={scenesContentRef}
                  className="sidebar-scene-content rounded mt-1"
                >
                  {isGeneratingSceneSuggestion && (
                    <div className="sidebar-scene-generating">
                      <div className="sidebar-scene-generating-header">
                        <span className="sidebar-scene-generating-pulse" />
                        <span className="sidebar-scene-generating-label">
                          Olivia is generating this chapter…
                        </span>
                        {isGeneratingSceneSuggestion && sceneGenProgress.total > 1 && (
                          <span className="sidebar-scene-generating-progress">
                            Chapter {sceneGenProgress.current} of {sceneGenProgress.total}
                          </span>
                        )}
                      </div>
                      <div className="sidebar-scene-progress-bar">
                        <div className="sidebar-scene-progress-bar-fill" />
                      </div>
                    </div>
                  )}
                  {isBootLoading && !isStreaming && !selectedScene.text ? (
                    <div className="sidebar-pane-skeleton" aria-label="Loading sidebar">
                      <div className="skeleton-bar w-70" />
                      <div className="skeleton-bar w-92" />
                      <div className="skeleton-bar w-88" />
                      <div className="skeleton-bar w-95" />
                      <div className="skeleton-bar w-80" />
                      <div className="skeleton-bar w-90" />
                      <div className="skeleton-bar w-75" />
                    </div>
                  ) : isEditing ? (
                    // Distinct key so React fully unmounts this contentEditable
                    // node when leaving edit mode. Without it, React reconciles
                    // the edit-mode div with the display-mode div (same type,
                    // no key), reuses the DOM node, and the untracked text
                    // node the user typed persists beside the newly-mounted
                    // ReactMarkdown output — causing a duplicated line until
                    // the next full unmount (refresh / scene change).
                    <div
                      key="scene-design-edit"
                      ref={inlineEditRef}
                      className="sidebar-scene-inline-edit"
                      contentEditable={!isSaving}
                      suppressContentEditableWarning={true}
                      aria-label="Edit Chapter Design"
                      onBlur={(e) => setEditText(e.currentTarget.innerText)}
                    />
                  ) : selectedScene.text ? (
                    <div key="scene-design-display">
                      {formatSceneText(selectedScene.text, selectedScene.promptKey)}
                    </div>
                  ) : isStreaming || isGeneratingSceneSuggestion ? (
                    <div
                      className={`scene-design-waiting${isGeneratingSceneSuggestion && !isStreaming ? " scene-design-waiting--compact" : ""}`}
                      aria-live="polite"
                    >
                      <div className="scene-design-waiting-card">
                        {!(isGeneratingSceneSuggestion && !isStreaming) && (
                          <>
                            <div className="scene-design-waiting-spinner" aria-hidden />
                            <p className="scene-design-waiting-title">
                              Chapter design is on the way
                            </p>
                            <p className="scene-design-waiting-sub">
                              Coaching notes, beats, and structure will stream into
                              this panel—usually within a few seconds once generation
                              starts.
                            </p>
                          </>
                        )}
                        {isGeneratingSceneSuggestion && !isStreaming && (
                          <p className="scene-design-waiting-compact-hint">
                            Chapter sections will fill in below as Olivia streams.
                          </p>
                        )}
                        <div className="scene-design-waiting-lines" aria-hidden>
                          <span className="scene-design-waiting-line" />
                          <span className="scene-design-waiting-line" />
                          <span className="scene-design-waiting-line scene-design-waiting-line--short" />
                        </div>
                      </div>
                    </div>
                  ) : selectedScene.isUserAdded ? (
                    <div className="scene-design-idle scene-design-idle--user">
                      <div className="scene-design-idle-icon" aria-hidden />
                      <p className="scene-design-idle-title">
                        Add a Manual Chapter
                      </p>
                      <p className="scene-design-idle-sub">
                        Write your own chapter design here. Capture beats, POV, tension,
                        or anything else that helps you draft. Click Edit to start.
                      </p>
                    </div>
                  ) : (
                    <div className="scene-design-idle">
                      <div className="scene-design-idle-icon" aria-hidden />
                      <p className="scene-design-idle-title">No chapter design here yet</p>
                      <p className="scene-design-idle-sub">
                        Choose a chapter that already has outline content, or use{" "}
                        <strong>Olivia</strong> to build the next chapter—details will
                        appear in this panel when they&apos;re ready.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ),
          },
          {
            key: "scene-notes",
            label: <div className="sidebar-tab-label">Chapter Notes</div>,
            children: (
              <div className="sidebar-notes-pane d-flex flex-column flex-grow-1">
                <p className="sidebar-notes-subtitle small text-muted mb-2">
                  Notes for the chapter selected in your outline.
                </p>
                <NotesEditor
                  bookId={bookId}
                  scope="scene"
                  userContentId={selectedScene.id}
                  promptKey={selectedScene.promptKey}
                  sceneLabel={
                    selectedScene.actNumber != null &&
                    selectedScene.sceneIndex != null
                      ? `Act ${selectedScene.actNumber} | Chapter ${
                          chapterNumber ?? selectedScene.globalSceneNumber
                        }`
                      : null
                  }
                />
              </div>
            ),
          },
          {
            key: "book-notes",
            label: <div className="sidebar-tab-label">Project Notes</div>,
            children: (
              <div className="sidebar-notes-pane d-flex flex-column flex-grow-1">
                <p className="sidebar-notes-subtitle small text-muted mb-2">
                  Keep bigger-picture notes that are not tied to one chapter: future
                  ideas, timeline questions, continuity reminders, marketing ideas,
                  or things to revisit later.
                </p>
                <NotesEditor bookId={bookId} scope="story" />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
};

export default SidebarTabs;
