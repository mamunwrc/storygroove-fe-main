import { Modal, Row, Col, Button } from 'react-bootstrap';
import React from 'react';
import './imageModelStyle.scss';

const ImageModal = ({
  show,
  handleClose,
  image,
  showOptions = true,
  handleEditorClick,
  handleDownloadBtnClick,
  handleShopifyClick,
  handleSocialShare,
}) => {
  return (
    <>
      <Modal show={show} onHide={handleClose} size="xl">
        <Modal.Header closeButton></Modal.Header>
        <Modal.Body>
          <Row>
            <Col md={8}>
              <img
                src={`${process.env.REACT_APP_BASE_URL}/${image.imagePath}/${image.imageName}`}
                alt=""
                className="img-fluid"
              />
            </Col>
            {showOptions ? (
              <Col md={4}>
                <div className="d-flex flex-column justify-content-between">
                  <div>
                    <Button
                      variant="primary"
                      size="sm"
                      className="pull-right"
                      onClick={() => {
                        handleEditorClick();
                      }}
                    >
                      Open in Editor
                    </Button>
                  </div>
                  <div>
                    <Button
                      variant="primary"
                      size="sm"
                      className="pull-right"
                      onClick={() => {
                        handleDownloadBtnClick();
                      }}
                    >
                      Download Image
                    </Button>
                  </div>
                </div>
              </Col>
            ) : (
              <></>
            )}
          </Row>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default ImageModal;
