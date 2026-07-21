import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HiOutlineEye,
  HiOutlineKey,
  HiOutlineLockClosed,
  HiOutlineLockOpen,
  HiOutlinePencil,
  HiOutlinePlus,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineUsers,
} from "react-icons/hi";
import ConfirmDialog from "../components/common/ConfirmDialog";
import Toast from "../components/common/Toast";
import {
  adjustRewardPoints,
  forceResetPassword,
  getUserById,
  getUsers,
  updateUserAccountStatus,
  updateUserBasicInfo,
} from "../services/userService";

const PAGE_SIZE = 10;

const tierLabels = {
  member: "Member",
  vip: "VIP",
  vvip: "VVIP",
};

const roleLabels = {
  user: "User",
  admin: "Admin",
};

const genderLabels = {
  male: "Nam",
  female: "Nữ",
  other: "Khác",
};

const accountStatusLabels = {
  active: "Đang hoạt động",
  banned: "Bị khóa",
  unverified: "Chưa xác thực",
};

const paymentStatusLabels = {
  pending: "Đang chờ",
  paid: "Đã thanh toán",
  failed: "Thất bại",
  refunded: "Đã hoàn tiền",
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("vi-VN");
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const toDateInputValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const resolveAccountStatus = (user) => user?.account_status || (user?.status === false ? "banned" : "active");
const isActiveUser = (user) => resolveAccountStatus(user) === "active";

const statusBadgeClass = (status) => {
  if (status === "active" || status === "paid") return "status-badge status-now-showing";
  if (status === "unverified" || status === "pending") return "status-badge status-coming-soon";
  return "status-badge status-ended";
};

const getBookingStatusLabel = (booking) => {
  if (booking.status === "cancelled") return "Đã hủy";
  const startTime = booking.showtime_id?.start_time;
  if (startTime && new Date(startTime) > new Date()) return "Sắp chiếu";
  return "Đã xem";
};

const getSeatNames = (booking) =>
  (booking.showtime_seat_ids || [])
    .map((seat) => {
      const data = seat.seat_id;
      if (!data) return "";
      return `${data.seat_row || ""}${data.seat_number || ""}`;
    })
    .filter(Boolean)
    .join(", ") || "-";

const UserInfoField = ({ label, value }) => (
  <div className="user-info-field">
    <span className="form-label">{label}</span>
    <div className="user-info-value">{value || "-"}</div>
  </div>
);

const UserDetailModal = ({ detail, loading, onClose, onEdit, onReward, onForceReset }) => {
  if (!detail && !loading) return null;

  const user = detail?.user;
  const bookings = detail?.bookings || [];
  const rewardLogs = detail?.reward_point_logs || [];
  const auditLogs = detail?.audit_logs || [];
  const vouchers = detail?.vouchers || [];
  const accountStatus = resolveAccountStatus(user);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Chi tiết người dùng</h2>
          <button className="modal-close" type="button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
            </div>
          ) : (
            <>
              <div className="stats-grid" style={{ marginBottom: 24 }}>
                <div className="stat-card">
                  <div className="stat-card-icon purple">
                    <HiOutlineUsers />
                  </div>
                  <div>
                    <div className="stat-card-value">{tierLabels[user.member_tier] || "Member"}</div>
                    <div className="stat-card-label">Hạng thành viên</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-icon green">
                    <HiOutlinePlus />
                  </div>
                  <div>
                    <div className="stat-card-value">{Number(user.reward_points || 0)}</div>
                    <div className="stat-card-label">Điểm thưởng</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-icon orange">
                    <HiOutlineUsers />
                  </div>
                  <div>
                    <div className="stat-card-value">{bookings.length}</div>
                    <div className="stat-card-label">Lượt đặt vé</div>
                  </div>
                </div>
              </div>

              <div className="form-row">
                <UserInfoField label="Mã khách hàng" value={user._id} />
                <UserInfoField label="Trạng thái" value={accountStatusLabels[accountStatus]} />
              </div>
              <div className="form-row">
                <UserInfoField label="Họ tên" value={user.full_name} />
                <UserInfoField label="Email" value={user.email} />
              </div>
              <div className="form-row">
                <UserInfoField label="Số điện thoại" value={user.phone} />
                <UserInfoField label="Vai trò" value={roleLabels[user.role] || user.role} />
              </div>
              <div className="form-row">
                <UserInfoField label="Ngày sinh" value={formatDate(user.birth_date)} />
                <UserInfoField label="Giới tính" value={genderLabels[user.gender]} />
              </div>
              <div className="form-row">
                <UserInfoField label="Ngày đăng ký" value={formatDateTime(user.created_at)} />
                <UserInfoField label="Lần đăng nhập cuối" value={formatDateTime(user.last_login_at)} />
              </div>

              <div className="table-container" style={{ marginTop: 24 }}>
                <div className="table-toolbar">
                  <div className="table-toolbar-left">
                    <span className="table-toolbar-title">Lịch sử đặt vé</span>
                    <span className="table-toolbar-count">{bookings.length} giao dịch</span>
                  </div>
                </div>
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Mã vé</th>
                        <th>Phim</th>
                        <th>Rạp / Phòng</th>
                        <th>Suất chiếu</th>
                        <th>Ghế</th>
                        <th>Tổng tiền</th>
                        <th>Thanh toán</th>
                        <th>Vé</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.length === 0 ? (
                        <tr>
                          <td colSpan="8" style={{ textAlign: "center" }}>
                            Chưa có lịch sử đặt vé
                          </td>
                        </tr>
                      ) : (
                        bookings.map((booking) => (
                          <tr key={booking._id}>
                            <td>{String(booking._id).slice(-8).toUpperCase()}</td>
                            <td>{booking.showtime_id?.movie_id?.title || "-"}</td>
                            <td>
                              {booking.showtime_id?.room_id?.cinema_id?.name || "-"}
                              <br />
                              <span style={{ color: "var(--color-text-secondary)" }}>
                                {booking.showtime_id?.room_id?.name || "-"}
                              </span>
                            </td>
                            <td>{formatDateTime(booking.showtime_id?.start_time)}</td>
                            <td>{getSeatNames(booking)}</td>
                            <td>{formatCurrency(booking.total_price)}</td>
                            <td>
                              <span className={statusBadgeClass(booking.payment_status || "paid")}>
                                {paymentStatusLabels[booking.payment_status || "paid"]}
                              </span>
                            </td>
                            <td>{getBookingStatusLabel(booking)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="table-container" style={{ marginTop: 24 }}>
                <div className="table-toolbar">
                  <div className="table-toolbar-left">
                    <span className="table-toolbar-title">Lịch sử điểm thưởng</span>
                    <span className="table-toolbar-count">{rewardLogs.length} dòng</span>
                  </div>
                </div>
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Thời gian</th>
                        <th>Loại</th>
                        <th>Điểm</th>
                        <th>Số dư</th>
                        <th>Lý do</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rewardLogs.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: "center" }}>
                            Chưa có biến động điểm
                          </td>
                        </tr>
                      ) : (
                        rewardLogs.map((log) => (
                          <tr key={log._id}>
                            <td>{formatDateTime(log.created_at)}</td>
                            <td>{log.type === "add" ? "Cộng" : log.type === "subtract" ? "Trừ" : log.type}</td>
                            <td>{Number(log.points || 0)}</td>
                            <td>{Number(log.balance_after || 0)}</td>
                            <td>{log.reason || "-"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="table-container" style={{ marginTop: 24 }}>
                <div className="table-toolbar">
                  <div className="table-toolbar-left">
                    <span className="table-toolbar-title">Voucher đang sở hữu</span>
                    <span className="table-toolbar-count">{vouchers.length} mã</span>
                  </div>
                </div>
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Mã</th>
                        <th>Giảm giá</th>
                        <th>Trạng thái</th>
                        <th>Hết hạn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vouchers.length === 0 ? (
                        <tr>
                          <td colSpan="4" style={{ textAlign: "center" }}>
                            Chưa có voucher gắn với tài khoản
                          </td>
                        </tr>
                      ) : (
                        vouchers.map((item) => (
                          <tr key={item._id}>
                            <td>{item.voucher_id?.code || "-"}</td>
                            <td>
                              {item.voucher_id?.discount_type === "percent"
                                ? `${item.voucher_id?.discount_value || 0}%`
                                : formatCurrency(item.voucher_id?.discount_value)}
                            </td>
                            <td>{item.status}</td>
                            <td>{formatDate(item.expires_at || item.voucher_id?.end_date)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="table-container" style={{ marginTop: 24 }}>
                <div className="table-toolbar">
                  <div className="table-toolbar-left">
                    <span className="table-toolbar-title">Audit log</span>
                    <span className="table-toolbar-count">{auditLogs.length} thao tác</span>
                  </div>
                </div>
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Thời gian</th>
                        <th>Admin</th>
                        <th>Hành động</th>
                        <th>Lý do</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan="4" style={{ textAlign: "center" }}>
                            Chưa có lịch sử thao tác
                          </td>
                        </tr>
                      ) : (
                        auditLogs.map((log) => (
                          <tr key={log._id}>
                            <td>{formatDateTime(log.created_at)}</td>
                            <td>{log.admin_id?.full_name || log.admin_id?.email || "-"}</td>
                            <td>{log.action}</td>
                            <td>{log.reason || "-"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" type="button" onClick={onClose}>
            Đóng
          </button>
          {user ? (
            <>
              <button className="btn btn-secondary" type="button" onClick={() => onForceReset(user)}>
                <HiOutlineKey />
                Reset mật khẩu
              </button>
              <button className="btn btn-secondary" type="button" onClick={() => onReward(user)}>
                <HiOutlinePlus />
                Điểm thưởng
              </button>
              <button className="btn btn-primary" type="button" onClick={() => onEdit(user)}>
                <HiOutlinePencil />
                Cập nhật
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const UserEditModal = ({ user, isLoading, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    birth_date: "",
    gender: "",
    role: "user",
    member_tier: "member",
    account_status: "active",
    reason: "",
  });

  useEffect(() => {
    if (!user) return;
    setFormData({
      full_name: user.full_name || "",
      email: user.email || "",
      phone: user.phone || "",
      birth_date: toDateInputValue(user.birth_date),
      gender: user.gender || "",
      role: user.role || "user",
      member_tier: user.member_tier || "member",
      account_status: resolveAccountStatus(user),
      reason: "",
    });
  }, [user]);

  if (!user) return null;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Cập nhật thông tin người dùng</h2>
          <button className="modal-close" type="button" onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Email đăng nhập</label>
                <input className="form-input" name="email" type="email" value={formData.email} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Số điện thoại</label>
                <input className="form-input" name="phone" value={formData.phone} onChange={handleChange} placeholder="090..." />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Họ tên</label>
                <input className="form-input" name="full_name" value={formData.full_name} onChange={handleChange} required minLength={2} />
              </div>
              <div className="form-group">
                <label className="form-label">Ngày sinh</label>
                <input className="form-input" name="birth_date" type="date" value={formData.birth_date} onChange={handleChange} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Giới tính</label>
                <select className="form-input" name="gender" value={formData.gender} onChange={handleChange}>
                  <option value="">Chưa cập nhật</option>
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                  <option value="other">Khác</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Vai trò</label>
                <select className="form-input" name="role" value={formData.role} onChange={handleChange}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Hạng thành viên</label>
                <select className="form-input" name="member_tier" value={formData.member_tier} onChange={handleChange}>
                  <option value="member">Member</option>
                  <option value="vip">VIP</option>
                  <option value="vvip">VVIP</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Trạng thái tài khoản</label>
                <select className="form-input" name="account_status" value={formData.account_status} onChange={handleChange}>
                  <option value="active">Đang hoạt động</option>
                  <option value="banned">Bị khóa</option>
                  <option value="unverified">Chưa xác thực</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Lý do thay đổi</label>
              <textarea className="form-input form-textarea" name="reason" value={formData.reason} onChange={handleChange} rows={3} />
              <span className="form-hint">Lý do sẽ được lưu vào audit log.</span>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" type="button" onClick={onClose}>
              Hủy bỏ
            </button>
            <button className="btn btn-primary" type="submit" disabled={isLoading}>
              {isLoading ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const RewardPointModal = ({ user, isLoading, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({ type: "add", points: "", reason: "" });

  useEffect(() => {
    if (user) setFormData({ type: "add", points: "", reason: "" });
  }, [user]);

  if (!user) return null;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({ ...formData, points: Number(formData.points) });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Điều chỉnh điểm thưởng</h2>
          <button className="modal-close" type="button" onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <UserInfoField label="Người dùng" value={`${user.full_name} - ${Number(user.reward_points || 0)} điểm`} />
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Loại</label>
                <select className="form-input" name="type" value={formData.type} onChange={handleChange}>
                  <option value="add">Cộng điểm</option>
                  <option value="subtract">Trừ điểm</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Số điểm</label>
                <input className="form-input" name="points" type="number" min="1" value={formData.points} onChange={handleChange} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Lý do</label>
              <textarea className="form-input form-textarea" name="reason" value={formData.reason} onChange={handleChange} rows={3} required />
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" type="button" onClick={onClose}>
              Hủy bỏ
            </button>
            <button className="btn btn-primary" type="submit" disabled={isLoading}>
              {isLoading ? "Đang lưu..." : "Xác nhận"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [rewardUser, setRewardUser] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);

  const activeUsers = useMemo(() => users.filter((user) => resolveAccountStatus(user) === "active").length, [users]);
  const bannedUsers = useMemo(() => users.filter((user) => resolveAccountStatus(user) === "banned").length, [users]);

  const addToast = useCallback((type, message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const fetchUsers = useCallback(
    async (page = 1, overrides = {}) => {
      try {
        setLoading(true);
        const params = {
          q: overrides.q ?? searchQuery.trim(),
          role: overrides.role ?? roleFilter,
          account_status: overrides.account_status ?? statusFilter,
          member_tier: overrides.member_tier ?? tierFilter,
          page,
          limit: PAGE_SIZE,
        };
        const response = await getUsers(params);
        setUsers(response.data || []);
        setCurrentPage(response.pagination?.page || page);
        setTotalPages(response.pagination?.totalPages || 1);
        setTotalItems(response.pagination?.totalItems || 0);
      } catch (error) {
        addToast("error", error.response?.data?.message || "Không thể tải danh sách người dùng");
      } finally {
        setLoading(false);
      }
    },
    [addToast, roleFilter, searchQuery, statusFilter, tierFilter],
  );

  useEffect(() => {
    fetchUsers(1);
  }, [fetchUsers]);

  const reloadDetail = async (userId) => {
    const response = await getUserById(userId);
    setDetail(response.data);
    return response.data;
  };

  const handleSearch = (event) => {
    const value = event.target.value;
    setSearchQuery(value);
    fetchUsers(1, { q: value.trim() });
  };

  const handleFilterChange = (setter, key) => (event) => {
    const value = event.target.value;
    setter(value);
    fetchUsers(1, { [key]: value });
  };

  const handleViewDetail = async (user) => {
    try {
      setDetailLoading(true);
      setDetail({ user, bookings: [], reward_point_logs: [], audit_logs: [], vouchers: [] });
      await reloadDetail(user._id);
    } catch (error) {
      addToast("error", error.response?.data?.message || "Không thể tải chi tiết người dùng");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSubmitEdit = async (formData) => {
    try {
      setSubmitting(true);
      const response = await updateUserBasicInfo(editingUser._id, formData);
      addToast("success", response.message || "Đã cập nhật người dùng");
      setEditingUser(null);
      setDetail((prev) => (prev ? { ...prev, user: response.data } : prev));
      fetchUsers(currentPage);
    } catch (error) {
      addToast("error", error.response?.data?.message || "Không thể cập nhật người dùng");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReward = async (formData) => {
    try {
      setSubmitting(true);
      const response = await adjustRewardPoints(rewardUser._id, formData);
      addToast("success", response.message || "Đã cập nhật điểm thưởng");
      setRewardUser(null);
      setDetail((prev) => (prev ? { ...prev, user: response.data } : prev));
      if (detail?.user?._id === response.data._id) await reloadDetail(response.data._id);
      fetchUsers(currentPage);
    } catch (error) {
      addToast("error", error.response?.data?.message || "Không thể cập nhật điểm thưởng");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmStatus = async () => {
    if (!statusTarget) return;
    try {
      const nextStatus = isActiveUser(statusTarget) ? "banned" : "active";
      const response = await updateUserAccountStatus(statusTarget._id, nextStatus, "Thao tác nhanh từ danh sách người dùng");
      addToast("success", response.message || "Đã cập nhật trạng thái người dùng");
      setStatusTarget(null);
      setDetail((prev) => (prev?.user?._id === response.data._id ? { ...prev, user: response.data } : prev));
      fetchUsers(currentPage);
    } catch (error) {
      addToast("error", error.response?.data?.message || "Không thể cập nhật trạng thái");
    }
  };

  const handleConfirmForceReset = async () => {
    if (!resetTarget) return;
    try {
      const response = await forceResetPassword(resetTarget._id, "Admin hỗ trợ force reset password");
      const otpText = response.dev_otp ? ` OTP dev: ${response.dev_otp}` : "";
      addToast("success", `${response.message || "Đã tạo yêu cầu reset mật khẩu"}.${otpText}`);
      setResetTarget(null);
      if (detail?.user?._id === resetTarget._id) await reloadDetail(resetTarget._id);
    } catch (error) {
      addToast("error", error.response?.data?.message || "Không thể reset mật khẩu");
    }
  };

  return (
    <div className="users-page">
      <div className="page-header">
        <div className="page-header-info">
          <h1>Quản lý Người dùng</h1>
          <p>Tra cứu hồ sơ, lịch sử đặt vé, trạng thái tài khoản và hạng thành viên</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => fetchUsers(currentPage)}>
            <HiOutlineRefresh />
            Làm mới
          </button>
        </div>
      </div>

      <div className="stats-grid users-stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon purple">
            <HiOutlineUsers />
          </div>
          <div>
            <div className="stat-card-value">{totalItems}</div>
            <div className="stat-card-label">Tổng người dùng</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon green">
            <HiOutlineLockOpen />
          </div>
          <div>
            <div className="stat-card-value">{activeUsers}</div>
            <div className="stat-card-label">Active trong trang</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon orange">
            <HiOutlineLockClosed />
          </div>
          <div>
            <div className="stat-card-value">{bannedUsers}</div>
            <div className="stat-card-label">Banned trong trang</div>
          </div>
        </div>
      </div>

      <div className="table-container users-table-container">
        <div className="table-toolbar">
          <div className="table-toolbar-left">
            <span className="table-toolbar-title">Danh sách người dùng</span>
            <span className="table-toolbar-count">{totalItems} kết quả</span>
          </div>
          <div className="table-search">
            <HiOutlineSearch className="table-search-icon" />
            <input
              type="text"
              className="table-search-input"
              placeholder="Tìm tên, email, số điện thoại..."
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>
        </div>

        <div className="table-toolbar" style={{ borderTop: "1px solid var(--color-border)" }}>
          <div className="table-toolbar-left">
            <select className="user-filter-select" value={roleFilter} onChange={handleFilterChange(setRoleFilter, "role")}>
              <option value="">Tất cả vai trò</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <select className="user-filter-select" value={statusFilter} onChange={handleFilterChange(setStatusFilter, "account_status")}>
              <option value="">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="banned">Bị khóa</option>
              <option value="unverified">Chưa xác thực</option>
            </select>
            <select className="user-filter-select" value={tierFilter} onChange={handleFilterChange(setTierFilter, "member_tier")}>
              <option value="">Tất cả hạng</option>
              <option value="member">Member</option>
              <option value="vip">VIP</option>
              <option value="vvip">VVIP</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Người dùng</th>
                    <th>Liên hệ</th>
                    <th>Vai trò</th>
                    <th>Hạng / Điểm</th>
                    <th>Trạng thái</th>
                    <th>Last login</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: "center" }}>
                        Không có người dùng phù hợp
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => {
                      const accountStatus = resolveAccountStatus(user);
                      return (
                        <tr key={user._id}>
                          <td>
                            <strong>{user.full_name}</strong>
                            <br />
                            <span style={{ color: "var(--color-text-secondary)" }}>#{String(user._id).slice(-6)}</span>
                          </td>
                          <td>
                            {user.email}
                            <br />
                            <span style={{ color: "var(--color-text-secondary)" }}>{user.phone || "Chưa có SĐT"}</span>
                          </td>
                          <td>
                            <span className={`status-badge ${user.role === "admin" ? "status-now-showing" : "status-coming-soon"}`}>
                              {roleLabels[user.role] || user.role}
                            </span>
                          </td>
                          <td>
                            {tierLabels[user.member_tier] || "Member"}
                            <br />
                            <span style={{ color: "var(--color-text-secondary)" }}>{Number(user.reward_points || 0)} điểm</span>
                          </td>
                          <td>
                            <span className={statusBadgeClass(accountStatus)}>
                              {accountStatusLabels[accountStatus]}
                            </span>
                          </td>
                          <td>{formatDateTime(user.last_login_at)}</td>
                          <td>
                            <div className="table-actions">
                              <button className="btn btn-icon btn-ghost" title="Xem chi tiết" onClick={() => handleViewDetail(user)}>
                                <HiOutlineEye />
                              </button>
                              <button className="btn btn-icon btn-ghost" title="Cập nhật" onClick={() => setEditingUser(user)}>
                                <HiOutlinePencil />
                              </button>
                              <button className="btn btn-icon btn-ghost" title="Điểm thưởng" onClick={() => setRewardUser(user)}>
                                <HiOutlinePlus />
                              </button>
                              <button
                                className="btn btn-icon btn-ghost"
                                title={isActiveUser(user) ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                                onClick={() => setStatusTarget(user)}
                              >
                                {isActiveUser(user) ? <HiOutlineLockClosed /> : <HiOutlineLockOpen />}
                              </button>
                              <button className="btn btn-icon btn-ghost" title="Force reset password" onClick={() => setResetTarget(user)}>
                                <HiOutlineKey />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <button className="btn btn-secondary" onClick={() => fetchUsers(currentPage - 1)} disabled={currentPage === 1}>
                Trang trước
              </button>
              <span className="pagination-info">
                Trang {currentPage} / {totalPages}
              </span>
              <button className="btn btn-secondary" onClick={() => fetchUsers(currentPage + 1)} disabled={currentPage === totalPages}>
                Trang sau
              </button>
            </div>
          </>
        )}
      </div>

      <UserDetailModal
        detail={detail}
        loading={detailLoading}
        onClose={() => setDetail(null)}
        onEdit={(user) => setEditingUser(user)}
        onReward={(user) => setRewardUser(user)}
        onForceReset={(user) => setResetTarget(user)}
      />

      <UserEditModal
        user={editingUser}
        isLoading={submitting}
        onClose={() => setEditingUser(null)}
        onSubmit={handleSubmitEdit}
      />

      <RewardPointModal
        user={rewardUser}
        isLoading={submitting}
        onClose={() => setRewardUser(null)}
        onSubmit={handleSubmitReward}
      />

      <ConfirmDialog
        isOpen={Boolean(statusTarget)}
        title={isActiveUser(statusTarget) ? "Khóa người dùng" : "Mở khóa người dùng"}
        message={
          isActiveUser(statusTarget)
            ? `Bạn có chắc chắn muốn khóa tài khoản "${statusTarget?.full_name}"? Người dùng sẽ không thể đăng nhập hoặc tiếp tục dùng token hiện tại.`
            : `Bạn có chắc chắn muốn mở khóa tài khoản "${statusTarget?.full_name}"?`
        }
        onConfirm={handleConfirmStatus}
        onCancel={() => setStatusTarget(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(resetTarget)}
        title="Force reset password"
        message={`Tạo yêu cầu đặt lại mật khẩu cho "${resetTarget?.full_name}"? Admin không thể xem mật khẩu hiện tại của user.`}
        onConfirm={handleConfirmForceReset}
        onCancel={() => setResetTarget(null)}
      />

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default UsersPage;
