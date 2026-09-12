import axiosClient from "../api/axiosClient";

export const loyaltyRequest = async (path, method = "get", data) => {
  const response = await axiosClient({ url: `/loyalty${path}`, method, ...(method === "get" ? { params: data } : { data }) });
  return response.data;
};
