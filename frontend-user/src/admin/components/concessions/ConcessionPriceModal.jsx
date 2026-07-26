import { useEffect, useState } from "react";
import { HiOutlineX } from "react-icons/hi";

const formatCurrency = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const ConcessionPriceModal = ({ item, isLoading, onClose, onSubmit }) => {
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!item) return;
    setPrice(String(item.price || ""));
    setError("");
  }, [item]);

  if (!item) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextPrice = Number(price);

    if (!Number.isFinite(nextPrice) || nextPrice <= 0) {
      setError("Giá bán phải lớn hơn 0");
      return;
    }

    onSubmit(item, nextPrice);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Cập nhật giá bán</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            <HiOutlineX />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="price-update-summary">
              <span>Dịch vụ</span>
              <strong>{item.name}</strong>
              <span>Giá hiện tại</span>
              <strong>{formatCurrency(item.price)}</strong>
            </div>

            <div className="form-group">
              <label className="form-label">
                Giá bán mới <span className="required">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1000"
                className={`form-input ${error ? "error" : ""}`}
                value={price}
                onChange={(event) => {
                  setPrice(event.target.value);
                  if (error) setError("");
                }}
                autoFocus
              />
              {error && <p className="form-error">{error}</p>}
            </div>

            <p className="form-hint">
              Giá mới chỉ áp dụng cho các đơn hàng phát sinh sau khi cập nhật.
            </p>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Hủy bỏ
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? "Đang lưu..." : "Cập nhật giá"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConcessionPriceModal;
