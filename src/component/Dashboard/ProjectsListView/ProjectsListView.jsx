import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaChevronLeft, FaChevronRight, FaLayerGroup, FaLightbulb } from "react-icons/fa";
import KanbanCard from "../KanbanCard/KanbanCard";
import CreateOliviaThreadModal from "./CreateOliviaThreadModal";
import CreateSimoneThreadModal from "./CreateSimoneThreadModal";
import SimoneThreadLimitModal from "../../Modal/SimoneThreadLimitModal";
import OliviaPurchaseModal from "../../Modal/OliviaPurchaseModal";
import EllisPurchaseModal from "../../Modal/EllisPurchaseModal";
import {
  getAgentAccessAPI,
  createSimoneOneTimeCheckoutAPI,
} from "../../../api/subscriptions";
import { hasEllisAccess, hasOliviaAccess, isSubscriptionPaused, isSubscriptionCancelled, isPastWorkLocked } from "../../../utils";
import { formatTitle } from "../../../Pages/BookEditor/utils";
import { toast } from "react-toastify";
import "./ProjectsListView.scss";

const AGENT_FILTERS = [
  { key: "all",    label: "All",    imgSrc: null, SvgIcon: FaLayerGroup },
  { key: "ideas",  label: "My Ideas", imgSrc: null, SvgIcon: FaLightbulb },
  { key: "simone", label: "Simone Work", imgSrc: "/assets/images/Simone-Avatar.jpg", SvgIcon: null },
  { key: "olivia", label: "Olivia Story Bible", imgSrc: "/assets/images/Olivia-Avatar.jpg", SvgIcon: null },
  { key: "novels", label: "Olivia Outline & Draft Studio", imgSrc: "/assets/images/Olivia-Avatar.jpg", SvgIcon: null },
  { key: "ellis",  label: "Ellis' Edits",  imgSrc: "/assets/images/Ellis-Avatar.jpg",  SvgIcon: null },
];

const AGENT_EMPTY_STATES = {
  ideas: {
    message: "No captured ideas yet. Start a notepad to jot something down.",
    cta: "Capture an Idea ✨",
  },
  simone: {
    message: "No stories started with Simone yet.",
    cta: "Start a New Idea ✨",
  },
  olivia: {
    message: "No Story Bible projects with Olivia yet.",
    cta: "Start a New Novel Plan ✨",
  },
  novels: {
    message: "Nothing in Outline & Draft Studio yet. Start a new novel plan with Olivia to get started.",
    cta: "Start a New Novel Plan ✨",
  },
  ellis: {
    message: "No manuscripts reviewed by Ellis yet.",
    cta: "Start a New Edit ✨",
  },
};

