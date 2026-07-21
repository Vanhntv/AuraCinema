export const getUserLoginUrl = () => {
  const userBaseUrl = import.meta.env.VITE_USER_URL;

  if (!userBaseUrl) {
    if (
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "localhost"
    ) {
      return `${window.location.protocol}//${window.location.hostname}:5173/dang-nhap`;
    }

    return "/dang-nhap";
  }

  try {
    return new URL("/dang-nhap", userBaseUrl).toString();
  } catch {
    return "/dang-nhap";
  }
};
