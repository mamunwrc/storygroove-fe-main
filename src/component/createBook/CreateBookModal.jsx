import React, { useState } from "react";
import {
  Form,
  InputGroup,
  Modal,
  OverlayTrigger,
  Tooltip,
} from "react-bootstrap";
import { toast } from "react-toastify";

import { createNewBook } from "../../api/bookGeneration";
import { MdInfoOutline } from "react-icons/md";

const CreateBookModal = ({ show, fetchAllBooks, handleClose }) => {
  // State to manage form data
  const [formData, setFormData] = useState({
    name: "",
    bookIdea: "",
  });

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await createNewBook(formData);
      if (response.status === 200) {
        // Reset form
        setFormData({ name: "", bookIdea: "" });
        handleClose();
        toast.success(response.data.message);
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <Modal
      show={show}
      onHide={handleClose}
      aria-labelledby="contained-modal-title-vcenter"
      centered
      size="md"
    >
      <Modal.Header closeButton>
        {" "}
        <Modal.Title id="contained-modal-title-vcenter">
          What’s This Bestseller Called?
        </Modal.Title>{" "}
      </Modal.Header>
      <Modal.Body>
        <div className="content-container form-control-icon storygroove-theme">
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="formName">
              <Form.Label>Title of the book</Form.Label>
              <InputGroup>
                <Form.Control
                  className="border-none"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter name here"
                  required
                />
                <InputGroup.Text>
                  <OverlayTrigger
                    placement="bottom"
                    overlay={
                      <Tooltip id="formName-tooltip">
                        Mindset matters—naming your book is the first magical
                        step. Picture it on a shelf, in a reader’s hands, or
                        trending on BookTok. You can always change it later—this
                        is where the magic begins.
                      </Tooltip>
                    }
                  >
                    <span>
                      <MdInfoOutline />
                    </span>
                  </OverlayTrigger>
                </InputGroup.Text>
              </InputGroup>
            </Form.Group>

            <Form.Group className="mb-3" controlId="formLogline">
              <Form.Label>Logline</Form.Label>
              <InputGroup>
                <Form.Control
                  as="textarea"
                  rows={2}
                  style={{ minHeight: "96px" }}
                  name="bookIdea"
                  value={formData.bookIdea}
                  onChange={handleChange}
                  required
                />
                <InputGroup.Text>
                  <OverlayTrigger
                    placement="bottom"
                    overlay={
                      <Tooltip id="formLogline-tooltip">
                        This is your elevator pitch of what the book is about.
                        It should be one or two sentences max.
                      </Tooltip>
                    }
                  >
                    <span>
                      <MdInfoOutline />
                    </span>
                  </OverlayTrigger>
                </InputGroup.Text>
              </InputGroup>
            </Form.Group>

            <div className="d-flex justify-content-end w-100 gap-2 mt-4">
              <button
                className="sg-btn-outline"
                type="button"
                onClick={handleClose}
              >
                Cancel
              </button>
              <button className="sg-btn-fill" type="submit">
                Create Book
              </button>
            </div>
          </Form>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default CreateBookModal;
