import axiosClient from "../../api/axiosClient";

export const lookupGiftQr = async (qrPayload) => (await axiosClient.post("/staff/pos/gifts/lookup", { qr_payload: qrPayload })).data;
export const redeemGiftQr = async (qrPayload) => (await axiosClient.post("/staff/pos/gifts/redeem", { qr_payload: qrPayload })).data;
