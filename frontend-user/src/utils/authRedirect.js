export const isAdminUser = (user) =>
  String(user?.role || "").trim().toLowerCase() === "admin" || Number(user?.role_id) === 1;
