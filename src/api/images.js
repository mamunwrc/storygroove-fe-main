import axios from "axios";

// export const uploadFile = async (formData, uploadProgressCallback) => {
//   //   console.log(formData);
//   //   Object.entries(formData).forEach(([key, value]) => {
//   //     console.log(`${key}: ${value}`);
//   //   });
//   const url = `${process.env.REACT_APP_BASE_URL}/api/images/upload/single`;
//   const token = localStorage.getItem("userToken");
//   if (!token || token === "undefined") {
//     return "token not found";
//   }
//   const config = {
//     headers: {
//       "Content-Type": "multipart/form-data",
//       Authorization: "Bearer " + token,
//     },
//     onUploadProgress: function (progressEvent) {
//       var percentCompleted = Math.round(
//         (progressEvent.loaded * 100) / progressEvent.total
//       );
//       uploadProgressCallback(percentCompleted);
//     },
//   };
//   try {
//     const response = await axios.post(url, formData, config);
//     return response.data;
//   } catch (err) {
//     console.log(err.response.data?.status);
//     if (err.response.data?.status == "failed") {
//       return err.response.data;
//     }

//     const error = err.response.data.error;
//     return error;
//   }
// };

export const uploadFile = async (files, uploadProgressCallback) => {
  const url = `${process.env.REACT_APP_BASE_URL}/api/images/upload/single`; // endpoint for multiple images
  const token = localStorage.getItem("userToken");
  if (!token || token === "undefined") {
    return "token not found";
  }

  const config = {
    headers: {
      "Content-Type": "multipart/form-data",
      Authorization: "Bearer " + token,
    },
    onUploadProgress: function (progressEvent) {
      var percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      uploadProgressCallback(percentCompleted);
    },
  };

  // Create formData and append all images
  const formData = new FormData();
  files.forEach((file, index) => {
    formData.append("image", file);
  });
  formData.append("type", "product");

  try {
    const response = await axios.post(url, formData, config);
    return response.data;
  } catch (err) {
    console.error(err);
  }
};

export const removeBackground = async (imageId, uploadProgressCallback) => {
  const url = `${process.env.REACT_APP_BASE_URL}/api/images/remove-background`;
  const token = localStorage.getItem("userToken");
  if (!token || token === "undefined") {
    return "token not found";
  }
  const config = {
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    onUploadProgress: function (progressEvent) {
      var percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      uploadProgressCallback(percentCompleted);
    },
  };

  const body = {
    imageId: imageId,
  };
  try {
    const response = await axios.post(url, body, config);

    //return { img, status: 200 };
    return { ...response.data, status: 200 };
  } catch (err) {
    return { err, status: 400 };
  }
};

export const editGoogleModelImage = async (body) => {
  try {
    const url = `${process.env.REACT_APP_BASE_URL}/api/images/user/edit-google-model-image`;
    const token = localStorage.getItem("userToken");
    if (!token || token === "undefined") {
      return "token not found";
    }
    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
    };

    const response = await axios.post(url, body, config);

    return { ...response.data };
  } catch (error) {
    return { ...error.response };
  }
};

export const editSdxlModelImage = async (body) => {
  try {
    const url = `${process.env.REACT_APP_BASE_URL}/api/images/user/edit-sdxl-model-image`;
    const token = localStorage.getItem("userToken");
    if (!token || token === "undefined") {
      return "token not found";
    }
    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
    };

    const response = await axios.post(url, body, config);

    return { ...response.data };
  } catch (error) {
    return { ...error.response };
  }
};

export const removeBackgroundImageList = async (body) => {
  try {
    const url = `${process.env.REACT_APP_BASE_URL}/api/images/user/get-google-model-image`;
    const token = localStorage.getItem("userToken");
    if (!token || token === "undefined") {
      return "token not found";
    }
    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
    };

    const response = await axios.post(url, body, config);
    return { ...response.data };
  } catch (error) {
    throw new Error("Image List Generation Failed");
  }
};

export const gcpEditImageList = async (body) => {
  try {
    const url = `${process.env.REACT_APP_BASE_URL}/api/images/user/get-gcp-edit-images`;
    const token = localStorage.getItem("userToken");

    if (!token || token === "undefined") {
      return "token not found";
    }
    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
    };

    const response = await axios.post(url, body, config);

    return { ...response.data };
  } catch (error) {
    return { ...error.response };
  }
};

export const sdxlGenImages = async (body) => {
  try {
    const url = `${process.env.REACT_APP_BASE_URL}/api/images/user/get-sdxl-gen-images`;
    const token = localStorage.getItem("userToken");

    if (!token || token === "undefined") {
      return "token not found";
    }
    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
    };

    const response = await axios.post(url, body, config);

    return { ...response.data };
  } catch (error) {
    return { ...error.response };
  }
};

