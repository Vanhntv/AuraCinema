import { useCallback, useEffect, useState } from "react";
import "./TransactionHistory.css";
import "./TransactionHistoryNotes.css";

const PAGE_SIZE = 10;
const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
const paymentLabels = { pending: "Chờ thanh toán", paid: "Đã thanh toán", failed: "Thanh toán lỗi", cancelled: "Đã hủy", expired: "Hết hạn", refund_pending: "Chờ hoàn tiền", refunded: "Đã hoàn tiền" };
const ticketLabels = { VALID: "Còn hiệu lực", CHECKED_IN: "Đã check-in", CANCELLED: "Đã hủy", EXPIRED: "Hết hạn" };
const formatDateTime = (value) => value ? new Date(value).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
const initialFilters = { q: "", sales_channel: "", customer_type: "", payment_status: "", date_from: "", date_to: "" };

function Badge({ value, labels }) {
  return <span className={`transaction-badge ${String(value || "unknown").toLowerCase()}`}>{labels[value] || value || "Không rõ"}</span>;
}

function DetailItem({ label, value }) {
  return <div className="transaction-detail-item"><span>{label}</span><strong>{value || "—"}</strong></div>;
}

export default function TransactionHistory({ api }) {
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [filters, setFilters] = useState(initialFilters);
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalItems: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [complaintNote, setComplaintNote] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);

  const loadTransactions = useCallback(async (page = 1) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
      const response = await api(`/staff/pos/transactions?${params}`, { returnBody: true });
      setTransactions(response.data || []);
      setPagination(response.pagination || { page, totalPages: 1, totalItems: 0 });
    } catch (requestError) {
      setTransactions([]);
      setError(requestError.message);
    } finally { setLoading(false); }
  }, [api, filters]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadTransactions(1); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadTransactions]);

  const submitFilters = (event) => { event.preventDefault(); setFilters({ ...draftFilters }); };
  const clearFilters = () => { setDraftFilters(initialFilters); setFilters(initialFilters); };
  const openDetail = async (transaction) => {
    setDetailLoading(true); setComplaintNote(""); setError("");
    try { setDetail(await api(`/staff/pos/transactions/${transaction._id}`)); }
    catch (requestError) { setError(requestError.message); }
    finally { setDetailLoading(false); }
  };
  const saveComplaintNote = async (event) => {
    event.preventDefault();
    if (!detail || complaintNote.trim().length < 3) return;
    setNoteSaving(true); setError("");
    try {
      await api(`/staff/pos/transactions/${detail._id}/notes`, { method: "POST", body: JSON.stringify({ reason: complaintNote.trim() }) });
      setComplaintNote("");
      setDetail(await api(`/staff/pos/transactions/${detail._id}`));
    } catch (requestError) { setError(requestError.message); }
    finally { setNoteSaving(false); }
  };

  return <section className="transaction-history">
    <form className="transaction-filters" onSubmit={submitFilters}>
      <label className="transaction-search"><span>Tìm kiếm giao dịch</span><input value={draftFilters.q} onChange={(event) => setDraftFilters((current) => ({ ...current, q: event.target.value }))} placeholder="Mã đơn, mã vé, khách hàng, SĐT, mã giao dịch..." /></label>
      <label><span>Kênh bán</span><select value={draftFilters.sales_channel} onChange={(event) => setDraftFilters((current) => ({ ...current, sales_channel: event.target.value }))}><option value="">Tất cả</option><option value="online">Online</option><option value="counter">Tại quầy</option></select></label>
      <label><span>Loại khách</span><select value={draftFilters.customer_type} onChange={(event) => setDraftFilters((current) => ({ ...current, customer_type: event.target.value }))}><option value="">Tất cả</option><option value="member">Có tài khoản</option><option value="guest">Khách vãng lai</option></select></label>
      <label><span>Thanh toán</span><select value={draftFilters.payment_status} onChange={(event) => setDraftFilters((current) => ({ ...current, payment_status: event.target.value }))}><option value="">Tất cả</option>{Object.entries(paymentLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label><span>Từ ngày</span><input type="date" value={draftFilters.date_from} onChange={(event) => setDraftFilters((current) => ({ ...current, date_from: event.target.value }))} /></label>
      <label><span>Đến ngày</span><input type="date" value={draftFilters.date_to} onChange={(event) => setDraftFilters((current) => ({ ...current, date_to: event.target.value }))} /></label>
      <div className="transaction-filter-actions"><button type="submit">Tra cứu</button><button type="button" onClick={clearFilters}>Xóa lọc</button></div>
    </form>

    <div className="transaction-toolbar"><div><strong>{pagination.totalItems || 0}</strong><span> giao dịch được lưu trữ</span></div><button type="button" onClick={() => loadTransactions(pagination.page)} disabled={loading}>↻ Làm mới</button></div>
    {error && <div className="transaction-error">{error}</div>}
    <div className="transaction-table-wrap"><table className="transaction-table"><thead><tr><th>Mã đơn / thời gian</th><th>Khách hàng</th><th>Phim / ghế</th><th>Kênh bán</th><th>Thanh toán</th><th>Tổng tiền</th><th /></tr></thead><tbody>
      {loading ? <tr><td colSpan="7" className="transaction-empty">Đang tải lịch sử giao dịch...</td></tr> : transactions.length ? transactions.map((item) => <tr key={item._id}>
        <td><strong>{item.booking_code}</strong><small>{formatDateTime(item.created_at)}</small></td>
        <td><strong>{item.customer_name || "Khách hàng"}</strong><small>{item.customer_type === "member" ? "Khách có tài khoản" : "Khách vãng lai"}</small><small>{item.customer_phone || item.customer_email}</small></td>
        <td><strong>{item.movie_snapshot?.title || "—"}</strong><small>{(item.tickets || []).map((ticket) => ticket.seat_label).join(", ") || "Chưa phát hành vé"}</small></td>
        <td><Badge value={item.sales_channel} labels={{ online: "Online", counter: "Tại quầy" }} /></td>
        <td><Badge value={item.payment_status} labels={paymentLabels} /><small>{item.payment_provider || "—"}</small></td>
        <td><strong>{money.format(Number(item.total_price || 0))}</strong><small>{item.tickets?.length || 0} vé</small></td>
        <td><button className="transaction-detail-button" type="button" onClick={() => openDetail(item)}>Chi tiết</button></td>
      </tr>) : <tr><td colSpan="7" className="transaction-empty">Không tìm thấy giao dịch phù hợp.</td></tr>}
    </tbody></table></div>
    <div className="transaction-pagination"><button type="button" disabled={loading || pagination.page <= 1} onClick={() => loadTransactions(pagination.page - 1)}>← Trước</button><span>Trang {pagination.page} / {pagination.totalPages}</span><button type="button" disabled={loading || pagination.page >= pagination.totalPages} onClick={() => loadTransactions(pagination.page + 1)}>Sau →</button></div>

    {(detail || detailLoading) && <div className="transaction-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetail(null); }}><div className="transaction-modal" role="dialog" aria-modal="true" aria-label="Chi tiết giao dịch">
      <div className="transaction-modal-heading"><div><span>Hồ sơ giao dịch</span><h2>{detail?.booking_code || "Đang tải..."}</h2></div><button type="button" onClick={() => setDetail(null)}>×</button></div>
      {detailLoading ? <p className="transaction-empty">Đang truy xuất đơn hàng, giao dịch và vé...</p> : detail && <>
        <div className="transaction-detail-grid"><DetailItem label="Loại khách" value={detail.customer_type === "member" ? "Khách hàng có tài khoản" : "Khách vãng lai"} /><DetailItem label="Khách hàng" value={detail.customer_name} /><DetailItem label="Email" value={detail.customer_email} /><DetailItem label="Số điện thoại" value={detail.customer_phone} /><DetailItem label="Phim" value={detail.movie_snapshot?.title} /><DetailItem label="Suất chiếu" value={formatDateTime(detail.showtime_snapshot?.start_time)} /><DetailItem label="Rạp / phòng" value={`${detail.showtime_snapshot?.cinema_name || "—"} · ${detail.showtime_snapshot?.room_name || "—"}`} /><DetailItem label="Kênh bán" value={detail.sales_channel === "counter" ? "Tại quầy" : "Online"} /><DetailItem label="Người bán" value={detail.sold_by?.full_name || (detail.sales_channel === "online" ? "Hệ thống online" : "—")} /><DetailItem label="Tổng thanh toán" value={money.format(Number(detail.total_price || 0))} /></div>
        <h3>Vé trong đơn</h3><div className="transaction-ticket-list">{detail.tickets?.length ? detail.tickets.map((ticket) => <article key={ticket.id}><div><strong>{ticket.ticket_code}</strong><span>Ghế {ticket.seat_label} · {ticket.seat_type || "Thường"}</span></div><div><Badge value={ticket.status} labels={ticketLabels} /><small>{ticket.checked_in_at ? `Check-in ${formatDateTime(ticket.checked_in_at)}` : money.format(Number(ticket.price || 0))}</small></div></article>) : <p>Đơn chưa phát hành vé.</p>}</div>
        <h3>Giao dịch thanh toán</h3><div className="transaction-payment-list">{detail.payments?.length ? detail.payments.map((payment) => <article key={payment.id}><div><strong>{payment.payment_code}</strong><span>{payment.provider} · {payment.transaction_id || payment.transaction_ref}</span></div><div><Badge value={payment.status} labels={paymentLabels} /><strong>{money.format(Number(payment.amount || 0))}</strong></div></article>) : <p>Không có bản ghi thanh toán.</p>}</div>
        <h3>Dịch vụ và giảm giá</h3><p className="transaction-summary-line">{detail.combos?.length ? detail.combos.map((item) => `${item.name} × ${item.quantity}`).join(", ") : "Không có combo"} · Voucher: {detail.voucher?.code || "Không có"} · Giảm: {money.format(Number(detail.discount_amount || 0))}</p>
        <h3>Xử lý khiếu nại</h3><form className="transaction-note-form" onSubmit={saveComplaintNote}><textarea value={complaintNote} onChange={(event) => setComplaintNote(event.target.value)} maxLength="1000" placeholder="Ghi lại nội dung khách phản ánh và hướng xử lý..." /><button disabled={noteSaving || complaintNote.trim().length < 3}>{noteSaving ? "Đang lưu..." : "Lưu ghi chú xử lý"}</button></form>
        <h3>Nhật ký truy soát</h3><div className="transaction-audit-list">{detail.action_logs?.length ? detail.action_logs.map((log) => <div key={log._id}><strong>{log.action === "COMPLAINT_NOTE" ? "KHIẾU NẠI" : log.action}</strong><span>{log.result} · {log.adminId?.full_name || "Hệ thống"} · {formatDateTime(log.createdAt)}</span><small>{log.reason || "Không có ghi chú"}</small></div>) : <p>Chưa có thao tác truy soát trước đó.</p>}</div>
      </>}
    </div></div>}
  </section>;
}
