import { Modal, Button, Form, Spinner } from "react-bootstrap";
import React, { useEffect, useState } from "react";
import "./AddCharacterModal.scss";

const CAST_TYPES = [
  { value: "supporting character", label: "Supporting" },
  { value: "protagonist", label: "Protagonist" },
  { value: "antagonist", label: "Antagonist" },
];

const MAX_CHARACTER_NAME_LENGTH = 120;

const emptyForm = {
  name: "",
  role: "",
  characterType: "supporting character",
};

const AddCharacterModal = ({ show, onHide, onAdd }) => {
  const [form, setForm] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(false);
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    if (show) {
      setForm(emptyForm);
      setIsLoading(false);
      setNameError("");
    }
  }, [show]);

  const handleHide = () => {
    if (isLoading) return;
    onHide();
  };

  const handleAdd = async (event) => {
    event?.preventDefault();
    const name = form.name.trim();
    if (isLoading) return;
    if (!name) {
      setNameError("Give this character a name.");
      return;
    }
    setNameError("");
    setIsLoading(true);
    try {
      await onAdd({
        name,
        role: form.role.trim(),
        characterType: form.characterType,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      show={show}
      onHide={handleHide}
      centered
      className="storygroove-theme add-character-modal"
      backdrop={isLoading ? "static" : true}
      keyboard={!isLoading}
      aria-labelledby="add-character-title"
    >
      <Modal.Header closeButton={!isLoading}>
        <div>
          <Modal.Title id="add-character-title">Add Character</Modal.Title>
          <div className="add-character-modal__subtitle">
            We’ll open their profile so you can fill in the details.
          </div>
        </div>
      </Modal.Header>
      <Form noValidate onSubmit={handleAdd}>
        <Modal.Body>
          <div
            className="add-character-modal__status"
            aria-live="polite"
            aria-atomic="true"
          >
            {isLoading
              ? "Adding character"
              : nameError
                ? nameError
                : ""}
          </div>
          <Form.Group className="mb-3" controlId="add-character-name">
            <Form.Label>What’s their name?</Form.Label>
            <Form.Control
              type="text"
              placeholder="e.g. Lola Reyes"
              value={form.name}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, name: e.target.value }));
                if (nameError) setNameError("");
              }}
              autoFocus
              disabled={isLoading}
              maxLength={MAX_CHARACTER_NAME_LENGTH}
              isInvalid={!!nameError}
              aria-invalid={!!nameError}
              aria-describedby={nameError ? "add-character-name-error" : undefined}
            />
            <Form.Control.Feedback type="invalid" id="add-character-name-error">
              {nameError}
            </Form.Control.Feedback>
          </Form.Group>
          <Form.Group className="mb-3" controlId="add-character-role">
            <Form.Label>How do they fit in? <span className="text-muted fw-normal">(optional)</span></Form.Label>
            <Form.Control
              type="text"
              placeholder="e.g. best friend, rival, mentor"
              value={form.role}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, role: e.target.value }))
              }
              disabled={isLoading}
            />
            <Form.Text>
              This shows next to their name in the list. You can skip it for now.
            </Form.Text>
          </Form.Group>
          <Form.Group>
            <Form.Label id="add-character-cast-label">Who are they?</Form.Label>
            <div
              className="add-character-modal__cast"
              role="group"
              aria-labelledby="add-character-cast-label"
            >
              {CAST_TYPES.map((opt) => {
                const selected = form.characterType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className="add-character-modal__cast-btn"
                    aria-pressed={selected}
                    disabled={isLoading}
                    onClick={() =>
                      setForm((prev) => ({ ...prev, characterType: opt.value }))
                    }
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <Form.Text className="d-block mt-2">
              Not sure yet? Supporting is a fine place to start.
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            className="sg-btn-outline"
            onClick={handleHide}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            className={`sg-btn-fill${isLoading ? " sg-btn-fill--loading" : ""}`}
            disabled={!form.name.trim() || isLoading}
          >
            {isLoading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                />
                Adding…
              </>
            ) : (
              "Add Character"
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default AddCharacterModal;