const ProjectsListView = ({
  booksList,
  loading,
  novelPinned,
  setNovelPinned,
  fetchAllBooks,
  openUploadModal,
  onBack,
  currentPage = 1,
  totalPages = 1,
  totalBooks = 0,
  onPageChange,
  agentFilter = "all",
  onAgentFilterChange,
}) => {
  const [showSimoneLimitModal, setShowSimoneLimitModal] = useState(false);
  const [simoneModalMode, setSimoneModalMode] = useState("limit");
  const [unlockingSimone, setUnlockingSimone] = useState(false);
  const [showOliviaModal, setShowOliviaModal] = useState(false);
  const [showOliviaPurchaseModal, setShowOliviaPurchaseModal] = useState(false);
  const [showEllisPurchaseModal, setShowEllisPurchaseModal] = useState(false);
  const oliviaPurchasePromptedRef = useRef(false);
  const [showSimoneNameModal, setShowSimoneNameModal] = useState(false);
  const navigate = useNavigate();
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const data = await getAgentAccessAPI();
        setSubscriptionData(data);
      } catch (error) {
        console.error("Error fetching subscription:", error);
      } finally {
        setLoadingSubscription(false);
      }
    };
    fetchSubscription();
  }, []);

  const refreshAgentAccess = async () => {
    try {
      const data = await getAgentAccessAPI();
      setSubscriptionData(data);
    } catch (error) {
      console.error("Error refreshing subscription:", error);
    }
  };

  const ellisAccessible = hasEllisAccess(subscriptionData);
  const oliviaAccessible = hasOliviaAccess(subscriptionData);
  const subscriptionPaused = isSubscriptionPaused(subscriptionData);
  const subscriptionCancelled = isSubscriptionCancelled(subscriptionData);
  const pastWorkLocked = isPastWorkLocked(subscriptionData);
  const ctaBlockedByPause = () => subscriptionPaused;
  // Cancellation locks the whole projects view: past work is hidden, every
  // agent CTA is disabled, and the only path forward is the subscription tab.
  const ctaBlockedByCancellation = () => subscriptionCancelled;

  useEffect(() => {
    if (
      loadingSubscription ||
      oliviaPurchasePromptedRef.current ||
      pastWorkLocked ||
      oliviaAccessible
    ) {
      return;
    }
    if (agentFilter === "olivia" || agentFilter === "novels") {
      oliviaPurchasePromptedRef.current = true;
      setShowOliviaPurchaseModal(true);
    }
  }, [
    loadingSubscription,
    agentFilter,
    oliviaAccessible,
    pastWorkLocked,
  ]);

  const handleOliviaEntry = () => {
    if (ctaBlockedByPause()) {
      toast.error(
        "Your subscription is paused. Please update billing to start new agent sessions.",
        { autoClose: 4500 }
      );
      return;
    }
    if (!oliviaAccessible) {
      setShowOliviaPurchaseModal(true);
      return;
    }
    setShowOliviaModal(true);
  };

  const handleEllisEntry = () => {
    if (ctaBlockedByPause()) {
      toast.error(
        "Your subscription is paused. Please update billing to start new agent sessions.",
        { autoClose: 4500 }
      );
      return;
    }
    if (!ellisAccessible) {
      setShowEllisPurchaseModal(true);
      return;
    }
    openUploadModal();
  };

  const allBooks = booksList || [];

  const handleUnlockSimone = async () => {
    setUnlockingSimone(true);
    try {
      const successUrl = window.location.href;
      const res = await createSimoneOneTimeCheckoutAPI({ successUrl });
      if (res?.url) {
        window.location.href = res.url;
        return;
      }
      toast.error("Could not open checkout. Please try again.");
    } catch (err) {
      console.error("Simone checkout error:", err);
      toast.error(err?.response?.data?.message || "Could not open checkout. Please try again.");
    } finally {
      setUnlockingSimone(false);
    }
  };

  const handleEnterSimoneOffice = () => {
    setShowSimoneNameModal(true);
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage && onPageChange) {
      onPageChange(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push("...");
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) pages.push("...");
      pages.push(totalPages);
    }

    return pages;
  };

  const getProjectCardSubtitle = (book) => {
    if (book.isIdea) {
      return "Captured idea notepad";
    }
    const idea =
      typeof book.bookIdea === "string" && book.bookIdea.trim()
        ? book.bookIdea.trim()
        : "";
    if (idea) return idea;

    if (book.uploaded) {
      return "EllisAI® Manuscript";
    }
    if (book.assistantName === "SimoneAI" || book.assistantName === "Simone AI") {
      return "SimoneAI® Assistant";
    }
    if (book.assistantName === "Olivia" || book.agentName === "olivia") {
      return "OliviaAI® Assistant";
    }
    const hasAssistant = Boolean(
      (typeof book.assistantName === "string" && book.assistantName.trim()) ||
        book.agentName
    );
    if (!hasAssistant && !idea) return "Draft";
    return "No description available.";
  };

  const getCtaLabel = (book) => {
    if (book.isIdea) {
      return "Open Notepad";
    }
    if (book.assistantName === "SimoneAI" || book.assistantName === "Simone AI") {
      return "Chat with SimoneAI®";
    }
    if (book.assistantName === "Olivia" || book.agentName === "olivia") {
      return "Chat with OliviaAI®";
    }
    if (book.status === "completed") {
      return "View";
    }
    return "Continue Writing";
  };

  return (
    <div className="projects-list-view">
      <div className="projects-header">
        <button className="back-button" onClick={onBack}>
          <FaArrowLeft />
        </button>
        <h1 className="projects-title">My Dashboard</h1>
      </div>

      {subscriptionCancelled && (
        <div
          className="subscription-cancelled-banner"
          role="status"
          aria-live="polite"
        >
          <strong>Your subscription has been cancelled.</strong>{" "}
          Your past work, Simone, Olivia, and Ellis are locked until you
          re-subscribe. You can still update your profile and resume billing
          from My Account.{" "}
          <button
            type="button"
            className="subscription-cancelled-banner__cta"
            onClick={() => navigate("/dashboard/userprofile?tab=subscription")}
          >
            Re-subscribe
          </button>
        </div>
      )}

      {subscriptionPaused && !subscriptionCancelled && (
        <div
          className="subscription-paused-banner"
          role="status"
          aria-live="polite"
        >
          <strong>Your subscription is paused.</strong>{" "}
          Your past work, Simone, Olivia, and Ellis are locked until you
          resume billing. You can still update your profile from My Account.{" "}
          <button
            type="button"
            className="subscription-paused-banner__cta"
            onClick={() => navigate("/dashboard/userprofile?tab=subscription")}
          >
            Manage billing
          </button>
        </div>
      )}

      <div className="projects-section">
        <div className="stories-tab-bar">
          <div className="stories-tab-bar__top">
            <div className="agent-filter-pills">
              {AGENT_FILTERS.map(({ key, label, imgSrc, SvgIcon }) => (
                <button
                  key={key}
                  className={`filter-pill ${agentFilter === key ? "active" : ""}`}
                  onClick={() => onAgentFilterChange?.(key)}
                  disabled={loading || pastWorkLocked}
                >
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt=""
                      className="filter-pill-avatar"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  ) : SvgIcon ? (
                    <SvgIcon className="filter-pill-svg-icon" />
                  ) : null}
                  <span className="filter-pill-label">{label}</span>
                </button>
              ))}
            </div>
            {totalBooks > 0 && !pastWorkLocked && (
              <span className="stories-count">
                {totalBooks}{" "}
                {agentFilter === "ideas"
                  ? totalBooks === 1
                    ? "idea"
                    : "ideas"
                  : totalBooks === 1
                    ? "project"
                    : "projects"}
              </span>
            )}
          </div>
        </div>

        {pastWorkLocked ? (
          <div className="empty-state">
            <p>
              {subscriptionPaused && !subscriptionCancelled
                ? "Your past work is locked while your subscription is paused. Resume billing to view your projects and use Simone, Olivia, and Ellis again."
                : "Your past work is locked because your subscription has been cancelled. Re-subscribe to view your projects and start new sessions with Simone, Olivia, and Ellis."}
            </p>
            <button
              className="empty-state-cta"
              onClick={() =>
                navigate("/dashboard/userprofile?tab=subscription")
              }
            >
              {subscriptionPaused && !subscriptionCancelled ? "Resume billing" : "Re-subscribe"}
            </button>
          </div>
        ) : loading ? (
          <div className="projects-grid">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-header">
                  <div className="skeleton-line skeleton-date" />
                  <div className="skeleton-icon" />
                </div>
                <div className="skeleton-line skeleton-title" />
                <div className="skeleton-line skeleton-subtitle" />
                <div className="skeleton-line skeleton-subtitle short" />
                <div className="skeleton-footer">
                  <div className="skeleton-line skeleton-button" />
                </div>
              </div>
            ))}
          </div>
        ) : allBooks.length === 0 ? (
          <div className="empty-state">
            {agentFilter !== "all" && AGENT_EMPTY_STATES[agentFilter] ? (
              <>
                <p>{AGENT_EMPTY_STATES[agentFilter].message}</p>
                <button
                  className="empty-state-cta"
                  disabled={
                    loadingSubscription ||
                    ctaBlockedByPause() ||
                    ctaBlockedByCancellation()
                  }
                  onClick={() => {
                    if (ctaBlockedByCancellation()) {
                      toast.error(
                        "Your subscription has been cancelled. Please re-subscribe to access agents.",
                        { autoClose: 4500 }
                      );
                      navigate("/dashboard/userprofile?tab=subscription");
                      return;
                    }
                    if (ctaBlockedByPause()) {
                      toast.error(
                        "Your subscription is paused. Please update billing to start new agent sessions.",
                        { autoClose: 4500 }
                      );
                      return;
                    }
                    if (agentFilter === "ideas") {
                      navigate("/dashboard/capture-idea");
                    } else if (agentFilter === "simone") handleEnterSimoneOffice();
                    else if (agentFilter === "olivia" || agentFilter === "novels") {
                      handleOliviaEntry();
                    } else if (agentFilter === "ellis") {
                      handleEllisEntry();
                    }
                  }}
                >
                  {AGENT_EMPTY_STATES[agentFilter].cta}
                </button>
              </>
            ) : (
              <p>You haven't created any stories yet.</p>
            )}
          </div>
        ) : (
          <>
            <div className="projects-grid">
              {allBooks.map((book) => {
                const rawTitle = book.name || book.title || "Untitled Story";
                return (
                <div key={book._id} className="projects-grid-item">
                  <KanbanCard
                    card={book}
                    title={rawTitle}
                    titleDisplay={formatTitle(rawTitle) ?? rawTitle}
                    subtitle={getProjectCardSubtitle(book)}
                    className="card-in-progress"
                    novelPinned={novelPinned}
                    setNovelPinned={setNovelPinned}
                    fetchAllBooks={fetchAllBooks}
                    deleteContext={{
                      source: "dashboard_projects_list",
                      agentFilter,
                    }}
                    ctaLabel={getCtaLabel(book)}
                    pastWorkLocked={pastWorkLocked}
                  />
                </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="pagination-btn"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <FaChevronLeft />
                </button>

                {getPageNumbers().map((page, index) =>
                  page === "..." ? (
                    <span key={`ellipsis-${index}`} className="pagination-ellipsis">...</span>
                  ) : (
                    <button
                      key={page}
                      className={`pagination-btn page-number ${currentPage === page ? "active" : ""}`}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </button>
                  )
                )}

                <button
                  className="pagination-btn"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <FaChevronRight />
                </button>
              </div>
            )}
          </>
        )}
      </div>
      
      <SimoneThreadLimitModal
        show={showSimoneLimitModal}
        onHide={() => setShowSimoneLimitModal(false)}
        mode={simoneModalMode}
        onUnlockPayment={handleUnlockSimone}
        isUnlocking={unlockingSimone}
      />
      <OliviaPurchaseModal
        show={showOliviaPurchaseModal}
        onHide={() => setShowOliviaPurchaseModal(false)}
      />
      <EllisPurchaseModal
        show={showEllisPurchaseModal}
        onHide={() => setShowEllisPurchaseModal(false)}
        onUpgraded={refreshAgentAccess}
      />
      <CreateOliviaThreadModal 
        show={showOliviaModal} 
        handleClose={() => setShowOliviaModal(false)} 
      />
      <CreateSimoneThreadModal
        show={showSimoneNameModal}
        handleClose={() => setShowSimoneNameModal(false)}
        onThreadLimit={() => {
          setSimoneModalMode("limit");
          setShowSimoneLimitModal(true);
        }}
        onPaymentRequired={() => {
          setSimoneModalMode("payment-required");
          setShowSimoneLimitModal(true);
        }}
      />
    </div>
  );
};

export default ProjectsListView;

