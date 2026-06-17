import axios from "axios";

const API_URL = "http://localhost:5001/api/movies";

export const getMovies = async (query = "", page = 1, limit = 10) => {
  const res = await axios.get(API_URL, {
    params: { search: query, page, limit },
  });
  return res.data;
};

export const getMovieById = async (id) => {
  const res = await axios.get(`${API_URL}/${id}`);
  return res.data;
};

export const createMovie = async (data) => {
  const res = await axios.post(API_URL, data);
  return res.data;
};

export const updateMovie = async (id, data) => {
  const res = await axios.put(`${API_URL}/${id}`, data);
  return res.data;
};

export const deleteMovie = async (id) => {
  const res = await axios.delete(`${API_URL}/${id}`);
  return res.data;
};
