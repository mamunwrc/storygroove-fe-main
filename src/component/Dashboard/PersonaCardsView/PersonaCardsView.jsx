import React, { useState, useEffect, useContext } from "react";
import { Modal } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { NewAuthContext } from "../../../contexts/NewAuthProvider";
import CreateOliviaThreadModal from "../ProjectsListView/CreateOliviaThreadModal";
import CreateSimoneThreadModal from "../ProjectsListView/CreateSimoneThreadModal";
import SimoneThreadLimitModal from "../../Modal/SimoneThreadLimitModal";
import OliviaPurchaseModal from "../../Modal/OliviaPurchaseModal";
import EllisPurchaseModal from "../../Modal/EllisPurchaseModal";
import {
  getAgentAccessAPI,
  createSimoneOneTimeCheckoutAPI,
} from "../../../api/subscriptions";
import { hasEllisAccess, hasOliviaAccess, isSubscriptionPaused, isSubscriptionCancelled, isPastWorkLocked } from "../../../utils";
import { toast } from "react-toastify";
import { getMostRecentNovel } from "../../../api/bookGeneration";
import { formatTitle } from "../../../Pages/BookEditor/utils";
import { getRecentWorkContinuePath } from "../../../utils/recentWork";
import SupportLink from "../../common/SupportLink";
import "./PersonaCardsView.scss";

const TUTORIAL_PLAYLIST_ID = "PLD-aYh1fVOEg";
const TUTORIAL_PLAYLIST_WATCH_URL = `https://www.youtube.com/playlist?list=${TUTORIAL_PLAYLIST_ID}`;

/** Pure playlist embed — no hardcoded video ID so YouTube uses the curator's manual order. */
const buildTutorialPlaylistEmbedUrl = () => {
  const params = new URLSearchParams({
    list: TUTORIAL_PLAYLIST_ID,
    rel: "0",
    playsinline: "1",
    iv_load_policy: "3",
  });
  if (typeof window !== "undefined" && window.location?.origin) {
    params.set("origin", window.location.origin);
  }
  return `https://www.youtube-nocookie.com/embed/videoseries?${params.toString()}`;
};

const YOUTUBE_EMBED_ORIGINS = [
  "https://www.youtube-nocookie.com",
  "https://www.youtube.com",
  "https://i.ytimg.com",
];

let tutorialEmbedWarmed = false;

/** Opens DNS/TLS to YouTube before the iframe mounts — shaves time off first play. */
const warmTutorialEmbed = () => {
  if (tutorialEmbedWarmed || typeof document === "undefined") return;
  tutorialEmbedWarmed = true;
  YOUTUBE_EMBED_ORIGINS.forEach((href) => {
    if (document.querySelector(`link[rel="preconnect"][href="${href}"]`)) return;
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = href;
    if (href.includes("youtube")) link.crossOrigin = "anonymous";
    document.head.appendChild(link);
  });
};

