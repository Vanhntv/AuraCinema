import axiosClient from "../../api/axiosClient";

const API_URL = "/admin/tickets";

export const getTicketScanLogs = async (params = {}) => {
  const response = await axiosClient.get(`${API_URL}/scan-logs`, { params });
  return response.data;
};

export const verifyTicketQr = async (qrToken) => {
  const response = await axiosClient.post(`${API_URL}/verify`, { qrToken });
  return response.data;
};

export const checkInTicketQr = async (qrToken) => {
  const response = await axiosClient.post(`${API_URL}/check-in`, { qrToken });
  return response.data;
};

export const checkOutTicketQr = async (qrToken) => {
  const response = await axiosClient.post(`${API_URL}/check-out`, { qrToken });
  return response.data;
};
