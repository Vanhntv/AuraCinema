import axiosClient from "../../api/axiosClient";

export const getDashboardStats = async () => {
  const res = await axiosClient.get("/dashboard/stats");
  return res.data;
};

export const getDashboardOverview = async () => {
  const res = await axiosClient.get("/admin/dashboard/overview");
  return res.data;
};

export const getBookingStatusStats = async () => {
  const res = await axiosClient.get("/admin/dashboard/bookings/statuses");
  return res.data;
};

export const getTodayRevenue = async () => {
  const res = await axiosClient.get("/admin/dashboard/revenue/today");
  return res.data;
};

export const getDailyRevenue = async (date) => {
  const res = await axiosClient.get("/admin/dashboard/revenue/daily", {
    params: { date },
  });
  return res.data;
};

export const getWeeklyRevenue = async (date) => {
  const res = await axiosClient.get("/admin/dashboard/revenue/weekly", {
    params: { date },
  });
  return res.data;
};

export const getMonthlyRevenue = async (month, year) => {
  const res = await axiosClient.get("/admin/dashboard/revenue/monthly", {
    params: { month, year },
  });
  return res.data;
};

export const getTopMoviesRevenue = async () => {
  const res = await axiosClient.get("/admin/dashboard/movies/top-revenue");
  return res.data;
};

export const getTopSellingCombos = async () => {
  const res = await axiosClient.get("/admin/dashboard/combos/top-selling");
  return res.data;
};

export const getMovieRevenue = async (movieId, filters = {}) => {
  const res = await axiosClient.get(`/admin/dashboard/movies/${movieId}`, {
    params: filters,
  });
  return res.data;
};
