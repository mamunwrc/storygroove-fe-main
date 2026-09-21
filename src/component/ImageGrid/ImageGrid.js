import { Row, Col } from "react-bootstrap";
import "./imageGridStyles.scss";

const ImageGrid = ({ setSelectedImgs, setCurrentImage }) => {
  return (
    <div>
      <Row className="justify-content-md-center">
        <Col md={8}>
          <Row className="justify-content-md-center g-1">
            {setSelectedImgs.map((img, index) => {
              return (
                <Col md={6} className="p-2" key={index}>
                  <div className="modal-img-container">
                    <img
                      src={`${process.env.REACT_APP_BASE_URL}/${img.imagePath}/${img.imageName}`}
                      alt=""
                      className="image-fluid"
                      onClick={(e) => {
                        setCurrentImage(img);
                      }}
                    />
                  </div>
                </Col>
              );
            })}
          </Row>
        </Col>
      </Row>
    </div>
  );
};

export default ImageGrid;
