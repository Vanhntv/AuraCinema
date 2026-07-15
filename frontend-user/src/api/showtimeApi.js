import axiosClient from "./axiosClient";

export const getShowtimes = async (params = {}) => {
  const response = await axiosClient.get("/showtimes", { params });
  return response.data;
};

const showtimeApi = {
  getShowtimes,
};

export default showtimeApi;
