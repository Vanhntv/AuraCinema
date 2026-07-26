import axiosClient from "../../api/axiosClient";

const API_URL = "/vouchers";

export const getVouchers = async (params = {}) => {
  const response = await axiosClient.get(API_URL, { params });
  return response.data;
};

export const getVoucherById = async (id) => {
  const response = await axiosClient.get(`${API_URL}/${id}`);
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
