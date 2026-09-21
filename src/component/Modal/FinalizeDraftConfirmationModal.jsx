import React from "react";
import { Modal, Button } from "react-bootstrap";

const FinalizeDraftConfirmationModal = ({
  show,
  handleClose,
  handleConfirm,
}) => {
  return (
    <Modal
      show={show}
      onHide={handleClose}
      aria-labelledby="finalize-draft-confirmation-title"
      centered
      size="lg"
      className="storygroove-theme"
    >
      <Modal.Header closeButton>
        <Modal.Title id="finalize-draft-confirmation-title">
          Finalize Draft Confirmation
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="pt-2">
        <div>
          <p>
            Congratulations! You're locking your draft and entering a 4-step
            guided edit to craft a submission ready manuscript. You’ll be
            working with our professionally trained AI Editors, Ellis, Lisa, &
            Clara.
          </p>
          <p>
            You’ll focus on one element at a time, using each step as a creative
            building block toward a polished, submission ready manuscript.
          </p>
          <div>
            <strong>Step 1: Full Manuscript Evaluation</strong>
            <br />
            An Editorial Letter by Ellis
          </div>
          <div className="mt-4">
            <strong>Step 2: Developmental Edit</strong>
            <br />
            Scene by Scene Structural & Character Depending by Ellis
          </div>
          <div className="mt-4">
            <strong>Step 3: Line Edit</strong>
            <br />
            Sentence-level pacing, tone, and prose clarity by Lisa
          </div>
          <div className="mt-4">
            <strong>Step 4: Copyedit</strong>
            <br />
            Clarity, rhythm and grammar, a submission ready polish
          </div>
          <div className="mt-4">
            Each expert helps build your novel layer by layer.
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer className="d-flex justify-content-end w-100 border-0 pt-4">
        <Button
          variant="secondary"
          className="sg-btn-outline"
          onClick={handleClose}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          className="sg-btn-outline"
          onClick={handleConfirm}
        >
          Confirm & Begin Editing Phase
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default FinalizeDraftConfirmationModal;
