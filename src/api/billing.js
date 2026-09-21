import { axiosSecureInstance } from "../api/axios";

export const getInvoice = async (pageSize, pageNumber) => {
  try {
    const response = await axiosSecureInstance.get(
      `/api/invoice/getall?pageSize=${pageSize}&pageNumber=${pageNumber}`
    );
    return { success: true, data: response.data };
  } catch (err) {
    return { success: false, message: err.response.data.message };
  }
};
