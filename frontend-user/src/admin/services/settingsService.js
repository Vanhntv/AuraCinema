import axiosClient from "../../api/axiosClient";

export const getHomeBannerSettings = async () => {
  const response = await axiosClient.get("/settings/home-banner");
  return response.data;
};

export const updateHomeBannerSettings = async (data) => {
  const response = await axiosClient.put("/settings/home-banner", data);
  return response.data;
};
