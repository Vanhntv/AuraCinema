import toast from "react-hot-toast";

const defaultOptions = {
  duration: 3600,
};

export const showToast = (type, message, options = {}) => {
  const content = String(message || "").trim();
  if (!content) return null;

  const toastOptions = {
    ...defaultOptions,
    ...options,
  };

  if (type === "success") return toast.success(content, toastOptions);
  if (type === "warning") {
    return toast(content, {
      icon: "!",
      ...toastOptions,
    });
  }

  if (type === "loading") return toast.loading(content, toastOptions);

  return toast.error(content, toastOptions);
};

export const getApiErrorMessage = (error, fallback = "Có lỗi xảy ra. Vui lòng thử lại.") =>
  error?.response?.data?.message || error?.message || fallback;

export default showToast;
