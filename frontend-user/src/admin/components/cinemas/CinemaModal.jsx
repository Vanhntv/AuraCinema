import { useEffect, useState } from "react";
import { HiOutlineX } from "react-icons/hi";

const emptyForm = {
  name: "",
  address: "",
  city: "",
  phone: "",
  image: "",
};

const CinemaModal = ({ isOpen, onClose, onSubmit, initialData, isLoading }) => {
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const isEditing = !!initialData;

  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setFormData({
        name: initialData.name || "",
        address: initialData.address || "",
        city: initialData.city || "",
        phone: initialData.phone || "",
        image: initialData.image || "",
      });
    } else {
      setFormData(emptyForm);
    }

    setErrors({});
  }, [isOpen, initialData]);

  const validate = () => {
    const nextErrors = {};

    if (!formData.name.trim()) {
      nextErrors.name = "Tên rạp không được để trống";
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

    onSubmit({
      name: formData.name.trim(),
      address: formData.address.trim() || null,
      city: formData.city.trim() || null,
      phone: formData.phone.trim() || null,
      image: formData.image.trim() || null,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {isEditing ? "Chỉnh sửa rạp chiếu" : "Thêm rạp chiếu mới"}
          </h2>
          <button type="button" className="modal-close" onClick={onClose}>
            <HiOutlineX />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group form-group-2">
                <label className="form-label">
                  Tên rạp <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className={`form-input ${errors.name ? "error" : ""}`}
                  placeholder="Nhập tên rạp..."
                  value={formData.name}
                  onChange={(event) => handleChange("name", event.target.value)}
                  autoFocus
                  id="input-cinema-name"
                />
                {errors.name && <p className="form-error">{errors.name}</p>}
              </div>

              <div className="form-group form-group-1">
                <label className="form-label">Thành phố</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="TP. Hồ Chí Minh"
                  value={formData.city}
                  onChange={(event) => handleChange("city", event.target.value)}
                  id="input-cinema-city"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group form-group-2">
                <label className="form-label">Địa chỉ</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nhập địa chỉ rạp..."
                  value={formData.address}
                  onChange={(event) => handleChange("address", event.target.value)}
                  id="input-cinema-address"
                />
              </div>

              <div className="form-group form-group-1">
                <label className="form-label">Số điện thoại</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="0900000000"
                  value={formData.phone}
                  onChange={(event) => handleChange("phone", event.target.value)}
                  id="input-cinema-phone"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Hình ảnh</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://example.com/cinema.jpg"
                value={formData.image}
                onChange={(event) => handleChange("image", event.target.value)}
                id="input-cinema-image"
              />
              {formData.image && (
                <div className="form-preview cinema-preview">
                  <img
                    src={formData.image}
                    alt="Xem trước rạp"
                    onError={(event) => {
                      event.currentTarget.src =
                        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='160'%3E%3Crect fill='%23151c2e' width='320' height='160'/%3E%3Ctext fill='%2394a3b8' font-size='16' x='104' y='86'%3EImage error%3C/text%3E%3C/svg%3E";
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Hủy bỏ
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? "Đang xử lý..." : isEditing ? "Cập nhật" : "Thêm mới"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CinemaModal;
