import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import TransactionHistory from "./TransactionHistory.jsx";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001/api";
const menu = [
  ["scanner", "Quét vé", "⌗"],
  ["counter", "Bán vé tại quầy", "▣"],
  ["rooms", "Quản lý phòng và ghế", "▤"],
  ["shift", "Báo cáo ca làm việc", "▥"],
  ["history", "Lịch sử giao dịch", "◷"],
];
const titles = {
  scanner: ["Quét vé", "Quét và check-in vé", "Dùng camera, ảnh QR hoặc mã vé để kiểm tra và đón khách vào rạp."],
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
  const { returnBody = false, ...requestOptions } = options;
  const response = await fetch(`${API}${path}`, {
    ...requestOptions,
    headers: { "Content-Type": "application/json", ...headers(), ...requestOptions.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.success) {
    const error = new Error(body.message || "Không thể kết nối máy chủ.");
    error.data = body.data || null;
    throw error;
  }
  return returnBody ? body : body.data;
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
          {active === "scanner" ? <TicketScanner /> : active === "counter" ? <CounterSale /> : active === "rooms" ? <RoomSeatManagement /> : active === "shift" ? <ShiftReport /> : active === "history" ? <TransactionHistory api={api} /> : <section className="content-card empty-page"><h2>{crumb}</h2><p>Chức năng này đang được chuẩn bị cho nhân viên rạp.</p></section>}
        </main>
      </div>
    </div>
  );
}

const STAFF_SCANNER_ID = "staff-ticket-qr-reader";
const BOOKING_QR_PREFIX = "AURA_BOOKING_V2:";

function TicketScanner() {
  const scannerRef = useRef(null);
  const processingRef = useRef(false);
  const fileInputRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [message, setMessage] = useState("Camera chưa bật. Bạn cũng có thể tải ảnh QR hoặc nhập mã vé.");
  const [result, setResult] = useState(null);
  const [currentQrToken, setCurrentQrToken] = useState("");
  const [qrText, setQrText] = useState("");
  const [ticketCode, setTicketCode] = useState("");
  const ticket = result?.data || null;
  const services = ticket?.booking?.combos?.length
    ? ticket.booking.combos.map((item) => `${item.name} × ${item.quantity}`).join(", ")
    : "Không có";

  const stopCamera = async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try { if (scanner.isScanning) await scanner.stop(); await scanner.clear(); } catch { /* Camera may already be closed. */ }
    scannerRef.current = null;
    setCameraActive(false);
  };

  useEffect(() => () => {
    const scanner = scannerRef.current;
    if (scanner?.isScanning) scanner.stop().then(() => scanner.clear()).catch(() => {});
    else scanner?.clear().catch(() => {});
    scannerRef.current = null;
  }, []);

  const verifyQr = async (value) => {
    const token = String(value || "").trim();
    if (!token || processingRef.current) return;
    processingRef.current = true; setProcessing(true); setResult(null); setCurrentQrToken(token); setMessage("Đang xác minh vé...");
    await stopCamera();
    try {
      const verifyPath = token.startsWith(BOOKING_QR_PREFIX) ? "/staff/pos/bookings/verify" : "/staff/pos/tickets/verify";
      const response = await api(verifyPath, { method: "POST", body: JSON.stringify({ qrToken: token }), returnBody: true });
      setResult(response); setMessage(response.message);
    } catch (err) {
      setResult({ success: false, message: err.message, data: err.data }); setMessage(err.message);
    } finally { processingRef.current = false; setProcessing(false); }
  };

  const startCamera = async () => {
    if (processing || cameraActive) return;
    setResult(null); setMessage("Đang yêu cầu quyền truy cập camera...");
    try {
      await stopCamera();
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
      const cameras = await Html5Qrcode.getCameras();
      if (!cameras.length) throw new Error("Không tìm thấy camera trên thiết bị.");
      const preferred = cameras.find((camera) => /back|rear|environment|sau/i.test(camera.label || "")) || cameras[0];
      const scanner = new Html5Qrcode(STAFF_SCANNER_ID, { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false });
      scannerRef.current = scanner;
      await scanner.start(preferred.id, { fps: 12, qrbox: (width, height) => { const size = Math.max(120, Math.min(Math.floor(Math.min(width, height) * .75), 320)); return { width: size, height: size }; } }, (decodedText) => verifyQr(decodedText), () => {});
      setCameraActive(true); setMessage("Đưa mã QR vé vào giữa khung hình.");
    } catch (err) { await stopCamera(); setMessage(err.message || "Không thể mở camera. Hãy kiểm tra quyền camera của trình duyệt."); }
  };

  const scanFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || processingRef.current) return;
    await stopCamera(); setMessage("Đang đọc ảnh QR...");
    const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
    const scanner = new Html5Qrcode("staff-ticket-file-reader", { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false });
    try { const decodedText = await scanner.scanFile(file, true); await scanner.clear(); await verifyQr(decodedText); }
    catch (err) { await scanner.clear().catch(() => {}); setResult(null); setMessage(err.message ? "Không đọc được mã QR trong ảnh đã chọn." : "Không thể đọc ảnh QR."); }
  };

  const lookupTicket = async (event) => {
    event.preventDefault();
    const code = ticketCode.trim().toUpperCase();
    if (!code || processingRef.current) return;
    processingRef.current = true; setProcessing(true); setResult(null); setMessage("Đang tra cứu mã vé...");
    try {
      const response = await api("/staff/pos/tickets/lookup", { method: "POST", body: JSON.stringify({ ticketCode: code }), returnBody: true });
      setResult(response); setCurrentQrToken(response.qrPayload || ""); setTicketCode(code); setMessage(response.message);
    } catch (err) { setResult({ success: false, message: err.message, data: err.data }); setCurrentQrToken(""); setMessage(err.message); }
    finally { processingRef.current = false; setProcessing(false); }
  };

  const checkIn = async () => {
    if (!currentQrToken || checkingIn) return;
    setCheckingIn(true);
    try {
      const response = await api("/staff/pos/tickets/check-in", { method: "POST", body: JSON.stringify({ qrToken: currentQrToken }), returnBody: true });
      setResult(response); setMessage(response.message);
    } catch (err) { setResult({ success: false, message: err.message, data: err.data }); setMessage(err.message); }
    finally { setCheckingIn(false); }
  };

  const reset = async () => { await stopCamera(); setResult(null); setCurrentQrToken(""); setQrText(""); setTicketCode(""); setMessage("Sẵn sàng quét vé tiếp theo."); };

  return <div className="staff-scanner"><section className="scanner-panel"><div className="scanner-heading"><div><h2>Quét mã QR</h2><p>Dùng camera hoặc tải ảnh QR từ thiết bị.</p></div><span>⌗</span></div><div id={STAFF_SCANNER_ID} className={`scanner-viewfinder ${cameraActive ? "active" : ""}`} /><div id="staff-ticket-file-reader" className="scanner-file-reader" /><div className="scanner-controls"><button type="button" className="scanner-primary" onClick={cameraActive ? stopCamera : startCamera} disabled={processing}>{cameraActive ? "Dừng camera" : "Bật camera"}</button><button type="button" onClick={() => fileInputRef.current?.click()} disabled={processing}>Tải ảnh QR</button><input ref={fileInputRef} type="file" accept="image/*" onChange={scanFile} hidden /></div><form className="scanner-token-form" onSubmit={(event) => { event.preventDefault(); verifyQr(qrText); }}><label htmlFor="staff-qr-token">Hoặc nhập nội dung mã QR</label><div><input id="staff-qr-token" value={qrText} onChange={(event) => setQrText(event.target.value)} placeholder="AURA_TICKET:... hoặc AURA_BOOKING_V2:..." /><button disabled={!qrText.trim() || processing}>Kiểm tra</button></div></form><form className="scanner-token-form" onSubmit={lookupTicket}><label htmlFor="staff-ticket-code">Tra cứu bằng mã vé</label><div><input id="staff-ticket-code" value={ticketCode} onChange={(event) => setTicketCode(event.target.value.toUpperCase())} placeholder="Nhập mã vé" /><button disabled={!ticketCode.trim() || processing}>Tra cứu</button></div></form><p className={`scanner-message ${result ? (result.success ? "success" : "error") : ""}`}>{processing ? "Đang xử lý..." : message}</p></section><section className={`scanner-panel scanner-result ${result ? (result.success ? "success" : "error") : ""}`}><div className="scanner-heading"><div><h2>Kết quả quét</h2><p>Kiểm tra thông tin trước khi cho khách vào rạp.</p></div><span>🎟</span></div>{ticket ? <><div className="scan-status"><strong>{result.message}</strong><span>{ticket.ticketCode || "Không có mã vé"}</span></div><div className="scan-ticket-grid"><Info label="Phim" value={ticket.movie?.title} /><Info label="Suất chiếu" value={dateTime(ticket.showtime?.startTime)} /><Info label="Phòng" value={ticket.room?.name} /><Info label={ticket.qrType === "BOOKING" ? "Toàn bộ ghế" : "Ghế"} value={ticket.seat?.label || ticket.seatLabel} /><Info label="Loại ghế" value={ticket.seat?.type} /><Info label="Dịch vụ" value={services} /></div>{ticket.qrType !== "BOOKING" && <button type="button" className="checkin-button" onClick={checkIn} disabled={!currentQrToken || checkingIn || ticket.status !== "VALID"}>{checkingIn ? "Đang check-in..." : ticket.status === "CHECKED_IN" ? "Vé đã check-in" : "Xác nhận check-in"}</button>}<button type="button" className="scan-next-button" onClick={reset}>Quét vé tiếp theo</button></> : <div className="scanner-empty"><span>⌗</span><p>Chưa có vé được quét.</p></div>}</section></div>;
}

