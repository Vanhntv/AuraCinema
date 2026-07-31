import axiosClient from "../../api/axiosClient";

const API_URL = "/admin/bookings";

export const getAdminBookings = async (params = {}) => {
  const res = await axiosClient.get(API_URL, { params });
  return res.data;
};

export const getAdminBookingById = async (id) => {
  const res = await axiosClient.get(`${API_URL}/${id}`);
  return res.data;
};

export const updateAdminBookingPayment = async (id, data) => {
  const res = await axiosClient.patch(`${API_URL}/${id}/payment`, data);
  return res.data;
};

export const cancelAdminBooking = async (id, data = {}) => {
  const res = await axiosClient.patch(`${API_URL}/${id}/cancel`, data);
  return res.data;
};
