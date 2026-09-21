import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./KanbanCard.css";
import { BsPinAngle, BsPinAngleFill } from "react-icons/bs";
import { MdDelete } from "react-icons/md";
import { TbCalendarTime } from "react-icons/tb";
import { FaChevronRight } from "react-icons/fa";
import { RxHamburgerMenu } from "react-icons/rx";
import { updateBook, deleteBook, deleteThread, renameThread, pinThread } from "../../../api/bookGeneration";
import { deleteIdea, updateIdea } from "../../../api/ideas";
import { inferRecentWorkFromKanbanCard, recordRecentWork } from "../../../utils/recentWork";
import { toast } from "react-toastify";
import { TiPin } from "react-icons/ti";
import { LuPencil } from "react-icons/lu";
import { Modal, Form } from "react-bootstrap";

const KanbanCard = ({
  title,
  titleDisplay,
  subtitle,
  className,
  card,
  loading,
  novelPinned,
  setNovelPinned,
  fetchAllBooks,
  deleteContext = {},
  ctaLabel = "Continue Writing",
  pastWorkLocked = false,
}) => {
  const navigate = useNavigate();
  const [isPinned, setIsPinned] = useState(card?.pinned || false);
  const [, setDeleting] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newTitle, setNewTitle] = useState(title || "");

  useEffect(() => {
    setNewTitle(title || "");
  }, [showRenameModal, title]);

  const isIdea = Boolean(card?.isIdea);
  const getAgentType = () => {
    if (isIdea) return "idea";
    if (card.assistantName === "SimoneAI" || card.assistantName === "Simone AI") return "simone";
    if (card.assistantName === "Olivia" || card.agentName === "olivia") return "olivia";
    return "novel";
  };
  const agentType = getAgentType();
  // Cards from the Thread collection (Simone / Olivia) have agentName or assistantName set
  const isThread = agentType === "simone" || agentType === "olivia";

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const datePart = date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const timePart = date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return `${datePart} | ${timePart}`;
  };

  const handleCardClick = (e) => {
    e.preventDefault();
    if (pastWorkLocked) {
      toast.error(
        "Your past work is locked. Resume or reactivate billing from My Account.",
        { autoClose: 4500 }
      );
      navigate("/dashboard/userprofile?tab=subscription");
      return;
    }
    if (isIdea) {
      navigate(`/dashboard/capture-idea/${card._id}`);
      return;
    }
    if (card.assistantName === "SimoneAI" || card.assistantName === "Simone AI") {
      const targetId = card.threadId || card._id;
      recordRecentWork(inferRecentWorkFromKanbanCard(card, title));
      navigate(`/dashboard/agent-chat/simone/novel/${targetId}`, { state: { ideaName: title } });
    } else if (card.assistantName === "Olivia" || card.agentName === "olivia") {
      const targetId = card.threadId || card._id;
      recordRecentWork(inferRecentWorkFromKanbanCard(card, title));
      navigate(`/dashboard/agent-chat/olivia/novel/${targetId}`, { state: { ideaName: title } });
    } else if (card.uploaded) {
      recordRecentWork(inferRecentWorkFromKanbanCard(card, title));
      navigate(`/dashboard/upload/bookeditor/${card?._id}`);
    } else if (card.status === "completed") {
      recordRecentWork(inferRecentWorkFromKanbanCard(card, title));
      navigate(`/dashboard/bookeditor/${card?._id}?view=true`);
    } else {
      recordRecentWork(inferRecentWorkFromKanbanCard(card, title));
      navigate(`/dashboard/bookeditor/${card?._id}`);
    }
  };

  const handlePinned = async () => {
    if (isIdea) return;
    try {
      const nextPinned = !isPinned;
      let response;
      if (isThread) {
        response = await pinThread(card._id, nextPinned);
      } else {
        response = await updateBook({ novelId: card._id, pinned: nextPinned });
      }
      if (response.status === 200) {
        setIsPinned(nextPinned);
        toast.success(nextPinned ? "Pinned successfully" : "Unpinned successfully");
        if (typeof setNovelPinned === "function") {
          setNovelPinned(!novelPinned);
        }
      } else {
        toast.error(response.data?.message || "Failed to update pin state");
      }
    } catch (err) {
      toast.error("Failed to update pin state");
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
    setDropdownOpen(false);
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      let response;
      if (isIdea) {
        response = await deleteIdea(card._id);
      } else if (isThread) {
        response = await deleteThread(card._id);
      } else {
        response = await deleteBook(card._id, {
          ...deleteContext,
          projectCardId: String(card?._id || ""),
          projectType: "novel",
        });
      }
      if (response.status === 200) {
        toast.success("Deleted successfully");
        if (typeof fetchAllBooks === "function") fetchAllBooks();
        else window.location.reload();
      } else {
        toast.error(response.data?.message || "Failed to delete");
      }
    } catch (err) {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleRename = () => {
    setShowRenameModal(true);
    setDropdownOpen(false);
  };

  const handleRenameSubmit = async (e) => {
    e.preventDefault();
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) {
      toast.error("Title cannot be empty");
      return;
    }
    try {
      let response;
      if (isIdea) {
        response = await updateIdea(card._id, { title: trimmedTitle });
      } else if (isThread) {
        response = await renameThread(card._id, trimmedTitle);
      } else {
        response = await updateBook({ novelId: card._id, name: trimmedTitle });
      }
      if (response.status === 200) {
        toast.success("Renamed successfully");
        if (typeof fetchAllBooks === "function") {
          fetchAllBooks();
        } else {
          window.location.reload();
        }
        setShowRenameModal(false);
      } else {
        toast.error(response.data?.message || "Failed to rename");
      }
    } catch (err) {
      toast.error("Failed to rename");
    }
  };

  return (
    <>
      <article
        className={`kanban-card d-flex flex-column h-100 ${className || ""}`}
        data-agent={agentType}
        onClick={handleCardClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => {
          setHovered(false);
          setDropdownOpen(false);
        }}
      >
        <header className="kanban-card-header">
          <div className="kanban-card-date">
            <TbCalendarTime size={16} />
            <span>{formatDate(card?.createdAt)}</span>
          </div>
          <div className="kanban-card-dropdown-wrapper">
            {isPinned && (
              <TiPin size={20} style={{ color: "#2d72d9", marginRight: 5 }} />
            )}
            {(hovered || dropdownOpen) && (
              <RxHamburgerMenu
                className="kanban-card-dropdown-hamburger"
                onClick={(e) => { e.stopPropagation(); setDropdownOpen((open) => !open); }}
              />
            )}
            {dropdownOpen && (
              <div
                className="kanban-card-dropdown-menu"
                onClick={(e) => e.stopPropagation()}
              >
                {!isIdea && (
                  <div
                    className="kanban-card-dropdown-item"
                    onClick={handlePinned}
                    style={{ color: isPinned ? "green" : undefined }}
                  >
                    {isPinned ? <BsPinAngleFill /> : <BsPinAngle />}{" "}
                    {isPinned ? "Unpin" : "Pin"}
                  </div>
                )}
                <div
                  className="kanban-card-dropdown-item"
                  onClick={handleDelete}
                  style={{ color: "red" }}
                >
                  <MdDelete /> Delete
                </div>
                <div
                  className="kanban-card-dropdown-item"
                  onClick={handleRename}
                >
                  <LuPencil /> Rename
                </div>
              </div>
            )}
          </div>
        </header>

        <h3 className="kanban-card-title">{titleDisplay ?? title}</h3>

        <div className="kanban-card-description">{subtitle}</div>

        {isIdea && (
          <div className="mt-2" style={{ fontSize: "0.8rem", color: "#6c757d", display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ backgroundColor: "#e9ecef", padding: "2px 6px", borderRadius: "4px" }}>
              My Ideas
            </span>
          </div>
        )}

        {(card.assistantName === "SimoneAI" || card.assistantName === "Simone AI" || card.assistantName === "Olivia" || card.agentName === "olivia") && (
          <div className="mt-2" style={{ fontSize: "0.8rem", color: "#6c757d", display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ backgroundColor: "#e9ecef", padding: "2px 6px", borderRadius: "4px" }}>
              {card.assistantName === "SimoneAI" || card.assistantName === "Simone AI" ? "SimoneAI®" : "OliviaAI®"}
            </span>
          </div>
        )}

        <div className="kanban-card-footer mt-auto w-100">
          <button
            onClick={(e) => { e.stopPropagation(); handleCardClick(e); }}
            className="sg-btn-outline outline-card-btn w-100"
          >
            {ctaLabel}
            <span className="kanban-card-chevron">
              <FaChevronRight style={{ marginLeft: 4 }} />
            </span>
          </button>
        </div>
      </article>

      <Modal show={showRenameModal} onHide={() => setShowRenameModal(false)} centered size="md">
        <Modal.Header closeButton>
          <Modal.Title>{isIdea ? "Rename Idea" : "Rename Book"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="content-container form-control-icon storygroove-theme">
            <Form onSubmit={handleRenameSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>{isIdea ? "Title of the idea" : "Title of the book"}</Form.Label>
                <Form.Control
                  className="border-none"
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Enter new title"
                  required
                />
              </Form.Group>
              <div className="d-flex justify-content-end w-100 gap-2 mt-4">
                <button
                  className="sg-btn-outline"
                  type="button"
                  onClick={() => setShowRenameModal(false)}
                >
                  Cancel
                </button>
                <button className="sg-btn-fill" type="submit">
                  Rename
                </button>
              </div>
            </Form>
          </div>
        </Modal.Body>
      </Modal>

      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered size="md">
        <Modal.Header closeButton>
          <Modal.Title>
            Delete {isIdea ? "Idea" : isThread ? "Conversation" : "Book"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="content-container form-control-icon storygroove-theme">
            <p className="mb-4">
              Are you sure you want to delete this{" "}
              {isIdea ? "idea" : isThread ? "conversation" : "book"}?
              This action cannot be undone.
            </p>
            <div className="d-flex justify-content-end w-100 gap-2 mt-2">
              <button
                className="sg-btn-outline"
                type="button"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                className="sg-btn-fill"
                type="button"
                onClick={handleConfirmDelete}
                style={{ backgroundColor: "#dc3545", borderColor: "#dc3545" }}
              >
                Delete
              </button>
            </div>
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default KanbanCard;
