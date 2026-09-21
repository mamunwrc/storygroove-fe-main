import { axiosSecureInstance } from "./axios";

export const listIdeas = async (page = 1, limit = 20) => {
  const response = await axiosSecureInstance.get(
    `/api/idea?page=${page}&limit=${limit}`
  );
  return response;
};

export const createIdea = async (requestBody = {}) => {
  const response = await axiosSecureInstance.post("/api/idea", requestBody);
  return response;
};

export const getIdea = async (id) => {
  const response = await axiosSecureInstance.get(`/api/idea/${id}`);
  return response;
};

export const updateIdea = async (id, requestBody = {}, config = {}) => {
  const response = await axiosSecureInstance.patch(
    `/api/idea/${id}`,
    requestBody,
    config
  );
  return response;
};

export const deleteIdea = async (id) => {
  const response = await axiosSecureInstance.delete(`/api/idea/${id}`);
  return response;
};
