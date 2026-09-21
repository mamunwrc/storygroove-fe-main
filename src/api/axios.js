import axios from "axios";
import { toast } from "react-toastify";
//export const getAuthorizationHeader = () => `Bearer ${localStorage.getItem("userToken")}`;

export const axiosSecure = axios.create({
  baseURL: process.env.REACT_APP_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${localStorage.getItem("userToken")}`,
  },
});

export const axiosOpen = axios.create({
  baseURL: process.env.REACT_APP_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

export const axiosSecureInstance = axios.create({
  baseURL: process.env.REACT_APP_BASE_URL,
});
export const axiosNonSecureInstance = axios.create({
  baseURL: process.env.REACT_APP_BASE_URL,
});

axiosSecureInstance.interceptors.request.use(
  (config) => {
    const userToken = localStorage.getItem("userToken");
    if (userToken) {
      config.headers.Authorization = `Bearer ${userToken}`;
    }
    return config;
  },
  (error) => {
    // Handle request error
    return Promise.reject(error);
  }
);

// Response interceptor to handle openai key
axiosSecureInstance.interceptors.response.use(
  (response) => {
    // If the response is successful, just return it
    return response;
  },
  (error) => {
    if (!error.response) return Promise.reject(error);

    const { status, data } = error.response;

    if (status === 429 && data) {
      const waitMsg = data.retryAfter
        ? ` Please wait ${data.retryAfter < 60 ? data.retryAfter + " seconds" : Math.ceil(data.retryAfter / 60) + " minutes"}.`
        : "";
      toast.error(data.message || `Rate limit exceeded.${waitMsg}`, {
        autoClose: Math.min((data.retryAfter || 10) * 1000, 15000),
      });
    } else if (status === 403 && data?.dimension === "BLOCKED") {
      toast.error(data.message || "Your API access has been blocked.", { autoClose: false });
    } else if (data?.error === "OpenAI key not found for user") {
      localStorage.removeItem("keyExist");
    } else if (
      data?.error === "Subscription required. Please subscribe to continue."
    ) {
      toast.error("Subscription required. Please subscribe to continue.");
    } else if (data?.message === "jwt expired") {
      localStorage.removeItem("userToken");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);
