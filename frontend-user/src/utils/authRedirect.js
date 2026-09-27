export const isAdminUser = (user) =>
  String(user?.role || "").trim().toLowerCase() === "admin";

export const isStaffUser = (user) =>
  String(user?.role || "").trim().toLowerCase() === "staff";

export const getStaffAppUrl = (token) => {
  const configuredUrl = import.meta.env.VITE_STAFF_URL;
  const baseUrl = configuredUrl || `${window.location.protocol}//${window.location.hostname}:5174`;
  return `${baseUrl.replace(/\/$/, "")}/#staffToken=${encodeURIComponent(token || "")}`;
};
