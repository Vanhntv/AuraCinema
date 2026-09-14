export const GIFT_WALLET_FILTERS = ["available", "used", "fulfilled", "expired"];

export const giftMatchesWalletFilter = (item, filter) => {
  if (filter === "available") return ["available", "reserved"].includes(item.status);
  return item.status === filter;
};

export const giftRedemptionDestination = (giftType) => {
  if (giftType === "voucher") {
    return { walletKind: "voucher", filter: "available", notice: "Đổi quà thành công. Voucher đã được thêm vào Ví ưu đãi." };
  }
  if (giftType === "point") {
    return { walletKind: "gift", filter: "fulfilled", notice: "Đổi quà thành công. Điểm thưởng đã được cộng vào tài khoản." };
  }
  return { walletKind: "gift", filter: "available", notice: "Đổi quà thành công. Quà đã được thêm vào Ví ưu đãi." };
};
