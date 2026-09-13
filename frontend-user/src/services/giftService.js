import axiosClient from "../api/axiosClient";

export const getGiftCatalog = async () => (await axiosClient.get("/gifts/catalog")).data;
export const redeemGift = async (id, key) => (await axiosClient.post(`/gifts/${id}/redeem`, { key })).data;
export const getMyGiftWallet = async (params = {}) => (await axiosClient.get("/gifts/my-wallet", { params })).data;
export const getMyGiftQr = async (id) => (await axiosClient.get(`/gifts/my-wallet/${id}/qr`)).data;
export const getEligibleGifts = async (payload, config = {}) => (await axiosClient.post("/gifts/eligible", payload, config)).data;