const PersonaCardsView = ({ onMyProjectsClick }) => {
  const navigate = useNavigate();
  const { setShowUploadModal } = useContext(NewAuthContext);
  const [showSimoneLimitModal, setShowSimoneLimitModal] = useState(false);
  const [simoneModalMode, setSimoneModalMode] = useState("limit");
  const [unlockingSimone, setUnlockingSimone] = useState(false);
  const [showOliviaModal, setShowOliviaModal] = useState(false);
  const [showOliviaPurchaseModal, setShowOliviaPurchaseModal] = useState(false);
  const [showEllisPurchaseModal, setShowEllisPurchaseModal] = useState(false);
  const [showSimoneNameModal, setShowSimoneNameModal] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  // Last opened project for "Your recent work" — only set after fetch succeeds.
  const [recentWork, setRecentWork] = useState(null);
  const [recentWorkLoading, setRecentWorkLoading] = useState(true);
  const [showWorkRowSkeleton, setShowWorkRowSkeleton] = useState(true);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [isTutorialEmbedLoading, setIsTutorialEmbedLoading] = useState(true);

  const openTutorialModal = () => {
    warmTutorialEmbed();
    setIsTutorialEmbedLoading(true);
    setShowTutorialModal(true);
  };

  const closeTutorialModal = () => {
    setShowTutorialModal(false);
    setIsTutorialEmbedLoading(true);
  };

  useEffect(() => {
    warmTutorialEmbed();
  }, []);

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

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();
    const minSkeletonMs = 180;

    (async () => {
      try {
        const data = await getMostRecentNovel();
        if (cancelled) return;
        const work = data?.work || data?.novel || null;
        if (work) setRecentWork(work);
      } catch (error) {
        if (!cancelled) {
          console.error("Error fetching most recent novel:", error);
        }
      } finally {
        if (cancelled) return;
        const waitMs = Math.max(0, minSkeletonMs - (Date.now() - startedAt));
        const reveal = () => {
          if (!cancelled) setRecentWorkLoading(false);
        };
        if (waitMs > 0) setTimeout(reveal, waitMs);
        else reveal();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleWorkRowSkeletonTransitionEnd = (event) => {
    if (event.propertyName !== "opacity" || recentWorkLoading) return;
    setShowWorkRowSkeleton(false);
  };

  useEffect(() => {
    if (recentWorkLoading) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setShowWorkRowSkeleton(false);
    }
  }, [recentWorkLoading]);

  const handleContinueRecentWork = () => {
    if (!recentWork?._id && !recentWork?.threadId) return;
    if (pastWorkLocked) {
      toast.error(
        "Your subscription is paused. Resume billing to view your past work.",
        { autoClose: 4500 }
      );
      navigate("/dashboard/userprofile?tab=subscription");
      return;
    }
    const target = getRecentWorkContinuePath(recentWork);
    if (!target?.pathname) return;
    navigate(target);
  };

  const ellisAccessible = hasEllisAccess(subscriptionData);
  const oliviaAccessible = hasOliviaAccess(subscriptionData);
  const subscriptionPaused = isSubscriptionPaused(subscriptionData);
  const subscriptionCancelled = isSubscriptionCancelled(subscriptionData);
  const pastWorkLocked = isPastWorkLocked(subscriptionData);
  const ctaBlockedByPause = () => subscriptionPaused;
  const ctaBlockedByCancellation = () => subscriptionCancelled;
  
  const personas = [
    {
      id: "capture-idea",
      name: "IDEA INBOX",
      title: "Capture an Idea",
      description:
        "Save a thought while it is fresh, then flesh it out with SimoneAI® when you are ready",
      buttonText: "Capture an Idea",
      image: "/assets/images/idea-inbox.png",
    },
    {
      id: "simone",
      name: "SimoneAI®",
      title: "Story Starter & Market Positioning Coach",
      description: "SimoneAI® helps fiction writers take the idea in their head, shape it into a clear concept, test its market potential, and deliver a readiness score.",
      buttonText: "Flesh Out an Idea",
      image: "/assets/images/simone.png",
    },
    {
      id: "olivia",
      name: "OliviaAI®",
      title: "Build with OliviaAI®",
      description: "Build your Story Bible, structured outline, and cast. Draft with OliviaAI® by your side—she remembers your whole novel and coaches you while you write.",
      buttonText: "Start a New Novel Plan",
      image: "/assets/images/olivia.png",
    },
  ];

  const ellisPersona = {
    id: "ellis",
    name: "EllisAI®",
    title: "Edit with EllisAI®",
    description: "Turn your draft into a stronger book with a scene-by-scene editorial plan.",
    buttonText: "Start a New Edit",
    image: "/assets/images/ellis.png",
  };

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

  const handlePersonaClick = (personaId) => {
    if (subscriptionCancelled) {
      toast.error(
        "Your subscription has been cancelled. Please re-subscribe to access agents.",
        { autoClose: 4500 }
      );
      navigate("/dashboard/userprofile?tab=subscription");
      return;
    }
    if (personaId === "olivia" && !oliviaAccessible) {
      setShowOliviaPurchaseModal(true);
      return;
    }
    if (personaId === "ellis" && !ellisAccessible) {
      setShowEllisPurchaseModal(true);
      return;
    }

    // Capture an Idea is a local notepad (no AI) — allow even when paused.
    if (personaId === "capture-idea") {
      navigate("/dashboard/capture-idea");
      return;
    }

    if (ctaBlockedByPause()) {
      toast.error(
        "Your subscription is paused. Please update billing to start new agent sessions.",
        { autoClose: 4500 }
      );
      return;
    }

    // Navigate to agent chat page for Simone and Olivia
    if (personaId === "simone") {
      setShowSimoneNameModal(true);
    } else if (personaId === "olivia") {
      setShowOliviaModal(true);
    } else if (personaId === "ellis") {
      setShowUploadModal(true);
    } else {
      // Placeholder for other agents
      console.log(`Clicked on ${personaId}`);
    }
  };

  const handleMyWorkClick = () => {
    if (pastWorkLocked) {
      toast.error(
        subscriptionPaused && !subscriptionCancelled
          ? "Your subscription is paused. Resume billing to view your past work."
          : "Your subscription has been cancelled. Please re-subscribe to view your past work.",
        { autoClose: 4500 }
      );
      navigate("/dashboard/userprofile?tab=subscription");
      return;
    }
    onMyProjectsClick?.();
  };

  return (
    <div className="persona-cards-view">
      <div className="welcome-section">
        <h1 className="welcome-title">Welcome back, {localStorage.getItem("userName") || "User"}</h1>
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

      {!pastWorkLocked && (
        <div className="dashboard-work-row-host">
          {showWorkRowSkeleton && (
            <div
              className={`dashboard-work-row-skeleton${
                recentWorkLoading ? "" : " dashboard-work-row-skeleton--hiding"
              }`}
              aria-label={recentWorkLoading ? "Loading your projects" : undefined}
              aria-busy={recentWorkLoading}
              aria-hidden={!recentWorkLoading}
              onTransitionEnd={handleWorkRowSkeletonTransitionEnd}
            >
              <div className="dashboard-work-row-skeleton__banner" />
            </div>
          )}

          {!recentWorkLoading && (
            <div
              className={`dashboard-work-row dashboard-work-row--visible${
                recentWork ? " dashboard-work-row--dual" : " dashboard-work-row--single"
              }`}
            >
              {recentWork && (
                <div className="resume-novel-slot">
                  <div
                    className="resume-novel-banner"
                    role="region"
                    aria-label="Your recent work — last opened project"
                  >
                    <div className="resume-novel-banner__text">
                      <p className="resume-novel-banner__eyebrow">CONTINUE WHERE YOU LEFT OFF</p>
                      <h2 className="resume-novel-banner__title">
                        {formatTitle(recentWork.name) ||
                          recentWork.name ||
                          "Untitled"}
                      </h2>
                      <p className="resume-novel-banner__hint">
                        Pick up right where you left off. Your full project library is
                        saved in My Work.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="resume-novel-banner__btn"
                      onClick={handleContinueRecentWork}
                    >
                      Resume Work
                      <span className="sparkle-icon">✨</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="resume-novel-slot resume-novel-slot--library">
                <div
                  className="resume-novel-banner"
                  role="region"
                  aria-label="Your project library — open My Work"
                >
                  <div className="resume-novel-banner__text">
                    <p className="resume-novel-banner__eyebrow">YOUR FULL PROJECT LIBRARY</p>
                    <h2 className="resume-novel-banner__title">My Work</h2>
                    <p className="resume-novel-banner__hint">
                      View all your ideas, Story Bibles, outlines, drafts, and edits.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="resume-novel-banner__btn"
                    onClick={handleMyWorkClick}
                  >
                    View All Projects
                    <span className="sparkle-icon">✨</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="tutorial-banner-slot">
        <div
          className="tutorial-quickstart"
          role="region"
          aria-label="StoryGroove quick start tutorials"
          onMouseEnter={warmTutorialEmbed}
        >
          <button
            type="button"
            className="tutorial-quickstart__play"
            onClick={openTutorialModal}
            onFocus={warmTutorialEmbed}
            aria-label="Play StoryGroove quick start tutorials"
          >
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>

          <div className="tutorial-quickstart__text">
            <h2 className="tutorial-quickstart__title">
              Required First Step: Watch the Quick Start Tutorials
            </h2>
            <p className="tutorial-quickstart__hint">
              Watch these short tutorials before beginning your project. They
              explain the StoryGroove workflow, prevent confusion, misplaced
              work, and unnecessary restarts, and will save you considerable
              time.
            </p>
          </div>

          <button
            type="button"
            className="tutorial-quickstart__btn"
            onClick={openTutorialModal}
          >
            Watch Tutorials
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </button>
        </div>
      </div>

      <div className="persona-cards-container">
        {personas.map((persona) => (
          <div
            key={persona.id}
            className={`persona-card${persona.id === "capture-idea" ? " persona-card--capture-idea" : ""}`}
          >
            {persona.badge && (
              <div className="persona-badge">{persona.badge}</div>
            )}
            <div className="persona-image-container">
              <img
                src={persona.image}
                alt={persona.title || persona.name}
                className="persona-image"
                style={{ 
                  aspectRatio: '4/3', 
                  objectFit: 'cover',
                  width: '100%',
                  height: 'auto'
                }}
                onError={(e) => {
                  e.target.src = "/assets/images/avatar.jpg";
                }}
              />
            </div>
            
            <div className="persona-name-wrapper">
              <h3 className="persona-name">{persona.name}</h3>
            </div>

            <div className="persona-content d-flex flex-column justify-content-center">
              <h4 className="persona-title">{persona.title}</h4>
              <p className="persona-description">{persona.description}</p>
              <button
                className={`persona-button ${
                  persona.id !== "capture-idea" && ctaBlockedByPause()
                    ? "persona-button-disabled"
                    : ""
                } ${ctaBlockedByCancellation() ? "persona-button-disabled" : ""}`}
                onClick={() => handlePersonaClick(persona.id)}
                disabled={
                  loadingSubscription ||
                  (persona.id === "simone" && showSimoneNameModal) ||
                  (persona.id !== "capture-idea" && ctaBlockedByPause()) ||
                  ctaBlockedByCancellation()
                }
              >
                {persona.buttonText} <span className="sparkle-icon">✨</span>
              </button>
            </div>
          </div>
        ))}

        {/* Ellis Card — last position */}
        <div className="persona-card">
          {ellisPersona.badge && (
            <div className="persona-badge">{ellisPersona.badge}</div>
          )}
          <div className="persona-image-container">
            <img
              src={ellisPersona.image}
              alt={ellisPersona.name}
              className="persona-image"
              style={{ 
                aspectRatio: '4/3', 
                objectFit: 'cover',
                width: '100%',
                height: 'auto'
              }}
              onError={(e) => {
                e.target.src = "/assets/images/avatar.jpg";
              }}
            />
          </div>
          
          <div className="persona-name-wrapper">
            <h3 className="persona-name">{ellisPersona.name}</h3>
          </div>

          <div className="persona-content d-flex flex-column justify-content-center">
            <h4 className="persona-title">{ellisPersona.title}</h4>
            <p className="persona-description">{ellisPersona.description}</p>
            <button
              className={`persona-button ${ctaBlockedByPause() ? "persona-button-disabled" : ""} ${ctaBlockedByCancellation() ? "persona-button-disabled" : ""}`}
              onClick={() => handlePersonaClick(ellisPersona.id)}
              disabled={
                loadingSubscription ||
                ctaBlockedByPause() ||
                ctaBlockedByCancellation()
              }
            >
              {ellisPersona.buttonText}
              <span className="sparkle-icon">✨</span>
            </button>
          </div>
        </div>
      </div>
      <SupportLink variant="centered-bold" />
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
      <Modal
        show={showTutorialModal}
        onHide={closeTutorialModal}
        centered
        dialogClassName="tutorial-playlist-modal__dialog"
        className="tutorial-playlist-modal"
        contentClassName="tutorial-playlist-modal__content"
        aria-labelledby="tutorialPlaylistTitle"
      >
        <div className="tutorial-playlist-modal__header">
          <div className="tutorial-playlist-modal__heading">
            <p className="tutorial-playlist-modal__eyebrow">Watch &amp; learn</p>
            <h2
              className="tutorial-playlist-modal__title"
              id="tutorialPlaylistTitle"
            >
              Start Here: StoryGroove Quick Start Tutorials
            </h2>
          </div>
          <button
            type="button"
            className="tutorial-playlist-modal__close"
            onClick={closeTutorialModal}
            aria-label="Close tutorial"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>

        <div className="tutorial-playlist-modal__embed">
          {isTutorialEmbedLoading && (
            <div
              className="tutorial-playlist-modal__loading"
              aria-live="polite"
              aria-busy="true"
            >
              <span className="tutorial-playlist-modal__spinner" aria-hidden="true" />
              <span>Loading player…</span>
            </div>
          )}
          <iframe
            key={showTutorialModal ? "tutorial-playlist-open" : "tutorial-playlist-closed"}
            src={showTutorialModal ? buildTutorialPlaylistEmbedUrl() : undefined}
            title="Start Here: Learn StoryGroove.ai Step by Step"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            onLoad={() => setIsTutorialEmbedLoading(false)}
          />
        </div>

        <div className="tutorial-playlist-modal__footer">
          <span className="tutorial-playlist-modal__meta">
            Guided playlist · SimoneAI®, OliviaAI® &amp; EllisAI®
          </span>
          <a
            className="tutorial-playlist-modal__external"
            href={TUTORIAL_PLAYLIST_WATCH_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open on YouTube
            <svg
              viewBox="0 0 24 24"
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>
      </Modal>
    </div>
  );
};
export default PersonaCardsView;
