import axiosClient from "../../api/axiosClient";
import { retryReadRequest } from "../utils/retryReadRequest";

const API_URL = "/vouchers";

export const uploadVoucherImage = async (file) => {
  const form = new FormData();
  form.append("image", file);
  const response = await axiosClient.post(`${API_URL}/upload-image`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const getVouchers = async (params = {}) => {
  const response = await retryReadRequest(() => axiosClient.get(API_URL, { params, timeout: 10000 }));
  return response.data;
};

export const getVoucherById = async (id) => {
  const response = await axiosClient.get(`${API_URL}/${id}`);
  return response.data;
};

export const getVoucherStats = async () => {
  const response = await retryReadRequest(() => axiosClient.get(`${API_URL}/stats`, { timeout: 10000 }));
  return response.data;
};

export const getVoucherUsageHistory = async (id, params = {}) => {
  const response = await axiosClient.get(`${API_URL}/${id}/usages`, { params });
  return response.data;
};

export const createVoucher = async (data) => {
  const response = await axiosClient.post(API_URL, data);
  return response.data;
};

export const updateVoucher = async (id, data) => {
  const response = await axiosClient.put(`${API_URL}/${id}`, data);
  return response.data;
};

export const toggleVoucherStatus = async (id) => {
  const response = await axiosClient.patch(`${API_URL}/${id}/status`);
  return response.data;
};

export const deleteVoucher = async (id) => {
  const response = await axiosClient.delete(`${API_URL}/${id}`);
  return response.data;
};
