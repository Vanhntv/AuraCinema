import axiosClient from "../../api/axiosClient";

const API_URL = "/gifts";

export const getGifts = async (params = {}) => {
  const response = await axiosClient.get(API_URL, { params });
  return response.data;
};
