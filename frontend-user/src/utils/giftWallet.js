export const GIFT_WALLET_FILTERS = ["available", "used", "fulfilled", "expired"];

export const giftMatchesWalletFilter = (item, filter) => {
  if (filter === "available") return ["available", "reserved"].includes(item.status);
  return item.status === filter;
};

export const isWalletBenefitVisible = (item, now = new Date()) => {
  if (!["available", "reserved", "paused", "upcoming"].includes(item.status)) return false;
  if (!item.expires_at) return true;
  const expiresAt = new Date(item.expires_at);
  return !Number.isNaN(expiresAt.getTime()) && expiresAt > now;
};

export const hasRedemptionStock = (item) => {
  const remaining = item.remaining ?? item.remaining_quantity ?? item.voucher_id?.quantity ?? item.quantity;
  return Number.isFinite(Number(remaining)) && Number(remaining) > 0;
};

export const giftRedemptionDestination = (giftType) => {
  if (giftType === "voucher") {
    return { tab: "vouchers", walletKind: "voucher", filter: "available", notice: "Đổi quà thành công. Voucher đã được thêm vào Ví ưu đãi." };
  }
  if (giftType === "point") {
    return { tab: "points", walletKind: "gift", filter: "fulfilled", notice: "Đổi quà thành công. Điểm thưởng đã được cộng vào tài khoản." };
  }
  return { tab: "vouchers", walletKind: "gift", filter: "available", notice: "Đổi quà thành công. Quà đã được thêm vào Ví ưu đãi." };
};

export const paginateRedemptions = (items, requestedPage, pageSize = 6) => {
  const totalPages = Math.max(Math.ceil(items.length / pageSize), 1);
  const page = Math.min(Math.max(requestedPage, 1), totalPages);
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page, totalPages };
};
