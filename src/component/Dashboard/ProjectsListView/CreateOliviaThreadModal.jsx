import React, { useState } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { createOliviaThread } from "../../../api/assistant";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const CreateOliviaThreadModal = ({ show, handleClose }) => {
  const [ideaName, setIdeaName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!ideaName.trim()) return;

    setLoading(true);
    try {
      const response = await createOliviaThread(ideaName);
      
      if (response.data) {
        toast.success("Thread created successfully!");
        handleClose();
        const newProject = response.data;
        const targetId = newProject.threadId || newProject.id || newProject._id;
        
        if (targetId) {
             navigate(`/dashboard/agent-chat/olivia/novel/${targetId}`, { state: { ideaName } });
        } else {
            // Fallback if structure is different
             console.error("Could not find thread ID in response", response.data);
             toast.error("Created but could not navigate automatically.");
        }
      }
    } catch (error) {
      console.error("Error creating thread:", error);
      toast.error("Failed to create thread. Please try again.");
    } finally {
      setLoading(false);
      setIdeaName("");
    }
  };

  return (
    <Modal show={show} onHide={handleClose} centered className="storygroove-theme">
      <Modal.Header closeButton>
        <Modal.Title>What's the name of your novel?</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleCreate}>
          <Form.Group className="mb-3">
            <Form.Control
              type="text"
              placeholder="e.g. The Lost City"
              value={ideaName}
              onChange={(e) => setIdeaName(e.target.value)}
              autoFocus
              required
            />
          </Form.Group>
          <div className="d-flex justify-content-end gap-2 mt-4">
             <Button variant="secondary" onClick={handleClose} disabled={loading} className="sg-btn-outline">
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading || !ideaName.trim()} className="sg-btn-fill">
              {loading ? "Creating..." : "Talk to Olivia"}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default CreateOliviaThreadModal;

