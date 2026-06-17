import { useState, useEffect } from "react";
import { HiOutlineX } from "react-icons/hi";

const GenreModal = ({ isOpen, onClose, onSubmit, initialData, isLoading }) => {
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [errors, setErrors] = useState({});
  const isEditing = !!initialData;

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          name: initialData.name || "",
          description: initialData.description || "",
        });
      } else {
        setFormData({ name: "", description: "" });
      }
      setErrors({});
    }
  }, [isOpen, initialData]);

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = "Tên thể loại không được để trống";
    }
    if (!formData.description.trim()) {
      newErrors.description = "Mô tả không được để trống";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {isEditing ? "Chỉnh sửa thể loại" : "Thêm thể loại mới"}
          </h2>
          <button className="modal-close" onClick={onClose}>
            <HiOutlineX />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">
                Tên thể loại <span className="required">*</span>
              </label>
              <input
                type="text"
                className={`form-input ${errors.name ? "error" : ""}`}
                placeholder="Nhập tên thể loại..."
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                autoFocus
                id="input-genre-name"
              />
              {errors.name && <p className="form-error">{errors.name}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">
                Mô tả <span className="required">*</span>
              </label>
              <textarea
                className={`form-input form-textarea ${errors.description ? "error" : ""}`}
                placeholder="Nhập mô tả thể loại..."
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                id="input-genre-description"
              />
              {errors.description && (
                <p className="form-error">{errors.description}</p>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Hủy bỏ
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading
                ? "Đang xử lý..."
                : isEditing
                ? "Cập nhật"
                : "Thêm mới"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GenreModal;
