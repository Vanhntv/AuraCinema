import { useEffect, useState } from "react";
import { HiOutlineX } from "react-icons/hi";

const emptyForm = {
  name: "",
  code: "",
  description: "",
  image_url: "",
  discount_type: "percent",
  discount_value: "",
  max_discount_amount: "",
  min_order: "0",
  start_date: "",
  end_date: "",
  usage_limit: "",
  usage_limit_per_user: "1",
  apply_scope: "order",
  applicable_movie_ids: "",
  applicable_member_tiers: [],
  status_mode: "active",
};

const memberTierOptions = ["member", "vip", "vvip"];

const toDateTimeLocalValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
};

const stringifyMovieIds = (value) => {
  if (!Array.isArray(value)) return "";
  return value
    .map((item) => item?._id || item)
    .filter(Boolean)
    .join(", ");
};

const buildFormFromVoucher = (voucher) => ({
  name: voucher?.name || "",
  code: voucher?.code || "",
  description: voucher?.description || "",
  image_url: voucher?.image_url || "",
  discount_type: voucher?.discount_type || "percent",
  discount_value: voucher?.discount_value ?? "",
  max_discount_amount: voucher?.max_discount_amount ?? "",
  min_order: voucher?.min_order ?? "0",
  start_date: toDateTimeLocalValue(voucher?.start_date),
  end_date: toDateTimeLocalValue(voucher?.end_date),
  usage_limit: voucher?.usage_limit ?? voucher?.quantity ?? "",
  usage_limit_per_user: voucher?.usage_limit_per_user ?? "1",
  apply_scope: voucher?.apply_scope || "order",
  applicable_movie_ids: stringifyMovieIds(voucher?.applicable_movie_ids),
  applicable_member_tiers: Array.isArray(voucher?.applicable_member_tiers)
    ? voucher.applicable_member_tiers
    : [],
  status_mode: voucher?.status === false ? "draft" : "active",
});

