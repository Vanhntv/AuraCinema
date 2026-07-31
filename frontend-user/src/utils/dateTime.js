const DEFAULT_TIME_ZONE = "Asia/Ho_Chi_Minh";

export const formatDate = (value, fallback = "Đang cập nhật") => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString("vi-VN", { timeZone: DEFAULT_TIME_ZONE });
};

export const buildRelativeDateOptions = (length = 7) =>
  Array.from({ length }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);

    return {
      value: date.toLocaleDateString("en-CA", { timeZone: DEFAULT_TIME_ZONE }),
      label: date
        .toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          timeZone: DEFAULT_TIME_ZONE,
        })
        .replaceAll("/", "-"),
    };
  });

export const getShowtimeDateValue = (showtime) => {
  const value = showtime?.date || showtime?.showtime_date || showtime?.start_time || showtime?.startTime;
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-CA", { timeZone: DEFAULT_TIME_ZONE });
};
