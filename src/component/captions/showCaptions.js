import React from "react";
import { Button, Row, Col } from "react-bootstrap";
import "./captionStyles.scss";
import { FiRefreshCcw } from "react-icons/fi";
const GenerateCaptionlayout = ({
  captions,
  setImageCaption,
  regenerateCaption,
}) => {
  const setCaptionText = (caption) => {
    setImageCaption(caption);
  };

  return (
    <>
      <ol className="caption-list ">
        {captions.length ? (
          captions.map(({ caption }, index) => {
            return (
              <>
                <li key={index}>
                  <Row className="caption-list-row">
                    <Col md={8}>{caption}</Col>
                    <Col
                      md={4}
                      className="d-flex justify-content-end align-items-center caption-list-row-buttons"
                    >
                      <Button
                        className="bg-gray border-0"
                        variant="dark"
                        onClick={(e) => {
                          regenerateCaption(caption, index);
                        }}
                      >
                        <FiRefreshCcw />
                      </Button>
                      &nbsp;&nbsp;
                      <Button
                        variant="dark"
                        onClick={(e) => {
                          setCaptionText(caption);
                        }}
                      >
                        {" "}
                        Use{" "}
                      </Button>
                    </Col>
                  </Row>
                </li>
                <hr />
              </>
            );
          })
        ) : (
          <></>
        )}
      </ol>
    </>
  );
};

export default GenerateCaptionlayout;
