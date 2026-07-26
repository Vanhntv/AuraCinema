import { useCallback, useEffect, useState } from "react";
import {
  HiOutlineEye,
  HiOutlineGift,
  HiOutlinePause,
  HiOutlinePencil,
  HiOutlinePlay,
  HiOutlinePlus,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineTrash,
  HiOutlineX,
} from "react-icons/hi";
import Toast from "../components/common/Toast";
import { createGift, getGiftById, getGifts, updateGift } from "../services/giftService";

const PAGE_SIZE = 10;

const typeLabels = {
  ticket: "Vé miễn phí",
  combo: "Combo bắp nước",
  voucher: "Voucher",
  point: "Điểm thưởng",
  physical: "Quà vật phẩm",
};

const statusClasses = {
  draft: "status-coming-soon",
  upcoming: "status-coming-soon",
  active: "status-now-showing",
  paused: "status-ended",
  out_of_stock: "status-ended",
  expired: "status-ended",
  cancelled: "status-ended",
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "Chưa cấu hình";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cấu hình";
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const toDateTimeLocalValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
};

const formatGiftValue = (gift) => {
  if (gift.value_label) {
    return gift.value_label;
  }

  if (gift.type === "point") {
    return `${Number(gift.value || 0).toLocaleString("vi-VN")} điểm`;
  }

  if (gift.type === "ticket") {
    return Number(gift.value || 0) > 0 ? formatCurrency(gift.value) : "1 vé";
  }

  return formatCurrency(gift.value);
};

const getGiftImage = (gift) => {
  if (gift.image_url) return gift.image_url;
  return "";
};

