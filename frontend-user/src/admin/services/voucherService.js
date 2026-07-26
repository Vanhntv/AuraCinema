import axiosClient from "../../api/axiosClient";

const API_URL = "/vouchers";

export const getVouchers = async (params = {}) => {
  const response = await axiosClient.get(API_URL, { params });
  return response.data;
};