function Info({ label, value }) { return <div><span>{label}</span><strong>{value || "—"}</strong></div>; }

function ShiftReport() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const today = getVietnamDateValue();

  useEffect(() => {
    let live = true;
    let refreshing = false;
    const loadReport = async () => {
      if (!live || refreshing) return;
      refreshing = true;
      try {
        const data = await api(`/staff/pos/shift-report?date=${encodeURIComponent(today)}`);
        if (live) { setReport(data); setError(""); }
      } catch (err) {
        if (live) setError(err.message);
      } finally {
        refreshing = false;
        if (live) setLoading(false);
      }
    };
    loadReport();
    const timer = window.setInterval(loadReport, 10_000);
    window.addEventListener("focus", loadReport);
    return () => { live = false; window.clearInterval(timer); window.removeEventListener("focus", loadReport); };
  }, [today]);

  const cashTotal = Number(report?.cash_total || 0);
  const ticketCount = Number(report?.pos_ticket_count || 0);
  const onlineScannedCount = Number(report?.online_scanned_count || 0);
  return <section className="shift-report"><div className="shift-meta"><span>Nhân viên: <strong>{report?.staff_name || "Nhân viên"}</strong></span><i /><span>Ngày: <strong>{formatReportDate(report?.date || today)}</strong></span></div>{error && <div className="shift-error">{error}</div>}<div className="shift-summary"><article className="cash"><div className="shift-card-title"><span>＄</span>Tiền mặt thu tại quầy</div><strong>{loading ? "..." : money.format(cashTotal)}</strong><small>Tổng số tiền cần nộp lại cho quản lý cuối ca.</small></article><article className="tickets"><div className="shift-card-title"><span>🎟</span>Vé bán tại quầy (POS)</div><strong>{loading ? "..." : `${ticketCount} vé`}</strong><small>Số lượng vé in ra trực tiếp bằng tiền mặt.</small></article><article className="online"><div className="shift-card-title"><span>⌗</span>Vé online đã quét</div><strong>{loading ? "..." : `${onlineScannedCount} vé`}</strong><small>Vé online do bạn xác nhận check-in trong ngày.</small></article></div></section>;
}

