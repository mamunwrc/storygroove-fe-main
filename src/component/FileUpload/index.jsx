import React, { useState, useContext, useEffect, useRef } from "react";
import { ImageContext } from "../../contexts/imageContext";
import {
  gcpEditImageList,
  removeBackground,
  removeBackgroundImageList,
  saveRecordInMidJourney,
  sdxlGenImages,
} from "../../api/images";
import { UploadProgressModal, FileUpload, Editor } from "../index";
import toast, { Toaster } from "react-hot-toast";
import CustomProgressBar from "../CustomProgressBar/CustomProgressBar";
import LearnTutorialSection from "../Dashboard/LearnTutorialSection";
import "react-image-crop/dist/ReactCrop.css";
import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";
import { FaCube } from "react-icons/fa";
import CustomDropdown from "./CustomDropDown";
import RangeSlider from "./RangeSlider";
import CustomFlexDropdown from "./CustomFlexDropDown";
import { HiLightBulb } from "react-icons/hi";
import CollapseListImage from "./CollapseListImages";
import CollapseListBottom from "./CollapseListBottom";
import SkeletonImage from "./SkeletonImage";
import SkeletonImageList from "./SkeletonImageList";
import ResizeImage from "./ResizeImage";
import image from "../../assests/images/test.png";
import dim11 from "../../assests/size/1-1.png";
import dim43 from "../../assests/size/4-3.png";
import dim45 from "../../assests/size/4-5.png";
import dim52 from "../../assests/size/5-2.png";
import dim916 from "../../assests/size/9-16.png";
import dim169 from "../../assests/size/16-9.png";
import axios from "axios";
import { Spinner } from "react-bootstrap";
import { IoArrowBack } from "react-icons/io5";

export const getImageBase64 = async (imgUrl) => {
  try {
    const response = await fetch(imgUrl);
    if (!response.ok) {
      throw new Error("Network response was not ok: " + response.statusText);
    }
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Split the result to get the base64 string and resolve it
        const base64String = reader.result;
        const base64Data = base64String.split(",")[1];
        resolve(base64Data);
      };
      reader.onerror = () => {
        reject(new Error("Failed to read the image blob."));
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error fetching or reading image:", error);
    throw error; // Re-throw the error to be handled by the caller
  }
};

if (typeof AggregateError === "undefined") {
  const AggregateError = class AggregateError extends Error {
    constructor(errors, message) {
      super(message);
      this.errors = errors;
    }
  };
}

