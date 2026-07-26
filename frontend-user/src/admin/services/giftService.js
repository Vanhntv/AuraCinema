import axiosClient from "../../api/axiosClient";

const API_URL = "/gifts";

export const getGifts = async (params = {}) => {
  const response = await axiosClient.get(API_URL, { params });
  return response.data;
};

export const getGiftById = async (id) => {
  const response = await axiosClient.get(`${API_URL}/${id}`);
  return response.data;
};
