import Modal from 'react-bootstrap/Modal';
import Spinner from 'react-bootstrap/Spinner';
import './poupstyles.scss';
function PopupLoader({
    show, 
    setShow
}) {
  const handleClose = () => setShow(false);

  return (
    <>
      <Modal show={show} 
      onHide={handleClose}
      size="lg"
      aria-labelledby="contained-modal-title-vcenter"
      centered
      className='popup-loader'
      >
        <Spinner animation="border" variant="light" >
            <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Modal>
    </>
  );
}

export default PopupLoader;



