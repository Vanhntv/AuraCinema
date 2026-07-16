export const isAdminUser = (user) => user?.role === "admin" || user?.role_id === 1;

export const getAdminDashboardUrl = (token = "") => {
  const adminBaseUrl = import.meta.env.VITE_ADMIN_URL;
  const tokenHash = token ? `#adminToken=${encodeURIComponent(token)}` : "";

  if (!adminBaseUrl) {
    if (
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "localhost"
    ) {
      return `${window.location.protocol}//${window.location.hostname}:5173/admin/dashboard${tokenHash}`;
    }

    return `/admin/dashboard${tokenHash}`;
  }

  try {
    const url = new URL("/admin/dashboard", adminBaseUrl);
    url.hash = tokenHash.slice(1);
    return url.toString();
  } catch {
    return `/admin/dashboard${tokenHash}`;
  }
};
