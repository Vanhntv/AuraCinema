import axiosClient from "../api/axiosClient";
export const getBookings = async (params = {}) => (await axiosClient.get("/bookings", { params })).data;
export const updateBooking = async (id, data) => (await axiosClient.put(`/bookings/${id}`, data)).data;
