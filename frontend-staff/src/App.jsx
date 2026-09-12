import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001/api";
const menu = [
  ["counter", "Bán vé tại quầy", "▣"],
  ["rooms", "Quản lý phòng và ghế", "▤"],
  ["shift", "Báo cáo ca làm việc", "▥"],
  ["history", "Lịch sử giao dịch", "◷"],
];
const titles = {
  counter: ["Bán vé tại quầy", "Bán vé trực tiếp", "Chọn suất chiếu, ghế còn trống và hoàn tất thanh toán tiền mặt."],
  rooms: ["Quản lý phòng và ghế", "Sơ đồ phòng chiếu", "Kiểm tra tình trạng phòng và cập nhật trạng thái ghế."],
  shift: ["Báo cáo ca làm việc", "Tổng kết ca làm việc", "Xem doanh thu, số vé bán và các giao dịch trong ca của bạn."],
  history: ["Lịch sử giao dịch", "Các giao dịch gần đây", "Tra cứu hóa đơn, trạng thái thanh toán và lịch sử bán vé."],
};
const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

const headers = () => {
  const token = localStorage.getItem("staffAccessToken") || localStorage.getItem("adminAccessToken") || localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const consumeStaffTokenFromHash = () => {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const token = hash.get("staffToken");
  if (!token) return;
  localStorage.setItem("staffAccessToken", token);
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
};

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...headers(), ...options.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.success) throw new Error(body.message || "Không thể kết nối máy chủ.");
  return body.data;
}