export const saveImageToBucket = async (body) => {
  try {
    const url = `${process.env.REACT_APP_BASE_URL}/api/images/user/save-image-to-bucket`;
    const token = localStorage.getItem("userToken");
    if (!token || token === "undefined") {
      return "token not found";
    }
    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
    };

    const response = await axios.post(url, body, config);
    return { ...response.data };
  } catch (error) {
    throw new Error("Image List Generation Failed");
  }
};

export const imageDescription = async (imgPath) => {
  try {
    const url = `${process.env.REACT_APP_BASE_URL}/api/images/image-description`;
    const token = localStorage.getItem("userToken");
    if (!token || token === "undefined") {
      return "token not found";
    }
    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
    };
    const body = {
      imgPath: imgPath,
    };
    const response = await axios.post(url, body, config);
    return response.data;
  } catch (error) {
    throw new Error("Image Description Generation Failed");
  }
};

export const imageDescriptionWithLamda = async (imgPath, social) => {
  try {
    const url = `${process.env.REACT_APP_BASE_URL}/api/images/image-description-lamda`;
    const token = localStorage.getItem("userToken");
    if (!token || token === "undefined") {
      return "token not found";
    }
    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
    };
    const body = {
      social: social,
      imgPath: imgPath,
    };
    const response = await axios.post(url, body, config);
    return response.data;
  } catch (error) {
    throw new Error("Image Description Generation Failed");
  }
};

export const imageDescriptionWithOpenAI = async (imgPath, social) => {
  try {
    const url = `${process.env.REACT_APP_BASE_URL}/api/images/image-description-openai`;
    const token = localStorage.getItem("userToken");
    if (!token || token === "undefined") {
      return "token not found";
    }
    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
    };
    const body = {
      social: social,
      imgPath: imgPath,
    };
    const response = await axios.post(url, body, config);
    return response.data;
  } catch (error) {
    throw new Error("Image Description Generation Failed");
  }
};

export const saveRecordInMidJourney = async (imageList, provider) => {
  try {
    const url = `${process.env.REACT_APP_BASE_URL}/api/images/user/save-in-midjourney`;
    const token = localStorage.getItem("userToken");
    if (!token || token === "undefined") {
      return "token not found";
    }
    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
    };
    const body = {
      imageList: JSON.stringify(imageList),
      provider: provider,
    };
    const response = await axios.post(url, body, config);
    return response.data;
  } catch (error) {
    throw new Error("Mid Journey Process Failed");
  }
};

export const reduceImageSize = async (imageId, width, height) => {
  const url = `${process.env.REACT_APP_BASE_URL}/api/images/resize/single`;
  const token = localStorage.getItem("userToken");
  if (!token || token === "undefined") {
    return "token not found";
  }
  const config = {
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
  };

  const body = {
    imageId: imageId,
    width: +width,
    height: +height,
  };

  try {
    const response = await axios.post(url, body, config);
    return response.data;
  } catch (err) {
    throw new Error(err.response?.data?.error ?? err.message);
  }
};

export const saveImage = async (image, name, width, height) => {
  const url = `${process.env.REACT_APP_BASE_URL}/api/images/project/save`;
  const token = localStorage.getItem("userToken");
  if (!token || token === "undefined") {
    return "token not found";
  }
  const config = {
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
  };

  const body = {
    name: name,
    width: width,
    height: height,
    imageBase64: image,
  };

  try {
    const response = await axios.post(url, body, config);
    return response.data;
  } catch (err) {
    const error = err.response.data.error;
    return error;
  }
};

export const getBackgroundImages = async () => {
  try {
    const url = `${process.env.REACT_APP_BASE_URL}/api/images/background/all`;
    const token = localStorage.getItem("userToken");
    if (!token || token === "undefined") {
      return "token not found";
    }
    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
    };
    const response = await axios.get(url, config);
    return response.data;
  } catch (e) {
    return e.response.data.error;
  }
};

export const getImageFromPrompt = async (prompt) => {
  try {
    const url = `${process.env.REACT_APP_BASE_URL}/api/images/generate/prompt`;
    const token = localStorage.getItem("userToken");
    if (!token || token === "undefined") {
      return "token not found";
    }
    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
    };
    const body = {
      prompt: prompt,
    };
    const response = await axios.post(url, body, config);
    return response.data;
  } catch (error) {
    throw new Error("Image Generation Failed");
  }
};

export const getImagesByTaskId = async (taskId) => {
  try {
    const url = `${process.env.REACT_APP_BASE_URL}/api/images/get/taskimages?taskId=${taskId}`;
    const token = localStorage.getItem("userToken");
    if (!token || token === "undefined") {
      return "token not found";
    }
    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
    };
    const response = await axios.get(url, config);
    return response.data;
  } catch (e) {
    return e.response.data.error;
  }
};

export const getProjects = async () => {
  try {
    const url = `${process.env.REACT_APP_BASE_URL}/api/images/project/get`;
    const token = localStorage.getItem("userToken");
    if (!token || token === "undefined") {
      return "token not found";
    }
    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
    };
    const response = await axios.get(url, config);
    return response.data;
  } catch (e) {
    return e.response.data.error;
  }
};
