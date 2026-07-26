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

const ConcessionContentModal = ({ item, isLoading, onClose, onSubmit }) => {
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [errors, setErrors] = useState({});

  const currentImageUrl = resolveImageUrl(item?.image);
  const previewUrl = useMemo(() => {
    if (!image) return "";
    return URL.createObjectURL(image);
  }, [image]);

  useEffect(() => {
    if (!item) return;
    setDescription(item.description || "");
    setImage(null);
    setErrors({});
  }, [item]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!item) return null;

  const validate = () => {
    const nextErrors = {};

    if (image && !acceptedImageTypes.includes(image.type)) {
      nextErrors.image = "Ảnh chỉ hỗ trợ jpg, jpeg, png hoặc webp";
    }

    if (!image && !currentImageUrl) {
      nextErrors.image = "Dịch vụ cần có ít nhất một ảnh minh họa";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) return;

    const payload = new FormData();
    payload.append("description", description.trim());
    if (image) {
      payload.append("image", image);
    }

    onSubmit(item, payload);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Cập nhật hình ảnh và mô tả</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            <HiOutlineX />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="content-update-heading">
              <span>Dịch vụ</span>
              <strong>{item.name}</strong>
            </div>

            <div className="form-group">
              <label className="form-label">Mô tả</label>
              <textarea
                className="form-input form-textarea"
                placeholder="Thành phần hoặc thông tin dịch vụ..."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Hình ảnh</label>
              <div className="content-image-preview">
                {previewUrl || currentImageUrl ? (
                  <img src={previewUrl || currentImageUrl} alt={item.name} />
                ) : (
                  <HiOutlinePhotograph />
                )}
              </div>
              <input
                type="file"
                className={`form-input ${errors.image ? "error" : ""}`}
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  setImage(event.target.files?.[0] || null);
                  if (errors.image) setErrors((prev) => ({ ...prev, image: "" }));
                }}
              />
              {errors.image && <p className="form-error">{errors.image}</p>}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Hủy bỏ
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? "Đang lưu..." : "Cập nhật"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConcessionContentModal;