const formatCondition = (condition) => {
  if (!condition || (typeof condition === "object" && Object.keys(condition).length === 0)) {
    return "Chưa cấu hình";
  }

  if (typeof condition === "string") {
    return condition;
  }

  const labels = {
    min_order: "Đơn tối thiểu",
    member_tier: "Hạng thành viên",
    birthday: "Sinh nhật",
    campaign: "Chương trình",
    combo_required: "Yêu cầu combo",
    first_order: "Đơn đầu tiên",
    point_required: "Điểm yêu cầu",
  };

  return Object.entries(condition)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${labels[key] || key}: ${Array.isArray(value) ? value.join(", ") : value}`)
    .join(" | ") || "Chưa cấu hình";
};

const DetailField = ({ label, value }) => (
  <div className="voucher-detail-field">
    <span>{label}</span>
    <strong>{value || "Chưa cấu hình"}</strong>
  </div>
);

const GiftDetailModal = ({ gift, loading, onClose }) => {
  if (!gift && !loading) return null;

  const imageUrl = gift ? getGiftImage(gift) : "";
  const statusClass = statusClasses[gift?.computed_status] || "status-coming-soon";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Chi tiết quà tặng</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            <HiOutlineX />
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
            </div>
          ) : (
            <>
              <section className="voucher-detail-section">
                <div className="voucher-detail-heading">
                  <span>Thông tin cơ bản</span>
                  <span className={`status-badge ${statusClass}`}>{gift.computed_status_label}</span>
                </div>
                <div className="gift-detail-layout">
                  <div className="gift-detail-image">
                    {imageUrl ? <img src={imageUrl} alt={gift.name} /> : <HiOutlineGift />}
                  </div>
                  <div className="voucher-detail-grid">
                    <DetailField label="Tên quà" value={gift.name} />
                    <DetailField label="Mã quà" value={gift.code} />
                    <DetailField label="Mô tả" value={gift.description} />
                    <DetailField label="Loại" value={gift.type_label || typeLabels[gift.type] || gift.type} />
                    <DetailField label="Giá trị" value={formatGiftValue(gift)} />
                    <DetailField label="Trạng thái" value={gift.computed_status_label} />
                  </div>
                </div>
              </section>

              <section className="voucher-detail-section">
                <div className="voucher-detail-heading">
                  <span>Điều kiện nhận</span>
                </div>
                <div className="voucher-detail-grid">
                  <DetailField label="Điều kiện" value={formatCondition(gift.condition)} />
                  <DetailField label="Thời gian áp dụng" value={`${formatDateTime(gift.start_date)} - ${formatDateTime(gift.end_date)}`} />
                </div>
              </section>

              <section className="voucher-detail-section">
                <div className="voucher-detail-heading">
                  <span>Số lượng</span>
                </div>
                <div className="voucher-detail-grid">
                  <DetailField label="Tổng số lượng" value={Number(gift.quantity || 0).toLocaleString("vi-VN")} />
                  <DetailField label="Đã phát" value={Number(gift.issued_quantity || 0).toLocaleString("vi-VN")} />
                  <DetailField label="Còn lại" value={Number(gift.remaining_quantity || 0).toLocaleString("vi-VN")} />
                </div>
              </section>

              <section className="voucher-detail-section">
                <div className="voucher-detail-heading">
                  <span>Thông tin hệ thống</span>
                </div>
                <div className="voucher-detail-grid">
                  <DetailField label="Người tạo" value={gift.created_by?.full_name || gift.created_by?.email || gift.created_by} />
                  <DetailField label="Ngày tạo" value={formatDateTime(gift.created_at)} />
                  <DetailField label="Ngày cập nhật" value={formatDateTime(gift.updated_at)} />
                </div>
              </section>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

const emptyGiftForm = {
  name: "",
  code: "",
  description: "",
  image_url: "",
  type: "ticket",
  value_label: "",
  value: "",
  quantity: "",
  min_order: "",
  member_tier: "",
  birthday: false,
  campaign: "",
  condition_note: "",
  start_date: "",
  end_date: "",
  status: "active",
};

const buildGiftFormFromGift = (gift) => ({
  name: gift?.name || "",
  code: gift?.code || "",
  description: gift?.description || "",
  image_url: gift?.image_url || "",
  type: gift?.type || "ticket",
  value_label: gift?.value_label || "",
  value: gift?.value ?? "",
  quantity: gift?.quantity ?? "",
  min_order: gift?.condition?.min_order ?? "",
  member_tier: gift?.condition?.member_tier || "",
  birthday: Boolean(gift?.condition?.birthday),
  campaign: gift?.condition?.campaign || "",
  condition_note: gift?.condition?.note || "",
  start_date: toDateTimeLocalValue(gift?.start_date),
  end_date: toDateTimeLocalValue(gift?.end_date),
  status: gift?.status || "active",
});

const GiftCreateModal = ({ isOpen, isLoading, onClose, onSubmit, initialData = null }) => {
  const [formData, setFormData] = useState(emptyGiftForm);
  const [errors, setErrors] = useState({});
  const isEditMode = Boolean(initialData?._id);
  const issuedQuantity = Number(initialData?.issued_quantity || 0);
  const isIssuedGift = isEditMode && issuedQuantity > 0;

  useEffect(() => {
    if (!isOpen) return;
    setFormData(initialData ? buildGiftFormFromGift(initialData) : emptyGiftForm);
    setErrors({});
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validate = () => {
    const nextErrors = {};
    const quantity = Number(formData.quantity);
    const value = formData.value === "" ? 0 : Number(formData.value);
    const minOrder = formData.min_order === "" ? null : Number(formData.min_order);
    const startDate = formData.start_date ? new Date(formData.start_date) : null;
    const endDate = formData.end_date ? new Date(formData.end_date) : null;
    const imagePattern = /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i;

    if (!formData.name.trim()) nextErrors.name = "Tên quà là bắt buộc";
    if (!isIssuedGift && !/^[A-Za-z0-9-]{2,}$/.test(formData.code.trim())) {
      nextErrors.code = "Mã quà chỉ gồm chữ không dấu, số và dấu -, tối thiểu 2 ký tự";
    }
    if (!isIssuedGift && !formData.value_label.trim() && (!Number.isFinite(value) || value <= 0)) {
      nextErrors.value_label = "Vui lòng nhập giá trị quà";
    }
    if (!isIssuedGift && ["voucher", "point"].includes(formData.type) && (!Number.isFinite(value) || value <= 0)) {
      nextErrors.value = formData.type === "point"
        ? "Quà điểm thưởng phải có số điểm lớn hơn 0"
        : "Quà voucher phải có giá trị lớn hơn 0";
    }
    if (!isIssuedGift && (!Number.isInteger(quantity) || quantity <= 0)) {
      nextErrors.quantity = "Tổng số lượng phải là số nguyên lớn hơn 0";
    }
    if (!isIssuedGift && minOrder !== null && (!Number.isFinite(minOrder) || minOrder < 0)) {
      nextErrors.min_order = "Đơn tối thiểu không hợp lệ";
    }
    if (!formData.start_date) nextErrors.start_date = "Ngày bắt đầu là bắt buộc";
    if (!formData.end_date) nextErrors.end_date = "Ngày kết thúc là bắt buộc";
    if (startDate && endDate && endDate <= startDate) {
      nextErrors.end_date = "Ngày kết thúc phải sau ngày bắt đầu";
    }
    if (formData.image_url.trim() && !imagePattern.test(formData.image_url.trim())) {
      nextErrors.image_url = "Ảnh phải là URL jpg, jpeg, png, webp hoặc gif";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) return;

    const issuedGiftPayload = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      image_url: formData.image_url.trim(),
      start_date: formData.start_date,
      end_date: formData.end_date,
      status: formData.status,
    };

    const fullPayload = {
      name: formData.name.trim(),
      code: formData.code.trim().toUpperCase(),
      description: formData.description.trim(),
      image_url: formData.image_url.trim(),
      type: formData.type,
      value_label: formData.value_label.trim(),
      value: formData.value === "" ? 0 : Number(formData.value),
      quantity: Number(formData.quantity),
      condition: {
        min_order: formData.min_order === "" ? null : Number(formData.min_order),
        member_tier: formData.member_tier,
        birthday: formData.birthday,
        campaign: formData.campaign.trim(),
        note: formData.condition_note.trim(),
      },
      start_date: formData.start_date,
      end_date: formData.end_date,
      status: formData.status,
    };

    onSubmit(isIssuedGift ? issuedGiftPayload : fullPayload);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{isEditMode ? "Chỉnh sửa quà tặng" : "Thêm quà tặng"}</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            <HiOutlineX />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body voucher-form">
            <section className="voucher-form-section">
              <h3>Thông tin cơ bản</h3>
              {isIssuedGift && (
                <p className="form-hint">
                  Quà đã phát {issuedQuantity.toLocaleString("vi-VN")} lượt nên chỉ có thể sửa tên, mô tả, hình ảnh, trạng thái và thời gian.
                </p>
              )}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Tên quà <span className="required">*</span></label>
                  <input className={`form-input ${errors.name ? "error" : ""}`} value={formData.name} onChange={(event) => handleChange("name", event.target.value)} />
                  {errors.name && <p className="form-error">{errors.name}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Mã quà <span className="required">*</span></label>
                  <input className={`form-input ${errors.code ? "error" : ""}`} value={formData.code} onChange={(event) => handleChange("code", event.target.value.toUpperCase())} disabled={isIssuedGift} />
                  {errors.code && <p className="form-error">{errors.code}</p>}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Mô tả</label>
                <textarea className="form-input form-textarea" value={formData.description} onChange={(event) => handleChange("description", event.target.value)} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Ảnh</label>
                  <input className={`form-input ${errors.image_url ? "error" : ""}`} placeholder="https://..." value={formData.image_url} onChange={(event) => handleChange("image_url", event.target.value)} />
                  {errors.image_url && <p className="form-error">{errors.image_url}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Loại quà <span className="required">*</span></label>
                  <select className="form-input" value={formData.type} onChange={(event) => handleChange("type", event.target.value)} disabled={isIssuedGift}>
                    <option value="ticket">Vé</option>
                    <option value="combo">Combo</option>
                    <option value="voucher">Voucher</option>
                    <option value="point">Điểm</option>
                    <option value="physical">Quà vật phẩm</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="voucher-form-section">
              <h3>Giá trị và số lượng</h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Giá trị hiển thị <span className="required">*</span></label>
                  <input className={`form-input ${errors.value_label ? "error" : ""}`} placeholder="Combo Big, Voucher 50.000 VNĐ, 500 điểm" value={formData.value_label} onChange={(event) => handleChange("value_label", event.target.value)} disabled={isIssuedGift} />
                  {errors.value_label && <p className="form-error">{errors.value_label}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Giá trị quy đổi</label>
                  <input className={`form-input ${errors.value ? "error" : ""}`} type="number" min="0" value={formData.value} onChange={(event) => handleChange("value", event.target.value)} disabled={isIssuedGift} />
                  {errors.value && <p className="form-error">{errors.value}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Tổng số lượng <span className="required">*</span></label>
                  <input className={`form-input ${errors.quantity ? "error" : ""}`} type="number" min="1" value={formData.quantity} onChange={(event) => handleChange("quantity", event.target.value)} disabled={isIssuedGift} />
                  {errors.quantity && <p className="form-error">{errors.quantity}</p>}
                </div>
              </div>
            </section>

            <section className="voucher-form-section">
              <h3>Điều kiện nhận</h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Đơn tối thiểu</label>
                  <input className={`form-input ${errors.min_order ? "error" : ""}`} type="number" min="0" placeholder="300000" value={formData.min_order} onChange={(event) => handleChange("min_order", event.target.value)} disabled={isIssuedGift} />
                  {errors.min_order && <p className="form-error">{errors.min_order}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Hạng thành viên</label>
                  <select className="form-input" value={formData.member_tier} onChange={(event) => handleChange("member_tier", event.target.value)} disabled={isIssuedGift}>
                    <option value="">Không yêu cầu</option>
                    <option value="member">Member</option>
                    <option value="gold">Gold</option>
                    <option value="vip">VIP</option>
                    <option value="vvip">VVIP</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Chương trình</label>
                  <input className="form-input" placeholder="Sinh nhật Aura, Khách Gold..." value={formData.campaign} onChange={(event) => handleChange("campaign", event.target.value)} disabled={isIssuedGift} />
                </div>
              </div>
              <div className="segmented-options">
                <label>
                  <input type="checkbox" checked={formData.birthday} onChange={(event) => handleChange("birthday", event.target.checked)} disabled={isIssuedGift} />
                  Sinh nhật
                </label>
              </div>
              <div className="form-group">
                <label className="form-label">Ghi chú điều kiện</label>
                <textarea className="form-input form-textarea" placeholder="Ví dụ: Đơn trên 300.000 VNĐ, khách Gold, sinh nhật..." value={formData.condition_note} onChange={(event) => handleChange("condition_note", event.target.value)} disabled={isIssuedGift} />
              </div>
            </section>

            <section className="voucher-form-section">
              <h3>Thời gian</h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Ngày bắt đầu <span className="required">*</span></label>
                  <input className={`form-input ${errors.start_date ? "error" : ""}`} type="datetime-local" value={formData.start_date} onChange={(event) => handleChange("start_date", event.target.value)} />
                  {errors.start_date && <p className="form-error">{errors.start_date}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Ngày kết thúc <span className="required">*</span></label>
                  <input className={`form-input ${errors.end_date ? "error" : ""}`} type="datetime-local" value={formData.end_date} onChange={(event) => handleChange("end_date", event.target.value)} />
                  {errors.end_date && <p className="form-error">{errors.end_date}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Trạng thái</label>
                  <select className="form-input" value={formData.status} onChange={(event) => handleChange("status", event.target.value)}>
                    <option value="active">Kích hoạt</option>
                    <option value="draft">Nháp</option>
                  </select>
                </div>
              </div>
            </section>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy bỏ</button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>{isLoading ? "Đang lưu..." : isEditMode ? "Lưu thay đổi" : "Tạo quà tặng"}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const GiftsPage = () => {
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [detailGift, setDetailGift] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editGift, setEditGift] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const addToast = useCallback((type, message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const fetchGifts = useCallback(
    async (page = 1, overrides = {}) => {
      try {
        setLoading(true);
        const response = await getGifts({
          q: overrides.q ?? searchQuery.trim(),
          type: overrides.type ?? typeFilter,
          status: overrides.status ?? statusFilter,
          stock: overrides.stock ?? stockFilter,
          sort_by: overrides.sort_by ?? sortBy,
          sort_order: overrides.sort_order ?? sortOrder,
          page,
          limit: PAGE_SIZE,
        });

        setGifts(response.data || []);
        setCurrentPage(response.pagination?.page || page);
        setTotalPages(response.pagination?.totalPages || 1);
        setTotalItems(response.pagination?.totalItems || 0);
      } catch (error) {
        addToast("error", error.response?.data?.message || "Không thể tải danh sách quà tặng");
      } finally {
        setLoading(false);
      }
    },
    [addToast, searchQuery, sortBy, sortOrder, statusFilter, stockFilter, typeFilter],
  );

  useEffect(() => {
    fetchGifts(1);
  }, [fetchGifts]);

  const handleSearch = (event) => {
    const value = event.target.value;
    setSearchQuery(value);
    fetchGifts(1, { q: value.trim() });
  };

  const handleFilterChange = (setter, key) => (event) => {
    const value = event.target.value;
    setter(value);
    fetchGifts(1, { [key]: value });
  };

  const handleSortChange = (event) => {
    const [nextSortBy, nextSortOrder] = event.target.value.split(":");
    setSortBy(nextSortBy);
    setSortOrder(nextSortOrder);
    fetchGifts(1, { sort_by: nextSortBy, sort_order: nextSortOrder });
  };

  const handleViewDetail = async (gift) => {
    try {
      setDetailGift(gift);
      setDetailLoading(true);
      const response = await getGiftById(gift._id);
      setDetailGift(response.data);
    } catch (error) {
      addToast("error", error.response?.data?.message || "Không thể tải chi tiết quà tặng");
      setDetailGift(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleEditGift = async (gift) => {
    try {
      setDetailLoading(true);
      const response = await getGiftById(gift._id);
      setEditGift(response.data);
    } catch (error) {
      addToast("error", error.response?.data?.message || "Không thể tải quà tặng để chỉnh sửa");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateGift = async (payload) => {
    try {
      setSubmitting(true);
      const response = await createGift(payload);
      addToast("success", response.message || "Tạo quà tặng thành công.");
      setIsCreateModalOpen(false);
      fetchGifts(1);
    } catch (error) {
      addToast("error", error.response?.data?.message || "Không thể tạo quà tặng");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateGift = async (payload) => {
    if (!editGift?._id) return;

    try {
      setSubmitting(true);
      const response = await updateGift(editGift._id, payload);
      addToast("success", response.message || "Cập nhật quà tặng thành công.");
      setEditGift(null);
      fetchGifts(currentPage);
    } catch (error) {
      addToast("error", error.response?.data?.message || "Không thể cập nhật quà tặng");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-info">
          <h1>Quản lý Quà tặng</h1>
          <p>Theo dõi mã quà, số lượng, thời gian áp dụng và trạng thái phát quà.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
            <HiOutlinePlus />
            Thêm quà
          </button>
          <button className="btn btn-secondary" onClick={() => fetchGifts(currentPage)} disabled={loading}>
            <HiOutlineRefresh />
            Làm mới
          </button>
        </div>
      </div>

      <div className="content-card">
        <div className="table-toolbar">
          <div className="table-toolbar-left">
            <span className="table-toolbar-title">Danh sách quà tặng</span>
            <span className="table-toolbar-count">{totalItems} kết quả</span>
          </div>
          <div className="search-box">
            <HiOutlineSearch className="search-icon" />
            <input
              type="text"
              placeholder="Tìm theo mã hoặc tên quà..."
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>
        </div>

        <div className="table-toolbar" style={{ borderTop: "1px solid var(--color-border)" }}>
          <div className="table-toolbar-left voucher-filter-row">
            <select className="user-filter-select" value={typeFilter} onChange={handleFilterChange(setTypeFilter, "type")}>
              <option value="">Tất cả loại quà</option>
              <option value="ticket">Vé miễn phí</option>
              <option value="combo">Combo bắp nước</option>
              <option value="voucher">Voucher</option>
              <option value="point">Điểm thưởng</option>
              <option value="physical">Quà vật phẩm</option>
            </select>
            <select className="user-filter-select" value={statusFilter} onChange={handleFilterChange(setStatusFilter, "status")}>
              <option value="">Tất cả trạng thái</option>
              <option value="draft">Nháp</option>
              <option value="upcoming">Sắp diễn ra</option>
              <option value="active">Đang hoạt động</option>
              <option value="paused">Tạm dừng</option>
              <option value="out_of_stock">Hết quà</option>
              <option value="expired">Hết hạn</option>
              <option value="cancelled">Đã hủy</option>
            </select>
            <select className="user-filter-select" value={stockFilter} onChange={handleFilterChange(setStockFilter, "stock")}>
              <option value="">Tất cả tồn quà</option>
              <option value="available">Còn quà</option>
              <option value="out_of_stock">Hết quà</option>
            </select>
            <select className="user-filter-select voucher-sort-select" value={`${sortBy}:${sortOrder}`} onChange={handleSortChange}>
              <option value="created_at:desc">Mới tạo gần nhất</option>
              <option value="created_at:asc">Mới tạo cũ nhất</option>
              <option value="start_date:asc">Ngày bắt đầu gần nhất</option>
              <option value="end_date:asc">Ngày kết thúc gần nhất</option>
              <option value="issued_quantity:desc">Đã phát nhiều nhất</option>
              <option value="remaining_quantity:asc">Còn lại ít nhất</option>
              <option value="quantity:desc">Số lượng cao nhất</option>
              <option value="value:desc">Giá trị cao nhất</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
        ) : (
          <>
            <div className="table-wrapper vouchers-table-wrapper">
              <table className="data-table vouchers-table gifts-table">
                <thead>
                  <tr>
                    <th style={{ width: "74px" }}>Hình ảnh</th>
                    <th style={{ width: "120px" }}>Mã quà</th>
                    <th>Tên quà</th>
                    <th style={{ width: "140px" }}>Loại quà</th>
                    <th style={{ width: "120px" }}>Giá trị</th>
                    <th style={{ width: "100px" }}>Số lượng</th>
                    <th style={{ width: "100px" }}>Đã phát</th>
                    <th style={{ width: "100px" }}>Còn lại</th>
                    <th style={{ width: "180px" }}>Thời gian áp dụng</th>
                    <th style={{ width: "140px" }}>Trạng thái</th>
                    <th style={{ width: "170px", textAlign: "center" }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {gifts.length === 0 ? (
                    <tr>
                      <td colSpan="11">
                        <div className="table-empty">
                          <div className="table-empty-icon">%</div>
                          <div className="table-empty-text">Chưa có quà tặng phù hợp</div>
                          <div className="table-empty-sub">Thử thay đổi từ khóa, bộ lọc hoặc cách sắp xếp.</div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    gifts.map((gift) => {
                      const imageUrl = getGiftImage(gift);
                      const statusClass = statusClasses[gift.computed_status] || "status-coming-soon";

                      return (
                        <tr key={gift._id}>
                          <td>
                            <div className="gift-thumb">
                              {imageUrl ? <img src={imageUrl} alt={gift.name} /> : <HiOutlineGift />}
                            </div>
                          </td>
                          <td><span className="voucher-code">{gift.code}</span></td>
                          <td>
                            <div className="table-cell-name">{gift.name}</div>
                            {gift.description && <div className="table-cell-desc">{gift.description}</div>}
                          </td>
                          <td>{gift.type_label || typeLabels[gift.type] || gift.type}</td>
                          <td className="voucher-discount-value">{formatGiftValue(gift)}</td>
                          <td>{Number(gift.quantity || 0).toLocaleString("vi-VN")}</td>
                          <td>{Number(gift.issued_quantity || 0).toLocaleString("vi-VN")}</td>
                          <td>
                            <strong className="text-usage">{Number(gift.remaining_quantity || 0).toLocaleString("vi-VN")}</strong>
                          </td>
                          <td className="table-cell-date">
                            {formatDate(gift.start_date)} - {formatDate(gift.end_date)}
                          </td>
                          <td>
                            <span className={`status-badge ${statusClass}`}>{gift.computed_status_label}</span>
                          </td>
                          <td>
                            <div className="table-actions" style={{ justifyContent: "center" }}>
                              <button className="btn btn-icon btn-ghost" title="Xem chi tiết" onClick={() => handleViewDetail(gift)}>
                                <HiOutlineEye />
                              </button>
                              <button className="btn btn-icon btn-ghost" title="Chỉnh sửa" onClick={() => handleEditGift(gift)}>
                                <HiOutlinePencil />
                              </button>
                              <button className="btn btn-icon btn-ghost" title={gift.status === "active" ? "Tạm dừng" : "Kích hoạt"} disabled>
                                {gift.status === "active" ? <HiOutlinePause /> : <HiOutlinePlay />}
                              </button>
                              <button className="btn btn-icon btn-ghost btn-danger-text" title="Xóa" disabled>
                                <HiOutlineTrash />
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
              <button className="btn btn-secondary" onClick={() => fetchGifts(currentPage - 1)} disabled={currentPage === 1}>
                Trước
              </button>
              <span className="pagination-info">
                Trang {currentPage} / {totalPages}
              </span>
              <button className="btn btn-secondary" onClick={() => fetchGifts(currentPage + 1)} disabled={currentPage === totalPages}>
                Sau
              </button>
            </div>
          </>
        )}
      </div>

      <div className="toast-container">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            type={toast.type}
            message={toast.message}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      <GiftDetailModal
        gift={detailGift}
        loading={detailLoading}
        onClose={() => {
          setDetailGift(null);
          setDetailLoading(false);
        }}
      />

      <GiftCreateModal
        isOpen={isCreateModalOpen}
        isLoading={submitting}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateGift}
      />

      <GiftCreateModal
        isOpen={Boolean(editGift)}
        isLoading={submitting}
        onClose={() => setEditGift(null)}
        onSubmit={handleUpdateGift}
        initialData={editGift}
      />
    </>
  );
};

export default GiftsPage;