const VoucherModal = ({ isOpen, onClose, onSubmit, isLoading, initialData = null }) => {
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const isEditMode = Boolean(initialData?._id);
  const usageCount = Number(initialData?.usage_count || 0);
  const isUsedVoucher = isEditMode && usageCount > 0;

  useEffect(() => {
    if (!isOpen) return;
    setFormData(initialData ? buildFormFromVoucher(initialData) : emptyForm);
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
    const discountValue = Number(formData.discount_value);
    const minOrder = Number(formData.min_order || 0);
    const maxDiscount = formData.max_discount_amount === "" ? null : Number(formData.max_discount_amount);
    const usageLimit = Number(formData.usage_limit);
    const usagePerUser = Number(formData.usage_limit_per_user);
    const startDate = formData.start_date ? new Date(formData.start_date) : null;
    const endDate = formData.end_date ? new Date(formData.end_date) : null;

    if (!formData.name.trim()) nextErrors.name = "Tên chương trình là bắt buộc";
    if (!isUsedVoucher && !/^[A-Za-z0-9-]{3,}$/.test(formData.code.trim())) {
      nextErrors.code = "Mã cần ít nhất 3 ký tự, không dấu, không khoảng trắng, chỉ gồm chữ, số và dấu -";
    }
    if (!isUsedVoucher && (!Number.isFinite(discountValue) || discountValue <= 0)) {
      nextErrors.discount_value = "Giá trị giảm phải lớn hơn 0";
    }
    if (!isUsedVoucher && formData.discount_type === "percent" && discountValue > 100) {
      nextErrors.discount_value = "Giảm phần trăm không được vượt quá 100";
    }
    if (!isUsedVoucher && (!Number.isFinite(minOrder) || minOrder < 0)) {
      nextErrors.min_order = "Đơn hàng tối thiểu không hợp lệ";
    }
    if (!isUsedVoucher && maxDiscount !== null && (!Number.isFinite(maxDiscount) || maxDiscount < 0)) {
      nextErrors.max_discount_amount = "Giảm tối đa không được nhỏ hơn 0";
    }
    if (!isUsedVoucher && !formData.start_date) nextErrors.start_date = "Ngày bắt đầu là bắt buộc";
    if (!formData.end_date) nextErrors.end_date = "Ngày kết thúc là bắt buộc";
    if (startDate && endDate && endDate <= startDate) {
      nextErrors.end_date = "Ngày kết thúc phải sau ngày bắt đầu";
    }
    if (!Number.isInteger(usageLimit) || usageLimit <= 0) {
      nextErrors.usage_limit = "Tổng lượt sử dụng phải là số nguyên lớn hơn 0";
    }
    if (isEditMode && usageLimit < usageCount) {
      nextErrors.usage_limit = "Tổng lượt sử dụng không được nhỏ hơn số lượt đã dùng";
    }
    if (!isUsedVoucher && (!Number.isInteger(usagePerUser) || usagePerUser <= 0)) {
      nextErrors.usage_limit_per_user = "Lượt mỗi khách phải là số nguyên lớn hơn 0";
    }
    if (!isUsedVoucher && Number.isInteger(usageLimit) && Number.isInteger(usagePerUser) && usagePerUser > usageLimit) {
      nextErrors.usage_limit_per_user = "Lượt mỗi khách không được lớn hơn tổng lượt sử dụng";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleTierToggle = (tier, checked) => {
    setFormData((prev) => ({
      ...prev,
      applicable_member_tiers: checked
        ? [...prev.applicable_member_tiers, tier]
        : prev.applicable_member_tiers.filter((item) => item !== tier),
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) return;

    const usageLimit = Number(formData.usage_limit);
    const editableUsedPayload = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      end_date: formData.end_date,
      usage_limit: usageLimit,
      status: formData.status_mode === "active",
    };

    const fullPayload = {
      name: formData.name.trim(),
      code: formData.code.trim().toUpperCase(),
      description: formData.description.trim(),
      image_url: formData.image_url.trim(),
      discount_type: formData.discount_type,
      discount_value: Number(formData.discount_value),
      max_discount_amount: formData.max_discount_amount ? Number(formData.max_discount_amount) : null,
      min_order: Number(formData.min_order || 0),
      start_date: formData.start_date,
      end_date: formData.end_date,
      usage_limit: usageLimit,
      quantity: usageLimit,
      usage_limit_per_user: Number(formData.usage_limit_per_user),
      apply_scope: formData.apply_scope,
      applicable_movie_ids: formData.applicable_movie_ids
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      applicable_member_tiers: formData.applicable_member_tiers,
      status: formData.status_mode === "active",
    };

    onSubmit(isUsedVoucher ? editableUsedPayload : fullPayload);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{isEditMode ? "Chỉnh sửa mã giảm giá" : "Thêm mã giảm giá"}</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            <HiOutlineX />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body voucher-form">
            <section className="voucher-form-section">
              <h3>Thông tin cơ bản</h3>
              {isUsedVoucher && (
                <p className="form-hint">
                  Mã đã có {usageCount} lượt sử dụng nên chỉ có thể sửa tên, mô tả, ngày kết thúc, tổng lượt và trạng thái.
                </p>
              )}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Tên chương trình <span className="required">*</span></label>
                  <input className={`form-input ${errors.name ? "error" : ""}`} value={formData.name} onChange={(event) => handleChange("name", event.target.value)} />
                  {errors.name && <p className="form-error">{errors.name}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Mã giảm giá <span className="required">*</span></label>
                  <input className={`form-input ${errors.code ? "error" : ""}`} value={formData.code} onChange={(event) => handleChange("code", event.target.value.toUpperCase())} disabled={isUsedVoucher} />
                  {errors.code && <p className="form-error">{errors.code}</p>}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Mô tả</label>
                <textarea className="form-input form-textarea" value={formData.description} onChange={(event) => handleChange("description", event.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Ảnh chương trình</label>
                <input className="form-input" type="url" placeholder="https://..." value={formData.image_url} onChange={(event) => handleChange("image_url", event.target.value)} disabled={isUsedVoucher} />
              </div>
            </section>

            <section className="voucher-form-section">
              <h3>Loại giảm giá</h3>
              <div className="segmented-options">
                <label><input type="radio" checked={formData.discount_type === "percent"} onChange={() => handleChange("discount_type", "percent")} disabled={isUsedVoucher} /> Giảm theo phần trăm</label>
                <label><input type="radio" checked={formData.discount_type === "fixed"} onChange={() => handleChange("discount_type", "fixed")} disabled={isUsedVoucher} /> Giảm số tiền cố định</label>
              </div>
            </section>

            <section className="voucher-form-section">
              <h3>Điều kiện giá trị</h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Giá trị giảm <span className="required">*</span></label>
                  <input className={`form-input ${errors.discount_value ? "error" : ""}`} type="number" min="1" value={formData.discount_value} onChange={(event) => handleChange("discount_value", event.target.value)} disabled={isUsedVoucher} />
                  {errors.discount_value && <p className="form-error">{errors.discount_value}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Giảm tối đa</label>
                  <input className={`form-input ${errors.max_discount_amount ? "error" : ""}`} type="number" min="0" value={formData.max_discount_amount} onChange={(event) => handleChange("max_discount_amount", event.target.value)} disabled={isUsedVoucher} />
                  {errors.max_discount_amount && <p className="form-error">{errors.max_discount_amount}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Đơn hàng tối thiểu</label>
                  <input className={`form-input ${errors.min_order ? "error" : ""}`} type="number" min="0" value={formData.min_order} onChange={(event) => handleChange("min_order", event.target.value)} disabled={isUsedVoucher} />
                  {errors.min_order && <p className="form-error">{errors.min_order}</p>}
                </div>
              </div>
            </section>

            <section className="voucher-form-section">
              <h3>Thời gian áp dụng</h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Ngày bắt đầu <span className="required">*</span></label>
                  <input className={`form-input ${errors.start_date ? "error" : ""}`} type="datetime-local" value={formData.start_date} onChange={(event) => handleChange("start_date", event.target.value)} disabled={isUsedVoucher} />
                  {errors.start_date && <p className="form-error">{errors.start_date}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Ngày kết thúc <span className="required">*</span></label>
                  <input className={`form-input ${errors.end_date ? "error" : ""}`} type="datetime-local" value={formData.end_date} onChange={(event) => handleChange("end_date", event.target.value)} />
                  {errors.end_date && <p className="form-error">{errors.end_date}</p>}
                </div>
              </div>
            </section>

            <section className="voucher-form-section">
              <h3>Giới hạn sử dụng</h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Tổng số lượt sử dụng <span className="required">*</span></label>
                  <input className={`form-input ${errors.usage_limit ? "error" : ""}`} type="number" min="1" value={formData.usage_limit} onChange={(event) => handleChange("usage_limit", event.target.value)} />
                  {errors.usage_limit && <p className="form-error">{errors.usage_limit}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Số lượt mỗi khách hàng</label>
                  <input className={`form-input ${errors.usage_limit_per_user ? "error" : ""}`} type="number" min="1" value={formData.usage_limit_per_user} onChange={(event) => handleChange("usage_limit_per_user", event.target.value)} disabled={isUsedVoucher} />
                  {errors.usage_limit_per_user && <p className="form-error">{errors.usage_limit_per_user}</p>}
                </div>
              </div>
            </section>

            <section className="voucher-form-section">
              <h3>Phạm vi áp dụng</h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Phạm vi</label>
                  <select className="form-input" value={formData.apply_scope} onChange={(event) => handleChange("apply_scope", event.target.value)} disabled={isUsedVoucher}>
                    <option value="order">Toàn đơn hàng</option>
                    <option value="ticket">Vé xem phim</option>
                    <option value="concession">Bắp nước</option>
                    <option value="movie">Phim cụ thể</option>
                    <option value="member">Hạng thành viên</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Phim cụ thể</label>
                  <input className="form-input" placeholder="Nhập ID phim, cách nhau bằng dấu phẩy" value={formData.applicable_movie_ids} onChange={(event) => handleChange("applicable_movie_ids", event.target.value)} disabled={isUsedVoucher} />
                </div>
              </div>
              <div className="segmented-options">
                {memberTierOptions.map((tier) => (
                  <label key={tier}>
                    <input type="checkbox" checked={formData.applicable_member_tiers.includes(tier)} onChange={(event) => handleTierToggle(tier, event.target.checked)} disabled={isUsedVoucher} />
                    {tier.toUpperCase()}
                  </label>
                ))}
              </div>
            </section>

            <section className="voucher-form-section">
              <h3>Trạng thái</h3>
              <div className="segmented-options">
                <label><input type="radio" checked={formData.status_mode === "draft"} onChange={() => handleChange("status_mode", "draft")} /> Lưu nháp</label>
                <label><input type="radio" checked={formData.status_mode === "active"} onChange={() => handleChange("status_mode", "active")} /> Kích hoạt ngay</label>
              </div>
            </section>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy bỏ</button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>{isLoading ? "Đang lưu..." : isEditMode ? "Lưu thay đổi" : "Tạo mã giảm giá"}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VoucherModal;
