import axiosClient from "../api/axiosClient";

export const getPublishedPolicies = async (surface) => {
  const response = await axiosClient.get("/policies/public", {
    params: surface ? { surface } : {},
  });
  return response.data;
};
