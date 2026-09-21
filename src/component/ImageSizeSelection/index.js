import { Form, Row, Col, Dropdown } from "react-bootstrap";
import socialSizeOptions from "../../assests/data/commonSocialMediaSizes.json";
import { useState, useEffect, useRef } from "react";

const ImageSizeSelection = ({ setSizeSelected, curImage, setError }) => {
  const [widthState, setWidthState] = useState(480);
  const [heightState, setHeightState] = useState(480);
  const [size, setSize] = useState("Select social media sizes");
  const widthRef = useRef();
  const heightRef = useRef();

  const handleSocialSizeSelect = async (e) => {
    setSize(e);
    const [w, h] = socialSizeOptions
      .filter((s) => s.ratio === e)[0]
      .value.split("x");
    setSizeSelected({
      width: w,
      height: h,
    });
  };

  useEffect(() => {
    // if (socialMediaSize?.value == undefined) return;
    // const [width, height] = socialMediaSize.value.split("x");
    // setSizeSelected({
    //   width: width,
    //   height: height,
    // });
  }, []);

  // useEffect(() => {
  //   const handler = setTimeout(() => {
  //     if (heightState >= 512) {
  //       setSizeSelected((val) => ({
  //         ...val,
  //         height: heightState,
  //       }));
  //     } else {
  //       setError("Height cannot be less then 512px");
  //       setHeightState(512);
  //     }
  //   }, delay);

  //   return () => {
  //     clearTimeout(handler);
  //   };
  // }, [heightState]);

  // useEffect(() => {
  //   const handler = setTimeout(() => {
  //     if (widthState >= 512) {
  //       setSizeSelected((val) => ({
  //         ...val,
  //         width: widthState,
  //       }));
  //     } else {
  //       setError("Width cannot be less then 512px");
  //       setWidthState(512);
  //     }
  //   }, delay);

  //   return () => {
  //     clearTimeout(handler);
  //   };
  // }, [widthState]);

  const handleSizeSelection = () => {
    const wdth = widthRef.current.value;
    const hgth = heightRef.current.value;
    setWidthState(wdth);
    setHeightState(hgth);
    setSizeSelected({
      width: wdth,
      height: hgth,
    });
  };
  // const defaultSize = socialMediaSize.length > 0 ? socialMediaSize : null;

  return (
    <>
      <Form.Group className="mb-3 sm-12 ">
        <Form.Label className="paragraph-text-secondary text-gray">
          {/* Current Size : {width != undefined ? `${width} X ${height}` : ""} */}
          Current Size : {size ? size : ""}
        </Form.Label>
      </Form.Group>
      <div className="mb-3 sm-12 ">
        <Form.Label>Common social media sizes</Form.Label>
        <Dropdown
          className="d-inline-block w-100"
          onSelect={handleSocialSizeSelect}
        >
          <Dropdown.Toggle
            style={{ backgroundColor: "white", color: "black" }}
            className="w-100"
          >
            {size || "Select social media sizes"}
            {/* {defaultSize ? defaultSize: 'Select social media sizes'} */}
          </Dropdown.Toggle>
          <Dropdown.Menu className="w-100">
            {socialSizeOptions.map((option) => (
              <Dropdown.Item
                style={{ fontSize: 15 }}
                eventKey={option.ratio}
                value={option.value}
              >
                {option.ratio}
                <img style={{ float: "right" }} src={"/" + option.icon} alt="" />
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown>
      </div>
      {/* <Form.Group className="mb-3">
        <Form.Label>Common social media sizes</Form.Label>
        <Form.Select onChange={handleSocialSizeSelect}>
          <option hidden>Select social media sizes</option>
          {socialSizeOptions.map((option) => (
            <option key={option.key} value={option.value}>
              {option.label}
              <img style={{ float: "right" }} src={"/" + option.icon} />
            </option>
          ))}
        </Form.Select>
      </Form.Group> */}
      <Form.Group className="mb-3">
        <Form.Label>Custom Sizes</Form.Label>
        <Row>
          <Col>
            <Form.Control
              type="number"
              placeholder="width"
              id="width"
              min={480}
              ref={widthRef}
              value={widthState}
              max={4096}
              onInput={(e) => {
                //setWidthState(e.target.value);
                handleSizeSelection();
              }}
            />
          </Col>
          <Col>
            <Form.Control
              type="number"
              placeholder="height"
              id="width"
              min={480}
              value={heightState}
              ref={heightRef}
              max={4096}
              onInput={(e) => {
                handleSizeSelection();
                //setHeightState(e.target.value);
              }}
            />
          </Col>
        </Row>
      </Form.Group>
    </>
  );
};

export default ImageSizeSelection;
