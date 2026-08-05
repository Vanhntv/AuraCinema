import axiosClient from "../api/axiosClient";

export const createBooking = async (payload) => {
  const response = await axiosClient.post("/bookings", payload);
  return response.data;
};

export const payBooking = async (bookingId, payload = {}) => {
  const response = await axiosClient.post(`/bookings/${bookingId}/pay`, payload);
  return response.data;
};

export const createVnpayPaymentUrl = async (payload) => {
  const response = await axiosClient.post("/payments/vnpay/create-payment-url", payload);
  return response.data;
};

export const createSepayPgCheckout = async (payload) => {
  const response = await axiosClient.post("/payments/sepay-pg/create-checkout", payload);
  return response.data;
};

export const getBookingPaymentStatus = async (bookingId) => {
  const response = await axiosClient.get(`/bookings/${bookingId}/status`);
  return response.data;
};

export const verifyVnpayReturn = async (queryString) => {
  const response = await axiosClient.get(`/payments/vnpay/return${queryString}`);
  return response.data;
};

export const verifySepayPgReturn = async (queryString) => {
  const response = await axiosClient.get(`/payments/sepay-pg/return${queryString}`);
  return response.data;
};

export const cancelBooking = async (bookingId, payload = {}) => {
  const response = await axiosClient.patch(`/bookings/${bookingId}/cancel`, payload);
  return response.data;
};

export const getMyBookings = async () => {
  const response = await axiosClient.get("/bookings/my");
  return response.data;
};
