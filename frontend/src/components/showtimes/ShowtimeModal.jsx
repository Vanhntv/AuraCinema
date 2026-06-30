import { useEffect, useState } from "react";
import { HiOutlineX } from "react-icons/hi";
import { getRoomsByCinema } from "../../services/showtimeService";

const emptyForm = { movie_id: "", cinema_id: "", room_id: "", start_time: "", base_price: "" };
const toLocalInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

function ShowtimeModal({ isOpen, initialData, movies, cinemas, onClose, onSubmit, isLoading }) {
  const cinemaId = initialData?.cinema_id || "";
  const [form, setForm] = useState(() => initialData ? {
    movie_id: initialData.movie_id || "", cinema_id: cinemaId,
    room_id: initialData.room_id || "", start_time: toLocalInput(initialData.start_time),
    base_price: initialData.base_price ?? "",
  } : emptyForm);
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    if (cinemaId) getRoomsByCinema(cinemaId).then((result) => setRooms(result.data || [])).catch(() => setRooms([]));
  }, [isOpen, cinemaId]);

  const changeCinema = async (cinemaId) => {
    setForm((current) => ({ ...current, cinema_id: cinemaId, room_id: "" }));
    try { const result = await getRoomsByCinema(cinemaId); setRooms(result.data || []); }
    catch { setRooms([]); }
  };

  const submit = (event) => {
    event.preventDefault();
    if (!form.movie_id || !form.room_id || !form.start_time || !form.base_price) {
      setError("Vui lòng nhập đầy đủ phim, rạp, phòng, thời gian và giá vé");
      return;
    }
    if (Number(form.base_price) <= 0) { setError("Giá vé phải lớn hơn 0"); return; }
    onSubmit({ movie_id: form.movie_id, room_id: form.room_id, start_time: new Date(form.start_time).toISOString(), base_price: Number(form.base_price) });
  };

  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header"><h2 className="modal-title">{initialData ? "Chỉnh sửa suất chiếu" : "Thêm suất chiếu mới"}</h2><button className="modal-close" type="button" onClick={onClose}><HiOutlineX /></button></div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group form-group-2"><label className="form-label">Phim <span className="required">*</span></label><select className="form-input" value={form.movie_id} onChange={(e) => setForm({ ...form, movie_id: e.target.value })}><option value="">Chọn phim</option>{movies.map((movie) => <option key={movie._id} value={movie._id}>{movie.title}</option>)}</select></div>
              <div className="form-group form-group-1"><label className="form-label">Rạp <span className="required">*</span></label><select className="form-input" value={form.cinema_id} onChange={(e) => changeCinema(e.target.value)}><option value="">Chọn rạp</option>{cinemas.map((cinema) => <option key={cinema._id} value={cinema._id}>{cinema.name}</option>)}</select></div>
            </div>
            <div className="form-row">
              <div className="form-group form-group-1"><label className="form-label">Phòng <span className="required">*</span></label><select className="form-input" value={form.room_id} disabled={!form.cinema_id} onChange={(e) => setForm({ ...form, room_id: e.target.value })}><option value="">Chọn phòng</option>{rooms.map((room) => <option key={room._id} value={room._id}>{room.name}</option>)}</select></div>
              <div className="form-group form-group-1"><label className="form-label">Bắt đầu <span className="required">*</span></label><input className="form-input" type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
              <div className="form-group form-group-1"><label className="form-label">Giá vé <span className="required">*</span></label><input className="form-input" min="1000" step="1000" type="number" placeholder="45000" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })} /></div>
            </div>
            {error && <p className="form-error">{error}</p>}
            <p className="table-cell-desc">Thời gian kết thúc được tự động tính theo thời lượng phim.</p>
          </div>
          <div className="modal-footer"><button className="btn btn-secondary" type="button" onClick={onClose}>Hủy</button><button className="btn btn-primary" disabled={isLoading} type="submit">{isLoading ? "Đang xử lý..." : initialData ? "Cập nhật" : "Thêm mới"}</button></div>
        </form>
      </div>
    </div>
  );
}

export default ShowtimeModal;
