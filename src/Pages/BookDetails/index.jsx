import React, { useContext, useEffect, useState } from "react";
import { Button, Card } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import {
  getABook,
  getAllCharactersOfaBook,
  updateBook,
} from "../../api/bookGeneration";

import StoryBluePrint from "../../component/bookGeneration/StoryBluePrint";
import { NovelContext } from "../../contexts/NovelContext";
import { BsInfoCircleFill } from "react-icons/bs";
import { FaSquarePen } from "react-icons/fa6";
import { IoMdSettings } from "react-icons/io";
import CharacterDevelopment from "../../component/bookGeneration/CharacterDevelopment";
import { toast } from "react-toastify";
import { FaChevronRight } from "react-icons/fa";
import { GoBook } from "react-icons/go";
import "./bookdetails.css";
import { FaArrowRight } from "react-icons/fa6";

const BookDetails = () => {
  // Always reset to blueprint on page load
  useEffect(() => {
    localStorage.setItem("activeTab", "blueprint");
  }, []);

  const { id } = useParams();
  const navigate = useNavigate();
  const { activeTab, setActiveTab } = useContext(NovelContext);
  const [subStep, setSubStep] = useState(1);
  const [bookData, setBookData] = useState({
    novelId: id,
    setting: "",
    narrativeStyle: "",
    genre: "",
    wordCount: 0,
    protagonist: "",
    protagonistDescription: "",
    antagonist: "",
    antagonistMotivation: "",
    theme: "",
    themeExploration: "",
    supportingCharacters: [
      { name: "", role: "", _id: "" },
      { name: "", role: "", _id: "" },
      { name: "", role: "", _id: "" },
    ],
    subplot: "",
    summary: "",
    compTitles: ["", ""],
  });
  const [loading, setLoading] = useState(false);

  // get book details
  useEffect(() => {
    const fetchBookDetails = async () => {
      try {
        setLoading(true);
        const response = await getABook(id);
        setBookData((prevData) => ({
          ...prevData,
          ...response.data,
          novelId: response.data._id,
        }));
      } catch (err) {
        toast.error("Failed to load book details");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchBookDetails();
  }, [id]);

  // Handle navigation to the next tab
  const handleNextTab = (nextTab) => {
    setActiveTab(nextTab);
    localStorage.setItem("activeTab", nextTab);
  };

  // Handle navigation to the previous tab
  const handlePreviousTab = (prevTab) => {
    setActiveTab(prevTab);
    localStorage.setItem("activeTab", prevTab);
  };

  // Save book data and move to the next tab
  const handleSaveAndContinue = async (nextTab) => {
    try {
      setLoading(true);
      await updateBook(bookData);
      handleNextTab(nextTab);
      if (nextTab === "characters") {
        setSubStep(1);
      }
    } catch (err) {
      toast.error("Failed to save book data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-100 vh-100 d-flex flex-column book-details-container storygroove-theme">
      <div className="border-bottom p-4 page-heading">
        <div className="d-flex align-items-center gap-2 editor-title">
          <GoBook /> {bookData.name}
        </div>
      </div>
      <div className="p-4">
        {/* Custom Stepper - now clickable */}
        <div className="custom-stepper mb-4">
          {["blueprint", "development", "editor"].map((step, idx) => {
            const isActive = activeTab === step;
            const isCompleted =
              ["blueprint", "development", "editor"].indexOf(activeTab) > idx;
            let icon = null;
            let label = "";
            if (step === "blueprint") {
              icon = (
                <BsInfoCircleFill
                  color={
                    isActive ? "#1da1f2" : isCompleted ? "#1BA7E4" : "#CCD4D8"
                  }
                  size={24}
                />
              );
              label = "Your Story Blueprint";
            } else if (step === "development") {
              icon = (
                <IoMdSettings
                  color={
                    isActive ? "#1da1f2" : isCompleted ? "#1BA7E4" : "#CCD4D8"
                  }
                  size={24}
                />
              );
              label = "Character Development";
            } else {
              icon = (
                <FaSquarePen
                  color={
                    isActive ? "#1da1f2" : isCompleted ? "#7b3f00" : "#888"
                  }
                  size={24}
                />
              );
              label = "Manuscript Studio";
            }
            return (
              <React.Fragment key={step}>
                <div className="d-flex align-items-center">
                  <div
                    className={`sub-step${isActive ? " active" : ""}${
                      isCompleted ? " selected" : ""
                    } d-flex align-items-center justify-content-center`}
                    style={{ cursor: "pointer" }}
                    onClick={() => setActiveTab(step)}
                  >
                    {icon}
                  </div>
                  <span
                    style={{
                      margin: "0 8px",
                      color: isActive ? "#1da1f2" : "#888",
                      fontWeight: isActive ? 600 : 400,
                      minWidth: 120,
                      textAlign: "center",
                      cursor: "pointer",
                    }}
                    onClick={() => setActiveTab(step)}
                  >
                    {label}
                  </span>
                </div>
                {idx < 2 && (
                  <FaChevronRight
                    style={{
                      margin: "0 12px",
                      color: isCompleted ? "#1BA7E4" : "#e0e0e0",
                      fontSize: 22,
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
        {/* End Custom Stepper */}
        {/* Only render tab content, not the old tab headers */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {activeTab === "blueprint" && (
            <StoryBluePrint
              bookData={bookData}
              setBookData={setBookData}
              onNext={() => handleSaveAndContinue("development")}
              subStep={subStep}
              setSubStep={setSubStep}
              setActiveTab={setActiveTab}
            />
          )}
          {activeTab === "development" && (
            <CharacterDevelopment
              novelId={id}
              bookData={bookData}
              onNext={() => handleSaveAndContinue("editor")}
              subStep={subStep}
              setSubStep={setSubStep}
              onPrevious={() => handlePreviousTab("characters")}
              activeTab={activeTab}
            />
          )}
          {activeTab === "editor" && (
            <Card className="d-flex flex-row align-items-stretch menuscript-card">
              {/* Left: Book Cover */}
              <div className="menuscript-card__cover">
                {/* Blue vertical bar */}
                <div className="menuscript-card__cover-bar" />
                <div className="menuscript-card__cover-content">
                  <div className="menuscript-card__cover-date">
                    <i className="bi bi-calendar-event menuscript-card__calendar-icon" />
                    {bookData?.createdAt
                      ? new Date(bookData.createdAt).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </div>
                  <div className="menuscript-card__cover-title text-truncate w-90">
                    {bookData?.name}
                  </div>
                  <div className="menuscript-card__cover-author">
                    By {bookData?.author}
                  </div>
                </div>
              </div>

              {/* Right: Manuscript Studio */}
              <div className="menuscript-card__studio d-flex flex-column justify-content-center px-4">
                <Card.Title className="menuscript-card__studio-title">
                  Manuscript Studio
                </Card.Title>
                <Card.Subtitle className="menuscript-card__studio-subtitle text-muted mb-3">
                  Your info is saved, and now you can jump right into the book
                  editor to start crafting your awesome novel!
                </Card.Subtitle>
                <Button
                  onClick={() =>
                    navigate(`/dashboard/bookeditor/${bookData._id}`)
                  }
                  variant="primary"
                  style={{ width: "200px" }}
                  className="d-flex gap-3 menuscript-card__studio-btn mt-2"
                >
                  Begin Writing <FaArrowRight />
                </Button>
              </div>
            </Card>
          )}
        </div>
        {loading && (
          <div className="text-center">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookDetails;
