import { useCallback, useEffect, useState } from "react";
import { HiOutlinePencil, HiOutlinePlus, HiOutlineRefresh, HiOutlineTicket, HiOutlineTrash } from "react-icons/hi";
import { getMovies } from "../services/movieService";
import { getCinemas } from "../services/cinemaService";
import { createShowtime, deleteShowtime, getShowtimes, updateShowtime } from "../services/showtimeService";
import ShowtimeModal from "../components/showtimes/ShowtimeModal";
import ConfirmDialog from "../components/common/ConfirmDialog";
import Toast from "../components/common/Toast";

const displayDate = (value) => new Date(value).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });

function ShowtimesPage() {
  const [showtimes, setShowtimes] = useState([]), [movies, setMovies] = useState([]), [cinemas, setCinemas] = useState([]);
  const [loading, setLoading] = useState(true), [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false), [editing, setEditing] = useState(null), [deleting, setDeleting] = useState(null);
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((type, message) => setToasts((items) => [...items, { id: crypto.randomUUID(), type, message }]), []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [showtimeResult, movieResult, cinemaResult] = await Promise.all([getShowtimes(), getMovies("", 1, 500), getCinemas()]);
      setShowtimes(showtimeResult.data || []); setMovies(movieResult.data || []); setCinemas(cinemaResult.data || []);
    } catch { toast("error", "Không thể tải dữ liệu suất chiếu"); }
    finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { Promise.resolve().then(load); }, [load]);

  const save = async (data) => {
    try { setSubmitting(true); if (editing) await updateShowtime(editing.id, data); else await createShowtime(data); toast("success", editing ? "Đã cập nhật suất chiếu" : "Đã thêm suất chiếu"); setModalOpen(false); setEditing(null); await load(); }
    catch (error) { toast("error", error.response?.data?.message || "Không thể lưu suất chiếu"); }
    finally { setSubmitting(false); }
  };
  const remove = async () => { try { await deleteShowtime(deleting.id); toast("success", "Đã xóa suất chiếu"); setDeleting(null); load(); } catch (error) { toast("error", error.response?.data?.message || "Không thể xóa suất chiếu"); } };

  return (
    <div className="page-container">
      <div className="page-header"><div><h1 className="page-title"><HiOutlineTicket style={{ marginRight: 12 }} />Quản lý Suất chiếu</h1><p className="page-subtitle">Tạo và quản lý lịch chiếu phim</p></div><button className="btn btn-primary" onClick={() => { setEditing(null); setModalOpen(true); }}><HiOutlinePlus /> Thêm suất chiếu</button></div>
      <div className="search-bar"><button className="btn btn-secondary" onClick={load}><HiOutlineRefresh /> Làm mới</button></div>
      <div className="card table-container">{loading ? <div className="loading-spinner"><div className="spinner" /><p>Đang tải dữ liệu...</p></div> : <table className="data-table"><thead><tr><th>Phim</th><th>Rạp / Phòng</th><th>Bắt đầu</th><th>Kết thúc</th><th>Giá vé</th><th>Thao tác</th></tr></thead><tbody>{showtimes.map((item) => <tr key={item.id}><td className="table-cell-name">{item.movieTitle}</td><td>{item.cinemaName} / {item.roomName}</td><td>{displayDate(item.start_time)}</td><td>{displayDate(item.end_time)}</td><td>{item.base_price == null ? "—" : `${Number(item.base_price).toLocaleString("vi-VN")}đ`}</td><td><div className="table-actions"><button className="action-btn action-edit" title="Sửa" onClick={() => { setEditing(item); setModalOpen(true); }}><HiOutlinePencil /></button><button className="action-btn action-delete" title="Xóa" onClick={() => setDeleting(item)}><HiOutlineTrash /></button></div></td></tr>)}</tbody></table>}{!loading && !showtimes.length && <div className="table-empty"><HiOutlineTicket className="table-empty-icon" /><p className="table-empty-text">Chưa có suất chiếu</p></div>}</div>
      <ShowtimeModal key={`${editing?.id || "new"}-${modalOpen}`} isOpen={modalOpen} initialData={editing} movies={movies} cinemas={cinemas} isLoading={submitting} onClose={() => { setModalOpen(false); setEditing(null); }} onSubmit={save} />
      <ConfirmDialog isOpen={!!deleting} title="Xóa suất chiếu" message={`Bạn có chắc muốn xóa suất chiếu của phim “${deleting?.movieTitle || ""}”?`} onConfirm={remove} onCancel={() => setDeleting(null)} />
      <Toast toasts={toasts} onRemove={(id) => setToasts((items) => items.filter((item) => item.id !== id))} />
    </div>
  );
}

export default ShowtimesPage;
