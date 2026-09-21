import React from "react";
import { Modal } from "react-bootstrap";
import "./CommunityModal.scss";

const COMMUNITY_URL =
  "https://www.thenoveliststudio.com/offers/wzgw9Veh/checkout";

const CommunityModal = ({ show, onHide, paused = false }) => {
  const handleJoin = () => {
    if (paused) return;
    window.open(COMMUNITY_URL, "_blank", "noopener,noreferrer");
    onHide();
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      aria-labelledby="community-modal-title"
      centered
      dialogClassName="community-modal__dialog"
      className="storygroove-theme community-modal"
    >
      <Modal.Body className="text-center px-4 py-5">
        <div className="community-modal-icon-wrapper mb-3">
          <img
            src="/android-chrome-192x192.png"
            alt="StoryGroove"
            className="community-modal-icon"
            onError={(e) => {
              e.target.src = "/assets/images/story-grove-ai-logo1.png";
            }}
          />
        </div>

        <h4 id="community-modal-title" className="fw-bold mb-3">
          {paused
            ? "Community access is on hold"
            : "Join StoryGroove Writers Community"}
        </h4>
        <div className="community-modal-message mb-4">
          <p className="mb-0">
            {paused
              ? "Access to the private community is paused with your membership. Reactivate your plan to restore community access."
              : "Join our private writer community for live writing sessions, support, group events, and creative momentum while you build your book inside StoryGroove."}
          </p>
        </div>
        <div className="community-modal-actions">
          <button
            type="button"
            className="community-modal-btn community-modal-btn--primary"
            onClick={handleJoin}
            disabled={paused}
            aria-disabled={paused}
          >
            Join the Community
            <span className="community-modal-btn__sparkle" aria-hidden="true">
              ✨
            </span>
          </button>
          <button
            type="button"
            className="community-modal-btn community-modal-btn--secondary"
            onClick={onHide}
          >
            {paused ? "Close" : "Maybe later"}
          </button>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default CommunityModal;
