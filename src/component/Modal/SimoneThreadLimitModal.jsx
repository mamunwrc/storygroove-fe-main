import React from "react";
import { Modal } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import "./SimoneThreadLimitModal.scss";

const SimoneThreadLimitModal = ({
  show,
  onHide,
  // `mode` is accepted for backwards compatibility with existing callers but
  // the modal now renders a single unified workflow regardless of the value.
  // eslint-disable-next-line no-unused-vars
  mode,
  onUnlockPayment,
  isUnlocking = false,
}) => {
  const navigate = useNavigate();

  const handleViewPlans = () => {
    onHide();
    navigate("/dashboard/userprofile?tab=subscription");
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      aria-labelledby="simone-limit-title"
      centered
      dialogClassName="simone-limit-modal__dialog"
      className="storygroove-theme simone-limit-modal"
    >
      <Modal.Body className="text-center px-4 py-5">
        <div className="simone-limit-icon-wrapper mb-3">
          <img
            src="/android-chrome-192x192.png"
            alt="StoryGroove"
            className="simone-limit-icon"
          />
        </div>

        <h4 id="simone-limit-title" className="fw-bold mb-3">
          Start Your Story with SimoneAI&reg;
        </h4>
        <div className="simone-limit-message mb-4">
          <p className="mb-3">
            Purchase one Story Starter Kit for $7, or upgrade to Builder
            for unlimited access to SimoneAI&reg; and the full novel-building
            studio.
          </p>
          <p className="mb-0">
            With Builder, you can keep exploring new story ideas, build
            your interactive Story Bible, create a professional outline, draft
            in the studio, and continue shaping your novel with Olivia coaching
            you as you build.
          </p>
        </div>
        <div className="simone-limit-actions">
          <button
            type="button"
            className="simone-limit-btn simone-limit-btn--primary"
            onClick={handleViewPlans}
          >
            Upgrade to Builder
            <span className="simone-limit-btn__sparkle" aria-hidden="true">
              ✨
            </span>
          </button>
          <button
            type="button"
            className="simone-limit-btn simone-limit-btn--secondary"
            onClick={onUnlockPayment}
            disabled={isUnlocking}
          >
            {isUnlocking ? "Redirecting…" : "Buy a Story Starter Kit for $7"}
            {!isUnlocking && (
              <span className="simone-limit-btn__sparkle" aria-hidden="true">
                ✨
              </span>
            )}
          </button>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default SimoneThreadLimitModal;
