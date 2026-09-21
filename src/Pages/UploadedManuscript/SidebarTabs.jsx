import { useState } from "react";
import { Tabs } from "antd";
import { LuDownload, LuLoader2 } from "react-icons/lu";
import { toast } from "react-toastify";
import { downloadChapterPlan } from "../../api/bookGeneration";
import SceneEditPanel from "./SceneEditPanel";

/**
 * Right sidebar for the upload viewer: Chapter Edits (original Ellis reviews),
 * Chapter Notes, and Project Notes.
 */
const SidebarTabs = ({
  NotesEditor,
  bookId,
  bookName = "",
  selectedScene,
  selectedChapter = null,
  chapters = [],
  letterReady = false,
  ellisAccessible = true,
  subscriptionPaused = false,
  reviewProgress = {},
  reviewRefreshToken = 0,
  activeTab = "sceneEdit",
  onTabChange,
}) => {
  const blocked = !ellisAccessible || subscriptionPaused;
  const [isDownloadingPlan, setIsDownloadingPlan] = useState(false);

  const handleDownloadChapterPlan = async () => {
    if (isDownloadingPlan || !bookId) return;
    setIsDownloadingPlan(true);
    try {
      await downloadChapterPlan(bookId, { suggestedTitle: bookName });
      toast.success("Chapter Plan ready — check your downloads folder.");
    } catch (error) {
      const status = error?.response?.status;
      if (status === 404) {
        toast.error(
          "No chapter reviews have been inserted into your Revision Plan yet."
        );
      } else {
        toast.error("Could not download the Chapter Plan.");
      }
    } finally {
      setIsDownloadingPlan(false);
    }
  };

  const renderTabBar = (props, DefaultTabBar) => (
    <div className="sidebar-tabs-bar-with-avatar">
      <div className="sidebar-tabs-avatar">
        <img
          src="/assets/images/ellis.png"
          alt="Ellis"
          onError={(e) => {
            e.target.src = "/assets/images/Ellis-Avatar.jpg";
          }}
        />
      </div>
      <DefaultTabBar {...props} />
    </div>
  );

  const sceneLabel = selectedChapter?.label || null;

  return (
    <div className="sidebar-tabs-root sidebar-tabs-root--ellis">
      <div className="panel-header panel-header--right">
        <p className="panel-header-title">Ellis' Editing Plan</p>
        <p className="panel-header-subtitle">
          Review chapter by chapter developmental edits with Ellis and insert them
          Into your revision plan here.
        </p>
      </div>
      <div className="chapter-plan-download-wrap">
        <button
          type="button"
          className={[
            "chapter-plan-download-btn",
            isDownloadingPlan && "chapter-plan-download-btn--busy",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={handleDownloadChapterPlan}
          disabled={isDownloadingPlan || blocked}
          title="Download your Chapter Plan as a Word document (.docx)"
          aria-label={
            isDownloadingPlan
              ? "Preparing Chapter Plan download"
              : "Download Editing Plan"
          }
          aria-busy={isDownloadingPlan}
        >
          {isDownloadingPlan ? (
            <LuLoader2
              size={15}
              className="chapter-plan-download-btn__spinner"
              aria-hidden
            />
          ) : (
            <LuDownload size={15} aria-hidden />
          )}
          <span className="chapter-plan-download-btn__label">
            {isDownloadingPlan ? "Preparing…" : "Download Editing Plan"}
          </span>
        </button>
      </div>
      <Tabs
        activeKey={activeTab}
        onChange={(key) => onTabChange?.(key)}
        renderTabBar={renderTabBar}
        tabBarGutter={0}
        size="small"
        centered={true}
        items={[
          {
            key: "sceneEdit",
            label: <div className="sidebar-tab-label">Chapter Edits</div>,
            children: (
              <div className="sidebar-scene-pane d-flex flex-column flex-grow-1">
                <p className="sidebar-notes-subtitle small text-muted mb-2">
                  Ellis&apos;s original editorial review and recommended changes
                </p>
                <SceneEditPanel
                  novelId={bookId}
                  selectedChapter={selectedChapter}
                  chapters={chapters}
                  letterReady={letterReady}
                  blocked={blocked}
                  reviewProgress={reviewProgress}
                  reviewRefreshToken={reviewRefreshToken}
                />
              </div>
            ),
          },
          {
            key: "scene-notes",
            label: <div className="sidebar-tab-label">Chapter Notes</div>,
            children: (
              <div className="sidebar-notes-pane d-flex flex-column flex-grow-1">
                <p className="sidebar-notes-subtitle small text-muted mb-2">
                  Notes for the chapter selected in your Manuscript Map.
                </p>
                <NotesEditor
                  bookId={bookId}
                  scope="scene"
                  userContentId={selectedScene?.id}
                  promptKey={selectedScene?.promptKey}
                  sceneLabel={sceneLabel}
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
                  Keep bigger-picture notes that are not tied to one chapter:
                  future ideas, timeline questions, continuity reminders, or
                  things to revisit later.
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
