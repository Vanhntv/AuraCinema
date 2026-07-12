import axiosClient from "../api/axiosClient";

const API_URL = "/cinemas";

export const getCinemas = async (params = {}) => {
  const res = await axiosClient.get(API_URL, { params });
  return res.data;
};

export const createCinema = async (data) => {
  const res = await axiosClient.post(API_URL, data);
  return res.data;
};

export const updateCinema = async (id, data) => {
  const res = await axiosClient.put(`${API_URL}/${id}`, data);
  return res.data;
};

export const deleteCinema = async (id) => {
  const res = await axiosClient.delete(`${API_URL}/${id}`);
  return res.data;
};
