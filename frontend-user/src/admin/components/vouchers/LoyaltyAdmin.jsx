import { useEffect, useState } from "react";
import { loyaltyRequest } from "../../../services/loyaltyService";
import { getVouchers } from "../../services/voucherService";
import { LoyaltyPagination } from "../../../components/LoyaltyPanel";

export default function LoyaltyAdmin() {
  const [programs, setPrograms] = useState([]);
  const [offers, setOffers] = useState([]);
  const [history, setHistory] = useState({ data: [], pagination: { totalPages: 1 } });
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [offer, setOffer] = useState({ voucher_id: "", points_cost: "", active: false });
  const [grant, setGrant] = useState({ voucher_id: "", mode: "email", email: "", tier: "member" });
  const [preview, setPreview] = useState(null);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [loadedKey, setLoadedKey] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const dataKey = `${page}:${version}`;
  const loading = loadedKey !== dataKey;
  useEffect(() => {
    let current = true;
    Promise.all([getVouchers({ limit: 100 }), loyaltyRequest("/admin/rewards"), loyaltyRequest("/admin/grants", "get", { page })])
      .then(async ([v, r, g]) => {
        const extra = [];
        for (let p = 2; p <= Number(v.pagination?.totalPages || 1); p++) extra.push(...(await getVouchers({ limit: 100, page: p })).data);
        if (current) { setError(""); setPrograms([...(v.data || []), ...extra]); setOffers(r.data); setHistory(g); }
      }).catch(e => { if (current) setError(e.response?.data?.message || "Không thể tải dữ liệu thành viên."); })
      .finally(() => { if (current) setLoadedKey(dataKey); });
    return () => { current = false; };
  }, [page, version, dataKey]);
  const run = async (fn) => {
    setBusy(true); setError(""); setNotice("");
    try { await fn(); } catch (e) { setError(e.response?.data?.message || "Thao tác chưa thành công. Vui lòng thử lại."); } finally { setBusy(false); }
  };
  const changeGrant = (patch) => { setGrant(g => ({ ...g, ...patch })); setPreview(null); setKey(crypto.randomUUID()); };
  const options = programs.map(v => <option key={v._id || v.id} value={v._id || v.id}>{v.name || v.code} ({v.code})</option>);
  return <details className="loyalty-admin">
    <summary>Phần thưởng và cấp voucher cá nhân</summary>
    {error && <p role="alert">{error} <button onClick={() => setVersion(v => v + 1)}>Tải lại</button></p>}
    {notice && <p role="status">{notice}</p>}
    {loading && <p role="status">Đang tải...</p>}
    <h3>Cấu hình phần thưởng</h3>
    <p>Chương trình được chọn sẽ chỉ phát hành qua ví cá nhân; mã chung ngừng áp dụng cho đơn mới.</p>
    <form onSubmit={e => { e.preventDefault(); run(async () => { await loyaltyRequest("/admin/rewards", "put", { ...offer, points_cost: Number(offer.points_cost) }); setNotice("Đã lưu phần thưởng."); setVersion(v => v + 1); }); }}>
      <label>Chương trình voucher<select disabled={busy || loading} required value={offer.voucher_id} onChange={e => setOffer(o => ({ ...o, voucher_id: e.target.value }))}><option value="">Chọn chương trình</option>{options}</select></label>
      <label>Giá điểm<input disabled={busy || loading} required type="number" min="1" step="1" value={offer.points_cost} onChange={e => setOffer(o => ({ ...o, points_cost: e.target.value }))} /></label>
      <label><span>Mở đổi thưởng</span><input disabled={busy || loading} type="checkbox" checked={offer.active} onChange={e => setOffer(o => ({ ...o, active: e.target.checked }))} /></label>
      <button disabled={busy || loading} type="submit">Lưu phần thưởng</button>
    </form>
    <div style={{ overflowX: "auto" }}><table><thead><tr><th>Phần thưởng</th><th>Giá điểm</th><th>Còn lại</th><th>Trạng thái</th><th /></tr></thead><tbody>{offers.map(item => <tr key={item._id}><td>{item.voucher_id.name || item.voucher_id.code}</td><td>{item.points_cost}</td><td>{item.remaining}</td><td>{item.active ? "Mở" : "Tạm ngừng"}</td><td><button disabled={busy} onClick={() => setOffer({ voucher_id: item.voucher_id._id, points_cost: item.points_cost, active: item.active })}>Chỉnh sửa</button></td></tr>)}</tbody></table></div>
    <h3>Cấp voucher</h3>
    <form onSubmit={e => { e.preventDefault(); run(async () => { const result = await loyaltyRequest("/admin/grants/preview", "post", { voucher_id: grant.voucher_id, [grant.mode]: grant[grant.mode], key }); setPreview(result.data); }); }}>
      <label>Chương trình voucher<select disabled={busy || loading} required value={grant.voucher_id} onChange={e => changeGrant({ voucher_id: e.target.value })}><option value="">Chọn chương trình</option>{options}</select></label>
      <label>Người nhận<select disabled={busy || loading} value={grant.mode} onChange={e => changeGrant({ mode: e.target.value })}><option value="email">Một tài khoản</option><option value="tier">Nhóm hạng</option></select></label>
      {grant.mode === "email" ? <label>Email<input disabled={busy || loading} type="email" required value={grant.email} onChange={e => changeGrant({ email: e.target.value })} /></label> : <label>Hạng<select disabled={busy || loading} value={grant.tier} onChange={e => changeGrant({ tier: e.target.value })}><option value="member">Member</option><option value="vip">VIP</option><option value="vvip">VVIP</option></select></label>}
      <button type="submit" disabled={busy || loading}>Xem trước</button>
    </form>
    {preview && <div><p>{preview.count} thành viên, mỗi người nhận 1 voucher.</p><button disabled={busy || Boolean(preview.completed_at)} onClick={() => run(async () => { await loyaltyRequest(`/admin/grants/${preview.id}/confirm`, "post", {}); setNotice(`Đã cấp voucher cho ${preview.count} thành viên.`); setPreview(p => ({ ...p, completed_at: new Date().toISOString() })); setVersion(v => v + 1); })}>{preview.completed_at ? "Đã cấp" : "Xác nhận cấp voucher"}</button></div>}
    <h3>Lịch sử cấp voucher</h3>
    <div style={{ overflowX: "auto" }}><table><thead><tr><th>Ngày cấp</th><th>Chương trình</th><th>Người nhận</th><th>Người cấp</th></tr></thead><tbody>{history.data.map(item => <tr key={item._id}><td>{new Date(item.completed_at).toLocaleString("vi-VN")}</td><td>{item.voucher_id?.name || item.voucher_id?.code || "Chương trình đã ngừng"}</td><td>{item.count}</td><td>{item.admin_id?.full_name || "-"}</td></tr>)}{!history.data.length && <tr><td colSpan="4">Chưa có đợt cấp voucher.</td></tr>}</tbody></table></div>
    <LoyaltyPagination page={page} totalPages={history.pagination.totalPages} onChange={setPage} disabled={busy || loading} />
  </details>;
}