export default function App() {
  const [active, setActive] = useState("counter");
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [crumb, title, description] = titles[active];
  consumeStaffTokenFromHash();

  return (
    <div className={`staff-layout ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside className={`sidebar ${collapsed ? "collapsed" : ""} ${mobile ? "mobile-open" : ""}`}>
        <div className="sidebar-logo"><div className="sidebar-logo-icon">A</div><span className="sidebar-logo-text">AuraCinema</span></div>
        <nav className="sidebar-nav">
          <div className="sidebar-section-title">Nhân viên</div>
          {menu.map(([id, label, icon]) => <button key={id} className={`sidebar-link ${active === id ? "active" : ""}`} onClick={() => { setActive(id); setMobile(false); }} title={collapsed ? label : undefined}><span className="sidebar-link-icon">{icon}</span><span className="sidebar-link-text">{label}</span></button>)}
        </nav>
        <div className="sidebar-footer"><div className="sidebar-footer-avatar">N</div><div className="sidebar-footer-details"><strong>Nhân viên</strong><span>Nhân viên quầy vé</span></div></div>
      </aside>
      {mobile && <button className="sidebar-overlay" onClick={() => setMobile(false)} aria-label="Đóng menu" />}
      <div className="staff-main">
        <header className="header"><div className="header-left"><button className="header-toggle desktop-toggle" onClick={() => setCollapsed(!collapsed)}>☰</button><button className="header-toggle mobile-toggle" onClick={() => setMobile(true)}>☰</button><div className="breadcrumb"><span>Nhân viên</span><b>/</b><strong>{crumb}</strong></div></div><div className="header-right"><label className="header-search"><span>⌕</span><input placeholder="Tìm kiếm..." /></label><button className="header-icon">♢<i /></button><div className="header-user"><div>N</div><span><strong>Nhân viên</strong><small>Quầy vé</small></span></div></div></header>
        <main className="staff-content">
          <section className="page-heading"><span>{crumb}</span><h1>{title}</h1><p>{description}</p></section>
          {active === "counter" ? <CounterSale /> : active === "rooms" ? <RoomSeatManagement /> : <section className="content-card empty-page"><h2>{crumb}</h2><p>Chức năng này đang được chuẩn bị cho nhân viên rạp.</p></section>}
        </main>
      </div>
    </div>
  );
}

function RoomSeatManagement() {
  const [rooms, setRooms] = useState([]);
  const [room, setRoom] = useState(null);
  const [showtime, setShowtime] = useState(null);
  const [showtimeSeats, setShowtimeSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seatLoading, setSeatLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  const loadRooms = async () => {
    setLoading(true);
    setError("");
    try { setRooms(await api("/staff/pos/rooms")); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    let live = true;
    api("/staff/pos/rooms")
      .then((data) => live && setRooms(data))
      .catch((err) => live && setError(err.message))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const chooseShowtime = async (selectedRoom, selectedShowtime) => {
    setSeatLoading(true); setError(""); setNotice("");
    try {
      const [roomDetail, seats] = await Promise.all([
        api(`/staff/pos/rooms/${selectedRoom._id}/seats`),
        api(`/showtime-seats?showtime_id=${selectedShowtime.id}`),
      ]);
      setRoom(roomDetail);
      setShowtime(selectedShowtime);
      setShowtimeSeats(seats);
    }
    catch (err) { setError(err.message); }
    finally { setSeatLoading(false); }
  };

  const updateStatus = async (showtimeSeat) => {
    const physicalSeat = showtimeSeat.seat_id;
    const nextStatus = physicalSeat.operational_status === "maintenance" || showtimeSeat.status === "maintenance" ? "active" : "maintenance";
    setUpdatingId(physicalSeat._id); setError(""); setNotice("");
    try {
      const result = await api(`/staff/pos/rooms/${room._id}/seats/${physicalSeat._id}/status`, { method: "PATCH", body: JSON.stringify({ status: nextStatus }) });
      const refreshedSeats = await api(`/showtime-seats?showtime_id=${showtime.id}`);
      setShowtimeSeats(refreshedSeats);
      setRoom((current) => ({ ...current, seats: current.seats.map((item) => item._id === physicalSeat._id ? result.seat : item) }));
      setRooms((current) => current.map((item) => {
        if (item._id !== room._id) return item;
        const delta = nextStatus === "maintenance" ? 1 : -1;
        return { ...item, seat_summary: { ...item.seat_summary, maintenance: item.seat_summary.maintenance + delta, active: item.seat_summary.active - delta } };
      }));
      setNotice(`${result.seat.seat_code}: ${nextStatus === "maintenance" ? "đang bảo trì" : "đã sẵn sàng"}. Đã đồng bộ ${result.synced_showtime_seats} ghế theo suất chiếu.`);
    } catch (err) { setError(err.message); }
    finally { setUpdatingId(""); }
  };

  const summary = useMemo(() => {
    const seats = room?.seats || [];
    return { total: seats.length, maintenance: seats.filter((seat) => seat.operational_status === "maintenance").length };
  }, [room]);
  const selectedShowtimeIsUpcoming = showtime && showtime.status === "scheduled" && new Date(showtime.start_time).getTime() > currentTime;

  return (
    <div className="room-management">
      <aside className="room-list-panel">
        <div className="room-panel-heading"><h2>Danh sách phòng</h2><button onClick={loadRooms} disabled={loading}>↻</button></div>
        {loading ? <p className="empty-note">Đang tải phòng...</p> : rooms.map((item) => { const upcomingShowtimes = (item.today_showtimes || []).filter((itemShowtime) => itemShowtime.status === "scheduled" && new Date(itemShowtime.start_time).getTime() > currentTime); return <div className={`room-choice ${room?._id === item._id ? "selected" : ""}`} key={item._id}><div className="room-choice-title"><strong>{item.name}</strong><em>{item.seat_summary?.maintenance || 0} bảo trì</em></div><div className="room-showtimes">{upcomingShowtimes.length ? upcomingShowtimes.map((itemShowtime) => <button className={showtime?.id === itemShowtime.id ? "active" : ""} key={itemShowtime.id} onClick={() => chooseShowtime(item, itemShowtime)}><b>{showtimeTime(itemShowtime.start_time)}</b><span>{itemShowtime.movie.title}</span></button>) : <small>Không còn suất chiếu sắp tới trong ngày</small>}</div></div>; })}
      </aside>
      <section className="room-seat-panel">
        {seatLoading ? <p className="empty-note">Đang tải sơ đồ ghế...</p> : !room || !selectedShowtimeIsUpcoming ? <div className="room-empty"><span>▤</span><h2>Chọn một suất chiếu sắp tới</h2><p>Các suất đã bắt đầu chiếu sẽ tự động được ẩn.</p></div> : <><div className="room-detail-heading"><div><span>{showtime.movie.title} · {showtimeTime(showtime.start_time)}</span><h2>{room.name}</h2></div><div className="room-stats"><b>{summary.total}<small>Tổng ghế</small></b><b className="maintenance-count">{summary.maintenance}<small>Bảo trì</small></b></div></div><div className="maintenance-help">Màu ghế thể hiện loại <strong>Thường / VIP / Đôi</strong>. Viền vàng là ghế bảo trì; ghế xám là ghế đã bán hoặc đang giữ.</div><MaintenanceSeatMap seats={showtimeSeats} updatingId={updatingId} updateStatus={updateStatus} /></>}
        {notice && <div className="room-feedback success">{notice}</div>}
        {error && <div className="room-feedback error">{error}</div>}
      </section>
    </div>
  );
}

function MaintenanceSeatMap({ seats, updatingId, updateStatus }) {
  const rows = [...new Set(seats.map((item) => item.seat_id?.seat_row))].sort();
  return <div className="maintenance-map"><div className="screen">MÀN HÌNH</div><div className="seat-legend type-legend"><span><i className="normal" />Thường</span><span><i className="vip" />VIP</span><span><i className="couple" />Ghế đôi</span><span><i className="maintenance" />Bảo trì</span><span><i className="taken" />Đã bán / đang giữ</span></div>{rows.map((row) => <div className="seat-row" key={row}><b>{row}</b><div>{seats.filter((item) => item.seat_id?.seat_row === row).sort((a, b) => a.seat_id.seat_number - b.seat_id.seat_number).map((item, index, rowSeats) => { const seat = item.seat_id; const tone = getSeatTypeTone(seat.seat_type_id); const nextTone = getSeatTypeTone(rowSeats[index + 1]?.seat_id?.seat_type_id); let previousCouples = 0; for (let cursor = index - 1; cursor >= 0 && getSeatTypeTone(rowSeats[cursor]?.seat_id?.seat_type_id) === "couple"; cursor -= 1) previousCouples += 1; const pairClass = tone === "couple" ? (previousCouples % 2 === 1 ? "couple-left" : nextTone === "couple" ? "couple-right" : "") : ""; const maintenance = item.status === "maintenance" || seat.operational_status === "maintenance"; const unavailable = !["available", "maintenance"].includes(item.status); return <button key={item._id} disabled={updatingId === seat._id} onClick={() => updateStatus(item)} className={`seat maintenance-seat ${tone} ${pairClass} ${maintenance ? "is-maintenance" : ""} ${unavailable ? "is-taken" : ""}`} title={`${seat.seat_code} · ${seat.seat_type_id?.name || "Ghế thường"} · ${maintenance ? "Bảo trì" : item.status}`}><span>{seat.seat_number}</span>{updatingId === seat._id && <i />}</button>; })}</div><b>{row}</b></div>)}</div>;
}

function CounterSale() {
  const [showtimes, setShowtimes] = useState([]), [current, setCurrent] = useState(null), [seats, setSeats] = useState([]), [selected, setSelected] = useState([]), [loading, setLoading] = useState(true), [seatLoading, setSeatLoading] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(""), [sale, setSale] = useState(null);
  const [clock, setClock] = useState(() => Date.now());
  const [selectedDate, setSelectedDate] = useState(() => getVietnamDateValue());
  const [selectedMovieId, setSelectedMovieId] = useState("");
  const dateOptions = useMemo(() => getRollingDateOptions(clock), [clock]);
  const effectiveDate = dateOptions.some((item) => item.value === selectedDate) ? selectedDate : dateOptions[0].value;
  const visibleShowtimes = useMemo(() => showtimes.filter((item) => item.status === "scheduled" && new Date(item.start_time).getTime() > clock), [showtimes, clock]);
  const movies = useMemo(() => {
    const groupedMovies = new Map();
    visibleShowtimes.forEach((showtime) => {
      const movieId = String(showtime.movie.id);
      if (!groupedMovies.has(movieId)) groupedMovies.set(movieId, { ...showtime.movie, showtimes: [] });
      groupedMovies.get(movieId).showtimes.push(showtime);
    });
    return [...groupedMovies.values()];
  }, [visibleShowtimes]);
  const selectedMovie = movies.find((movie) => String(movie.id) === selectedMovieId) || null;
  const activeCurrent = current && new Date(current.start_time).getTime() > clock ? current : null;
  const chosen = seats.filter((seat) => selected.includes(seat.id)); const total = chosen.reduce((sum, seat) => sum + seat.price, 0);
  useEffect(() => { const timer = window.setInterval(() => setClock(Date.now()), 30_000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { let live = true; api(`/staff/pos/showtimes?date=${encodeURIComponent(effectiveDate)}`).then((data) => { if (live) { setShowtimes(data); setError(""); } }).catch((err) => live && setError(err.message)).finally(() => live && setLoading(false)); return () => { live = false; }; }, [effectiveDate, clock]);
  const resetOrder = () => { setCurrent(null); setSeats([]); setSelected([]); setSale(null); };
  const changeDate = (date) => { setSelectedDate(date); setSelectedMovieId(""); resetOrder(); setError(""); setLoading(true); };
  const chooseMovie = (movie) => { setSelectedMovieId(String(movie.id)); resetOrder(); setError(""); };
  const choose = async (showtime) => { setCurrent(showtime); setSelected([]); setSeats([]); setSale(null); setError(""); setSeatLoading(true); try { const data = await api(`/showtime-seats?showtime_id=${showtime.id}`); setSeats(data.map(normalizeSeat)); } catch (err) { setError(err.message); } finally { setSeatLoading(false); } };
  const toggle = (seat) => seat.status === "available" && setSelected((list) => list.includes(seat.id) ? list.filter((id) => id !== seat.id) : [...list, seat.id]);
  const pay = async () => { if (!current || !selected.length) return; setBusy(true); setError(""); try { const data = await api("/staff/pos/sales", { method: "POST", body: JSON.stringify({ showtime_id: current.id, showtime_seat_ids: selected, payment_method: "cash" }) }); setSale(data); setSeats((list) => list.map((seat) => selected.includes(seat.id) ? { ...seat, status: "booked" } : seat)); setSelected([]); } catch (err) { setError(err.message); choose(current); } finally { setBusy(false); } };
  const print = async () => { try { await api(`/staff/pos/sales/${sale.booking_id}/print`, { method: "POST" }); window.print(); } catch (err) { setError(err.message); } };
  return <div className="pos-layout"><section className="pos-workspace"><Step number="1" title="Chọn ngày chiếu" text={loading ? "Đang tải lịch chiếu..." : `${movies.length} phim · ${visibleShowtimes.length} suất chiếu sắp tới`} /><div className="pos-date-tabs">{dateOptions.map((date) => <button key={date.value} className={effectiveDate === date.value ? "active" : ""} onClick={() => changeDate(date.value)} aria-pressed={effectiveDate === date.value}><span>{date.label}</span><strong>{date.day}</strong><small>Tháng {date.month}</small></button>)}</div>{!loading && <><Step number="2" title="Chọn phim" text={movies.length ? "Chỉ hiển thị các phim có suất chiếu trong ngày đã chọn." : "Ngày này không còn phim có suất chiếu sắp tới."} />{movies.length ? <div className="movie-picker">{movies.map((movie) => <button className={`movie-card ${selectedMovieId === String(movie.id) ? "selected" : ""}`} onClick={() => chooseMovie(movie)} key={movie.id} aria-pressed={selectedMovieId === String(movie.id)}><span className="movie-poster"><span>{movie.title.slice(0, 2).toUpperCase()}</span>{movie.poster && <img src={movie.poster} alt={`Poster ${movie.title}`} />}</span><span className="movie-card-info"><strong>{movie.title}</strong><small>{movie.showtimes.length} suất chiếu</small><em>{movie.showtimes.reduce((sum, showtime) => sum + showtime.available_seats, 0)} lượt ghế trống</em></span></button>)}</div> : <p className="empty-note picker-empty">Không còn suất chiếu sắp tới trong ngày này.</p>}</>}{selectedMovie && <><Step number="3" title="Chọn suất chiếu" text={`${selectedMovie.showtimes.length} suất chiếu của ${selectedMovie.title}`} /><div className="showtime-picker">{selectedMovie.showtimes.map((showtime) => <button className={`showtime-card ${activeCurrent?.id === showtime.id ? "selected" : ""}`} onClick={() => choose(showtime)} key={showtime.id} aria-pressed={activeCurrent?.id === showtime.id}><span className="showtime-clock">{showtimeTime(showtime.start_time)}</span><span><strong>{showtime.room.name}</strong><small>{showtime.room.cinema}</small></span><em>{showtime.available_seats} ghế trống</em></button>)}</div></>}{activeCurrent && <><Step number="4" title="Chọn ghế" text="Chỉ ghế màu tím còn trống mới có thể bán." />{seatLoading ? <p className="empty-note">Đang tải sơ đồ ghế...</p> : <SeatMap seats={seats} selected={selected} toggle={toggle} />}</>}</section><aside className="order-panel"><h2>Thông tin đơn hàng</h2>{activeCurrent ? <><div className="order-row"><span>Phim</span><strong>{activeCurrent.movie.title}</strong></div><div className="order-row"><span>Suất chiếu</span><strong>{dateTime(activeCurrent.start_time)}</strong></div><div className="order-row"><span>Phòng</span><strong>{activeCurrent.room.name}</strong></div><div className="order-seats"><span>Ghế đã chọn</span><div>{chosen.length ? chosen.map((seat) => <b key={seat.id}>{seat.label}</b>) : "Chưa chọn ghế"}</div></div><div className="order-total"><span>Tổng thanh toán</span><strong>{money.format(total)}</strong></div><div className="payment-method">✓ Thanh toán tiền mặt</div><button className="pay-button" disabled={!selected.length || busy} onClick={pay}>{busy ? "Đang xử lý..." : `Xác nhận thanh toán ${money.format(total)}`}</button></> : <p className="empty-note">Hãy chọn phim và suất chiếu để bắt đầu.</p>}{sale && <div className="sale-success"><strong>Thanh toán thành công</strong><span>Mã đơn: {sale.booking_code}</span><span>Vé: {sale.tickets.map((ticket) => ticket.seat).join(", ")}</span><button onClick={print}>In vé cứng</button></div>}</aside>{error && <div className="pos-alert">{error}</div>}</div>;
}

function Step({ number, title, text }) { return <div className="pos-step"><span>{number}</span><div><h2>{title}</h2><p>{text}</p></div></div>; }
function dateTime(value) { return new Date(value).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }); }
function showtimeTime(value) { return new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }); }
function getVietnamDateValue(value = new Date()) { return new Date(value).toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }); }
function getRollingDateOptions(clock) {
  const today = getVietnamDateValue(clock);
  const base = new Date(`${today}T00:00:00+07:00`);
  return Array.from({ length: 3 }, (_, offset) => {
    const date = new Date(base.getTime() + offset * 24 * 60 * 60 * 1000);
    const value = getVietnamDateValue(date);
    const [, month, day] = value.split("-");
    return {
      value,
      day: Number(day),
      month: Number(month),
      label: offset === 0 ? "Hôm nay" : date.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", weekday: "short" }),
    };
  });
}
function getSeatTypeTone(seatType) { const name = String(seatType?.name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase(); if (name.includes("vip")) return "vip"; if (name.includes("doi") || name.includes("couple")) return "couple"; return "normal"; }
function normalizeSeat(item) { const seat = item.seat_id || item.seat || {}; const seatType = seat.seat_type_id || seat.seat_type || {}; const label = String(seat.seat_code || `${seat.seat_row || ""}${seat.seat_number || ""}`).toUpperCase(); return { id: item._id || item.id, label, row: seat.seat_row || label.charAt(0) || "?", number: Number(seat.seat_number || label.slice(1) || 0), price: Number(item.price || 0), status: item.status, type: getSeatTypeTone(seatType), typeName: seatType.name || "Ghế thường" }; }
function SeatMap({ seats, selected, toggle }) { const rows = [...new Set(seats.map((seat) => seat.row))].sort(); return <div className="seat-map"><div className="screen">MÀN HÌNH</div><div className="seat-legend type-legend sale-seat-legend"><span><i className="normal" />Thường</span><span><i className="vip" />VIP</span><span><i className="couple" />Ghế đôi</span><span><i className="selected" />Đang chọn</span><span><i className="taken" />Đã bán / đang giữ</span><span><i className="maintenance" />Bảo trì</span></div>{rows.map((row) => <div className="seat-row" key={row}><b>{row}</b><div>{seats.filter((seat) => seat.row === row).sort((a, b) => a.number - b.number).map((seat, index, rowSeats) => { let previousCouples = 0; for (let cursor = index - 1; cursor >= 0 && rowSeats[cursor].type === "couple"; cursor -= 1) previousCouples += 1; const pairClass = seat.type === "couple" ? (previousCouples % 2 === 1 ? "couple-left" : rowSeats[index + 1]?.type === "couple" ? "couple-right" : "") : ""; return <button key={seat.id} disabled={seat.status !== "available"} onClick={() => toggle(seat)} className={`seat sale-seat ${seat.type} ${pairClass} ${seat.status} ${selected.includes(seat.id) ? "selected" : ""}`} title={`${seat.label} · ${seat.typeName} · ${seat.status === "maintenance" ? "Đang bảo trì" : money.format(seat.price)}`}>{seat.number || seat.label}</button>; })}</div><b>{row}</b></div>)}</div>; }
