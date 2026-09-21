import { PiBookOpen } from "react-icons/pi";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { computeActOffsets, getGlobalSceneNumber } from "../BookEditor/utils";

const ReviewOutlineSidebar = ({
  bookData,
  selectedScene,
  setSelectedScene,
  saveUserContent,
  content,
  storyResponseMap,
  expandedAct,
  setExpandedAct,
  formatSceneTitle,
}) => {
  // Render acts and scenes by promptKey
  const renderActsAndScenes = () => {
    if (!bookData?.userContents) return null;

    const filteredContents = bookData.userContents.filter(
      (c) => c.promptKey !== "bookblurb" && c.promptKey !== "synopsis"
    );
    const reviewOffsets = computeActOffsets(filteredContents);

    // Check if any content has act numbers
    const hasActStructure = filteredContents.some(
      (content) => content.actNumber
    );

    if (!hasActStructure) {
      // Render flat list of scenes when no act structure exists
      const scenes = filteredContents
        .map((content, index) => ({ ...content, originalIndex: index }))
        .sort((a, b) => (a.sceneIndex || 0) - (b.sceneIndex || 0));

      return (
        <div className="scene-item-list">
          {scenes.map((sceneData) => {
            const isSelected = selectedScene.id === sceneData._id;

            return (
              <div
                key={sceneData.promptKey}
                style={{
                  cursor: "pointer",
                  backgroundColor: isSelected ? "#03587a" : "transparent",
                  position: "relative",
                }}
                className="scene-item"
                onClick={(e) => {
                  if (content && selectedScene.id) saveUserContent();
                  setSelectedScene({
                    promptKey: sceneData.promptKey,
                    text: "",
                    index: sceneData.originalIndex,
                    id: sceneData._id,
                    sceneIndex: sceneData.sceneIndex
                  });
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  <span>
                    {sceneData.sceneTitle
                      ? sceneData.sceneTitle
                      : storyResponseMap[sceneData.promptKey]
                      ? formatSceneTitle(storyResponseMap[sceneData.promptKey])
                      : `Scene ${getGlobalSceneNumber(sceneData.actNumber || 1, sceneData.sceneIndex || 1, reviewOffsets)}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // Original act-based rendering logic
    const actGroups = filteredContents.reduce((acc, content, index) => {
      const actNum = content.actNumber || 1;
      if (!acc[actNum]) acc[actNum] = [];
      acc[actNum].push({ ...content, originalIndex: index });
      return acc;
    }, {});

    return Object.keys(actGroups)
      .sort((a, b) => Number(a) - Number(b))
      .map((actNum) => {
        const actScenes = actGroups[actNum].sort(
          (a, b) => (a.sceneIndex || 0) - (b.sceneIndex || 0)
        );

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
                {actScenes.map((sceneData) => {
                  const isSelected =
                    selectedScene.id === sceneData._id;

                  return (
                    <div
                      key={sceneData.promptKey}
                      style={{
                        cursor: "pointer",
                        backgroundColor: isSelected ? "#03587a" : "transparent",
                        position: "relative",
                      }}
                      className="scene-item"
                      onClick={(e) => {
                        if (content && selectedScene.id) saveUserContent();
                        setSelectedScene({
                          promptKey: sceneData.promptKey,
                          text: "",
                          index: sceneData.originalIndex,
                          id: sceneData._id,
                          sceneIndex: sceneData.sceneIndex
                        });
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          width: "100%",
                        }}
                      >
                        <span>
                          {sceneData.sceneTitle
                            ? sceneData.sceneTitle
                            : storyResponseMap[sceneData.promptKey]
                            ? formatSceneTitle(
                                storyResponseMap[sceneData.promptKey]
                              )
                            : `Scene ${getGlobalSceneNumber(sceneData.actNumber || Number(actNum), sceneData.sceneIndex || 1, reviewOffsets)}`}
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
  };

  return (
    <div className="d-flex flex-column outline-box">
      <div className="d-flex align-items-center justify-content-between p-3">
        <div className="m-0 fs-6 fw-light fst-italic">Outline:</div>
      </div>
      {renderActsAndScenes()}
    </div>
  );
};

export default ReviewOutlineSidebar;
