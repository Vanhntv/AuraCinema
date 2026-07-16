import axiosClient from "../api/axiosClient";

export const createBooking = async (payload) => {
  const response = await axiosClient.post("/bookings", payload);
  return response.data;
};
