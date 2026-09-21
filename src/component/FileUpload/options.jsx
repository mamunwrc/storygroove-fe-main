import React, { useState, useRef, useEffect, useContext } from "react";
import { Form, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { downloadImage } from "../../Utility/utility";
import { ImageSizeSelection } from "../index";
import clsx from "clsx";

import {
  reduceImageSize,
  uploadFile,
  getBackgroundImages,
} from "../../api/images";

import { ImageContext } from "../../contexts/imageContext";
import { ProgressBarContext } from "../../contexts/ProgressBarContext";
import { Toaster } from "react-hot-toast";

const ImageOptions = ({
  setError,
  setLoading,
  editorType = "background-remove",
  saveClicked,
  setSaveClicked,
  editorRef,
  bg,
}) => {
  const { curImage, setBackgroundImg, saveImageToServer } =
    useContext(ImageContext);
  const isbgRemovePg =
    window.location.href.split("/").pop() === "remove-background";
  const navigate = useNavigate();
  const [backgroundImages, setBackgroundImages] = useState([]);
  const [sizeSelected, setSizeSelected] = useState({
    width: null,
    height: null,
  });
  const { setCurrentStep } = useContext(ProgressBarContext);
  useEffect(() => {
    setCurrentStep(1);
  }, [setCurrentStep]);

  const validateSizes = () => {
    if (sizeSelected.width < 480 || sizeSelected.height < 480) {
      setError("Width and height cannot be less then 480px");
      return false;
    } else {
      return true;
    }
  };

  const downloadFile = (img) => {
    const url = `${process.env.REACT_APP_BASE_URL}/${img.imagePath}/${img.imageName}`;
    downloadImage(url, img.imageName);
  };

  const handleImageSubmit = async (e) => {
    e.preventDefault();

    if (isbgRemovePg) {
      downloadFile(curImage);
      return;
    }

    const { width, height } = sizeSelected;
    if (width === null || height === null) {
      setError("Please select width and height");
    } else if (validateSizes()) {
      setError(null);
      setLoading(true);
      let imagesaved = curImage;

      if (!saveClicked && editorRef) {
        imagesaved = await saveImageToServer(editorRef);
        if (!imagesaved) {
          setError("Error occured while saving the image");
          return;
        }
        setSaveClicked(true);
      }

      try {
        const resp = await reduceImageSize(imagesaved._id, width, height);
        const img = resp.image;
        const url = `${process.env.REACT_APP_BASE_URL}/${img.imagePath}/${img.imageName}`;
        downloadImage(url, img.imageName);
        setLoading(false);
      } catch (err) {
        setLoading(false);
      }
    }
  };

  const fetchBackgroundImages = React.useCallback(async () => {
    try {
      const resp = await getBackgroundImages();
      setBackgroundImages(resp.backgroundImages);
    } catch (err) {
      console.log(err);
    }
  }, []);

  const handleBackground = (e) => {
    setBackgroundImg(e.target.src);
  };

  const btnClickHandler = async (navLink) => {
    try {
      if (saveClicked) {
        return navigate(navLink);
      }

      const resp = await saveImageToServer(editorRef);
      if (resp) {
        editorRef.current = null;
        setSaveClicked(true);
        setTimeout(() => {
          navigate(navLink);
        }, 1000);
      } else {
        setError("Error occured while saving the image");
      }
    } catch (e) {
      setError("Error occured while saving the image");
    }
  };

  const editImageClickHandler = (navLink) => {
    // if(validateSizes()){}
    navigate(navLink);
  };

  return (
    <>
      <Form className="custom-form remove-bg-social-tab mt-5">
        {editorType !== "background-remove" ? (
          <ImageSizeSelection
            curImage={curImage}
            setSizeSelected={setSizeSelected}
            key={"image-size-selection"}
            setError={setError}
          />
        ) : null}

        {editorType === "superimpose" ? (
          <ImageUploadBtn fetchBackgroundImages={fetchBackgroundImages} />
        ) : (
          <></>
        )}

        <NavigationBtn
          label={"Generate new background with AI"}
          to={"/dashboard/text-to-image"}
          handleBtnClick={(to) => {
            navigate(to, { state: { isRedirected: true }, replace: true });
          }}
        />
        {editorType !== "superimpose" ? (
          <NavigationBtn
            label={"Choose standard background"}
            to={"/dashboard/image-editor"}
            handleBtnClick={editImageClickHandler}
          />
        ) : (
          <></>
        )}
        {editorType === "superimpose" ? (
          <NavigationBtn
            label={"Enhance with editor"}
            to={"/dashboard/enhance-with-editor"}
            handleBtnClick={btnClickHandler}
          />
        ) : (
          <></>
        )}
        {editorType === "superimpose" &&
        Object.keys(backgroundImages).length &&
        backgroundImages["userImages"].length > 0 ? (
          <div>
            <h4 className="paragraph-text-primary mb-3 fw-500">
              User Made backgrounds
            </h4>
            <ImageBackgroundGrid
              backgroundImages={backgroundImages["userImages"]}
              handleBackground={handleBackground}
              vertical={true}
              background={bg}
            />
          </div>
        ) : (
          <></>
        )}

        {editorType === "superimpose" ? (
          <div>
            <br />
            <h4 className="paragraph-text-primary mb-3 fw-500">
              Pre Made backgrounds
            </h4>
            <ImageBackgroundGrid
              backgroundImages={backgroundImages["siteImages"]}
              handleBackground={handleBackground}
              vertical={true}
              background={bg}
            />
          </div>
        ) : (
          <></>
        )}
        {editorType === "superimpose" ? (
          <div>
            <h4 className="paragraph-text-primary mb-3 fw-500 mt-4">
              Background Color
            </h4>
            <ImageBackgroundGrid
              backgroundImages={backgroundImages["solidImages"]}
              handleBackground={handleBackground}
              vertical={false}
              background={bg}
            />
          </div>
        ) : (
          <></>
        )}
        <DownloadImage handleImageSubmit={handleImageSubmit} />
      </Form>
      <Toaster position="top-right" />
    </>
  );
};

export default ImageOptions;

const DownloadImage = ({ handleImageSubmit }) => {
  return (
    <Form.Group className="mb-3">
      <Button
        className="button-primary-black w-100"
        variant="primary"
        type="button"
        onClick={handleImageSubmit}
      >
        <img src="/assets/images/download-icon.png" alt="" className="me-2" />
        Download
      </Button>
    </Form.Group>
  );
};

const NavigationBtn = ({ label, to, handleBtnClick, iconUrl }) => {
  return (
    <Form.Group className="mb-3">
      <Button
        className="button-primary-black w-100"
        type="button"
        onClick={() => {
          handleBtnClick(to);
        }}
      >
        <img className="me-2" src={iconUrl} alt="" />
        {label}
      </Button>
    </Form.Group>
  );
};

const ImageUploadBtn = ({ fetchBackgroundImages }) => {
  const btnref = useRef(null);

  const handleFileUpload = async (e) => {
    e.preventDefault();

    try {
      const file = e.target.files[0];
      if (file) {
        const formData = new FormData();
        formData.append("image", file);
        formData.append("type", "background");
        const resp = await uploadFile(formData, () => {});
        if (resp) {
          fetchBackgroundImages();
        }
      } else {
        console.log("file not found");
      }
    } catch (e) {
      console.log("error occured");
    }
  };

  useEffect(() => {
    fetchBackgroundImages();
  }, [fetchBackgroundImages]);

  return (
    <div>
      <input
        type="file"
        ref={btnref}
        name="file"
        id="file"
        className="inputfile"
        accept="image/png, image/jpeg, image/jpg, image/webp"
        onChange={handleFileUpload}
        hidden
      />
      <Button
        className="button-primary-black mb-3"
        type="button"
        onClick={(e) => {
          window.onbeforeunload = null;
          e.stopPropagation();
          btnref.current.click();
        }}
      >
        <img className="me-2" src="/assets/images/upload.svg" alt="" />
        Upload a new Image
      </Button>
    </div>
  );
};

const ImageBackgroundGrid = ({
  handleBackground,
  backgroundImages,
  vertical = false,
  background,
}) => {
  const gridVertical = vertical
    ? "background-image-grid-vertical"
    : "background-image-grid-horizontal";

  return (
    <div>
      <div className={`${gridVertical}`}>
        {backgroundImages &&
          backgroundImages.map((imageurl) => {
            return (
              <div
                className={clsx(
                  background === imageurl ? "bg-selected-border" : "",
                  "image-thumbnail-container"
                )}
              >
                <img
                  src={imageurl}
                  alt={imageurl.split("/").pop().split(".")[0]}
                  onClick={handleBackground}
                  className="w-100 h-100"
                />
              </div>
            );
          })}
      </div>
    </div>
  );
};
