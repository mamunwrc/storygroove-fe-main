import { createContext, useState, useEffect } from "react";
import { saveImage } from "../api/images";
import { userTrackHistory } from "../api/user";
import { getUserID } from "../service";

export const ImageContext = createContext({});

export const removeEmptyProperties = (obj) => {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (
      (typeof value === "boolean") ||
      (typeof value === "string" && value !== "") ||
      (Array.isArray(value) && value.length > 0)|| (typeof value==='object' && value) // Check if the value is a non-empty array
    ) {
      acc[key] = value;
    }
    return acc;
  }, {});
};

const ImageProvider = ({ children }) => {
  const [imageChanged, setImageChanged] = useState(false);

  // load initial vaues from local storage
  const curImageFromStorage = JSON.parse(localStorage.getItem("curImage"));
  const imageNoBgFromStorage = JSON.parse(localStorage.getItem("imageNoBg"));
  // const selectedSize = JSON.parse(localStorage.getItem("selectedSize")) || null ;

  const base64ImageCropImage = JSON.parse(
    localStorage.getItem("base64ImageCropImage")
  );

  const sdkImage = JSON.parse(localStorage.getItem("sdkImage"));

  const currentShoUrl = JSON.parse(localStorage.getItem("shopUrl"));

  const currentSkeletonImage = JSON.parse(
    localStorage.getItem("currentSkeletonImage")
  );

  const currentSkeletonImageList = JSON.parse(
    localStorage.getItem("currentSkeletonImageList")
  );

  const originalImageFromStorage = JSON.parse(
    localStorage.getItem("originalImage")
  );
  const backgroundImgFromStorage = JSON.parse(
    localStorage.getItem("backgroundImg")
  );
  const savedImageFromStorage = JSON.parse(localStorage.getItem("savedImage"));
  const savedProject = JSON.parse(localStorage.getItem("project"));

  const editorAiImageList = JSON.parse(localStorage.getItem("editorImageList"));
  const currentEditorAiImage = JSON.parse(
    localStorage.getItem("currentEditorAiImage")
  );

  const responseStatus = JSON.parse(localStorage.getItem("genResponse"));

  const socialShare = JSON.parse(localStorage.getItem("socialShare"));

  const track = JSON.parse(localStorage.getItem("track"));

  const editor = JSON.parse(localStorage.getItem("editor"));

  const backwardPhase = JSON.parse(localStorage.getItem("backwordPhase"));

  const edtiorBase64Image = JSON.parse(
    localStorage.getItem("editorBase64Image")
  );

  const linkedin = JSON.parse(
    localStorage.getItem("linkedinShare")
  );

  const linkedinItems = JSON.parse(
    localStorage.getItem("linkedinShareItems")
  );

  // set initial values to state
  const [curImage, setCurImage] = useState(curImageFromStorage || null);
  const [imageNoBg, setImageNoBg] = useState(imageNoBgFromStorage || null);
  const [originalImage, setOriginalImage] = useState(
    originalImageFromStorage || null
  );
  const [backgroundImg, setBackgroundImg] = useState(
    backgroundImgFromStorage || null
  );
  const [savedImage, setSavedImage] = useState(savedImageFromStorage || null);
  const [project, setProject] = useState(savedProject || null);
  const [show, setShow] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState("");
  const [userImages, setUserImages] = useState(null);
  const [socialShareSelected, setSocialShareSelected] = useState(
    socialShare || null
  );

  const [base64Crop, setBase64Crop] = useState(base64ImageCropImage || false);
  const [currentSkeleton, setCurrentSkeleton] = useState(
    currentSkeletonImage || null
  );

  const [currentSkeletonList, setCurrentSkeletonList] = useState(
    currentSkeletonImageList
  );

  const [editorImageList, setEditorImageList] = useState(editorAiImageList);
  const [currentEditAiImage, setCurrentEditAiImage] = useState(
    currentEditorAiImage || null
  );

  const [updatedSdkImage, setUpdatedSdkImage] = useState(sdkImage || null);

  const [shopUrl, setShopUrl] = useState(currentShoUrl || null);

  const [responsError, setResponseError] = useState(responseStatus || false);

  const userId = getUserID();

  const [editorLoad, setEditorLoad] = useState(editor || false);

  const [backward, setBackward] = useState(backwardPhase || null);

  const [editorB64Image, setEditorB64Image] = useState(edtiorBase64Image);

  const [linkedinShare, setLinkedinShare] = useState(linkedin || null);

  const [linkedinShareItems,setLinkedinShareItems] = useState(linkedinItems || null);

  const [userTrack, setUserTrack] = useState(track||{
    type: "",
    flows:"",
    steps: "",
    textToImage:"",
    video:"",
    model:"",
    previousId:null,
    selectedImageUrl:"",
    socialMedium: "",
    shardOnPlatform:"",
    imageModel: "",
    metaData:"",
    apiCall: false,
    user: userId,
  });

  useEffect(() => {
    const fetchUserTrackHistory = async () => {
      const filledUserTrack = removeEmptyProperties(userTrack);
      let flag=true;
      try {
        if (userTrack.apiCall) {
          if(userTrack.type==='textToImageModel' && userTrack.imageModel)
            {
               flag=false;
            }
          const res = await userTrackHistory(filledUserTrack);
          setUserTrack((prevState) => ({
            ...prevState,
            type: "",
            flows:"",
            steps: "",
            textToImage:"",
            video:"",
            model:"",
            previousId:flag ? res?.data?._id : prevState.previousId,
            selectedImageUrl:"",
            socialMedium: "",
            shardOnPlatform:"",
            imageModel: "",
            metaData:"",
            apiCall: false,
            user: userId,
          }));
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchUserTrackHistory();
  }, [userTrack, userId]);

  // update values on change
  useEffect(() => {
    localStorage.setItem("curImage", JSON.stringify(curImage));
    localStorage.setItem("imageNoBg", JSON.stringify(imageNoBg));
    localStorage.setItem("originalImage", JSON.stringify(originalImage));
    localStorage.setItem("backgroundImg", JSON.stringify(backgroundImg));
    localStorage.setItem("savedImage", JSON.stringify(savedImage));
    localStorage.setItem("project", JSON.stringify(project));
    localStorage.setItem("base64ImageCropImage", JSON.stringify(base64Crop));
    localStorage.setItem(
      "currentSkeletonImage",
      JSON.stringify(currentSkeleton)
    );
    localStorage.setItem(
      "currentSkeletonImageList",
      JSON.stringify(currentSkeletonList)
    );
    localStorage.setItem("editorImageList", JSON.stringify(editorImageList));
    localStorage.setItem(
      "currentEditorAiImage",
      JSON.stringify(currentEditAiImage)
    );
    localStorage.setItem("shopUrl", JSON.stringify(shopUrl));
    localStorage.setItem("sdkImage", JSON.stringify(updatedSdkImage));
    localStorage.setItem("socialShare", JSON.stringify(socialShareSelected));
    localStorage.setItem("genResponse", JSON.stringify(responsError));

    localStorage.setItem("track", JSON.stringify(userTrack));

    localStorage.setItem("editor", JSON.stringify(editorLoad));
    localStorage.setItem("backwordPhase", JSON.stringify(backward));

    localStorage.setItem("editorBase64Image", JSON.stringify(editorB64Image));
    localStorage.setItem("linkedinShare", JSON.stringify(linkedinShare));
    localStorage.setItem("linkedinShareItems", JSON.stringify(linkedinShareItems));
    //localStorage.setItem("selectedSize", JSON.stringify(sizeSelected));
  }, [
    curImage,
    imageNoBg,
    originalImage,
    backgroundImg,
    savedImage,
    project,
    base64Crop,
    currentSkeleton,
    shopUrl,
    currentSkeletonList,
    editorImageList,
    currentEditAiImage,
    updatedSdkImage,
    socialShareSelected,
    responsError,
    userTrack,
    editorLoad,
    backward,
    editorB64Image,
    linkedinShare,
    linkedinShareItems
  ]);

  const saveImageToServer = async (editorRef) => {
    try {
      const imageDate = await editorRef.current();
      const { imageBase64, fullName, width, height } =
        await imageDate.imageData;
      const resp = await saveImage(imageBase64, fullName, width, height);
      if (resp.image) {
        setCurImage(resp.image);
        return resp.image;
      }
    } catch (e) {
      return false;
    }
  };

  return (
    <ImageContext.Provider
      value={{
        curImage,
        setCurImage,
        imageNoBg,
        setImageNoBg,
        originalImage,
        setOriginalImage,
        backgroundImg,
        setBackgroundImg,
        savedImage,
        setSavedImage,
        project,
        setProject,
        saveImageToServer,
        show,
        setShow,
        uploadProgress,
        setUploadProgress,
        uploadMessage,
        setUploadMessage,
        imageChanged,
        setImageChanged,
        userImages,
        setUserImages,
        base64Crop,
        setBase64Crop,
        currentSkeleton,
        setCurrentSkeleton,
        currentSkeletonList,
        setCurrentSkeletonList,
        shopUrl,
        setShopUrl,
        socialShareSelected,
        setSocialShareSelected,
        editorImageList,
        setEditorImageList,
        currentEditAiImage,
        setCurrentEditAiImage,
        updatedSdkImage,
        setUpdatedSdkImage,
        responsError,
        setResponseError,
        userTrack,
        setUserTrack,
        editorLoad,
        setEditorLoad,
        backward,
        setBackward,
        editorB64Image,
        setEditorB64Image,
        linkedinShare,
        setLinkedinShare,
        linkedinShareItems,
        setLinkedinShareItems
      }}
    >
      {children}
    </ImageContext.Provider>
  );
};

export default ImageProvider;
