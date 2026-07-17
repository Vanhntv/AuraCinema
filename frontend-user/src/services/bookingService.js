import axiosClient from "../api/axiosClient";

export const createBooking = async (payload) => {
  const response = await axiosClient.post("/bookings", payload);
  return response.data;
};

export const getMyBookings = async () => {
  const response = await axiosClient.get("/bookings/my");
  return response.data;
};
