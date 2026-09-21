import { Modal, Button } from "react-bootstrap";

const DraftConflictModal = ({
  show,
  onKeepThisDevice,
  onLoadOtherDevice,
}) => {
  return (
    <Modal
      show={show}
      backdrop="static"
      keyboard={false}
      aria-labelledby="draft-conflict-title"
      centered
      className="storygroove-theme"
    >
      <Modal.Header>
        <Modal.Title id="draft-conflict-title">
          This scene changed on another device
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="pt-2">
        <p>
          You have unsaved typing here, and a newer version was saved from
          another device. Keeping this device overwrites that version.
        </p>
      </Modal.Body>
      <Modal.Footer className="d-flex justify-content-end w-100 border-0 pt-4">
        <Button
          variant="secondary"
          className="sg-btn-outline"
          onClick={onLoadOtherDevice}
        >
          Load other device
        </Button>
        <Button
          variant="primary"
          className="sg-btn-outline"
          onClick={onKeepThisDevice}
        >
          Keep this device
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DraftConflictModal;
