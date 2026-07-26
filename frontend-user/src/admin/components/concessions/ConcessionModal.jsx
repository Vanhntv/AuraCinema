import { useEffect, useMemo, useState } from "react";
import { HiOutlineX } from "react-icons/hi";

const emptyForm = {
  name: "",
  type: "popcorn",
  price: "",
  stock: "0",
  description: "",
  status: true,
  image: null,
};

const acceptedImageTypes = ["image/jpeg", "image/png", "image/webp"];

const ConcessionModal = ({ isOpen, onClose, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  const previewUrl = useMemo(() => {
    if (!formData.image) return "";
    return URL.createObjectURL(formData.image);
  }, [formData.image]);

  useEffect(() => {
    if (!isOpen) return;
    setFormData(emptyForm);
    setErrors({});
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const validate = () => {
    const nextErrors = {};
    const price = Number(formData.price);
    const stock = Number(formData.stock);

    if (formData.name.trim().length < 3) {
      nextErrors.name = "Tên dịch vụ cần từ 3 ký tự";
    }

    if (!Number.isFinite(price) || price <= 0) {
      nextErrors.price = "Giá bán phải lớn hơn 0";
    }

    if (!Number.isInteger(stock) || stock < 0) {
      nextErrors.stock = "Tồn kho phải là số nguyên không âm";
    }

    if (!formData.image) {
      nextErrors.image = "Vui lòng chọn ảnh minh họa";
    } else if (!acceptedImageTypes.includes(formData.image.type)) {
      nextErrors.image = "Ảnh chỉ hỗ trợ jpg, jpeg, png hoặc webp";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
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
    payload.append("image", formData.image);

    onSubmit(payload, formData.name.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Thêm dịch vụ bắp nước</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            <HiOutlineX />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group form-group-2">
                <label className="form-label">
                  Tên dịch vụ <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className={`form-input ${errors.name ? "error" : ""}`}
                  placeholder="Ví dụ: Bắp rang bơ lớn"
                  value={formData.name}
                  onChange={(event) => handleChange("name", event.target.value)}
                  autoFocus
                />
                {errors.name && <p className="form-error">{errors.name}</p>}
              </div>

              <div className="form-group form-group-1">
                <label className="form-label">Loại</label>
                <select
                  className="form-input"
                  value={formData.type}
                  onChange={(event) => handleChange("type", event.target.value)}
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
                  min="1"
                  step="1000"
                  className={`form-input ${errors.price ? "error" : ""}`}
                  placeholder="59000"
                  value={formData.price}
                  onChange={(event) => handleChange("price", event.target.value)}
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
                  onChange={(event) => handleChange("stock", event.target.value)}
                />
                {errors.stock && <p className="form-error">{errors.stock}</p>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Mô tả</label>
              <textarea
                className="form-input form-textarea"
                placeholder="Thành phần hoặc ghi chú ngắn cho dịch vụ..."
                value={formData.description}
                onChange={(event) => handleChange("description", event.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Hình ảnh <span className="required">*</span>
              </label>
              <input
                type="file"
                className={`form-input ${errors.image ? "error" : ""}`}
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={(event) =>
                  handleChange("image", event.target.files?.[0] || null)
                }
              />
              {errors.image && <p className="form-error">{errors.image}</p>}
              {previewUrl && (
                <div className="form-preview concession-preview">
                  <img src={previewUrl} alt="Xem trước dịch vụ" />
                </div>
              )}
            </div>

            <label className="form-check">
              <input
                type="checkbox"
                checked={formData.status}
                onChange={(event) => handleChange("status", event.target.checked)}
              />
              <span>Đang bán</span>
            </label>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Hủy bỏ
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? "Đang lưu..." : "Thêm dịch vụ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConcessionModal;
