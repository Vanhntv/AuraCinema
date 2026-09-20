export const LOGIN_PATH = "/dang-nhap";
export const LEGACY_LOGIN_PATH = "/login";

export const getLegacyLoginRedirect = (location = {}) => ({
  state: location.state,
  to: {
    pathname: LOGIN_PATH,
    search: location.search || "",
    hash: location.hash || "",
  },
});