const RemoveBackground = () => {
  const {
    curImage,
    setCurImage,
    imageNoBg,
    setImageNoBg,
    originalImage,
    setOriginalImage,
    show,
    setShow,
    uploadProgress,
    setUploadProgress,
    uploadMessage,
    setUploadMessage,
    imageChanged,
    setImageChanged,
    setCurrentSkeleton,
    currentSkeleton,
    currentSkeletonList,
    setCurrentSkeletonList,
    setEditorImageList,
    setCurrentEditAiImage,
    setUpdatedSdkImage,
    backgroundImg,
    setProject,
    project,
    responseError,
    setResponseError,
    setUserTrack,
    editorLoad,
    setEditorLoad,
    setShopUrl,
    setBackward,
    editorB64Image,
    setEditorB64Image,
    userTrack
  } = useContext(ImageContext);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editorType, setEditorType] = useState("imageUpload");
  const [tabSelected, setTabSelected] = useState("");

  const [isOpen, setIsOpen] = useState(currentSkeletonList ? true : false);

  const [selectGeneric, setSelectGeneric] = useState("Imagine Create v1");
  const [selectedOptionForImage, setSelectedOptionForImage] = useState(null);
  const [skeletonImage, setSkeletonImage] = useState(null);

  const [showHoverIcon, setShowHoverIcon] = useState(false);
  const [spinner, setSpinner] = useState(false);
  const [collaspeOpen, setCollapseOpen] = useState(
    currentSkeletonList ? false : true
  );
  const [removeBackgroundImages, setremoveBackgroundImages] = useState([]);

  const [description, setDecsription] = useState("");
  const [size, setSize] = useState("16:9");
  const [variation, setVariation] = useState(8);

  const [saveClicked, setSaveClicked] = useState(false);

  const [imagesLoaded, setImagesLoaded] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);

  const [editorImageLoad, setEditorImageLoad] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(0);
  const editorRef = useRef(null);

  const dropdownRef1 = useRef(null);
  const dropdownRef2 = useRef(null);
  const dropdownRef3 = useRef(null);

  const [dropdown, setDropdown] = useState(null);

  // States for SkeletonImageList
  const [requestedImages, setRequestedImages] = useState(0);
  const [failedImages, setFailedImages] = useState(0);

  const handleGeneric = (selectedLabel) => {
    setSelectGeneric(selectedLabel);
    setDropdown(null);
  };

  const handleSize = (selectedLabel) => {
    setSize(selectedLabel);
  };
  const handleVariation = (selectedLabel) => {
    setVariation(Number(selectedLabel));
  };

  const handleCollapseImageList = (selectedLabel) => {
    setEditorImageLoad(false);
    // setUserTrack((prevState) => ({
    //   ...prevState,
    //   selectedImageUrl: selectedLabel,
    // }));

    setCurrentSkeleton(selectedLabel);
    setSelectedOptionForImage(selectedLabel);
  };

  const handleSkeletonValueChange = (newValue) => {
    setSkeletonImage(newValue);
    setCurrentSkeleton(newValue);
    setCurrentEditAiImage(newValue);
    if (newValue == uploadImage) {
      setIsOpen(false);
      setCollapseOpen(true);
      setEditorB64Image(null);

      setTimeout(() => {
        setEditorOpen(true);
      }, 1500);
    }
    // setUserTrack((prevState) => ({
    //   ...prevState,
    //   selectedImageUrl: newValue,
    // }));
  };

  const handleBackButton = () => {
    setSkeletonImage(currentSkeletonList[0]);
    setCurrentSkeleton(currentSkeletonList[0]);
    setCurrentEditAiImage(currentSkeletonList[0]);
    setIsOpen(false);
    setCollapseOpen(true);
    setTimeout(() => {
      setEditorOpen(true);
    }, 1500);
  };

  const handleImageLoad = () => {
    setImagesLoaded((prevCount) => prevCount + 1);
  };

  const checkError = [];
  function checkApiResponse(promise) {
    return new Promise(async (resolve, reject) => {
      try {
        let response = await promise;
        if (response && response.status === "success") {
          resolve(response);
        } else {
          if (response.status == 408) {
            checkError.push(response);
          }

          reject("Response not good.");
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  function cleanBase64(base64String) {
    const parts = base64String.split(",");
    if (parts.length === 2) {
      return parts[1];
    }
    return base64String;
  }

  let uploadImage = "";
  if (selectedOptionForImage === null) {
    uploadImage = curImage
      ? `${
          curImage[0]?.syncS3
            ? process.env.REACT_APP_S3_API_URL
            : process.env.REACT_APP_BASE_URL
        }/${curImage[0]?.imagePath}/${curImage[0]?.imageName}`
      : null;
  } else {
    uploadImage = curImage ? selectedOptionForImage : null;
  }

  const bg =
    size === "16:9"
      ? dim169
      : size === "9:16"
      ? dim916
      : size === "1:1"
      ? dim11
      : size === "5:2"
      ? dim52
      : size === "4:5"
      ? dim45
      : dim43;

  const finalbg = bg;

  function handleIncomingImagesFailures(numberOfFails, reason) {
    setFailedImages((prevState) => prevState + numberOfFails);
    toast.error(reason);
  }

  function parsingData(data)
  {
    const parsedData =
    typeof data === "string"
      ? JSON.parse(data)
      : data;
   return parsedData?.images;
  }

  function handleIncomingImages(expectedImages, response) {
    let returnedImages = [];

    // Reduce the generate count since we're processing the request now
    setGenerateLoading((prevState) => {
      if (prevState <= 0) return 0; // Safety check to not go into the negatives
      return --prevState;
    });

    // If the call failed, then handle errors and return
    if (response.status !== "success") {
      handleIncomingImagesFailures(expectedImages, "Some results have been ommited due to violating policies.");
      return;
    }

    // Sometimes we get JSON data, sometimes it's stringified
    // Can probably clean this up once the AI Lambda's are more stable
    returnedImages=parsingData(response.data)

    // We got partial results, make sure to handle failures, but keep processing
    if (returnedImages?.length < expectedImages) {
      handleIncomingImagesFailures((expectedImages - returnedImages), "Some results have been ommited due to violating policies.");
    }

    // TODO: May need special handling if we get a successful API call, but 0 images...
    if (returnedImages?.length > 0) {
      // On the first API to return, we're null, so set it to the first image
      // The next calls shouldn't mess with this, since the user may be browsing images
      setCurrentSkeleton((prevState) => prevState ?? returnedImages[0]);
      setCurrentEditAiImage((prevState) => prevState ?? returnedImages[0]);

      // Each returned call should append it's data, except the first, which sets it
      setCurrentSkeletonList((prevState) => prevState ? [...prevState, ...returnedImages] : returnedImages);

      // Not sure what this does ATM
      setremoveBackgroundImages((prevState) => prevState ? [...prevState, ...returnedImages] : returnedImages);

      const imageType=returnedImages[0].includes("sdxl/") ? "sdxl" : "gcp";

      let provider = returnedImages[0].includes("sdxl/") ? "sdxl" : "gcp";
      saveRecordInMidJourney(returnedImages, provider);
      setEditorOpen(false);

    }
  }

  const generateImage = async () => {
    setGenerateLoading(2);

    // Validation
    if (!description || description.trim() === "") {
      toast.error(
        "Please provide a description. This should include details about the image you want to generate."
      );
      setTimeout(() => {
        setGenerateLoading(0);
      }, 2000);
      return;
    }

    let base64 = null;
    setSpinner(true);
    setCollapseOpen(false);

    setCurrentSkeleton(null);
    setCurrentEditAiImage(null);
    setCurrentSkeletonList(null);
    setremoveBackgroundImages(null);

    setRequestedImages(variation);
    setFailedImages(0);

    // If we have saved editor data, use it
    if (editorB64Image) {
      base64 = editorB64Image
    // Else, get data from editor, use it and save it for future runs
    } else {
      try {
        const data = editorRef?.current()?.imageData;
        base64 = cleanBase64(data?.imageBase64);
        setEditorB64Image(base64);
      } catch (error) {
        console.error(error);
      }
    }

    if (!base64) {
      toast.error("No image data available to generate the image.");
      setSpinner(false);
      editorError();
      return;
    }

    const body = {
      prompt: description,
      image: base64,
      originalImageName: originalImage[0]?.imageName,
      size: size,
      variations: variation / 2,
      totalVariations: variation,
    };
    setIsOpen(true);

    

    // Fire off both calls, and then process their results as they come in
    // Currently, we'll assume it's two API calls for half the requests
    
     let gcpImageLists="", sdxlImageLists="";
    await gcpEditImageList(body).then(response =>{
      handleIncomingImages((variation / 2), response);
      gcpImageLists=parsingData(response.data); 
    });
     
    await sdxlGenImages(body).then(response => {
      handleIncomingImages((variation / 2), response);
      sdxlImageLists=parsingData(response.data); 
    });

    let metaData={
        promptUsed: description,
        size: size,
        numberOfVariations : variation,  
        imageUrls: JSON.stringify([
          {
              gcp: gcpImageLists ? gcpImageLists : 'NotGenerated',
          },
          {
              sdxl: sdxlImageLists ? sdxlImageLists : 'NotGenerated',
          },
         {
          selectedImageUrl: currentSkeleton,
         }
      ]),
    }
    setUserTrack((prevState) => ({
      ...prevState,
      type: ['userFlow','model'],
      imageModel: 'gcp,sdxl',
      steps: ['imageSelection','model'],
      metaData:metaData,
      flows:'backgroundGeneration',
      selectedImageUrl:currentSkeleton,
      previousId:userTrack.previousId?userTrack.previousId:null,
      apiCall: true,
    }));
  };

  const editorError = () => {
    setIsOpen(false);
    setEditorOpen(true);
    setCollapseOpen(true);
    // setGenerateLoading(false);
    //setSelectGeneric("Imagine Create v1");
    // uploadImage = curImage
    //   ? `${
    //       curImage[0]?.syncS3
    //         ? process.env.REACT_APP_S3_API_URL
    //         : process.env.REACT_APP_BASE_URL
    //     }/${curImage[0]?.imagePath}/${curImage[0]?.imageName}`
    //   : null;
    if (currentSkeletonList?.length > 0) {
      setCurrentSkeleton(currentSkeletonList[0]);
    }
  };

  const handleCollapse = (value) => {
    setCollapseOpen(!collaspeOpen);
  };

  const handleSpinner = () => {
    setSpinner(false);
  };

  const toggleDropdown = (dropdownId) => {
    if (generateLoading) return;
    if (dropdown === dropdownId) {
      setDropdown(null);
    } else {
      setDropdown(dropdownId);
    }
  };

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        dropdown === "dropdown1" &&
        (!dropdownRef1.current || !dropdownRef1.current.contains(e.target))
      ) {
        setDropdown(null);
      }
      if (
        dropdown === "dropdown2" &&
        (!dropdownRef2.current || !dropdownRef2.current.contains(e.target))
      ) {
        setDropdown(null);
      }
      if (
        dropdown === "dropdown3" &&
        (!dropdownRef3.current || !dropdownRef3.current.contains(e.target))
      ) {
        setDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [dropdown]);
  useEffect(() => {
    showEditor && setEditorType("superimpose");
  }, [showEditor]);

  useEffect(() => {
    if (currentSkeletonList?.length > 0)


    setUpdatedSdkImage(null);
    if (currentSkeletonList?.length > 0) {
      setCurrentSkeleton(currentSkeletonList[1]);
      setCurrentEditAiImage(currentSkeletonList[1]);
    }

    setEditorImageList(null);
    if (imageNoBg) {
      setCurImage(imageNoBg);
    } else {
      let original =
        originalImage == "undefined"
          ? null
          : originalImage == null
          ? null
          : originalImage[0];
      setCurImage(original);
    }
  }, []);
  useEffect(() => {
    if (originalImage !== null && imageChanged) {
      setImageNoBg(null);
      let original =
        originalImage == "undefined"
          ? null
          : originalImage == null
          ? null
          : originalImage[0];
      setCurImage(original);
      handleSelect("background-removed");
    }
  }, [imageChanged]);

  const handleSelect = async (key) => {
    if (key === "original") {
      setCurImage(originalImage);
    } else if (key === "background-removed") {
      if (imageNoBg === null || imageChanged) {
        let original =
          originalImage == "undefined"
            ? null
            : originalImage == null
            ? null
            : originalImage[0];
        setCurImage(original);
        setLoading(true);
        setShow(true);
        setUploadProgress(0);
        setUploadMessage("Uploading your images and removing backgrounds...");
        try {
          const imageDetails = originalImage.map((image) => ({
            _id: image._id,
            user: image.user,
          }));
          const resp = await removeBackground(
            imageDetails,
            uploadProgressCallback
          );
          setLoading(false);
          setShow(false);
          if (resp) {
            const images = Object.values(resp.updatedImages);
            const url = `${
              images[0]?.syncS3
                ? process.env.REACT_APP_S3_API_URL
                : process.env.REACT_APP_BASE_URL
            }/${images[0]?.imagePath}/${images[0]?.imageName}`;
            setImageNoBg(images);
            setCurImage(images);

            setImageChanged(false);
            const removeBackgroundImageList = images.map(
              (image) =>
                `${
                  image.syncS3
                    ? process.env.REACT_APP_S3_API_URL
                    : process.env.REACT_APP_BASE_URL
                }/${image.imagePath}/${image.imageName}`
            );
            
            const metaData=
              {urls: JSON.stringify(images)};
            
            setUserTrack((prevState) => ({
              ...prevState,
              type: "userFlow",
              flows:'backgroundGeneration',
              steps: "backgroundGeneration",
              previousId:userTrack.previousId?userTrack.previousId:null,
              metaData: metaData,
              apiCall: true,
            }));
            setCurrentSkeleton(url);
          } else {
            setError(resp.response.data.message);
            setImageChanged(false);
          }
        } catch (err) {
          setShow(false);
          setImageChanged(false);
          setError(err);
        }
      } else {
        setCurImage(imageNoBg);
      }
    }
  };

  const uploadProgressCallback = (progressEvent) => {
    if (progressEvent % 5 === 0) {
      setUploadProgress(progressEvent);
    }
  };

  const editorImageOnLoad = () => {
    setEditorImageLoad(true);
    setGenerateLoading(0);
  };

  useEffect(() => {
    if (tabSelected != "") {
      handleSelect(tabSelected);
    }
  }, [tabSelected]);

  // useEffect(() => {
  //   if (error) {
  //     toast.error(error, {
  //       duration: 1000,
  //       position: "top-right",
  //       icon: "❌",
  //       className: "bg-danger text-white",
  //     });
  //     setError("");
  //   }
  // }, [error]);

  useEffect(() => {
    if (imagesLoaded === curImage?.length) {
      setEditorOpen(true);
    }
  }, [imagesLoaded, curImage?.length]);

  useEffect(() => {
    if (editorImageLoad == true) {
      setGenerateLoading(0);
    } else {
      setGenerateLoading(2);
    }
  }, [editorImageLoad]);

  useEffect(() => {
    if(!curImage)
      {
        setUserTrack((prevState) => ({
          ...prevState,
          type: "userFlow",
          flows:'backgroundGeneration',
          steps: "imageUpload",
          previousId:userTrack.previousId?userTrack.previousId:null,
          apiCall: true,
        }));
      }
    setShopUrl(null);
    setBackward("remove");
    if (currentSkeletonList == null) {
      let currentImg = curImage
        ? `${
            curImage[0]?.syncS3
              ? process.env.REACT_APP_S3_API_URL
              : process.env.REACT_APP_BASE_URL
          }/${curImage[0]?.imagePath}/${curImage[0]?.imageName}`
        : null;
      setCurrentSkeleton(currentImg);
    }
  }, []);

  const editorMainElement = document.querySelector(".canvas-ratio");

  useEffect(() => {
    let ratioWidth = size.split(":")[0];
    let ratioHeight = size.split(":")[1];
    if (editorImageLoad == true) {
      const canvasDiv = document.querySelector(".konvajs-content canvas");
      const canvasHeight = canvasDiv?.height;
      const canvasWidth = canvasDiv?.width;
      if (editorMainElement) {
        editorMainElement.style.setProperty(
          "--height-canvas",
          canvasHeight + "px"
        );
        editorMainElement.style.setProperty(
          "--width-canvas",
          canvasWidth + "px"
        );
      }
    }
  }, [editorImageLoad, !generateLoading]);

  let ratioWidth = size.split(":")[0];
  let ratioHeight = size.split(":")[1];
  if (editorMainElement) {
    editorMainElement.style.setProperty("--width-size", ratioWidth);
    editorMainElement.style.setProperty("--height-size", ratioHeight);
  }

  return (
    <>
      {show ? (
        <UploadProgressModal
          setShow={setShow}
          show={show}
          uploadProgress={uploadProgress}
          uploadMessage={uploadMessage}
        />
      ) : (
        <div className="content-container">
          <div>
            {originalImage == null ? (
              <>
                <h6 className="upload-heading">
                  {" "}
                  Create product photos and videos with simple steps{" "}
                </h6>
                <CustomProgressBar />

                <div>
                  <FileUpload
                    originalImage={originalImage}
                    setOriginalImage={setOriginalImage}
                    setUploadProgress={setUploadProgress}
                    setShow={setShow}
                    setUploadMessage={setUploadMessage}
                    setImageChanged={setImageChanged}
                    setError={setError}
                  />
                  <LearnTutorialSection />
                </div>
              </>
            ) : null}
            {originalImage != null ? (
              <div>
                <div className="upload-container bg-white mt-4 flex-wrap flex-lg-nowrap">
                  {currentSkeletonList?.length > 0 &&
                    !generateLoading && (
                      <button
                        className="skeleton-back-button1"
                        onClick={handleBackButton}
                      >
                        <IoArrowBack />
                        <span className="back"> Back</span>
                      </button>
                    )}
                  <div className="upload-container-left ">
                    <div className="upperContainer">
                      <div className="upperFlex1" ref={dropdownRef2}>
                        <div className="firstdropdown">
                          <a
                            onClick={(e) => toggleDropdown("dropdown2")}
                            className="dropbtn"
                          >
                            Size{" "}
                            <span className="optionShape">
                              {size || "16.9"}
                            </span>
                            <span className="space">
                              {dropdown === "dropdown2" ? (
                                <IoIosArrowUp />
                              ) : (
                                <IoIosArrowDown />
                              )}
                            </span>
                          </a>
                        </div>
                        {dropdown === "dropdown2" && (
                          <CustomFlexDropdown selectedValue={handleSize} />
                        )}
                      </div>
                      <div className="upperFlex2" ref={dropdownRef3}>
                        <div className="firstdropdown">
                          <a
                            onClick={(e) => toggleDropdown("dropdown3")}
                            className="dropbtn"
                          >
                            Number of variation{" "}
                            <span className="optionVarriant">
                              {" "}
                              {variation || "1"}
                            </span>
                            <span className="space">
                              {dropdown === "dropdown3" ? (
                                <IoIosArrowUp />
                              ) : (
                                <IoIosArrowDown />
                              )}
                            </span>
                          </a>
                          {dropdown === "dropdown3" && (
                            <RangeSlider
                              variation={variation}
                              selectedValue={handleVariation}
                            />
                          )}
                        </div>
                      </div>
                      {/* <div className="upperFlex1" ref={dropdownRef1}>
                        <div className="firstdropdown">
                          <a
                            onClick={(e) => toggleDropdown("dropdown1")}
                            className="dropbtn"
                          >
                            {selectGeneric ? selectGeneric : "Models"}

                            <span className="space">
                              {dropdown === "dropdown1" ? (
                                <IoIosArrowUp />
                              ) : (
                                <IoIosArrowDown />
                              )}
                            </span>
                          </a>
                          {dropdown === "dropdown1" && (
                            <CustomDropdown
                              handleSelect={handleGeneric}
                              selectGeneric={selectGeneric}
                            />
                          )}
                        </div>
                      </div> */}
                    </div>
                    <div className="lowerContainer">
                      <div className="lowerArea1">
                        <input
                          className="inputField"
                          type="text"
                          placeholder="Describe the scene around your product..."
                          onChange={(e) => setDecsription(e.target.value)}
                        />
                      </div>
                      {/* <div className="lowerArea2">
                        <a
                          onMouseEnter={() => setShowHoverIcon(true)}
                          onMouseLeave={() => setShowHoverIcon(false)}
                        >
                          <div className="lowerArea2Inner">
                            {showHoverIcon ? <FaCube /> : <HiLightBulb />}
                          </div>
                        </a>
                      </div> */}

                      <button
                        onClick={generateImage}
                        className={
                          // (currentSkeletonList?.length > 0 && imageListCheck) ||
                          generateLoading == 0
                            ? "lowerArea3Inner"
                            : "lowerArea3InnerDisable"
                        }
                        disabled={generateLoading > 0} // Disable the button while the API call is in progress
                      >
                        Generate
                      </button>
                    </div>

                    {!isOpen ? (
                      <>
                        <div className="upload-image-outer">
                          <div className="editor-main">
                            <div className="canvas-ratio"></div>
                            <>
                              {editorOpen ? (
                                <>
                                  <Editor
                                    key={currentSkeleton}
                                    saveClicked={saveClicked}
                                    setSaveClicked={setSaveClicked}
                                    editorRef={editorRef}
                                    bg={bg}
                                    editorImageOnLoad={editorImageOnLoad}
                                  />
                                </>
                              ) : (
                                <>
                                  <div className="superimpose-editor">
                                    <div className="editorloader">
                                      <Spinner animation="border" />
                                    </div>
                                  </div>
                                </>
                              )}
                            </>
                          </div>
                        </div>
                      </>
                    ) : (
                      // <div className="upload-image-outer">
                      //   <div className="upload-image-container">
                      //     <div className="upload-image-inner">
                      //       <div className="editor-main">
                      //         {/* <Editor
                      //           key={"image-editor"}
                      //           saveClicked={saveClicked}
                      //           setSaveClicked={setSaveClicked}
                      //           editorRef={editorRef}
                      //           bg={bg}

                      //         /> */}
                      //       </div>
                      //       {/* <ResizeImage uploadImage={uploadImage} /> */}
                      //     </div>
                      //   </div>
                      // </div>
                      <div className="generate-upload-image-outer">
                        {currentSkeletonList?.length > 0 ? (
                          <SkeletonImage
                            currentImage={uploadImage}
                            imageList={currentSkeletonList}
                            changeImage={skeletonImage}
                            currentSkeletonImage={currentSkeleton}
                          />
                        ) : (
                          <SkeletonImage
                            currentImage={uploadImage}
                            changeImage={skeletonImage}
                          />
                        )}

                        <SkeletonImageList
                          startingImage={uploadImage}
                          totalExpected={requestedImages}
                          imageResults={currentSkeletonList}
                          failures={failedImages}
                          onImageSelected={handleSkeletonValueChange}
                        />
                      </div>
                    )}

                    {/* <div className="text-center pt-3">
                      {curImage ? <SocialShareBtn image={curImage} /> : ""}
                    </div> */}
                  </div>

                  <div className="social-tabs-container">
                    <div className="faq-container">

                      <CollapseListImage
                        curImage={curImage}
                        handleSelect={
                          isOpen ? () => {} : handleCollapseImageList
                        }
                        collaspeOpen={collaspeOpen}
                        handleCollapse={handleCollapse}
                        spinner={spinner}
                        handleSpinner={handleSpinner}
                        onImageLoad={handleImageLoad}
                      />

                      <CollapseListBottom
                        curImage={curImage}
                        currentSkeletonImage={currentSkeleton}
                        type="model"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          {/* <CustomProgressBar /> */}
          <div>{/* <LearnTutorialSection /> */}</div>
        </div>
      )}
      <Toaster position="top-right" toastOptions={{ duration: 5000 }} />
    </>
  );
};
export default RemoveBackground;
