export const isAdminUser = (user) => user?.role === "admin" || user?.role_id === 1;