function RoomSeatManagement() {
  const [rooms, setRooms] = useState([]);
  const [room, setRoom] = useState(null);
  const [showtime, setShowtime] = useState(null);
  const [showtimeSeats, setShowtimeSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seatLoading, setSeatLoading] = useState(false);
  const [updatingIds, setUpdatingIds] = useState([]);
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
    const couplePair = getCoupleSeatPair(showtimeSeat, showtimeSeats, describeShowtimeSeat);
    if (getSeatTypeTone(physicalSeat.seat_type_id) === "couple" && !couplePair) {
      setError("Ghế đôi này chưa có đủ cặp liền kề để cập nhật.");
      return;
    }
    const seatsToUpdate = couplePair || [showtimeSeat];
    const nextStatus = physicalSeat.operational_status === "maintenance" || showtimeSeat.status === "maintenance" ? "active" : "maintenance";
    setUpdatingIds(seatsToUpdate.map((item) => String(item.seat_id._id))); setError(""); setNotice("");
    try {
      const results = await Promise.all(seatsToUpdate.map((item) => api(`/staff/pos/rooms/${room._id}/seats/${item.seat_id._id}/status`, { method: "PATCH", body: JSON.stringify({ status: nextStatus }) })));
      const [roomDetail, refreshedSeats] = await Promise.all([
        api(`/staff/pos/rooms/${room._id}/seats`),
        api(`/showtime-seats?showtime_id=${showtime.id}`),
      ]);
      setShowtimeSeats(refreshedSeats);
      setRoom(roomDetail);
      setRooms((current) => current.map((item) => {
        if (item._id !== room._id) return item;
        const maintenance = roomDetail.seats.filter((seat) => seat.operational_status === "maintenance").length;
        return { ...item, seat_summary: { total: roomDetail.seats.length, maintenance, active: roomDetail.seats.length - maintenance } };
      }));
      const seatCodes = results.map((result) => result.seat.seat_code).join(" & ");
      const syncedCount = results.reduce((sum, result) => sum + result.synced_showtime_seats, 0);
      setNotice(`${seatCodes}: ${nextStatus === "maintenance" ? "đang bảo trì" : "đã sẵn sàng"}. Đã đồng bộ ${syncedCount} ghế theo suất chiếu.`);
    } catch (err) { setError(err.message); }
    finally { setUpdatingIds([]); }
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
        {seatLoading ? <p className="empty-note">Đang tải sơ đồ ghế...</p> : !room || !selectedShowtimeIsUpcoming ? <div className="room-empty"><span>▤</span><h2>Chọn một suất chiếu sắp tới</h2><p>Các suất đã bắt đầu chiếu sẽ tự động được ẩn.</p></div> : <><div className="room-detail-heading"><div><span>{showtime.movie.title} · {showtimeTime(showtime.start_time)}</span><h2>{room.name}</h2></div><div className="room-stats"><b>{summary.total}<small>Tổng ghế</small></b><b className="maintenance-count">{summary.maintenance}<small>Bảo trì</small></b></div></div><div className="maintenance-help">Màu ghế thể hiện loại <strong>Thường / VIP / Đôi</strong>. Bấm một ghế đôi sẽ cập nhật cả cặp. Viền vàng là ghế bảo trì; ghế xám là ghế đã bán hoặc đang giữ.</div><MaintenanceSeatMap seats={showtimeSeats} updatingIds={updatingIds} updateStatus={updateStatus} /></>}
        {notice && <div className="room-feedback success">{notice}</div>}
        {error && <div className="room-feedback error">{error}</div>}
      </section>
    </div>
  );
}

