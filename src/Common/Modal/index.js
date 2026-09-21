import React from "react";
import { Modal } from "react-bootstrap";
import { useUI } from "../../contexts/ManagedUIContext";


const ModalArea = () => {
  const { modal, setCloseModal } = useUI();
  return (
    <Modal
      className="global-shopify-modal"
      show={modal?.isOpen}
      onHide={setCloseModal}
      centered
      size="lg"
    >
      <Modal.Header closeButton>
        <Modal.Title>{modal?.data?.title || "Modal"}</Modal.Title>
      </Modal.Header>
      <Modal.Body>

      </Modal.Body>
    </Modal>
  );
};

export default ModalArea;
