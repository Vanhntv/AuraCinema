import axiosClient from "../api/axiosClient";

const API_URL = "/showtimes";

export const getShowtimesByMovie = async (movieId, params = {}) => {
  const response = await axiosClient.get(`${API_URL}/movie/${movieId}`, {
    params,
  });
  return response.data;
};

export const getShowtimeById = async (showtimeId) => {
  const response = await axiosClient.get(`${API_URL}/${showtimeId}`);
  return response.data;
};