function MaintenanceSeatMap({ seats, updatingIds, updateStatus }) {
  const rows = [...new Set(seats.map((item) => item.seat_id?.seat_row))].sort();
  return <div className="maintenance-map"><div className="screen">MÀN HÌNH</div><div className="seat-legend type-legend"><span><i className="normal" />Thường</span><span><i className="vip" />VIP</span><span><i className="couple" />Ghế đôi</span><span><i className="maintenance" />Bảo trì</span><span><i className="taken" />Đã bán / đang giữ</span></div>{rows.map((row) => <div className="seat-row" key={row}><b>{row}</b><div>{seats.filter((item) => item.seat_id?.seat_row === row).sort((a, b) => a.seat_id.seat_number - b.seat_id.seat_number).map((item, index, rowSeats) => { const seat = item.seat_id; const tone = getSeatTypeTone(seat.seat_type_id); const nextTone = getSeatTypeTone(rowSeats[index + 1]?.seat_id?.seat_type_id); let previousCouples = 0; for (let cursor = index - 1; cursor >= 0 && getSeatTypeTone(rowSeats[cursor]?.seat_id?.seat_type_id) === "couple"; cursor -= 1) previousCouples += 1; const pairClass = tone === "couple" ? (previousCouples % 2 === 1 ? "couple-left" : nextTone === "couple" ? "couple-right" : "") : ""; const maintenance = item.status === "maintenance" || seat.operational_status === "maintenance"; const unavailable = !["available", "maintenance"].includes(item.status); const updating = updatingIds.includes(String(seat._id)); return <button key={item._id} disabled={updating} onClick={() => updateStatus(item)} className={`seat maintenance-seat ${tone} ${pairClass} ${maintenance ? "is-maintenance" : ""} ${unavailable ? "is-taken" : ""}`} title={`${seat.seat_code} · ${seat.seat_type_id?.name || "Ghế thường"} · ${maintenance ? "Bảo trì" : item.status}`}><span>{seat.seat_number}</span>{updating && <i />}</button>; })}</div><b>{row}</b></div>)}</div>;
}

