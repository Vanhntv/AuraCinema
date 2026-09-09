import { useEffect, useMemo, useState } from "react";
import { HiOutlinePhotograph, HiOutlineX } from "react-icons/hi";

const acceptedImageTypes = ["image/jpeg", "image/png", "image/webp"];

const resolveImageUrl = (image) => {
  if (!image) return "";
  if (/^https?:\/\//i.test(image)) return image;

  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5001/api";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${image.startsWith("/") ? image : `/${image}`}`;
};

const ConcessionEditForm = ({ item, isLoading, onClose, onSubmit }) => {
  const [formData, setFormData] = useState(() => ({
    name: item.name || "",
    type: item.type || "combo",
    price: String(item.price ?? ""),
    stock: String(item.stock ?? 0),
    description: item.description || "",
    status: Boolean(item.status),
    image: null,
  }));
  const [errors, setErrors] = useState({});

  const currentImageUrl = resolveImageUrl(item.image);
  const previewUrl = useMemo(() => {
    if (!formData.image) return "";
    return URL.createObjectURL(formData.image);
  }, [formData.image]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const updateField = (field, value) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
    if (errors[field]) {
      setErrors((previous) => ({ ...previous, [field]: "" }));
    }
  };

  const validate = () => {
    const nextErrors = {};
    const price = Number(formData.price);
    const stock = Number(formData.stock);

    if (formData.name.trim().length < 3) {
      nextErrors.name = "Tên dịch vụ cần từ 3 ký tự";
    }

    if (!Number.isFinite(price) || price <= 0) {
      nextErrors.price = "Giá bán phải lớn hơn 0";
    } else if (!Number.isInteger(price) || price % 1000 !== 0) {
      nextErrors.price = "Giá bán phải là bội số của 1.000đ";
    }

    if (!Number.isInteger(stock) || stock < 0) {
      nextErrors.stock = "Tồn kho phải là số nguyên không âm";
    }

    if (formData.image && !acceptedImageTypes.includes(formData.image.type)) {
      nextErrors.image = "Ảnh chỉ hỗ trợ jpg, jpeg, png hoặc webp";
    }

    if (!formData.image && !currentImageUrl) {
      nextErrors.image = "Dịch vụ cần có ít nhất một ảnh minh họa";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) return;

    const payload = new FormData();
    payload.append("name", formData.name.trim());
    payload.append("type", formData.type);
    payload.append("price", String(Number(formData.price)));
    payload.append("stock", String(Number(formData.stock)));
    payload.append("description", formData.description.trim());
    payload.append("status", String(formData.status));
    if (formData.image) payload.append("image", formData.image);

    onSubmit(item, payload);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Chỉnh sửa dịch vụ bắp nước</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Đóng">
            <HiOutlineX />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body concession-edit-body">
            <div className="form-row">
              <div className="form-group form-group-2">
                <label className="form-label">
                  Tên dịch vụ <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className={`form-input ${errors.name ? "error" : ""}`}
                  value={formData.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  autoFocus
                />
                {errors.name && <p className="form-error">{errors.name}</p>}
              </div>

              <div className="form-group form-group-1">
                <label className="form-label">Loại</label>
                <select
                  className="form-input"
                  value={formData.type}
                  onChange={(event) => updateField("type", event.target.value)}
                >
                  <option value="popcorn">Bắp</option>
                  <option value="drink">Nước</option>
                  <option value="snack">Snack</option>
                  <option value="combo">Combo</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  Giá bán <span className="required">*</span>
                </label>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  className={`form-input ${errors.price ? "error" : ""}`}
                  value={formData.price}
                  onChange={(event) => updateField("price", event.target.value)}
                />
                {errors.price && <p className="form-error">{errors.price}</p>}
              </div>

              <div className="form-group">
                <label className="form-label">Tồn kho</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className={`form-input ${errors.stock ? "error" : ""}`}
                  value={formData.stock}
                  onChange={(event) => updateField("stock", event.target.value)}
                />
                {errors.stock && <p className="form-error">{errors.stock}</p>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Mô tả</label>
              <textarea
                className="form-input form-textarea"
                placeholder="Thành phần hoặc thông tin dịch vụ..."
                value={formData.description}
                onChange={(event) => updateField("description", event.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Hình ảnh</label>
              <div className="content-image-preview concession-edit-image">
                {previewUrl || currentImageUrl ? (
                  <img src={previewUrl || currentImageUrl} alt={formData.name} />
                ) : (
                  <HiOutlinePhotograph />
                )}
              </div>
              <input
                type="file"
                className={`form-input ${errors.image ? "error" : ""}`}
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={(event) => updateField("image", event.target.files?.[0] || null)}
              />
              <p className="form-hint">Để trống nếu muốn giữ nguyên ảnh hiện tại.</p>
              {errors.image && <p className="form-error">{errors.image}</p>}
            </div>

            <label className="form-check">
              <input
                type="checkbox"
                checked={formData.status}
                onChange={(event) => updateField("status", event.target.checked)}
              />
              <span>Đang bán</span>
            </label>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isLoading}>
              Hủy bỏ
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ConcessionEditModal = (props) => {
  if (!props.item) return null;
  return <ConcessionEditForm key={props.item._id} {...props} />;
};

export default ConcessionEditModal;
