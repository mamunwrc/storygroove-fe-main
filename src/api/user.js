import axios from "axios";

import { axiosSecureInstance } from "./axios";

export const getUser = async () => {
  const url = `${process.env.REACT_APP_BASE_URL}/api/user/getuser`;
  const token = localStorage.getItem("userToken");
  if (!token || token === "undefined") {
    return { success: false, message: "token not found" };
  }
  const config = {
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
  };
  try {
    const response = await axios.get(url, config);
    return { success: true, user: response.data };
  } catch (err) {
    return { success: false, message: err.response.data.message };
  }
};

export const resetPassword = async (body) => {
  try {
    const response = await axiosSecureInstance.post(
      "/api/user/changepassword",
      { ...body }
    );
    return { success: true, response };
  } catch (err) {
    return { success: false, message: err };
  }
};

export const updateProfile = async (body) => {
  try {
    const response = await axiosSecureInstance.post("/api/user/updateprofile", {
      ...body,
    });
    return { success: true, response };
  } catch (err) {
    return { success: false, message: err };
  }
};

export const uploadProfilePic = async (body) => {
  const url = `${process.env.REACT_APP_BASE_URL}/api/user/uploadprofilepic`;
  const token = localStorage.getItem("userToken");
  if (!token || token === "undefined") {
    return { success: false, message: "token not found" };
  }
  const config = {
    headers: {
      "Content-Type": "multipart/form-data",
      Authorization: "Bearer " + token,
    },
  };
  try {
    const response = await axios.post(url, body, config);
    return { success: true, response };
  } catch (err) {
    return { success: false, err };
  }
};

export const removeProfilePic = async (body) => {
  try {
    const response = await axiosSecureInstance.post(
      `/api/user/removeprofilepic`,
      { ...body }
    );
    return { success: true, response };
  } catch (err) {
    return { success: false, message: err.response.data.message };
  }
};

export const deleteProject = async (type, id) => {
  const url = `${process.env.REACT_APP_BASE_URL}/api/user/project/delete`;

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
  try {
    const response = await axios.post(
      url,
      {
        type,
        id,
      },
      config
    );
    return { success: true, message: response.data.message };
  } catch (err) {
    const error = { success: false, message: err.response.data.message };
    return error;
  }
};



export const verifyUserToken = async (token) => {
  try {
    const url = `${process.env.REACT_APP_BASE_URL}/api/user/verify/${token}`;

    if (!token || token === "undefined") {
      return "token not found";
    }

    const response = await axios.get(url);

    return {
      success: true,
      message: response.data.message,
      data: response.data,
    };
  } catch (e) {
    const errMsg = e.response.data.message;
    const error = { success: false, message: errMsg };
    return error;
  }
};

export const generateNewToken = async (email) => {
  return resendVerificationEmail(email);
};

/** Resend signup verification link for inactive email/password accounts. */
export const resendVerificationEmail = async (email) => {
  try {
    const url = `${process.env.REACT_APP_BASE_URL}/api/user/generate-new-token`;
    const response = await axios.post(url, { email: String(email || "").trim() });

    return {
      success: true,
      message: response.data.message,
      code: response.data.code,
      data: response.data.data,
    };
  } catch (e) {
    const data = e?.response?.data || {};
    return {
      success: false,
      message: data.message || "Failed to resend verification email",
      code: data.code,
      status: e?.response?.status,
      retryAfterSeconds: data.retryAfterSeconds,
    };
  }
};

// Admin/superadmin: paginated, searchable user list (excludes superadmin accounts).
// Backend route is POST with query-string params (page, limit, search).
export const getAllUsersAdminAPI = async ({ page = 1, limit = 20, search = "" } = {}) => {
  try {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (search) params.set("search", search);
    const response = await axiosSecureInstance.post(
      `/api/user/getAllUsers?${params.toString()}`
    );
    return { success: true, data: response.data };
  } catch (err) {
    return {
      success: false,
      message: err?.response?.data?.message || err?.message || "Failed to fetch users",
    };
  }
};

export const userTrackHistory = async (body) => {
  try {
    const url = `${process.env.REACT_APP_BASE_URL}/api/user/trackUser`;
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
    throw new Error("User Tracking Failed");
  }
};

