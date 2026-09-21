import { Modal, Button, Form } from "react-bootstrap";
import React from "react";

const RenameSceneModal = ({
  show,
  onHide,
  newSceneTitle,
  setNewSceneTitle,
  updateSceneTitle,
}) => (
  <Modal show={show} onHide={onHide}>
    <Modal.Header closeButton>
      <Modal.Title>Rename Scene</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <Form.Control
        type="text"
        value={newSceneTitle}
        onChange={(e) => setNewSceneTitle(e.target.value)}
        autoFocus
      />
    </Modal.Body>
    <Button variant="primary" onClick={updateSceneTitle}>
      Save
    </Button>
  </Modal>
);

export default RenameSceneModal;