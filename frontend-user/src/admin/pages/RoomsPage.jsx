import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HiOutlineEye,
  HiOutlineOfficeBuilding,
  HiOutlinePencil,
  HiOutlinePlus,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineTrash,
  HiOutlineViewGrid,
} from "react-icons/hi";
import { getCinemas } from "../services/cinemaService";
import {
  createRoom,
  deleteRoom,
  getRoomById,
  getRooms,
  updateRoom,
  updateRoomStatus,
} from "../services/roomService";
import ConfirmDialog from "../components/common/ConfirmDialog";
import Toast from "../components/common/Toast";

const emptyForm = {
  cinema_id: "",
  name: "",
  room_type: "2D",
  row_count: 8,
  column_count: 10,
  status: "active",
};

const statusLabels = {
  active: "Hoạt động",
  maintenance: "Bảo trì",
  inactive: "Ngừng hoạt động",
};

const roomTypes = ["2D", "3D", "IMAX", "VIP"];
const PAGE_SIZE = 10;

const getCinemaName = (room) => room.cinema_id?.name || "Chưa chọn rạp";
const getSeatCode = (seat) => seat.seat_code || `${seat.seat_row}${seat.seat_number}`;
const getRoomCinemaId = (room) => {
  if (!room?.cinema_id) return "";
  return typeof room.cinema_id === "object" ? room.cinema_id._id || "" : String(room.cinema_id);
};
const normalizeRoomName = (value = "") =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

