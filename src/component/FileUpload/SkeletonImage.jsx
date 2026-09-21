import React, { useState, useEffect, useContext } from "react";
import { ImageContext } from "../../contexts/imageContext";
import { MdModeEdit } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { FaMagic } from "react-icons/fa";
import { MdSaveAlt } from "react-icons/md";
import { handleImageSubmit } from "./CollapseListBottom";
import { getUserID } from "../../service";
import toast, { Toaster } from "react-hot-toast";
import { Default } from "react-spinners-css";
import { GrSave } from "react-icons/gr";
import { getUserHistory } from "../../api/helper";
const SkeletonImage = ({
  currentImage,
  changeImage,
  imageList,
  currentSkeletonImage,
}) => {
  const [showImage, setShowImage] = useState(true);
  const [loadingBeforeSave, setLoadingBeforeSave] = useState(false);
  const {
    setCurrentEditAiImage,
    currentSkeletonList,
    setUserTrack,
    userTrack,
  } = useContext(ImageContext);
  const navigate = useNavigate();

  const callUserHistoryAPI = async (type) => {
    const params = {
      type: type,
      imageUrl: currentSkeletonImage,
    };

    try {
      const res = await getUserHistory(params);
    } catch (err) {
      console.error("Error in calling User History API:", err.response || err);
    }
  };

  const handleButtonEnhanceEditor = () => {
    callUserHistoryAPI("EnhanceEditor");
    navigate("/dashboard/enhance-with-editor");
  };

  const handleButtonEditWithAi = () => {
    callUserHistoryAPI("EditWithAI");
    navigate("/dashboard/edit-with-ai");
  };

  const saveImage = async () => {
    const userID = getUserID();

    await handleImageSubmit(currentSkeletonImage, userID, setLoadingBeforeSave)
      .then(() => {
        setUserTrack((prevState) => ({
          ...prevState,
          type: "model",
          flows:'backgroundGeneration',
          steps: "save",
          metaData:{
            imageUrl: currentSkeletonImage,
          },
          previousId:userTrack.previousId?userTrack.previousId:null,
          apiCall: true,
        }));
        setLoadingBeforeSave(false);
      })
      .catch((err) => {
        setLoadingBeforeSave(false);
      });
  };

  useEffect(() => {
    if (imageList !== undefined) {
      setShowImage(false);
    } else {
      setShowImage(true);
    }
  }, [imageList]);

  return (
    <>
      {showImage && (
        <div className="skeleton">
          <div className="square">
            {showImage && <img src={currentImage} />}
          </div>
        </div>
      )}

      {!showImage && (
        <div className="skeleton-main-image">
          {changeImage == null ? (
            <>
              {imageList !== undefined ? (
                <img src={imageList[1]} alt="" />
              ) : (
                <img src={currentSkeletonImage} alt="" />
              )}

              <div className="expand-button">
                <button className="cta" onClick={handleButtonEditWithAi}>
                  <FaMagic />
                  <span className="button-text">Edit with AI</span>
                </button>
              </div>

              <div className="expand-button1">
                <button className="cta" onClick={handleButtonEnhanceEditor}>
                  <MdModeEdit />
                  <span className="button-text">Use Editor</span>
                </button>
              </div>

              <div className="expand-button2">
                {loadingBeforeSave ? (
                  <div className="cta">
                    <Default size={30} style={{ top: "10px" }} color="black" />
                  </div>
                ) : (
                  <button className="cta" onClick={() => saveImage()}>
                    <GrSave />
                    <span className="button-text">Save</span>
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="expand-button">
                <button className="cta" onClick={handleButtonEditWithAi}>
                  <FaMagic />
                  <span className="button-text">Edit with AI</span>
                </button>
              </div>

              <div className="expand-button1">
                <button className="cta" onClick={handleButtonEnhanceEditor}>
                  <MdModeEdit />
                  <span className="button-text">use Editor</span>
                </button>
              </div>
              <div className="expand-button2">
                {loadingBeforeSave ? (
                  <div className="cta">
                    <Default size={30} style={{ top: "10px" }} color="black" />
                  </div>
                ) : (
                  <button className="cta" onClick={() => saveImage()}>
                    <GrSave />
                    <span className="button-text">Save</span>
                  </button>
                )}
              </div>

              {currentSkeletonImage ? (
                <img src={currentSkeletonImage} />
              ) : (
                <img src={changeImage} />
              )}
            </>
          )}
        </div>
      )}
    </>
  );
};
export default SkeletonImage;
