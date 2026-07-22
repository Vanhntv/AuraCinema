import axiosClient from "../../api/axiosClient";

const API_URL = "/seat-types";

export const getSeatTypes = async () => {
  const res = await axiosClient.get(API_URL);
  return res.data;
};

export const createSeatType = async (data) => {
  const res = await axiosClient.post(API_URL, data);
  return res.data;
};
