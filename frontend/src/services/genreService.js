import axios from "axios";

const API_URL = "http://localhost:5001/api/genres";

export const getGenres = async () => {
  const res = await axios.get(API_URL);
  return res.data;
};

export const createGenre = async (data) => {
  const res = await axios.post(API_URL, data);
  return res.data;
};

export const updateGenre = async (id, data) => {
  const res = await axios.put(`${API_URL}/${id}`, data);
  return res.data;
};

export const deleteGenre = async (id) => {
  const res = await axios.delete(`${API_URL}/${id}`);
  return res.data;
};