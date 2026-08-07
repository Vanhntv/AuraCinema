const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export const DEFAULT_PROMOTION_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='900' height='506' viewBox='0 0 900 506'%3E%3Cdefs%3E%3ClinearGradient id='a' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23151b26'/%3E%3Cstop offset='0.54' stop-color='%2324121f'/%3E%3Cstop offset='1' stop-color='%23ff5364'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='900' height='506' fill='url(%23a)'/%3E%3Ccircle cx='710' cy='108' r='148' fill='%23ff6070' opacity='0.18'/%3E%3Ctext x='70' y='220' fill='white' font-family='Arial,sans-serif' font-size='54' font-weight='800'%3EAuraCinema%3C/text%3E%3Ctext x='70' y='286' fill='%23ffb4bb' font-family='Arial,sans-serif' font-size='34' font-weight='700'%3EKhuyen mai%3C/text%3E%3C/svg%3E";

export function formatPromotionDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return dateFormatter.format(date);
}

export function formatPromotionCurrency(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return "-";
  return currencyFormatter.format(amount);
}

export function formatDiscountType(value) {
  return value === "fixed" ? "Giảm tiền" : "Giảm phần trăm";
}

export function formatDiscountValue(voucher = {}) {
  const value = Number(voucher.discount_value || 0);
  if (voucher.discount_type === "fixed") return currencyFormatter.format(value);
  return `${value}%`;
}

export function formatApplyScope(value) {
  const labels = {
    order: "Toàn đơn hàng",
    ticket: "Vé xem phim",
    concession: "Bắp nước",
    movie: "Phim áp dụng",
    member: "Thành viên",
  };

  return labels[value] || "Toàn đơn hàng";
}

export function resolvePromotionImage(imageUrl) {
  if (!imageUrl) return DEFAULT_PROMOTION_IMAGE;
  if (/^https?:\/\//i.test(imageUrl) || imageUrl.startsWith("data:")) return imageUrl;

  const apiBase = import.meta.env.VITE_API_URL || "/api";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`}`;
}

export function mapVoucherToPromotion(voucher = {}) {
  const id = String(voucher._id || voucher.id || voucher.code || "");
  const title = voucher.name || voucher.program_name || voucher.title || voucher.code || "Khuyến mãi AuraCinema";
  const description = voucher.description || `Nhập mã ${voucher.code} khi đặt vé để nhận ưu đãi từ AuraCinema.`;

  return {
    ...voucher,
    id,
    slug: id,
    title,
    summary: description,
    thumbnail: resolvePromotionImage(voucher.image_url || voucher.image || voucher.thumbnail),
    category: "Giảm giá",
    code: voucher.code || "",
    discountTypeLabel: formatDiscountType(voucher.discount_type),
    discountValueLabel: formatDiscountValue(voucher),
    maxDiscountLabel: formatPromotionCurrency(voucher.max_discount_amount),
    minOrderLabel: formatPromotionCurrency(voucher.min_order),
    scopeLabel: formatApplyScope(voucher.apply_scope || voucher.scope),
    startDate: formatPromotionDate(voucher.start_date),
    endDate: formatPromotionDate(voucher.end_date),
    terms: voucher.terms_and_conditions || "Áp dụng theo điều kiện của từng chương trình và số lượng mã còn lại.",
    viewCount: Number(voucher.usage_count || 0),
  };
}
