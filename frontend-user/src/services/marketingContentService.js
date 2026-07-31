import axiosClient from "../api/axiosClient";

export const getMarketingContent = async (params = {}) => {
  const response = await axiosClient.get("/marketing-content", { params });
  return response.data;
};

export const getMarketingContentBySlug = async (typeOrSlug, maybeSlug) => {
  const path = maybeSlug
    ? `/marketing-content/${typeOrSlug}/${maybeSlug}`
    : `/marketing-content/${typeOrSlug}`;
  const response = await axiosClient.get(path);
  return response.data;
};
