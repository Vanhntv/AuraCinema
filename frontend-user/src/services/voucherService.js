import axiosClient from "../api/axiosClient";

export const verifyVoucher = async (payload) => {
  const response = await axiosClient.post("/vouchers/verify", payload);
  return response.data;
};
