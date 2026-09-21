import React from "react";
import { Modal, Button } from "react-bootstrap";
import { MdLock } from "react-icons/md";
import "./SubscriptionRequiredModal.scss";

const SubscriptionRequiredModal = ({
  show,
  onHide,
  message,
  onViewPlans,
}) => {
  return (
    <Modal
      show={show}
      onHide={onHide}
      aria-labelledby="subscription-required-title"
      centered
      className="storygroove-theme subscription-required-modal"
    >
      <Modal.Body className="text-center px-4 py-5">
        <div className="subscription-modal-icon-wrapper mb-3">
          <MdLock size={40} />
        </div>
        <h4 id="subscription-required-title" className="fw-bold mb-3">
          Subscription Required
        </h4>
        <p className="subscription-modal-message mb-4">
          {message ||
            "This feature requires an active subscription. Upgrade your plan to unlock the full power of StoryGroove."}
        </p>
        <div className="d-flex justify-content-center gap-3">
          <Button variant="outline-secondary" onClick={onHide}>
            Maybe Later
          </Button>
          <Button variant="primary" onClick={onViewPlans}>
            View Plans
          </Button>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default SubscriptionRequiredModal;
