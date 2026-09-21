
import {Spinner} from "react-bootstrap"
import Modal from 'react-bootstrap/Modal';
import "./processModal.scss"

function ProgressModel({
    show, setShow
}) {

  const handleClose = () => setShow(false);

  return (
    <>
      <Modal className='progressModel' show={show} onHide={handleClose}>
        <div>
            <Spinner animation="border" variant="light" />
        </div>
      </Modal>
    </>
  );
}

export default ProgressModel;
