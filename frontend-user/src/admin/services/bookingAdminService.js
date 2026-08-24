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

export const lookupBookingOrder = async (bookingCode) => {
  const res = await axiosClient.post(`${API_URL}/lookup`, { bookingCode });
  return res.data;
};

export const lookupBookingOrderPrint = async ({ bookingCode, qrToken } = {}) => {
  const res = await axiosClient.post(`${API_URL}/lookup-print`, { bookingCode, qrToken });
  return res.data;
};

export const scanPrintBookingOrder = async (qrToken) => {
  const res = await axiosClient.post(`${API_URL}/scan-print`, { qrToken });
  return res.data;
};

export const reprintBookingTickets = async (id, ticketIds, reason) => {
  const res = await axiosClient.post(`${API_URL}/${id}/reprint`, { ticketIds, reason });
  return res.data;
};
