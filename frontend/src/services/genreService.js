import axiosClient from "../api/axiosClient";

const API_URL = "/genres";

export const getGenres = async () => {
  const res = await axiosClient.get(API_URL);
  return res.data;
};

export const createGenre = async (data) => {
  const res = await axiosClient.post(API_URL, data);
  return res.data;
};

export const updateGenre = async (id, data) => {
  const res = await axiosClient.put(`${API_URL}/${id}`, data);
  return res.data;
};

export const deleteGenre = async (id) => {
  const res = await axiosClient.delete(`${API_URL}/${id}`);
  return res.data;
};
