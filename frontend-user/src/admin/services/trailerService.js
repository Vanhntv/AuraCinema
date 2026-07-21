import axiosClient from "../../api/axiosClient";

const API_URL = "/trailers";

export const getTrailers = async (params = {}) => {
  const res = await axiosClient.get(API_URL, { params });
  return res.data;
};

export const createTrailer = async (data) => {
  const res = await axiosClient.post(API_URL, data);
  return res.data;
};

export const updateTrailer = async (id, data) => {
  const res = await axiosClient.put(`${API_URL}/${id}`, data);
  return res.data;
};

export const deleteTrailer = async (id) => {
  const res = await axiosClient.delete(`${API_URL}/${id}`);
  return res.data;
};