function CounterSale() {
  const [showtimes, setShowtimes] = useState([]), [current, setCurrent] = useState(null), [seats, setSeats] = useState([]), [selected, setSelected] = useState([]), [loading, setLoading] = useState(true), [seatLoading, setSeatLoading] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(""), [sale, setSale] = useState(null);
  const [combos, setCombos] = useState([]), [comboQuantities, setComboQuantities] = useState({}), [comboLoading, setComboLoading] = useState(true), [comboError, setComboError] = useState("");
  const [holdToken, setHoldToken] = useState(""), [holdExpiresAt, setHoldExpiresAt] = useState(null), [remainingHoldSeconds, setRemainingHoldSeconds] = useState(0);
  const [printing, setPrinting] = useState(false);
  const holdIdRef = useRef("");
  const seatBusyRef = useRef(false);
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
  const chosen = seats.filter((seat) => selected.includes(seat.id));
  const selectedCombos = combos.filter((item) => Number(comboQuantities[item._id] || 0) > 0).map((item) => ({ ...item, quantity: Number(comboQuantities[item._id]) }));
  const seatTotal = calculateSelectedSeatTotal(chosen, seats);
  const comboTotal = selectedCombos.reduce((sum, item) => sum + Number(item.price || 0) * item.quantity, 0);
  const total = seatTotal + comboTotal;
  useEffect(() => { const timer = window.setInterval(() => setClock(Date.now()), 30_000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { let live = true; api(`/staff/pos/showtimes?date=${encodeURIComponent(effectiveDate)}`).then((data) => { if (live) { setShowtimes(data); setError(""); } }).catch((err) => live && setError(err.message)).finally(() => live && setLoading(false)); return () => { live = false; }; }, [effectiveDate, clock]);
  useEffect(() => { let live = true; api("/combos/public?limit=100").then((data) => { const list = Array.isArray(data) ? data : data?.data || []; if (live) { setCombos(list.filter((item) => item.status)); setComboError(""); } }).catch((err) => { if (live) { setCombos([]); setComboError(err.message); } }).finally(() => live && setComboLoading(false)); return () => { live = false; }; }, []);
  useEffect(() => {
    const showtimeId = current?.id;
    if (!showtimeId) return undefined;

    let live = true;
    let refreshing = false;
    const refreshSeats = async () => {
      if (!live || refreshing || seatBusyRef.current) return;
      refreshing = true;
      try {
        const data = await api(`/showtime-seats?showtime_id=${showtimeId}`);
        if (!live) return;
        const refreshedSeats = data.map(normalizeSeat);
        const availableSeatCount = refreshedSeats.filter((seat) => seat.status === "available").length;
        const ownedHoldId = holdIdRef.current;
        const heldByThisCounter = new Set(refreshedSeats.filter((seat) => seat.status === "held" && seat.holdId === ownedHoldId).map((seat) => seat.id));
        setSeats(refreshedSeats.map((seat) => heldByThisCounter.has(seat.id) ? { ...seat, status: "available" } : seat));
        setSelected((currentSelection) => currentSelection.filter((seatId) => heldByThisCounter.has(seatId)));
        setCurrent((currentShowtime) => currentShowtime?.id === showtimeId ? { ...currentShowtime, available_seats: availableSeatCount } : currentShowtime);
        setShowtimes((currentShowtimes) => currentShowtimes.map((showtime) => showtime.id === showtimeId ? { ...showtime, available_seats: availableSeatCount } : showtime));
      } catch {
        // Keep the current seat map when a background refresh temporarily fails.
      } finally {
        refreshing = false;
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refreshSeats();
    };
    const timer = window.setInterval(refreshSeats, 1_500);
    window.addEventListener("focus", refreshSeats);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      live = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshSeats);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [current?.id]);
  useEffect(() => {
    if (!holdExpiresAt) return undefined;
    const updateCountdown = () => {
      const seconds = Math.max(0, Math.ceil((new Date(holdExpiresAt).getTime() - Date.now()) / 1000));
      setRemainingHoldSeconds(seconds);
      if (seconds === 0) {
        holdIdRef.current = "";
        setHoldToken("");
        setHoldExpiresAt(null);
        setSelected([]);
      }
    };
    const timer = window.setInterval(updateCountdown, 1_000);
    return () => window.clearInterval(timer);
  }, [holdExpiresAt]);
  const resetOrder = () => { holdIdRef.current = ""; setHoldToken(""); setHoldExpiresAt(null); setRemainingHoldSeconds(0); setCurrent(null); setSeats([]); setSelected([]); setComboQuantities({}); setSale(null); };
  const changeDate = (date) => { setSelectedDate(date); setSelectedMovieId(""); resetOrder(); setError(""); setLoading(true); };
  const chooseMovie = (movie) => { setSelectedMovieId(String(movie.id)); resetOrder(); setError(""); };
  const choose = async (showtime) => { holdIdRef.current = ""; setHoldToken(""); setHoldExpiresAt(null); setRemainingHoldSeconds(0); setCurrent(showtime); setSelected([]); setSeats([]); setComboQuantities({}); setSale(null); setError(""); setSeatLoading(true); try { const [data, activeHold] = await Promise.all([api(`/showtime-seats?showtime_id=${showtime.id}`), api(`/showtime-seats/hold/active?showtime_id=${showtime.id}`)]); const normalizedSeats = data.map(normalizeSeat); const heldIds = new Set((activeHold?.showtime_seat_ids || []).map(String)); holdIdRef.current = String(activeHold?.hold_id || ""); setHoldToken(activeHold?.hold_token || ""); setHoldExpiresAt(activeHold?.expires_at || null); setRemainingHoldSeconds(getRemainingHoldSeconds(activeHold?.expires_at)); setSelected(normalizedSeats.filter((seat) => heldIds.has(String(seat.id))).map((seat) => seat.id)); setSeats(normalizedSeats); } catch (err) { setError(err.message); } finally { setSeatLoading(false); } };
  const toggle = async (seat) => {
    if (seatBusyRef.current) return;
    const couplePair = getCoupleSeatPair(seat, seats, (item) => item);
    if (seat.type === "couple" && !couplePair) { setError("Ghế đôi này chưa có đủ cặp liền kề để bán."); return; }
    const seatsToToggle = couplePair || [seat];
    const selectedIds = new Set(selected);
    seatBusyRef.current = true;
    if (seatsToToggle.some((item) => selectedIds.has(item.id))) {
      const releaseIds = seatsToToggle.filter((item) => selectedIds.has(item.id)).map((item) => item.id);
      try {
        const result = await api("/showtime-seats/release", { method: "POST", body: JSON.stringify({ showtime_id: current.id, showtime_seat_ids: releaseIds, hold_token: holdToken }) });
        const remainingIds = (result.showtime_seat_ids || []).map(String);
        setSelected(remainingIds);
        setSeats((list) => list.map((item) => releaseIds.includes(item.id) ? { ...item, status: "available", holdId: "" } : item));
        if (!remainingIds.length) { holdIdRef.current = ""; setHoldToken(""); setHoldExpiresAt(null); }
        setError("");
      } catch (err) { setError(err.message); }
      finally { seatBusyRef.current = false; }
      return;
    }
    if (seatsToToggle.some((item) => item.status !== "available")) { seatBusyRef.current = false; setError("Cặp ghế đôi này đã có ghế không còn trống."); return; }
    const nextSelected = [...selected, ...seatsToToggle.map((item) => item.id)];
    try {
      const result = await api("/showtime-seats/hold", { method: "POST", body: JSON.stringify({ showtime_id: current.id, showtime_seat_ids: nextSelected, hold_token: holdToken || undefined }) });
      holdIdRef.current = String(result.hold_id || "");
      setHoldToken(result.hold_token || holdToken);
      setHoldExpiresAt(result.expires_at || null);
      setRemainingHoldSeconds(getRemainingHoldSeconds(result.expires_at));
      setSelected(nextSelected);
      setSeats((list) => list.map((item) => nextSelected.includes(item.id) ? { ...item, status: "available", holdId: String(result.hold_id || "") } : item));
      setError("");
    } catch (err) {
      setError(err.message);
      try { setSeats((await api(`/showtime-seats?showtime_id=${current.id}`)).map(normalizeSeat)); } catch { /* Keep the current map if reloading also fails. */ }
    } finally { seatBusyRef.current = false; }
  };
  const updateComboQuantity = (combo, nextQuantity) => { const quantity = Math.min(Math.max(Number(nextQuantity) || 0, 0), Number(combo.stock || 0)); setComboQuantities((current) => { const next = { ...current }; if (quantity) next[combo._id] = quantity; else delete next[combo._id]; return next; }); };
  const pay = async () => { if (!current || !selected.length || !holdToken) return; setBusy(true); setError(""); try { const data = await api("/staff/pos/sales", { method: "POST", body: JSON.stringify({ showtime_id: current.id, showtime_seat_ids: selected, hold_token: holdToken, combos: selectedCombos.map((item) => ({ combo_id: item._id, quantity: item.quantity })), payment_method: "cash" }) }); const soldSeatIds = [...selected]; holdIdRef.current = ""; setHoldToken(""); setHoldExpiresAt(null); setSale(data); setSeats((list) => list.map((seat) => soldSeatIds.includes(seat.id) ? { ...seat, status: "booked", holdId: "" } : seat)); setCombos((list) => list.map((combo) => ({ ...combo, stock: Math.max(Number(combo.stock || 0) - Number(comboQuantities[combo._id] || 0), 0) }))); setSelected([]); setComboQuantities({}); } catch (err) { setError(err.message); choose(current); } finally { setBusy(false); } };
  const print = async () => { if (!sale || sale.printed || printing) return; setPrinting(true); setError(""); try { await api(`/staff/pos/sales/${sale.booking_id}/print`, { method: "POST" }); setSale((currentSale) => currentSale ? { ...currentSale, printed: true } : currentSale); window.print(); } catch (err) { setError(err.message); } finally { setPrinting(false); } };
  return <div className="pos-layout"><section className="pos-workspace"><Step number="1" title="Chọn ngày chiếu" text={loading ? "Đang tải lịch chiếu..." : `${movies.length} phim · ${visibleShowtimes.length} suất chiếu sắp tới`} /><div className="pos-date-tabs">{dateOptions.map((date) => <button key={date.value} className={effectiveDate === date.value ? "active" : ""} onClick={() => changeDate(date.value)} aria-pressed={effectiveDate === date.value}><span>{date.label}</span><strong>{date.day}</strong><small>Tháng {date.month}</small></button>)}</div>{!loading && <><Step number="2" title="Chọn phim" text={movies.length ? "Chỉ hiển thị các phim có suất chiếu trong ngày đã chọn." : "Ngày này không còn phim có suất chiếu sắp tới."} />{movies.length ? <div className="movie-picker">{movies.map((movie) => <button className={`movie-card ${selectedMovieId === String(movie.id) ? "selected" : ""}`} onClick={() => chooseMovie(movie)} key={movie.id} aria-pressed={selectedMovieId === String(movie.id)}><span className="movie-poster"><span>{movie.title.slice(0, 2).toUpperCase()}</span>{movie.poster && <img src={movie.poster} alt={`Poster ${movie.title}`} />}</span><span className="movie-card-info"><strong>{movie.title}</strong><small>{movie.showtimes.length} suất chiếu</small><em>{movie.showtimes.reduce((sum, showtime) => sum + showtime.available_seats, 0)} lượt ghế trống</em></span></button>)}</div> : <p className="empty-note picker-empty">Không còn suất chiếu sắp tới trong ngày này.</p>}</>}{selectedMovie && <><Step number="3" title="Chọn suất chiếu" text={`${selectedMovie.showtimes.length} suất chiếu của ${selectedMovie.title}`} /><div className="showtime-picker">{selectedMovie.showtimes.map((showtime) => <button className={`showtime-card ${activeCurrent?.id === showtime.id ? "selected" : ""}`} onClick={() => choose(showtime)} key={showtime.id} aria-pressed={activeCurrent?.id === showtime.id}><span className="showtime-clock">{showtimeTime(showtime.start_time)}</span><span><strong>{showtime.room.name}</strong><small>{showtime.room.cinema}</small></span><em>{showtime.available_seats} ghế trống</em></button>)}</div></>}{activeCurrent && <><Step number="4" title="Chọn ghế" text={holdExpiresAt && selected.length ? `Ghế đang được giữ trong ${formatHoldCountdown(remainingHoldSeconds)}.` : "Chọn ghế còn trống để bán vé. Thời gian giữ ghế là 5 phút."} />{seatLoading ? <p className="empty-note">Đang tải sơ đồ ghế...</p> : <><SeatMap seats={seats} selected={selected} toggle={toggle} /><Step number="5" title="Chọn combo bắp nước" text="Có thể bỏ qua nếu khách hàng chỉ mua vé." /><ComboPicker combos={combos} quantities={comboQuantities} loading={comboLoading} error={comboError} updateQuantity={updateComboQuantity} /></>}</>}</section><aside className="order-panel"><h2>Thông tin đơn hàng</h2>{activeCurrent ? <><div className="order-row"><span>Phim</span><strong>{activeCurrent.movie.title}</strong></div><div className="order-row"><span>Suất chiếu</span><strong>{dateTime(activeCurrent.start_time)}</strong></div><div className="order-row"><span>Phòng</span><strong>{activeCurrent.room.name}</strong></div><div className="order-seats"><span>Ghế đã chọn</span><div>{chosen.length ? chosen.map((seat) => <b key={seat.id}>{seat.label}</b>) : "Chưa chọn ghế"}</div></div>{selectedCombos.length > 0 && <div className="order-combos"><span>Combo bắp nước</span>{selectedCombos.map((item) => <div key={item._id}><span>{item.name} × {item.quantity}</span><strong>{money.format(Number(item.price || 0) * item.quantity)}</strong></div>)}</div>}<div className="order-breakdown"><span>Tiền vé <strong>{money.format(sale?.pricing?.ticket_subtotal ?? seatTotal)}</strong></span><span>Bắp nước <strong>{money.format(sale?.pricing?.service_subtotal ?? comboTotal)}</strong></span></div><div className="order-total"><span>Tổng thanh toán</span><strong>{money.format(sale?.total_price ?? total)}</strong></div><div className="payment-method">✓ Thanh toán tiền mặt</div><button className="pay-button" disabled={!selected.length || busy} onClick={pay}>{busy ? "Đang xử lý..." : `Xác nhận thanh toán ${money.format(total)}`}</button></> : <p className="empty-note">Hãy chọn phim và suất chiếu để bắt đầu.</p>}{sale && <div className="sale-success"><strong>Thanh toán thành công</strong><span>Mã đơn: {sale.booking_code}</span><span>Vé: {sale.tickets.map((ticket) => ticket.seat).join(", ")}</span>{sale.combos?.length > 0 && <span>Combo: {sale.combos.map((item) => `${item.name} × ${item.quantity}`).join(", ")}</span>}<button onClick={print} disabled={printing || sale.printed}>{printing ? "Đang chuẩn bị in..." : sale.printed ? "Vé cứng đã được in" : "In vé cứng"}</button></div>}</aside>{error && <div className="pos-alert">{error}</div>}</div>;
}

function Step({ number, title, text }) { return <div className="pos-step"><span>{number}</span><div><h2>{title}</h2><p>{text}</p></div></div>; }
function getRemainingHoldSeconds(expiresAt) { return expiresAt ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000)) : 0; }
function formatHoldCountdown(totalSeconds) { const seconds = Math.max(0, Number(totalSeconds) || 0); return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`; }
function dateTime(value) { return new Date(value).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }); }
function showtimeTime(value) { return new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }); }
function getVietnamDateValue(value = new Date()) { return new Date(value).toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }); }
function formatReportDate(value) { const [year, month, day] = String(value || "").split("-"); return year && month && day ? `${day}/${month}/${year}` : "—"; }
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
function describeShowtimeSeat(item) { const seat = item.seat_id || {}; return { id: String(item._id || item.id), row: seat.seat_row, number: Number(seat.seat_number), type: getSeatTypeTone(seat.seat_type_id) }; }
function getCoupleSeatPair(targetSeat, allSeats, describeSeat) {
  const target = describeSeat(targetSeat);
  if (target.type !== "couple") return [targetSeat];
  const rowSeats = allSeats.filter((item) => describeSeat(item).row === target.row).sort((first, second) => describeSeat(first).number - describeSeat(second).number);
  const seatIndex = rowSeats.findIndex((item) => describeSeat(item).id === target.id);
  if (seatIndex < 0) return null;
  let previousCouples = 0;
  for (let index = seatIndex - 1; index >= 0 && describeSeat(rowSeats[index]).type === "couple"; index -= 1) previousCouples += 1;
  const pairIndex = previousCouples % 2 === 1 ? seatIndex - 1 : seatIndex + 1;
  const pairSeat = rowSeats[pairIndex];
  if (!pairSeat || describeSeat(pairSeat).type !== "couple" || Math.abs(describeSeat(pairSeat).number - target.number) !== 1) return null;
  return [targetSeat, pairSeat].sort((first, second) => describeSeat(first).number - describeSeat(second).number);
}
function calculateSelectedSeatTotal(selectedSeats, allSeats) {
  const selectedIds = new Set(selectedSeats.map((seat) => seat.id));
  const countedIds = new Set();
  return selectedSeats.reduce((total, seat) => {
    if (countedIds.has(seat.id)) return total;
    const pair = getCoupleSeatPair(seat, allSeats, (item) => item);
    if (seat.type === "couple" && pair?.every((item) => selectedIds.has(item.id))) {
      pair.forEach((item) => countedIds.add(item.id));
      return total + pair[0].price;
    }
    countedIds.add(seat.id);
    return total + seat.price;
  }, 0);
}
function normalizeSeat(item) { const seat = item.seat_id || item.seat || {}; const seatType = seat.seat_type_id || seat.seat_type || {}; const label = String(seat.seat_code || `${seat.seat_row || ""}${seat.seat_number || ""}`).toUpperCase(); return { id: item._id || item.id, label, row: seat.seat_row || label.charAt(0) || "?", number: Number(seat.seat_number || label.slice(1) || 0), price: Number(item.price || 0), status: item.status, holdId: String(item.hold_id || ""), type: getSeatTypeTone(seatType), typeName: seatType.name || "Ghế thường" }; }
function SeatMap({ seats, selected, toggle }) { const rows = [...new Set(seats.map((seat) => seat.row))].sort(); return <div className="seat-map"><div className="screen">MÀN HÌNH</div><div className="seat-legend type-legend sale-seat-legend"><span><i className="normal" />Thường</span><span><i className="vip" />VIP</span><span><i className="couple" />Ghế đôi</span><span><i className="selected" />Đang chọn</span><span><i className="taken" />Đã bán / đang giữ</span><span><i className="maintenance" />Bảo trì</span></div>{rows.map((row) => <div className="seat-row" key={row}><b>{row}</b><div>{seats.filter((seat) => seat.row === row).sort((a, b) => a.number - b.number).map((seat, index, rowSeats) => { let previousCouples = 0; for (let cursor = index - 1; cursor >= 0 && rowSeats[cursor].type === "couple"; cursor -= 1) previousCouples += 1; const pairClass = seat.type === "couple" ? (previousCouples % 2 === 1 ? "couple-left" : rowSeats[index + 1]?.type === "couple" ? "couple-right" : "") : ""; return <button key={seat.id} disabled={seat.status !== "available"} onClick={() => toggle(seat)} className={`seat sale-seat ${seat.type} ${pairClass} ${seat.status} ${selected.includes(seat.id) ? "selected" : ""}`} title={`${seat.label} · ${seat.typeName} · ${seat.status === "maintenance" ? "Đang bảo trì" : money.format(seat.price)}`}>{seat.number || seat.label}</button>; })}</div><b>{row}</b></div>)}</div>; }
function ComboPicker({ combos, quantities, loading, error, updateQuantity }) {
  if (loading) return <p className="empty-note combo-message">Đang tải combo bắp nước...</p>;
  if (error) return <p className="combo-message combo-error">{error}</p>;
  if (!combos.length) return <p className="empty-note combo-message">Hiện chưa có combo bắp nước đang bán.</p>;
  return <div className="combo-picker">{combos.map((combo) => { const quantity = Number(quantities[combo._id] || 0); const stock = Number(combo.stock || 0); return <article className={`combo-card ${stock <= 0 ? "sold-out" : ""}`} key={combo._id}><div className="combo-image">{combo.image ? <img src={resolveImageUrl(combo.image)} alt={combo.name} loading="lazy" /> : <span>BN</span>}</div><div className="combo-info"><div><strong>{combo.name}</strong><small>{money.format(Number(combo.price || 0))}</small></div>{combo.description && <p>{combo.description}</p>}<div className="combo-actions"><em>{stock > 0 ? `Còn ${stock}` : "Hết hàng"}</em><span><button type="button" disabled={quantity <= 0} onClick={() => updateQuantity(combo, quantity - 1)} aria-label={`Giảm ${combo.name}`}>−</button><b>{quantity}</b><button type="button" disabled={stock <= 0 || quantity >= stock} onClick={() => updateQuantity(combo, quantity + 1)} aria-label={`Tăng ${combo.name}`}>+</button></span></div></div></article>; })}</div>;
}
function resolveImageUrl(image) { if (!image || /^https?:\/\//i.test(image)) return image || ""; const origin = API.replace(/\/api\/?$/, ""); return `${origin}${image.startsWith("/") ? image : `/${image}`}`; }
