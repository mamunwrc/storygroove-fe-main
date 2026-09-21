import React, { useContext, useEffect, useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import { FaCheckCircle } from 'react-icons/fa';
import { MdOutlineOndemandVideo } from 'react-icons/md';
import { ImageContext } from '../../contexts/imageContext';
import { downloadImage } from '../../Utility/utility';
import { saveImageToBucket } from '../../api/images';
import { getUserID } from '../../service';
import { getImageBase64 } from '.';
import { Default } from 'react-spinners-css';
import { getUserHistory } from '../../api/helper';
import { toast } from 'react-toastify';

export const handleImageSubmit = async (
  currentSkeletonImage,
  userID,
  setLoadingBeforeSave,
  currentSkeleton,
  updatedSdkImage
) => {
  setLoadingBeforeSave(true);

  let img = currentSkeletonImage ? currentSkeletonImage : currentSkeleton;

  const urlParts = img?.split('/');
  let imageName = urlParts[urlParts.length - 1];

  if (updatedSdkImage) {
    img = `${process.env.REACT_APP_S3_API_URL}/${updatedSdkImage?.imagePath}/${updatedSdkImage?.imageName}`;
    imageName = updatedSdkImage?.imageName;
  }

  try {
    // Substring to check
    const patternGcp = 'gcp/';
    const patternSdxl = 'sdxl/';
    const patternEditModel = 'editModel/';

    const patternSdxlExist = img.includes(patternSdxl);

    const patternGcpExist = img.includes(patternGcp);

    const patternEditModelExist = img.includes(patternEditModel);

    // Wait for getImageBase64 to complete before proceeding
    // const base64 = await getImageBase64(img);
    const model = patternGcpExist ? 'gcp' : patternSdxlExist ? 'sdxl' : '';

    const body = {
      //  imageBase64: base64,
      imageUrl: img,
      objectUrl: `userData/${userID}/uploads/${imageName}`,
      userId: userID,
      imageName: imageName,
      imagePath: `userData/${userID}/uploads${model ? '/' + model : ''}`,
      model: patternGcpExist
        ? 'GCP'
        : patternSdxlExist
        ? 'SDXL'
        : patternEditModelExist
        ? 'EditModel'
        : '',
    };

    const res = await saveImageToBucket(body);
    if (res.success) {
      setLoadingBeforeSave(false);

      toast.success('Image Successfully Saved');

      return Promise.resolve(); // Return a resolved Promise in case of success
    } else {
      toast.error('Failed to save image');
      return Promise.reject(); // Add this line to return a rejected Promise if saving fails
    }
  } catch (error) {
    toast.error('Failed to save image');
    return Promise.reject(); // Return a rejected Promise in case of error
  }
};

const DownloadImage = ({
  currentSkeletonImage,
  downloadEditedImage,
  type,
  flows,
}) => {
  const { currentSkeleton, updatedSdkImage, setUserTrack, userTrack } =
    useContext(ImageContext);

  const handleImageDownload = async (currentSkeletonImage) => {
    let img = currentSkeletonImage ? currentSkeletonImage : currentSkeleton;

    if (typeof downloadEditedImage === 'function') {
      // If downloadEditedImage function is available, then call it.
      downloadEditedImage();
      //callUserHistoryAPI("download", updatedSdkImage);
    } else {
      // Otherwise, proceed with current functionality.
      const parts = img.split('/');
      let imageName = parts[parts.length - 1];

      if (updatedSdkImage) {
        img = `${process.env.REACT_APP_S3_API_URL}/${updatedSdkImage?.imagePath}/${updatedSdkImage?.imageName}`;
        imageName = updatedSdkImage?.imageName;
      }

      downloadImage(img, imageName);

      setUserTrack((prevState) => ({
        ...prevState,
        type: type || 'userFlow',
        flows: flows || 'backgroundGeneration',
        steps: 'download',
        metaData: {
          imageUrl: currentSkeleton,
        },
        previousId: userTrack.previousId ? userTrack.previousId : null,
        apiCall: true,
      }));
    }
  };
  return (
    <Form.Group className="mb-3 mt-3">
      <Button
        className="button-primary-black w-100"
        variant="primary"
        type="button"
        onClick={() => handleImageDownload(currentSkeletonImage)}
      >
        <img
          src="/assets/images/download-icon.png"
          alt=""
          className="me-2 download-icon"
        />
        Download
      </Button>
    </Form.Group>
  );
};

const SaveImage = ({
  currentSkeletonImage,
  saveEnhancedImage,
  type,
  flows,
}) => {
  const [loadingBeforeSave, setLoadingBeforeSave] = useState(false);

  const { currentSkeleton, updatedSdkImage, setUserTrack, userTrack } =
    useContext(ImageContext);

  const userID = getUserID();
  const handleClick = () => {
    if (!loadingBeforeSave) {
      // Define the function that should be called when saveEnhancedImage is not defined.
      const defaultFunction = () =>
        handleImageSubmit(
          currentSkeletonImage,
          userID,
          setLoadingBeforeSave,
          currentSkeleton,
          updatedSdkImage
        );
      // Use saveEnhancedImage function if it is defined, defaultFunction otherwise.
      const functionToCall = saveEnhancedImage || defaultFunction;
      functionToCall().then((res) => {
        setUserTrack((prevState) => ({
          ...prevState,
          type: type || 'userFlow',
          flows: flows || 'backgroundGeneration',
          steps: 'save',
          metaData: {
            imageUrl: currentSkeleton,
          },
          previousId: userTrack.previousId ? userTrack.previousId : null,
          apiCall: true,
        }));
      });
    }
  };
  return (
    <Form.Group className="mt-4">
      <Button
        className="button-primary-black w-100"
        variant="primary"
        type="button"
        onClick={() => handleClick()}
      >
        {loadingBeforeSave ? <Default size={30} color="white" /> : 'Save'}
      </Button>
    </Form.Group>
  );
};

const GenerateVideo = ({ handleImageSubmit }) => {
  return (
    <Form.Group className="mb-3 svgCustom">
      <Button
        className="button-primary-black w-100"
        variant="primary"
        type="button"
        onClick={handleImageSubmit}
      >
        <MdOutlineOndemandVideo />
        {/* <img src="/assets/images/download-icon.png" alt="" className="me-2" /> */}
        Generate Video
      </Button>
    </Form.Group>
  );
};
const CollapseListBottom = ({
  question,
  answer,
  currentSkeletonImage,
  saveEnhancedImage,
  downloadEditedImage,
  textToImage = false,
  type,
  flows,
}) => {
  const { currentSkeletonList } = useContext(ImageContext);
  const [isOpen, setIsOpen] = useState(
    currentSkeletonList && !textToImage ? true : false
  );
  const { setShopUrl } = useContext(ImageContext);

  const toggleOpen = () => setIsOpen(!isOpen);

  useEffect(() => {
    if (currentSkeletonList != null) {
      if (textToImage) {
        setIsOpen(false);
      } else {
        setIsOpen(true);
      }
    }
  }, [currentSkeletonList]);

  return (
    <div className={`faq ${isOpen ? 'active' : ''}`}>
      <div className="share-block">
        <span>Share</span>
        <a className="faq-toggle" onClick={toggleOpen}>
          <svg
            className="chevron w-6 h-6 text-gray-800 dark:text-white"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 14 8"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="m1 1 5.326 5.7a.909.909 0 0 0 1.348 0L13 1"
            />
          </svg>
          <svg
            className="close w-6 h-6 text-gray-800 dark:text-white"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 14 14"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
            />
          </svg>
        </a>
      </div>
      {isOpen && (
        <div>
          <SaveImage
            currentSkeletonImage={currentSkeletonImage}
            saveEnhancedImage={saveEnhancedImage}
            type={type}
            flows={flows}
          />
          <DownloadImage
            currentSkeletonImage={currentSkeletonImage}
            downloadEditedImage={downloadEditedImage}
            type={type}
            flows={flows}
          />
          <GenerateVideo />

          <h6>Shop URL</h6>
          <div className="lowerArea1">
            <input
              className="inputField1"
              type="text"
              placeholder="http//"
              onChange={(e) => setShopUrl(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
export default CollapseListBottom;
