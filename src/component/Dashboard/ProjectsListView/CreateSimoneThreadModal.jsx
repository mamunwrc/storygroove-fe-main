import React, { useState } from "react";
import { Modal, Button, Form, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { startSimoneSession } from "../../../utils/startSimoneSession";

const CreateSimoneThreadModal = ({
  show,
  handleClose,
  onThreadLimit,
  onPaymentRequired,
}) => {
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const resetAndClose = () => {
    setProjectName("");
    handleClose();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const trimmed = projectName.trim();
    if (!trimmed) return;

    setLoading(true);
    try {
      await startSimoneSession({
        navigate,
        title: trimmed,
        onThreadLimit: () => {
          handleClose();
          onThreadLimit?.();
        },
        onPaymentRequired: () => {
          handleClose();
          onPaymentRequired?.();
        },
      });
      // On success, startSimoneSession navigates away. Clear local state so a
      // re-open of the modal starts fresh.
      setProjectName("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      show={show}
      onHide={loading ? undefined : resetAndClose}
      centered
      className="storygroove-theme"
      backdrop={loading ? "static" : true}
      keyboard={!loading}
    >
      <Modal.Header closeButton={!loading}>
        <Modal.Title>Name of project</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleCreate}>
          <Form.Group className="mb-3">
            <Form.Label>What's the working name for this project?</Form.Label>
            <Form.Control
              type="text"
              placeholder="e.g. The Lost City"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              autoFocus
              disabled={loading}
              required
            />
            <Form.Text className="text-muted">
              You can rename this later — Simone will refine it as you work
              through the Story Starter Kit.
            </Form.Text>
          </Form.Group>
          <div className="d-flex justify-content-end gap-2 mt-4">
            <Button
              variant="secondary"
              onClick={resetAndClose}
              disabled={loading}
              className="sg-btn-outline"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={loading || !projectName.trim()}
              className="sg-btn-fill"
            >
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Starting…
                </>
              ) : (
                "Talk to Simone"
              )}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default CreateSimoneThreadModal;
