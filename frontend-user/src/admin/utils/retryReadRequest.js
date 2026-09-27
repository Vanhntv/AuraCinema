const isTransientConnectionError = (error) => {
  const status = error.response?.status;
  if (!error.response) return ["ERR_NETWORK", "ECONNABORTED", "ETIMEDOUT", "ECONNRESET", "ECONNREFUSED"].includes(error.code);
  if ([502, 503, 504].includes(status)) return true;
  // Vite returns an empty 500 response when its backend proxy cannot connect.
  return status === 500 && (error.response.data === "" || error.response.data == null);
};

export const retryReadRequest = async (request, {
  attempts = 3,
  wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      if (!isTransientConnectionError(error) || attempt === attempts - 1) throw error;
      await wait(600 * (attempt + 1));
    }
  }
};
