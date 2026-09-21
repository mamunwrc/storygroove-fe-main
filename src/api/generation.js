import { axiosSecureInstance } from "../api/axios";

// Can throw an AxiosError due to `axiosSecureInstance` interceptor
export const textToImage = async (req) => {
  const resp = await axiosSecureInstance.post(
    "/api/generation/text-to-image",
    {
      ...req
    }
  );
  /*
    { // Axios Obj
      status: int
      ...
      data: { // Lambda Response
        images: [
          "imageUrl-1",
          ...
        ]
      }
    }
  */

  return { ...resp.data }; // { images: [...] }
};
