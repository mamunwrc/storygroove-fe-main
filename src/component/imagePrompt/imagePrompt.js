import React from 'react';
import { Row, Col, Form, Button } from 'react-bootstrap';
import './imagePromptStyle.scss';

const ImagePrompt = ({
  prompt,
  setPrompt,
  resetPrompt,
  submitPrompt,
  error,
}) => {
  return (
    <div>
      <Row className="justify-content-md-center mt-2">
        <Col md={12}>
          <Form className="image-prompt-container">
            <Row>
              <Col md={12} className="">
                <Form.Control
                  as="textarea"
                  placeholder="Prompt: Write a engaging title for Nike Jordan Shoe available now "
                  value={prompt}
                  className="image-prompt-input"
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </Col>
              <p className="text-danger text-center mb-0 mt-2">{error}</p>
              <Col md={12} className="m-2 mt-5 d-flex justify-content-end">
                <Button
                  className="pull-right button-primary-black w-auto me-4"
                  onClick={submitPrompt}
                >
                  Submit
                </Button>
              </Col>
            </Row>
          </Form>
        </Col>
      </Row>
    </div>
  );
};

export default ImagePrompt;
