import React, { useEffect, useState, useContext, useRef } from "react";
import FilerobotImageEditor, {
  TABS,
  TOOLS,
} from "react-filerobot-image-editor";
import "./editorStyles.scss";
import { ImageContext } from "../../contexts/imageContext";
import { Spinner } from "react-bootstrap";

const Editor = ({
  setSaveClicked,
  editorRef,
  bg,
  editorImageOnLoad,
}) => {
  const {
    backgroundImg,
    setProject,
    currentSkeleton,
  } = useContext(ImageContext);
  const [forgoundImgLoaded, setForgoundImgLoaded] = useState(false);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(true); // Add loading state
  const [isLoading, setIsLoading] = useState(true);
  const editRef = useRef(null);

  const setForeGroundImage = () => {
    if (forgoundImgLoaded) {
      return;
    }
    try {
      let clickElement = document.querySelector(
        ".FIE_image-tool-add-option-button"
      );
      if (clickElement == null) {
        //const delay = currentSkeletonList == null ? 1000 : 600;
        //setForeGroundImage();
        setTimeout(() => {
          setForeGroundImage();
        }, 1000);
      }
      if (clickElement && !forgoundImgLoaded) {
        clickElement.click();
        setTimeout(() => {
          let element = document.getElementsByClassName("SfxPopper-root");
          if (element.length > 0) {
            element[0].childNodes[0].childNodes[0].click();
            setForgoundImgLoaded(true);
            document.querySelector("#SfxPopper div:nth-child(2)").remove();
            setShow(false);
          }
        }, 100);
      }
    } catch (e) {
      setShow(false);
    }
  };

  const funcImageLoad = () => {
    setIsLoading(false);
    editorImageOnLoad();
  };

  useEffect(() => {
    setForeGroundImage();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  useEffect(() => {
    setSaveClicked(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to backgroundImg
  }, [backgroundImg]);

  useEffect(() => {
    forgoundImgLoaded ? setShow(true) : setShow(false);
  }, [forgoundImgLoaded]);

  useEffect(() => {
    setLoading(!forgoundImgLoaded); // Update loading state based on image loading
  }, [forgoundImgLoaded]);

  return (
    <div className="edit-wrap">
      <div className="superimpose-editor">
        {loading ? (
          <div className="editorloader">
            <Spinner animation="border" />
          </div>
        ) : null}
        {!show ? (
          <div className="editorloader">
            <Spinner animation="border" />
          </div>
        ) : null}

        {isLoading && (
          <div className="editorloader">
            <Spinner animation="border" />
          </div>
        )}

        <FilerobotImageEditor
          source={bg}
          getCurrentImgDataFnRef={editorRef}
          updateStateFnRef={editRef}
          onSave={(editedImageObject, designState) => {
            setSaveClicked(true);
          }}
          onModify={(currentImageDesignState) => {
            setSaveClicked(false);
            setProject(currentImageDesignState);
            funcImageLoad();
          }}
          annotationsCommon={{
            fill: "#ff0000",
          }}
          Text={{ text: "Type here..." }}
          Rotate={{ angle: 90, componentType: "slider" }}
          Image={{
            gallery: [
              {
                originalUrl: currentSkeleton,
                previewUrl: currentSkeleton,
              },
            ],
            disableUpload: true,
          }}
          Crop={{
            presetsItems: [
              {
                titleKey: "classicTv",
                descriptionKey: "4:3",
                ratio: 4 / 3,
              },
              {
                titleKey: "cinemascope",
                descriptionKey: "21:9",
                ratio: 21 / 9,
              },
            ],
            presetsFolders: [
              {
                titleKey: "socialMedia",
                groups: [
                  {
                    titleKey: "facebook",
                    items: [
                      {
                        titleKey: "profile",
                        width: 180,
                        height: 180,
                        descriptionKey: "fbProfileSize",
                      },
                      {
                        titleKey: "coverPhoto",
                        width: 200,
                        height: 200,
                        descriptionKey: "fbCoverPhotoSize",
                      },
                    ],
                  },
                ],
              },
            ],
          }}
          tabsIds={[TABS.ADJUST, TABS.ANNOTATE, TABS.FILTERS, TABS.FINETUNE]}
          defaultTabId={TABS.ANNOTATE}
          defaultToolId={TOOLS.IMAGE}
        />
      </div>
    </div>
  );
};

export default Editor;
