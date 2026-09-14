import { useCallback, useEffect, useRef, useState } from "react";
import { HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineX, HiOutlineClipboardCopy } from "react-icons/hi";
import { loyaltyRequest } from "../services/loyaltyService";
import { getMyVoucherWallet } from "../services/voucherService";
import { getGiftCatalog, getMyGiftQr, getMyGiftWallet, redeemGift } from "../services/giftService";
import { giftRedemptionDestination, hasRedemptionStock, isWalletBenefitVisible, paginateRedemptions } from "../utils/giftWallet";
import QRCode from "qrcode";
import "./loyalty.css";

const money = (n) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(n || 0));
const date = (value) => value ? new Date(value).toLocaleDateString("vi-VN") : "Chưa xác định";
const dateTime = (value) => value ? new Date(value).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }) : "Chưa xác định";
const labels = { available: "Có thể sử dụng", reserved: "Đang giữ cho đơn", paused: "Tạm ngừng", upcoming: "Chưa bắt đầu", used: "Đã sử dụng", fulfilled: "Đã nhận", expired: "Đã hết hạn" };
const types = { earn: "Tích điểm", redeem: "Đổi ưu đãi", subtract: "Thu hồi điểm", add: "Điều chỉnh điểm" };
const giftTypes = { ticket: "Vé xem phim", combo: "Combo bắp nước", voucher: "Voucher", point: "Điểm thưởng", physical: "Quà vật phẩm" };
const REDEMPTION_PAGE_SIZE = 15;
const giftBenefit = (gift = {}) => gift.value_label || ({ ticket: "Vé xem phim", combo: "Combo bắp nước", voucher: "Voucher", point: `${gift.benefit?.points || gift.value || 0} điểm`, physical: "Quà tại rạp" }[gift.type]) || "Quà tặng";
const benefit = (v) => v.discount_type === "percent" ? `Giảm ${v.discount_value}%${v.max_discount_amount ? `, tối đa ${money(v.max_discount_amount)}` : ""}` : `Giảm ${money(v.discount_value)}`;
const errorText = (error) => error.response?.data?.message || "Không thể tải dữ liệu. Vui lòng thử lại.";

export function LoyaltyDialog({ title, children, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    dialog.showModal();
    return () => { dialog.close(); previous?.focus(); };
  }, []);
  return <dialog ref={ref} className="loyalty-dialog" aria-labelledby="loyalty-dialog-title" onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <header><h2 id="loyalty-dialog-title">{title}</h2><button type="button" className="loyalty-icon" title="Đóng" aria-label="Đóng" onClick={onClose}><HiOutlineX /></button></header>
    {children}
  </dialog>;
}

export function LoyaltyPagination({ page, totalPages, onChange, disabled }) {
  return <nav className="loyalty-pagination" aria-label="Phân trang">
    <button className="loyalty-icon" title="Trang trước" aria-label="Trang trước" disabled={disabled || page <= 1} onClick={() => onChange(page - 1)}><HiOutlineChevronLeft /></button>
    <span>Trang {page} / {totalPages}</span>
    <button className="loyalty-icon" title="Trang sau" aria-label="Trang sau" disabled={disabled || page >= totalPages} onClick={() => onChange(page + 1)}><HiOutlineChevronRight /></button>
  </nav>;
}

