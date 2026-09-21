const BookCoverStudioTabs = ({
  activeTab,
  onTabChange,
  versionCount = 0,
}) => {
  return (
    <div className="bcs-tabs" role="tablist" aria-label="Cover studio sections">
      <button
        type="button"
        role="tab"
        id="bcs-tab-studio"
        aria-selected={activeTab === "studio"}
        aria-controls="bcs-panel-studio"
        className={[
          "bcs-tab",
          activeTab === "studio" && "bcs-tab--active",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => onTabChange("studio")}
      >
        Studio
      </button>
      <button
        type="button"
        role="tab"
        id="bcs-tab-covers"
        aria-selected={activeTab === "covers"}
        aria-controls="bcs-panel-covers"
        className={[
          "bcs-tab",
          activeTab === "covers" && "bcs-tab--active",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => onTabChange("covers")}
      >
        Covers
        {versionCount > 0 && (
          <span className="bcs-tab__badge" aria-label={`${versionCount} versions`}>
            {versionCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default BookCoverStudioTabs;
