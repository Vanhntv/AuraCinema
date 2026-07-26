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

export const createGift = async (data) => {
  const response = await axiosClient.post(API_URL, data);
  return response.data;
};

export const updateGift = async (id, data) => {
  const response = await axiosClient.put(`${API_URL}/${id}`, data);
  return response.data;
};

export const toggleGiftStatus = async (id) => {
  const response = await axiosClient.patch(`${API_URL}/${id}/status`);
  return response.data;
};
