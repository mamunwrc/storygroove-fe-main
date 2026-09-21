// FinalDriftPage.jsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  completeBook,
  downloadManuscript,
  getBookReviews,
  reviewBook,
  updateUserContent,
} from "../../api/bookGeneration";
import RichTextEditor from "../../component/richTextEditor/RichTextEditor";
import { DRAFT_AUTOSAVE_DEBOUNCE_MS } from "../../constants/editorConstants";
import {
  getStoryResponseMap,
  formatSceneTitle,
  formatReview,
} from "../BookEditor/utils";
import {
  BiLoaderAlt,
  LiaDotCircleSolid,
  IoMdCheckmarkCircleOutline,
} from "../../Common/StepperIcons";
import { FaChevronRight } from "react-icons/fa6";
import { Button } from "react-bootstrap";
import { LuDownload } from "react-icons/lu";
import "./FinalDriftPage.scss";
import WordCountBar from "../BookEditor/WordCountBar";
import ReviewOutlineSidebar from "./ReviewOutlineSidebar";
import { toast } from "react-toastify";
import { Spin, Tabs } from "antd";
import NotesEditor from "../../component/bookGeneration/Notes";

const FinalDriftPage = () => {
  const { id } = useParams();
  const [bookData, setBookData] = useState({ acts: [] });
  const [selectedScene, setSelectedScene] = useState({
    promptKey: null,
    index: null,
    id: null,
    sceneIndex: null,
  });
  const [expandedAct, setExpandedAct] = useState(1);
  const [content, setContent] = useState("");
  const [totalWordCount, setTotalWordCount] = useState(0);
  // const stepList = ["evaluation", "development", "line", "copyedit"];
  const stepList = ["evaluation", "development", "copyedit"];
  const [activeTab, setActiveTab] = useState(stepList[0]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [completingBook, setCompletingBook] = useState(false); // Add loading state for complete book
  const [downloadingManuscript, setDownloadingManuscript] = useState(false);
  const downloadManuscriptInFlightRef = useRef(false);

  const storyResponseMap = getStoryResponseMap(bookData.storyResponses);
  const MAX_WORD_COUNT = bookData.wordCount || 1;
  const wordPercent = Math.min(
    Math.round((totalWordCount / MAX_WORD_COUNT) * 100),
    100
  );

  // Check if book is completed
  const isBookCompleted = bookData?.status === "completed";

  useEffect(() => {
    // Function to check if review exists for current step
    const checkAndFetchReview = async () => {
      if (!bookData?.reviews || !activeTab || !id) return;

      // Check if review exists for current step and scene
      const existingReview = bookData.reviews.find(
        ({ pillar, actNumber, sceneIndex }) =>
          pillar === activeTab &&
          (actNumber == null ||
            sceneIndex == null ||
            (actNumber === expandedAct &&
              sceneIndex === selectedScene?.sceneIndex))
      );

      // If no review exists, fetch it
      if (!existingReview) {
        try {
          setReviewLoading(true);
          let body = {
            novelId: id,
            pillar: activeTab,
          };
          const review = await reviewBook(body);
          const reviewsToAdd = Array.isArray(review) ? review : [review];
          setBookData((prev) => ({
            ...prev,
            reviews: [...(prev.reviews || []), ...reviewsToAdd],
          }));
        } catch (error) {
          toast.error("Failed to fetch review");
        } finally {
          setReviewLoading(false);
        }
      }
    };

    checkAndFetchReview();
  }, [activeTab, bookData.reviews]);

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const response = await getBookReviews(id);
        setBookData((prev) => ({
          ...prev,
          ...response.data,
          novelId: response.data._id,
        }));
      } catch (err) {
        console.error(err);
      }
    };
    if (id) fetchBook();
  }, [id]);

  useEffect(() => {
    if (
      bookData?.userContents &&
      bookData.userContents.length > 0 &&
      selectedScene.promptKey === null
    ) {
      const firstScene = bookData.userContents[0];
      setSelectedScene({
        promptKey: firstScene.promptKey,
        index: 0,
        id: firstScene._id,
        sceneIndex: 1,
      });
    }
  }, [
    bookData?.userContents,
    bookData?.storyResponses,
    selectedScene.promptKey,
    storyResponseMap,
  ]);

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

  useEffect(() => {
    if (!bookData?.userContents) {
      setContent("");
      return;
    }
    const scene = bookData.userContents.find((c) => c._id === selectedScene.id);
    setContent(scene?.userContent || "");
  }, [bookData, selectedScene]);

  const currentStepIdx = stepList.indexOf(activeTab);
  const isFinalStep = currentStepIdx === stepList.length - 1;

  const handleNextStep = async () => {
    if (!isFinalStep) {
      setActiveTab(stepList[currentStepIdx + 1]);
    } else {
      // Handle complete book
      try {
        setCompletingBook(true);
        await completeBook(id);

        // Update book status to completed
        setBookData((prev) => ({
          ...prev,
          status: "completed",
        }));

        toast.success("Book completed successfully!");
      } catch (error) {
        toast.error("Failed to complete book");
        console.error("Error completing book:", error);
      } finally {
        setCompletingBook(false);
      }
    }
  };

  const handleDownloadManuscript = useCallback(async () => {
    if (downloadManuscriptInFlightRef.current) return;
    downloadManuscriptInFlightRef.current = true;
    setDownloadingManuscript(true);
    try {
      await downloadManuscript(id, { suggestedTitle: bookData?.name });
      toast.success("Manuscript ready — check your downloads folder.");
    } catch (error) {
      console.error("Download manuscript error:", error);
      toast.error("Could not download manuscript. Try again.");
    } finally {
      downloadManuscriptInFlightRef.current = false;
      setDownloadingManuscript(false);
    }
  }, [id, bookData?.name]);

  useEffect(() => {
    if (!selectedScene.id || content == null) return;
    const currentSceneId = selectedScene.id;
    const currentContent = content;
    const timeoutId = setTimeout(() => {
      if (
        selectedScene.id === currentSceneId &&
        content === currentContent &&
        content.trim() !== ""
      ) {
        saveUserContent();
      }
    }, DRAFT_AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(timeoutId);
  }, [content, selectedScene.id]);

  const saveUserContent = async () => {
    if (!selectedScene.id) return;
    let body = { id: selectedScene.id, userContent: content };
    let response = await updateUserContent(body);
    if (response.status !== 200) {
      toast.error("Something went wrong");
    } else {
      setBookData((prev) => {
        const updatedContents = [...(prev.userContents || [])];
        let idx = updatedContents.findIndex((c) => c._id === selectedScene.id);
        if (idx !== -1) {
          updatedContents[idx] = {
            ...updatedContents[idx],
            userContent: content,
          };
        }
        return { ...prev, userContents: updatedContents };
      });
    }
  };

  // Determine button text and state
  const getButtonProps = () => {
    if (isBookCompleted && isFinalStep) {
      return {
        text: "Completed",
        disabled: true,
        variant: "outline-primary",
      };
    } else if (isFinalStep) {
      return {
        text: completingBook ? "Completing..." : "Complete Book",
        disabled: completingBook,
        variant: "outline-primary",
      };
    } else {
      return {
        text: "Next",
        disabled: false,
        variant: "outline-primary",
      };
    }
  };

  const buttonProps = getButtonProps();

  return (
    <div className="d-flex w-100 h-100 finaldrift-page">
      <ReviewOutlineSidebar
        bookData={bookData}
        selectedScene={selectedScene}
        setSelectedScene={setSelectedScene}
        saveUserContent={saveUserContent}
        content={content}
        storyResponseMap={storyResponseMap}
        expandedAct={expandedAct}
        setExpandedAct={setExpandedAct}
        formatSceneTitle={formatSceneTitle}
      />
      <div className="w-100 d-flex flex-column storygroove-theme">
        <WordCountBar
          bookName={bookData?.name}
          totalWordCount={totalWordCount}
          MAX_WORD_COUNT={MAX_WORD_COUNT}
          wordPercent={wordPercent}
        />
        <div className="page-heading d-flex align-items-center justify-content-between">
          {/* Flex container for stepper and button */}
          <div className="d-flex align-items-center w-100">
            {/* Stepper takes remaining space */}
            <div className="book-final-drift-stepper flex-grow-1">
              <div className="custom-stepper w-100 d-flex">
                {stepList.map((step, idx) => {
                  const isActive = activeTab === step;
                  const isCompleted = currentStepIdx > idx;
                  let icon = isCompleted ? (
                    <IoMdCheckmarkCircleOutline color="#219653" size={28} />
                  ) : isActive ? (
                    reviewLoading ? (
                      <div
                        className="d-flex align-items-center justify-content-center"
                        style={{ width: 28, height: 28 }}
                      >
                        <Spin spinning={true} size="small" />
                      </div>
                    ) : (
                      <LiaDotCircleSolid color="#1da1f2" size={28} />
                    )
                  ) : (
                    <LiaDotCircleSolid color="#CCD4D8" size={28} />
                  );

                  const labels = {
                    evaluation: "Full Manuscript Evaluation",
                    development: "Developmental Edit",
                    line: "Line Edit",
                    copyedit: "Copyedit Edit",
                  };

                  return (
                    <React.Fragment key={step}>
                      <div
                        className="d-flex align-items-center"
                        onClick={() => isCompleted && setActiveTab(step)}
                      >
                        <div
                          className={`sub-step${isActive ? " active" : ""}${
                            isCompleted ? " selected" : ""
                          } d-flex align-items-center justify-content-center`}
                          style={{ cursor: "default" }}
                        >
                          {icon}
                        </div>
                        <span
                          className="sub-step-label"
                          style={{
                            cursor: "default",
                            color: isCompleted
                              ? "#219653"
                              : isActive
                              ? "#1da1f2"
                              : "#888",
                            fontWeight: isActive ? 600 : 400,
                          }}
                        >
                          {labels[step]}
                        </span>
                      </div>
                      {idx < stepList.length - 1 && (
                        <FaChevronRight
                          className="mx-3"
                          style={{
                            color: isCompleted ? "#219653" : "#e0e0e0",
                            fontSize: 22,
                          }}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            <div className="stepper-btn-container flex-shrink-0 me-4">
              <Button
                variant={buttonProps.variant}
                className={
                  buttonProps.variant === "success"
                    ? "sg-btn-success rounded-pill"
                    : "sg-btn-outline rounded-pill"
                }
                onClick={handleNextStep}
                disabled={buttonProps.disabled}
              >
                {buttonProps.text}
                {!isBookCompleted && !completingBook && (
                  <FaChevronRight className="ms-2" />
                )}
                {completingBook && (
                  <Spin spinning={true} size="small" className="ms-2" />
                )}
              </Button>
            </div>
          </div>
        </div>
        <div className="d-flex flex-row w-100 gap-4 p-4 pt-0">
          <div
            style={{ width: "70%" }}
            className={"d-flex flex-column box-shadow position-relative"}
          >
            <RichTextEditor
              height="65vh"
              content={content}
              setContent={setContent}
            />
          </div>
          <div
            style={{ width: "30%" }}
            className="d-flex flex-column box-shadow book-editor-container p-4"
          >
            <Button
              onClick={handleDownloadManuscript}
              className="align-self-end border m-2 position-absolute top-0 end-0"
              disabled={!isBookCompleted || downloadingManuscript}
              aria-busy={downloadingManuscript}
              aria-label={
                downloadingManuscript
                  ? "Preparing manuscript download"
                  : "Download manuscript as Word file"
              }
            >
              {downloadingManuscript ? (
                <>
                  <Spin spinning size="small" className="me-2" />
                  Preparing download…
                </>
              ) : (
                <>
                  Download Manuscript &nbsp;
                  <LuDownload />
                </>
              )}
            </Button>
            <div style={{ height: "70vh" }} className="overflow-auto">
              <Tabs
                defaultActiveKey="review"
                className="custom-stepper"
                tabBarStyle={{
                  marginBottom: 0,
                  display: "flex",
                }}
                tabBarGutter={0}
                size="small"
                centered={true}
                items={[
                  {
                    key: "review",
                    label: (
                      <div
                        style={{
                          padding: 0,
                          margin: 0,
                          lineHeight: "1",
                          height: "30px",
                          display: "flex",
                          alignItems: "center",
                          overflow: "hidden",
                        }}
                      >
                        Review
                      </div>
                    ),
                    children: (
                      <div
                        style={{
                          marginTop: 10,
                          maxHeight: "60vh",
                          overflowY: "auto",
                        }}
                      >
                        {reviewLoading ? (
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              height: "200px",
                            }}
                          >
                            <div>Loading review...</div>
                          </div>
                        ) : (
                          <div
                            dangerouslySetInnerHTML={{
                              __html:
                                formatReview(
                                  bookData?.reviews?.find(
                                    ({ pillar, actNumber, sceneIndex }) =>
                                      pillar === activeTab &&
                                      (actNumber == null ||
                                        sceneIndex == null ||
                                        (actNumber === expandedAct &&
                                          sceneIndex === selectedScene?.sceneIndex))
                                  )?.response
                                ) || "No review available for this step.",
                            }}
                          />
                        )}
                      </div>
                    ),
                  },
                  {
                    key: "notes",
                    label: (
                      <div
                        style={{
                          padding: 0,
                          margin: 0,
                          lineHeight: "1",
                          height: "30px",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        Notes
                      </div>
                    ),
                    children: <NotesEditor bookId={id} />,
                  },
                ]}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinalDriftPage;
