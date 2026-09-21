import { Modal, Button, Form, Spinner } from "react-bootstrap";
import React, { useState } from "react";

const AddSceneModal = ({
  show,
  onHide,
  newSceneTitle,
  setNewSceneTitle,
  addScene,
  modalTitle = "Add New Scene",
  placeholder = "Enter scene title",
  allowEmptyTitle = false,
  saveLabel = "Save",
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleAddScene = async () => {
    setIsLoading(true);
    try {
      await addScene(); // Make sure addScene is a Promise-returning function
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>{modalTitle}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Control
          type="text"
          placeholder={placeholder}
          value={newSceneTitle}
          onChange={(e) => setNewSceneTitle(e.target.value)}
          autoFocus
        />
      </Modal.Body>
      <Button
        variant="primary"
        onClick={handleAddScene}
        disabled={(!allowEmptyTitle && !newSceneTitle.trim()) || isLoading}
      >
        {isLoading ? (
          <>
            <Spinner
              as="span"
              animation="border"
              size="sm"
              role="status"
              aria-hidden="true"
            />{" "}
            Saving...
          </>
        ) : (
          saveLabel
        )}
      </Button>
    </Modal>
  );
};

export default AddSceneModal;