export default function LoyaltyPanel({ tab, user, onTabChange, refreshProfile }) {
  const [membership, setMembership] = useState(null);
  const [history, setHistory] = useState({ data: [], pagination: { totalPages: 1 } });
  const [wallet, setWallet] = useState([]);
  const [offers, setOffers] = useState([]);
  const [giftOffers, setGiftOffers] = useState([]);
  const [giftWallet, setGiftWallet] = useState([]);
  const [walletKind, setWalletKind] = useState("voucher");
  const [giftQr, setGiftQr] = useState("");
  const [page, setPage] = useState(1);
  const [redemptionPage, setRedemptionPage] = useState(1);
  const [walletPage, setWalletPage] = useState(1);
  const [type, setType] = useState("");
  const [loadedKey, setLoadedKey] = useState(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [selected, setSelected] = useState(null);
  const [redeeming, setRedeeming] = useState(false);
  const [dialogError, setDialogError] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);
  const dataKey = `${tab}:${page}:${type}:${version}`;
  const loading = loadedKey !== dataKey;
  const reload = useCallback(() => setVersion(v => v + 1), []);
  useEffect(() => {
    let current = true;
    Promise.all([
      loyaltyRequest("/membership"),
      tab === "points" ? loyaltyRequest("/points", "get", { page, type }) : null,
      tab === "rewards" ? loyaltyRequest("/rewards") : null,
      tab === "vouchers" ? getMyVoucherWallet() : null,
      tab === "rewards" ? getGiftCatalog() : null,
      tab === "vouchers" ? getMyGiftWallet({ limit: 50, active_only: true }) : null,
    ]).then(([member, points, rewards, vouchers, gifts, ownedGifts]) => {
      if (!current) return;
      setError("");
      setMembership(member.data);
      if (points) setHistory(points);
      if (rewards) setOffers(rewards.data);
      if (vouchers) setWallet(vouchers.data);
      if (gifts) setGiftOffers(gifts.data || []);
      if (ownedGifts) setGiftWallet(ownedGifts.data || []);
    }).catch(e => { if (current) setError(errorText(e)); }).finally(() => { if (current) setLoadedKey(dataKey); });
    return () => { current = false; };
  }, [tab, page, type, version, dataKey]);

  const redeem = async () => {
    setRedeeming(true); setDialogError("");
    try {
      const result = await loyaltyRequest(`/rewards/${selected.offer._id}/redeem`, "post", { key: selected.key });
      setSelected({ wallet: { id: result.data._id, status: "available", expires_at: result.data.expires_at, voucher: { ...result.data.snapshot, code: result.data.code } } });
      setNotice("Đổi voucher thành công."); onTabChange("vouchers"); reload();
      refreshProfile().catch(() => {});
    } catch (e) { setDialogError(errorText(e)); } finally { setRedeeming(false); }
  };
  const redeemOwnedGift = async () => {
    setRedeeming(true); setDialogError("");
    try {
      const giftType = selected.giftOffer.type;
      await redeemGift(selected.giftOffer._id, selected.key);
      const destination = giftRedemptionDestination(giftType);
      setNotice(destination.notice); setWalletKind(destination.walletKind);
      setSelected(null); onTabChange(destination.tab); reload();
      refreshProfile().catch(() => {});
    } catch (e) { setDialogError(errorText(e)); } finally { setRedeeming(false); }
  };
  const openGiftWallet = async (item) => {
    setSelected({ giftWallet: item }); setGiftQr(""); setDialogError("");
    if (!["counter", "both"].includes(item.snapshot?.redemption_channel) || item.status !== "available") return;
    try {
      const response = await getMyGiftQr(item.id || item._id);
      const payload = response.data?.qrPayload;
      if (payload) setGiftQr(await QRCode.toDataURL(payload, { width: 320, margin: 2, errorCorrectionLevel: "M" }));
    } catch (e) { setDialogError(errorText(e)); }
  };
  const openWallet = (item) => { setSelected({ wallet: item }); setCopied(false); setDialogError(""); };
  const usableWallet = wallet.filter(isWalletBenefitVisible);
  const usableGiftWallet = giftWallet.filter(isWalletBenefitVisible);
  const redemptionItems = [
    ...offers.filter(hasRedemptionStock).map(item => ({ kind: "voucher", item })),
    ...giftOffers.filter(hasRedemptionStock).map(item => ({ kind: "gift", item })),
  ];
  const redemptionPagination = paginateRedemptions(redemptionItems, redemptionPage, REDEMPTION_PAGE_SIZE);
  const walletItems = walletKind === "voucher" ? usableWallet : usableGiftWallet;
  const walletPagination = paginateRedemptions(walletItems, walletPage, REDEMPTION_PAGE_SIZE);
  const voucher = selected?.wallet?.voucher || selected?.offer?.voucher_id;
  const selectedGift = selected?.giftOffer || selected?.giftWallet?.snapshot;

  return <section className={`loyalty-surface${tab === "member" ? " loyalty-member-surface" : ""}`} aria-busy={loading}>
    {notice && <p className="loyalty-success" role="status">{notice}</p>}
    {loading ? <p role="status">Đang tải...</p> : error ? <div role="alert"><p>{error}</p><button onClick={reload}>Thử lại</button></div> : membership && <>
      {tab === "member" && <>
        <h2>Thông tin thẻ thành viên</h2>
        <div className="loyalty-member-layout">
          <div className={`loyalty-member-card tier-${membership.tier}`}>
            <header><strong>AURACINEMA</strong><span>{membership.label}</span></header>
            <div className="loyalty-card-tier"><p>Hạng thẻ</p><strong>{membership.label}</strong></div>
            <div className="loyalty-card-owner"><p>Chủ thẻ</p><h3>{user.full_name || "Aura Member"}</h3><p>Mã thẻ</p><strong>{membership.code || "Chưa cấp mã"}</strong></div>
          </div>
          <div className="loyalty-member-details">
            <dl>
              <div><dt>Trạng thái thẻ</dt><dd className={membership.active ? "loyalty-success" : undefined}>{membership.active ? "Đang hoạt động" : "Chưa hoạt động"}</dd></div>
              <div><dt>Điểm khả dụng</dt><dd>{membership.available_points.toLocaleString("vi-VN")}</dd></div>
              {membership.points_debt > 0 && <div><dt>Điểm cần bù</dt><dd>{membership.points_debt}</dd></div>}
              <div><dt>Chi tiêu xét hạng</dt><dd>{money(membership.spent)}</dd></div>
            </dl>
            <progress aria-label="Tiến độ lên hạng" max="100" value={membership.progress} />
            <p>{membership.next ? `Còn ${money(membership.remaining)} để lên ${membership.next}.` : "Bạn đang ở hạng cao nhất."}</p>
            <button onClick={() => onTabChange("rewards")}>Mở kho ưu đãi</button>
          </div>
        </div>
      </>}
      {tab === "points" && <>
        <header className="loyalty-toolbar"><h2>Điểm thưởng</h2><strong>{membership.available_points.toLocaleString("vi-VN")} điểm khả dụng</strong></header>
        {membership.points_debt > 0 && <p role="status">Điểm cần bù: {membership.points_debt}. Điểm nhận tiếp theo sẽ bù khoản này trước khi đổi thưởng.</p>}
        <div className="loyalty-toolbar"><h3>Lịch sử điểm thưởng</h3><select aria-label="Loại giao dịch" value={type} onChange={e => { setType(e.target.value); setPage(1); }}><option value="">Tất cả giao dịch</option>{Object.entries(types).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <div className="loyalty-table-wrap"><table><thead><tr><th>Ngày</th><th>Giao dịch</th><th>Tham chiếu</th><th>Điểm</th><th>Số dư</th></tr></thead><tbody>
          {history.data.map(log => <tr key={log._id}><td>{dateTime(log.occurred_at)}{log.reconstructed && <small>Phục dựng</small>}</td><td>{types[log.type]}</td><td>{log.booking_id?.booking_code || log.user_voucher_id?.code || log.reason || "-"}</td><td className={["subtract", "redeem"].includes(log.type) ? "loyalty-negative" : "loyalty-success"}>{["subtract", "redeem"].includes(log.type) ? "-" : "+"}{log.points}</td><td>{log.balance_after ?? "Chưa xác định"}</td></tr>)}
          {!history.data.length && <tr><td colSpan="5">Chưa có giao dịch điểm.</td></tr>}
        </tbody></table></div>
        <LoyaltyPagination page={page} totalPages={history.pagination.totalPages} onChange={setPage} disabled={loading} />
      </>}
      {tab === "rewards" && <>
        <header className="loyalty-toolbar"><h2>Kho ưu đãi</h2><strong>{membership.available_points.toLocaleString("vi-VN")} điểm khả dụng</strong></header>
        {membership.points_debt > 0 && <p role="status">Điểm cần bù: {membership.points_debt}. Điểm nhận tiếp theo sẽ bù khoản này trước khi đổi thưởng.</p>}
        {!membership.redemption_enabled && <p>Đổi thưởng chưa được mở cho tài khoản này.</p>}
        <div className="loyalty-redemption-grid loyalty-reward-catalog">
          {redemptionPagination.items.map(({ kind, item }) => kind === "voucher"
            ? <article key={`voucher-${item._id}`} className="loyalty-redemption-item"><div className="loyalty-redemption-copy"><span className="loyalty-gift-type">Voucher</span><h4>{item.voucher_id.name || item.voucher_id.code}</h4><strong>{benefit(item.voucher_id)}</strong><p>{item.points_cost} điểm · Hết hạn {date(item.voucher_id.end_date)}</p></div><button disabled={!membership.redemption_enabled || !item.available || membership.available_points < item.points_cost || membership.points_debt > 0} onClick={() => { setDialogError(""); setSelected({ offer: item, key: crypto.randomUUID() }); }}>Đổi voucher</button></article>
            : <article key={`gift-${item._id}`} className="loyalty-redemption-item">{item.image_url && <img src={item.image_url} alt="" />}<div className="loyalty-redemption-copy"><span className="loyalty-gift-type">{giftTypes[item.type]}</span><h4>{item.name}</h4><strong>{giftBenefit(item)}</strong><p>{item.points_cost} điểm · Hết hạn {date(item.end_date)}</p>{item.availability_reason && <p className="loyalty-negative">{item.availability_reason}</p>}</div><button disabled={!membership.redemption_enabled || !item.available || membership.available_points < item.points_cost || membership.points_debt > 0} onClick={() => { setDialogError(""); setSelected({ giftOffer: item, key: crypto.randomUUID() }); }}>Đổi quà</button></article>)}
        </div>
        {redemptionItems.length > REDEMPTION_PAGE_SIZE && <LoyaltyPagination page={redemptionPagination.page} totalPages={redemptionPagination.totalPages} onChange={setRedemptionPage} disabled={loading} />}
        {!redemptionItems.length && <p className="loyalty-empty">Hiện chưa có ưu đãi còn số lượng để đổi.</p>}
      </>}
      {tab === "vouchers" && <>
        <header className="loyalty-toolbar"><h2>Ví ưu đãi</h2><button onClick={() => onTabChange("rewards")}>Mở kho ưu đãi</button></header>
        <div className="loyalty-wallet-switch" role="group" aria-label="Loại ưu đãi"><button aria-pressed={walletKind === "voucher"} onClick={() => { setWalletKind("voucher"); setWalletPage(1); }}>Voucher ({usableWallet.length})</button><button aria-pressed={walletKind === "gift"} onClick={() => { setWalletKind("gift"); setWalletPage(1); }}>Quà tặng ({usableGiftWallet.length})</button></div>
        <div className="loyalty-redemption-grid loyalty-reward-catalog loyalty-wallet-catalog">
          {walletPagination.items.map(item => walletKind === "voucher"
            ? <button className="loyalty-redemption-item loyalty-wallet-catalog-item" key={item.id} onClick={() => openWallet(item)}><div className="loyalty-redemption-copy"><span className="loyalty-gift-type">Voucher</span><h4>{item.voucher.name || item.voucher.code || "Voucher cá nhân"}</h4><strong>{benefit(item.voucher)}</strong><p>{labels[item.status]}</p><p>Hết hạn {date(item.expires_at)}</p></div></button>
            : <button className="loyalty-redemption-item loyalty-wallet-catalog-item" key={item.id || item._id} onClick={() => void openGiftWallet(item)}>{item.snapshot?.image_url && <img src={item.snapshot.image_url} alt="" />}<div className="loyalty-redemption-copy"><span className="loyalty-gift-type">{giftTypes[item.snapshot?.type]}</span><h4>{item.snapshot?.name || "Quà tặng"}</h4><strong>{giftBenefit(item.snapshot)}</strong><p>{labels[item.status] || item.status}</p><p>Hết hạn {date(item.expires_at)}</p></div></button>)}
        </div>
        {walletItems.length > REDEMPTION_PAGE_SIZE && <LoyaltyPagination page={walletPagination.page} totalPages={walletPagination.totalPages} onChange={setWalletPage} disabled={loading} />}
        {!walletItems.length && <p className="loyalty-empty">{walletKind === "voucher" ? "Bạn chưa có voucher có thể sử dụng." : "Bạn chưa có quà tặng có thể sử dụng."}</p>}
      </>}
    </>}
    {selected && !selectedGift && <LoyaltyDialog title={selected.offer ? "Xác nhận đổi voucher" : "Voucher cá nhân"} onClose={() => { if (!redeeming) setSelected(null); }}>
      <h3>{voucher.name || voucher.code}</h3><p className="loyalty-benefit">{benefit(voucher)}</p>
      <dl><div><dt>Đơn tối thiểu</dt><dd>{money(voucher.min_order)}</dd></div><div><dt>Hạn sử dụng</dt><dd>{date(selected.wallet?.expires_at || voucher.end_date)}</dd></div><div><dt>Áp dụng</dt><dd>{{ order: "Toàn đơn", ticket: "Vé xem phim", concession: "Bắp nước", movie: "Phim được chỉ định", member: "Hạng thành viên được chỉ định" }[voucher.apply_scope]}</dd></div></dl>
      <p className="loyalty-terms">{voucher.terms_and_conditions || voucher.description || "Áp dụng tối đa một voucher cho mỗi đơn."}</p>
      {selected.offer ? <><p>Đổi bằng <strong>{selected.offer.points_cost} điểm</strong></p><button disabled={redeeming} onClick={redeem}>{redeeming ? "Đang đổi..." : "Xác nhận đổi"}</button></> : <><p>{labels[selected.wallet.status]}</p><div className="loyalty-code"><strong>{voucher.code || "Chưa cấp mã"}</strong><button className="loyalty-icon" title="Sao chép mã" aria-label="Sao chép mã" disabled={!voucher.code} onClick={async () => { try { await navigator.clipboard.writeText(voucher.code); setCopied(true); } catch { setDialogError("Không thể sao chép mã."); } }}><HiOutlineClipboardCopy /></button></div>{copied && <p role="status">Đã sao chép mã.</p>}</>}
      {dialogError && <p role="alert" className="loyalty-negative">{dialogError}</p>}
    </LoyaltyDialog>}
    {selectedGift && <LoyaltyDialog title={selected.giftOffer ? "Xác nhận đổi quà" : "Chi tiết quà tặng"} onClose={() => { if (!redeeming) setSelected(null); }}>
      {selectedGift.image_url && <img className="loyalty-dialog-image" src={selectedGift.image_url} alt={selectedGift.name} />}
      <span className="loyalty-gift-type">{giftTypes[selectedGift.type]}</span><h3>{selectedGift.name}</h3><p className="loyalty-benefit">{giftBenefit(selectedGift)}</p>
      <dl><div><dt>Hạn sử dụng</dt><dd>{date(selected.giftWallet?.expires_at || selectedGift.end_date)}</dd></div><div><dt>Kênh sử dụng</dt><dd>{{ online: "Đặt vé trực tuyến", counter: "Nhận tại quầy", both: "Trực tuyến hoặc tại quầy", instant: "Tự động chuyển vào tài khoản" }[selectedGift.redemption_channel] || "Theo điều kiện chương trình"}</dd></div></dl>
      <p className="loyalty-terms">{selectedGift.condition?.note || selectedGift.description || "Mỗi tài khoản sử dụng một lần trong thời hạn chương trình."}</p>
      {selected.giftOffer ? <><p>Đổi bằng <strong>{selected.giftOffer.points_cost} điểm</strong></p><button disabled={redeeming} onClick={redeemOwnedGift}>{redeeming ? "Đang đổi..." : "Xác nhận đổi quà"}</button></> : <>{giftQr && <div className="loyalty-gift-qr"><img src={giftQr} alt={`QR ${selected.giftWallet.code}`} /><strong>{selected.giftWallet.code}</strong><span>Xuất trình mã này cho nhân viên tại quầy</span></div>}<p>{labels[selected.giftWallet.status] || selected.giftWallet.status}</p></>}
      {dialogError && <p role="alert" className="loyalty-negative">{dialogError}</p>}
    </LoyaltyDialog>}
  </section>;
}
