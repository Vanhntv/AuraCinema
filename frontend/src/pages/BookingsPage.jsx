import { useCallback, useEffect, useState } from "react";
import { HiOutlineRefresh, HiOutlineSearch, HiOutlineTicket } from "react-icons/hi";
import Toast from "../components/common/Toast";
import { getBookings, updateBooking } from "../services/bookingService";

const dateTime = (value) => value ? new Date(value).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "—";

function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((type, message) => setToasts((items) => [...items, { id: crypto.randomUUID(), type, message }]), []);

  const load = useCallback(async (q = "", state = "") => {
    try {
      setLoading(true);
      const result = await getBookings({ q: q || undefined, status: state || undefined });
      setBookings(result.data || []);
    } catch { toast("error", "Không thể tải danh sách đặt vé"); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { Promise.resolve().then(() => load("", "")); }, [load]);

  const change = async (booking, data) => {
    try { await updateBooking(booking._id, data); toast("success", "Đã cập nhật vé"); await load(query, status); }
    catch (error) { toast("error", error.response?.data?.message || "Không thể cập nhật vé"); }
  };

  return (
    <div className="page-container">
      <div className="page-header"><div><h1 className="page-title"><HiOutlineTicket style={{ marginRight: 12 }} />Quản lý Đặt vé</h1><p className="page-subtitle">Theo dõi khách hàng, ghế và thanh toán</p></div></div>
      <div className="search-bar">
        <div className="search-input-wrapper"><HiOutlineSearch className="search-icon" /><input className="search-input" placeholder="Mã vé, tên hoặc số điện thoại..." value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load(query, status)} /></div>
        <select className="form-input" style={{ maxWidth: 190 }} value={status} onChange={(e) => { setStatus(e.target.value); load(query, e.target.value); }}><option value="">Tất cả trạng thái</option><option value="confirmed">Đã xác nhận</option><option value="cancelled">Đã hủy</option></select>
        <button className="btn btn-secondary" onClick={() => load(query, status)}><HiOutlineRefresh /></button>
      </div>
      <div className="card table-container">
        {loading ? <div className="loading-spinner"><div className="spinner" /><p>Đang tải dữ liệu...</p></div> : (
          <table className="data-table"><thead><tr><th>Mã vé / Khách</th><th>Phim / Suất</th><th>Rạp / Ghế</th><th>Tổng tiền</th><th>Thanh toán</th><th>Trạng thái</th></tr></thead><tbody>
            {bookings.map((item) => { const show = item.showtime_id; return <tr key={item._id}>
              <td><div className="table-cell-name">{item.booking_code}</div><div className="table-cell-desc">{item.customer_name} · {item.customer_phone}</div></td>
              <td><div className="table-cell-name">{show?.movie_id?.title || "—"}</div><div className="table-cell-desc">{dateTime(show?.start_time)}</div></td>
              <td><div>{show?.room_id?.cinema_id?.name || "—"} / {show?.room_id?.name || "—"}</div><div className="table-cell-desc">Ghế {item.seats.map((seat) => seat.label).join(", ")}</div></td>
              <td className="table-cell-name">{Number(item.total_price).toLocaleString("vi-VN")}đ</td>
              <td><select className="form-input" value={item.payment_status} disabled={item.status === "cancelled"} onChange={(e) => change(item, { payment_status: e.target.value })}><option value="pending">Chưa thanh toán</option><option value="paid">Đã thanh toán</option></select></td>
              <td><select className="form-input" value={item.status} onChange={(e) => change(item, { status: e.target.value })}><option value="confirmed">Đã xác nhận</option><option value="cancelled">Đã hủy</option></select></td>
            </tr> })}
          </tbody></table>
        )}
        {!loading && !bookings.length && <div className="table-empty"><HiOutlineTicket className="table-empty-icon" /><p className="table-empty-text">Chưa có lượt đặt vé</p></div>}
      </div>
      <Toast toasts={toasts} onRemove={(id) => setToasts((items) => items.filter((item) => item.id !== id))} />
    </div>
  );
}
export default BookingsPage;
