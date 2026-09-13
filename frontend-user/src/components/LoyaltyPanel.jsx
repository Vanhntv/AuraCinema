import { useCallback, useEffect, useRef, useState } from "react";
import { HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineX, HiOutlineClipboardCopy } from "react-icons/hi";
import { loyaltyRequest } from "../services/loyaltyService";
import { getMyVoucherWallet } from "../services/voucherService";
import "./loyalty.css";

const money = (n) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(n || 0));
const date = (value) => value ? new Date(value).toLocaleDateString("vi-VN") : "Chưa xác định";
const dateTime = (value) => value ? new Date(value).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }) : "Chưa xác định";
const labels = { available: "Có thể sử dụng", reserved: "Đang giữ cho đơn", paused: "Tạm ngừng", upcoming: "Chưa bắt đầu", used: "Đã sử dụng", expired: "Đã hết hạn" };
const types = { earn: "Tích điểm", redeem: "Đổi voucher", subtract: "Thu hồi điểm", add: "Điều chỉnh điểm" };
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
  const [page, setPage] = useState(1);
  const [type, setType] = useState("");
  const [filter, setFilter] = useState("available");
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
      tab === "points" ? loyaltyRequest("/rewards") : null,
      tab === "vouchers" ? getMyVoucherWallet() : null,
    ]).then(([member, points, rewards, vouchers]) => {
      if (!current) return;
      setError("");
      setMembership(member.data);
      if (points) setHistory(points);
      if (rewards) setOffers(rewards.data);
      if (vouchers) setWallet(vouchers.data);
    }).catch(e => { if (current) setError(errorText(e)); }).finally(() => { if (current) setLoadedKey(dataKey); });
    return () => { current = false; };
  }, [tab, page, type, version, dataKey]);

  const redeem = async () => {
    setRedeeming(true); setDialogError("");
    try {
      const result = await loyaltyRequest(`/rewards/${selected.offer._id}/redeem`, "post", { key: selected.key });
      setSelected({ wallet: { id: result.data._id, status: "available", expires_at: result.data.expires_at, voucher: { ...result.data.snapshot, code: result.data.code } } });
      setNotice("Đổi voucher thành công."); setFilter("available"); onTabChange("vouchers"); reload();
      refreshProfile().catch(() => {});
    } catch (e) { setDialogError(errorText(e)); } finally { setRedeeming(false); }
  };
  const openWallet = (item) => { setSelected({ wallet: item }); setCopied(false); setDialogError(""); };
  const filtered = wallet.filter(item => filter === "available" ? !["used", "expired"].includes(item.status) : item.status === filter);
  const count = (status) => wallet.filter(item => status === "available" ? !["used", "expired"].includes(item.status) : item.status === status).length;
  const voucher = selected?.wallet?.voucher || selected?.offer?.voucher_id;

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
            <button onClick={() => onTabChange("points")}>Đổi điểm lấy voucher</button>
          </div>
        </div>
      </>}
      {tab === "points" && <>
        <header className="loyalty-toolbar"><h2>Điểm thưởng</h2><strong>{membership.available_points.toLocaleString("vi-VN")} điểm khả dụng</strong></header>
        {membership.points_debt > 0 && <p role="status">Điểm cần bù: {membership.points_debt}. Điểm nhận tiếp theo sẽ bù khoản này trước khi đổi thưởng.</p>}
        <div className="loyalty-toolbar"><h3>Lịch sử giao dịch</h3><select aria-label="Loại giao dịch" value={type} onChange={e => { setType(e.target.value); setPage(1); }}><option value="">Tất cả giao dịch</option>{Object.entries(types).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <div className="loyalty-table-wrap"><table><thead><tr><th>Ngày</th><th>Giao dịch</th><th>Tham chiếu</th><th>Điểm</th><th>Số dư</th></tr></thead><tbody>
          {history.data.map(log => <tr key={log._id}><td>{dateTime(log.occurred_at)}{log.reconstructed && <small>Phục dựng</small>}</td><td>{types[log.type]}</td><td>{log.booking_id?.booking_code || log.user_voucher_id?.code || log.reason || "-"}</td><td className={["subtract", "redeem"].includes(log.type) ? "loyalty-negative" : "loyalty-success"}>{["subtract", "redeem"].includes(log.type) ? "-" : "+"}{log.points}</td><td>{log.balance_after ?? "Chưa xác định"}</td></tr>)}
          {!history.data.length && <tr><td colSpan="5">Chưa có giao dịch điểm.</td></tr>}
        </tbody></table></div>
        <LoyaltyPagination page={page} totalPages={history.pagination.totalPages} onChange={setPage} disabled={loading} />
        <h3>Đổi voucher</h3>
        {!membership.redemption_enabled && <p>Đổi thưởng chưa được mở cho tài khoản này.</p>}
        <div className="loyalty-items">{offers.map(offer => <article key={offer._id} className="loyalty-item"><h4>{offer.voucher_id.name || offer.voucher_id.code}</h4><strong>{benefit(offer.voucher_id)}</strong><p>{offer.points_cost} điểm · Còn {offer.remaining}</p><p>Đơn tối thiểu {money(offer.voucher_id.min_order)}</p><p>Hết hạn {date(offer.voucher_id.end_date)}</p><button disabled={!membership.redemption_enabled || !offer.available || membership.available_points < offer.points_cost || membership.points_debt > 0} onClick={() => { setDialogError(""); setSelected({ offer, key: crypto.randomUUID() }); }}>Đổi voucher</button></article>)}</div>
        {!offers.length && <p>Chưa có phần thưởng để đổi.</p>}
      </>}
      {tab === "vouchers" && <>
        <header className="loyalty-toolbar"><h2>Ví voucher cá nhân</h2><button onClick={() => onTabChange("points")}>Đổi điểm</button></header>
        <div className="loyalty-tabs" role="group" aria-label="Trạng thái voucher">{["available", "used", "expired"].map(status => <button aria-pressed={filter === status} key={status} onClick={() => setFilter(status)}>{labels[status]} ({count(status)})</button>)}</div>
        <div className="loyalty-items">{filtered.map(item => <button className="loyalty-item" key={item.id} onClick={() => openWallet(item)}><h3>{item.voucher.name || item.voucher.code || "Voucher cá nhân"}</h3><strong>{benefit(item.voucher)}</strong><p>{labels[item.status]}</p><p>Hết hạn {date(item.expires_at)}</p></button>)}</div>
        {!filtered.length && <p className="loyalty-empty">Chưa có voucher ở trạng thái này.</p>}
      </>}
    </>}
    {selected && <LoyaltyDialog title={selected.offer ? "Xác nhận đổi voucher" : "Voucher cá nhân"} onClose={() => { if (!redeeming) setSelected(null); }}>
      <h3>{voucher.name || voucher.code}</h3><p className="loyalty-benefit">{benefit(voucher)}</p>
      <dl><div><dt>Đơn tối thiểu</dt><dd>{money(voucher.min_order)}</dd></div><div><dt>Hạn sử dụng</dt><dd>{date(selected.wallet?.expires_at || voucher.end_date)}</dd></div><div><dt>Áp dụng</dt><dd>{{ order: "Toàn đơn", ticket: "Vé xem phim", concession: "Bắp nước", movie: "Phim được chỉ định", member: "Hạng thành viên được chỉ định" }[voucher.apply_scope]}</dd></div></dl>
      <p className="loyalty-terms">{voucher.terms_and_conditions || voucher.description || "Áp dụng tối đa một voucher cho mỗi đơn."}</p>
      {selected.offer ? <><p>Đổi bằng <strong>{selected.offer.points_cost} điểm</strong></p><button disabled={redeeming} onClick={redeem}>{redeeming ? "Đang đổi..." : "Xác nhận đổi"}</button></> : <><p>{labels[selected.wallet.status]}</p><div className="loyalty-code"><strong>{voucher.code || "Chưa cấp mã"}</strong><button className="loyalty-icon" title="Sao chép mã" aria-label="Sao chép mã" disabled={!voucher.code} onClick={async () => { try { await navigator.clipboard.writeText(voucher.code); setCopied(true); } catch { setDialogError("Không thể sao chép mã."); } }}><HiOutlineClipboardCopy /></button></div>{copied && <p role="status">Đã sao chép mã.</p>}</>}
      {dialogError && <p role="alert" className="loyalty-negative">{dialogError}</p>}
    </LoyaltyDialog>}
  </section>;
}