function SeatMap({ seats = [] }) {
  const groupedSeats = useMemo(() => {
    return seats.reduce((groups, seat) => {
      const row = seat.seat_row || "?";
      groups[row] = groups[row] || [];
      groups[row].push(seat);
      return groups;
    }, {});
  }, [seats]);

  const rows = Object.keys(groupedSeats).sort();

  if (!seats.length) {
    return <div className="table-empty">Chưa có sơ đồ ghế.</div>;
  }

  return (
    <div className="room-seat-map">
      <div className="room-screen">Màn hình</div>
      {rows.map((row) => (
        <div className="room-seat-row" key={row}>
          <span className="room-seat-row-label">{row}</span>
          <div className="room-seat-list">
            {groupedSeats[row]
              .sort((a, b) => Number(a.seat_number) - Number(b.seat_number))
              .map((seat) => (
                <span
                  className={`room-seat ${seat.status ? "" : "disabled"}`}
                  key={seat._id}
                  title={seat.seat_type_id?.name || "Ghế thường"}
                >
                  {getSeatCode(seat)}
                </span>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [cinemas, setCinemas] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [cinemaFilter, setCinemaFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [formData, setFormData] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [editingRoom, setEditingRoom] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, message) => {
    setToasts((current) => [...current, { id: Date.now() + Math.random(), type, message }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const fetchRooms = useCallback(async () => {
    const response = await getRooms({
      q: searchQuery.trim(),
      cinema_id: cinemaFilter,
      status: statusFilter,
    });
    setRooms(response.data || []);
  }, [cinemaFilter, searchQuery, statusFilter]);

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [roomResponse, cinemaResponse] = await Promise.all([
        getRooms({
          q: searchQuery.trim(),
          cinema_id: cinemaFilter,
          status: statusFilter,
        }),
        getCinemas(),
      ]);
      setRooms(roomResponse.data || []);
      setCinemas(cinemaResponse.data || []);
    } catch (error) {
      addToast("error", error.response?.data?.message || "Không thể tải dữ liệu phòng chiếu");
    } finally {
      setLoading(false);
    }
  }, [addToast, cinemaFilter, searchQuery, statusFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadInitialData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadInitialData]);

  const activeRooms = useMemo(
    () => rooms.filter((room) => room.status === "active").length,
    [rooms],
  );

  const totalSeats = useMemo(
    () => rooms.reduce((sum, room) => sum + Number(room.capacity || 0), 0),
    [rooms],
  );

  const totalPages = Math.max(Math.ceil(rooms.length / PAGE_SIZE), 1);
  const pagedRooms = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return rooms.slice(start, start + PAGE_SIZE);
  }, [currentPage, rooms]);

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => ({ ...current, [field]: "" }));
  };

  const openCreateForm = () => {
    setEditingRoom(null);
    setFormData({
      ...emptyForm,
      cinema_id: cinemaFilter || cinemas[0]?._id || "",
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const openEditForm = (room) => {
    setEditingRoom(room);
    setFormData({
      cinema_id: room.cinema_id?._id || room.cinema_id || "",
      name: room.name || "",
      room_type: room.room_type || "2D",
      row_count: room.row_count || "",
      column_count: room.column_count || "",
      status: room.status || "active",
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    const rowCount = Number(formData.row_count);
    const columnCount = Number(formData.column_count);

    if (!formData.cinema_id) errors.cinema_id = "Vui lòng chọn rạp.";
    if (!formData.name.trim()) errors.name = "Vui lòng nhập tên phòng.";
    if (!errors.name && formData.cinema_id) {
      const duplicateRoom = rooms.find((room) => {
        const isSameRoom = editingRoom && room._id === editingRoom._id;
        return (
          !isSameRoom &&
          getRoomCinemaId(room) === formData.cinema_id &&
          normalizeRoomName(room.name) === normalizeRoomName(formData.name)
        );
      });

      if (duplicateRoom) {
        errors.name = "Tên phòng đã tồn tại trong rạp này.";
      }
    }
    if (!Number.isInteger(rowCount) || rowCount <= 0) {
      errors.row_count = "Số hàng phải là số nguyên dương.";
    }
    if (rowCount > 26) {
      errors.row_count = "Số hàng không được vượt quá 26.";
    }
    if (!Number.isInteger(columnCount) || columnCount <= 0) {
      errors.column_count = "Số cột phải là số nguyên dương.";
    }
    if (rowCount * columnCount > 400) {
      errors.column_count = "Sơ đồ ghế không được vượt quá 400 ghế.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) return;

    const payload = {
      cinema_id: formData.cinema_id,
      name: formData.name.trim(),
      room_type: formData.room_type,
      row_count: Number(formData.row_count),
      column_count: Number(formData.column_count),
      status: formData.status,
    };

    try {
      setSubmitting(true);
      if (editingRoom) {
        await updateRoom(editingRoom._id, payload);
        addToast("success", "Đã cập nhật phòng chiếu.");
      } else {
        await createRoom(payload);
        addToast("success", "Đã tạo phòng và sinh sơ đồ ghế.");
      }
      setIsFormOpen(false);
      setEditingRoom(null);
      await fetchRooms();
    } catch (error) {
      addToast("error", error.response?.data?.message || "Không thể lưu phòng chiếu");
    } finally {
      setSubmitting(false);
    }
  };

  const viewRoomDetail = async (room) => {
    try {
      const response = await getRoomById(room._id);
      setSelectedRoom(response.data);
    } catch (error) {
      addToast("error", error.response?.data?.message || "Không thể tải sơ đồ ghế");
    }
  };

  const handleStatusChange = async (room, status) => {
    try {
      await updateRoomStatus(room._id, status);
      addToast("success", `Đã đổi trạng thái phòng sang ${statusLabels[status]}.`);
      await fetchRooms();
      if (selectedRoom?._id === room._id) {
        await viewRoomDetail(room);
      }
    } catch (error) {
      addToast("error", error.response?.data?.message || "Không thể đổi trạng thái phòng");
    }
  };

  const openDeleteConfirm = (room) => {
    setDeleteTarget(room);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteRoom(deleteTarget._id);
      addToast("success", "Đã khóa phòng chiếu.");
      setConfirmOpen(false);
      setDeleteTarget(null);
      if (selectedRoom?._id === deleteTarget._id) {
        setSelectedRoom(null);
      }
      await fetchRooms();
    } catch (error) {
      addToast("error", error.response?.data?.message || "Không thể khóa phòng chiếu");
    }
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
    setCurrentPage(1);
  };

  const handleCinemaFilterChange = (event) => {
    setCinemaFilter(event.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-info">
          <h1>Quản lý Phòng chiếu</h1>
          <p>Tạo phòng, sinh sơ đồ ghế và kiểm soát trạng thái hoạt động</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={loadInitialData}>
            <HiOutlineRefresh />
            Làm mới
          </button>
          <button className="btn btn-primary" onClick={openCreateForm}>
            <HiOutlinePlus />
            Thêm phòng
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon blue">
            <HiOutlineOfficeBuilding />
          </div>
          <div>
            <div className="stat-card-value">{rooms.length}</div>
            <div className="stat-card-label">Tổng phòng</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon green">
            <HiOutlineViewGrid />
          </div>
          <div>
            <div className="stat-card-value">{activeRooms}</div>
            <div className="stat-card-label">Đang hoạt động</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon orange">
            <HiOutlineViewGrid />
          </div>
          <div>
            <div className="stat-card-value">{totalSeats}</div>
            <div className="stat-card-label">Tổng ghế</div>
          </div>
        </div>
      </div>

      {isFormOpen ? (
        <section className="card room-form-card">
          <div className="modal-header">
            <h2>{editingRoom ? "Cập nhật phòng chiếu" : "Thêm phòng chiếu"}</h2>
            <p>Nhập số hàng và số cột để hệ thống tự sinh sơ đồ ghế.</p>
          </div>
          <form className="showtime-form" onSubmit={handleSubmit}>
            <div className="showtime-form-grid">
              <label className="form-group">
                <span className="form-label">Rạp chiếu *</span>
                <select className={`form-input ${formErrors.cinema_id ? "error" : ""}`} value={formData.cinema_id} onChange={(event) => updateField("cinema_id", event.target.value)}>
                  <option value="">Chọn rạp</option>
                  {cinemas.map((cinema) => (
                    <option key={cinema._id} value={cinema._id}>
                      {cinema.name}
                    </option>
                  ))}
                </select>
                {formErrors.cinema_id ? <span className="form-error">{formErrors.cinema_id}</span> : null}
              </label>

              <label className="form-group">
                <span className="form-label">Tên phòng *</span>
                <input className={`form-input ${formErrors.name ? "error" : ""}`} value={formData.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Ví dụ: Phòng 01" />
                {formErrors.name ? <span className="form-error">{formErrors.name}</span> : null}
              </label>

              <label className="form-group">
                <span className="form-label">Loại phòng</span>
                <select className="form-input" value={formData.room_type} onChange={(event) => updateField("room_type", event.target.value)}>
                  {roomTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>

              <label className="form-group">
                <span className="form-label">Trạng thái</span>
                <select className="form-input" value={formData.status} onChange={(event) => updateField("status", event.target.value)}>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>

              <label className="form-group">
                <span className="form-label">Số hàng ghế *</span>
                <input className={`form-input ${formErrors.row_count ? "error" : ""}`} min="1" type="number" value={formData.row_count} onChange={(event) => updateField("row_count", event.target.value)} />
                {formErrors.row_count ? <span className="form-error">{formErrors.row_count}</span> : null}
              </label>

              <label className="form-group">
                <span className="form-label">Số cột ghế *</span>
                <input className={`form-input ${formErrors.column_count ? "error" : ""}`} min="1" type="number" value={formData.column_count} onChange={(event) => updateField("column_count", event.target.value)} />
                {formErrors.column_count ? <span className="form-error">{formErrors.column_count}</span> : <span className="form-hint">Tổng ghế: {Number(formData.row_count || 0) * Number(formData.column_count || 0)}</span>}
              </label>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" type="button" onClick={() => setIsFormOpen(false)}>
                Hủy
              </button>
              <button className="btn btn-primary" disabled={submitting} type="submit">
                {submitting ? "Đang lưu..." : "Lưu phòng"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <div className="table-container">
        <div className="table-toolbar">
          <div className="table-toolbar-left">
            <span className="table-toolbar-title">Danh sách phòng chiếu</span>
            <span className="table-toolbar-count">{rooms.length} kết quả</span>
          </div>
          <div className="cinema-filters">
            <div className="table-search">
              <HiOutlineSearch className="table-search-icon" />
              <input className="table-search-input" placeholder="Tìm phòng..." value={searchQuery} onChange={handleSearchChange} />
            </div>
            <select className="form-input room-filter-select" value={cinemaFilter} onChange={handleCinemaFilterChange}>
              <option value="">Tất cả rạp</option>
              {cinemas.map((cinema) => (
                <option key={cinema._id} value={cinema._id}>{cinema.name}</option>
              ))}
            </select>
            <select className="form-input room-filter-select" value={statusFilter} onChange={handleStatusFilterChange}>
              <option value="">Tất cả trạng thái</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading-spinner"><div className="spinner"></div></div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Phòng</th>
                  <th>Rạp</th>
                  <th>Loại</th>
                  <th>Sơ đồ</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {pagedRooms.map((room) => (
                  <tr key={room._id}>
                    <td className="table-cell-name">{room.name}</td>
                    <td>{getCinemaName(room)}</td>
                    <td>{room.room_type || "2D"}</td>
                    <td>{room.row_count || "?"} x {room.column_count || "?"} ({room.capacity || 0} ghế)</td>
                    <td>
                      <select className={`room-status-select ${room.status || "active"}`} value={room.status || "active"} onChange={(event) => handleStatusChange(room, event.target.value)}>
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-icon btn-ghost" title="Xem sơ đồ ghế" onClick={() => viewRoomDetail(room)}>
                          <HiOutlineEye />
                        </button>
                        <button className="btn btn-icon btn-ghost" title="Cập nhật" onClick={() => openEditForm(room)}>
                          <HiOutlinePencil />
                        </button>
                        <button className="btn btn-icon btn-ghost" title="Khóa phòng" onClick={() => openDeleteConfirm(room)}>
                          <HiOutlineTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="pagination">
          <button className="btn btn-secondary" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}>Trước</button>
          <span>Trang {currentPage} / {totalPages}</span>
          <button className="btn btn-secondary" disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}>Sau</button>
        </div>
      </div>

      {selectedRoom ? (
        <section className="table-container room-detail-panel">
          <div className="table-toolbar">
            <div className="table-toolbar-left">
              <span className="table-toolbar-title">{selectedRoom.name}</span>
              <span className="table-toolbar-count">{selectedRoom.seats?.length || 0} ghế</span>
            </div>
            <button className="btn btn-secondary" onClick={() => setSelectedRoom(null)}>Đóng</button>
          </div>
          <SeatMap seats={selectedRoom.seats || []} />
        </section>
      ) : null}

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Khóa phòng chiếu"
        message={`Bạn có chắc muốn khóa phòng "${deleteTarget?.name || ""}"? Phòng sẽ không còn dùng để tạo suất chiếu mới.`}
        confirmText="Khóa phòng"
        cancelText="Hủy"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
      />

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default RoomsPage;
