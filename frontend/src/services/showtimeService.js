import axiosClient from "../api/axiosClient";

export const getShowtimes = async (params = {}) => (await axiosClient.get("/showtimes", { params })).data;
export const createShowtime = async (data) => (await axiosClient.post("/showtimes", data)).data;
export const updateShowtime = async (id, data) => (await axiosClient.put(`/showtimes/${id}`, data)).data;
export const deleteShowtime = async (id) => (await axiosClient.delete(`/showtimes/${id}`)).data;
export const getRoomsByCinema = async (cinemaId) => (await axiosClient.post(`/rooms/cinema/${cinemaId}/defaults`)).data;
