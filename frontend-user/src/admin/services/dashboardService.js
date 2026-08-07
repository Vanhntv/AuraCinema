import axiosClient from "../../api/axiosClient";

export const getDashboardStats = async () => {
  const res = await axiosClient.get("/dashboard/stats");
  return res.data;
};

export const getDashboardOverview = async () => {
  const res = await axiosClient.get("/admin/dashboard/overview");
  return res.data;
};
