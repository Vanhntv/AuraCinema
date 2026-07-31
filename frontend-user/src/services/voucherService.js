import axiosClient from "../api/axiosClient";

export const verifyVoucher = async (payload) => {
  const response = await axiosClient.post("/vouchers/verify", payload);
  return response.data;
};

export const getMyVoucherWallet = async () => {
  const response = await axiosClient.get("/vouchers/my-wallet");
  return response.data;
};
