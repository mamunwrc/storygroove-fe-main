import React, { useContext, useEffect, useState } from "react";
import { FaCheckCircle } from "react-icons/fa";
import { IoMdAttach } from "react-icons/io";
import { Circle, Default, Heart } from "react-spinners-css";
import { ImageContext } from "../../contexts/imageContext";
const ChevronSvg = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 14 8"
    className="chevron w-6 h-6 text-gray-800 dark:text-white"
    aria-hidden="true"
  >
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="m1 1 5.326 5.7a.909.909 0 0 0 1.348 0L13 1"
    />
  </svg>
);

const CloseSvg = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 14 14"
    className="close w-6 h-6 text-gray-800 dark:text-white"
    aria-hidden="true"
  >
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
    />
  </svg>
);

const ImageDisplay = ({
  imagePath,
  imageName,
  handleSelect,
  syncS3,
  onImageLoad,
}) => {
  const [loaded, setLoaded] = useState(false);
  const { setEditorLoad } = useContext(ImageContext);
  const finishLoading = () => {
    setLoaded(true);

    if (typeof onImageLoad === "function") {
      onImageLoad();
    }
  };
  const imageUrl = `${
    syncS3 ? process.env.REACT_APP_S3_API_URL : process.env.REACT_APP_BASE_URL
  }/${imagePath}/${imageName}`;

  return (
    <div className="img-thumb">
      <img
        src={imageUrl}
        alt="original"
        height={40}
        onClick={() => {
          if (handleSelect) {
            handleSelect(imageUrl);
          }
        }}
        onLoad={() => finishLoading()}
        style={{ display: loaded ? "block" : "none" }}
      />
      {!loaded && <div className="spinCollapse"></div>}
    </div>
  );
};

const CollapseListImage = ({
  curImage,
  handleSelect = "",
  collaspeOpen,
  handleCollapse,
  spinner,
  handleSpinner,
  onImageLoad,
}) => {
  useEffect(() => {
    if (typeof handleSpinner !== "function") {
      console.error("handleSpinner prop must be a function");
      return;
    }

    const timer = setTimeout(handleSpinner, 5000);

    return () => clearTimeout(timer);
  }, [handleSpinner]);
  const imageComponents =
    curImage != undefined && curImage !== null && curImage.length > 0 ? (
      curImage?.map((image, index) => (
        <ImageDisplay
          key={index} // remember to give a key in order to avoid warnings
          imagePath={image.imagePath}
          imageName={image.imageName}
          handleSelect={handleSelect}
          syncS3={image.syncS3}
          onImageLoad={onImageLoad}
        />
      ))
    ) : (
      <></>
    );
  return (
    <div className={`faq ${collaspeOpen ? "active" : ""}`}>
      {/* <span> */}
      {spinner ? <Default size={30} /> : ""}
      {!spinner ? (
        <div className="collaspeHeader">
          <FaCheckCircle fill="green" />
          <span>Create</span>
          <a className="faq-toggle" onClick={handleCollapse}>
            <ChevronSvg />
            <CloseSvg />
          </a>
        </div>
      ) : (
        ""
      )}
      {/* </span> */}
      {collaspeOpen && (
        <div className="image-area">
          <h6 className="faq-text">Select Image to use</h6>
          <div className="image-inner-area">{imageComponents}</div>
          {/* <div className="secondRow">
            <h6>Add Watermark</h6>
            <label className="OuterAttachmentDiv">
              <div className="attachment">
                <IoMdAttach />
                <span>Attachment</span>
              </div>
              <span className="side-attachment">attachment name</span>
              <input type="file" />
            </label>
          </div> */}
        </div>
      )}
    </div>
  );
};

export default CollapseListImage;
