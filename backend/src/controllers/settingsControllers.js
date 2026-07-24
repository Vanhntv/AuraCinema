import Setting from "../models/Setting.js";

const HOME_BANNER_KEY = "home_banner";
const DEFAULT_HOME_BANNER_SETTINGS = {
  slide_interval_ms: 5000,
  selected_banner_urls: [],
};

const clampNumber = (value, fallback, min, max) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.round(parsed), min), max);
};

const normalizeHomeBannerSettings = (value = {}) => ({
  selected_banner_urls: Array.isArray(value.selected_banner_urls)
    ? Array.from(
        new Set(
          value.selected_banner_urls
            .map((item) => (typeof item === "string" ? item.trim() : ""))
            .filter(Boolean),
        ),
      )
    : DEFAULT_HOME_BANNER_SETTINGS.selected_banner_urls,
  slide_interval_ms: clampNumber(
    value.slide_interval_ms,
    DEFAULT_HOME_BANNER_SETTINGS.slide_interval_ms,
    1000,
    30000,
  ),
});

export const getHomeBannerSettings = async (_req, res) => {
  try {
    const setting = await Setting.findOne({ key: HOME_BANNER_KEY });
    const data = normalizeHomeBannerSettings(setting?.value);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateHomeBannerSettings = async (req, res) => {
  try {
    const value = normalizeHomeBannerSettings(req.body);
    const setting = await Setting.findOneAndUpdate(
      { key: HOME_BANNER_KEY },
      { key: HOME_BANNER_KEY, value },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật cấu hình banner trang chủ thành công",
      data: normalizeHomeBannerSettings(setting.value),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
