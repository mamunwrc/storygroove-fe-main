import axios from "axios";


export const getVideoProjects = async () => {
  try {
    const url = `${process.env.REACT_APP_BASE_URL}/api/video/projectvideo/get`;
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


