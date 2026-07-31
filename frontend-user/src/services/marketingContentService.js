import axiosClient from "../api/axiosClient";

export const getMarketingContent = async (params = {}) => {
  const response = await axiosClient.get("/marketing-content", { params });
  return response.data;
};

export const getMarketingContentBySlug = async (slug) => {
  const response = await axiosClient.get(`/marketing-content/${slug}`);
export const getMarketingContentBySlug = async (type, slug) => {
  const response = await axiosClient.get(`/marketing-content/${type}/${slug}`);
  return response.data;
};
