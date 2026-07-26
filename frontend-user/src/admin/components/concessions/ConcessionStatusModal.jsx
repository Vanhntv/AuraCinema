import { useEffect, useState } from "react";
import { HiOutlineX } from "react-icons/hi";

const ConcessionStatusModal = ({ item, isLoading, onClose, onSubmit }) => {
  const [nextStatus, setNextStatus] = useState(true);

  useEffect(() => {
    if (!item) return;
    setNextStatus(!item.status);
  }, [item]);

  if (!item) return null;

  const currentLabel = item.status ? "Đang bán" : "Ngừng bán";
  const nextLabel = nextStatus ? "Đang bán" : "Ngừng bán";

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(item, nextStatus);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Quản lý trạng thái kinh doanh</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            <HiOutlineX />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="status-update-summary">
              <span>Dịch vụ</span>
              <strong>{item.name}</strong>
              <span>Hiện tại</span>
              <strong>{currentLabel}</strong>
            </div>

            <div className="form-group">
              <label className="form-label">Trạng thái mới</label>
              <select
                className="form-input"
                value={nextStatus ? "active" : "inactive"}
                onChange={(event) => setNextStatus(event.target.value === "active")}
              >
                <option value="active">Đang bán</option>
                <option value="inactive">Ngừng bán</option>
              </select>
            </div>

            <div className={`business-status-note ${nextStatus ? "active" : "inactive"}`}>
              {nextStatus
                ? "Dịch vụ sẽ được phép hiển thị cho khách và có thể thêm vào đơn hàng mới."
                : "Dịch vụ ngừng bán sẽ không hiển thị cho khách và không được thêm vào đơn hàng mới. Admin vẫn có thể xem và chỉnh sửa."}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Hủy bỏ
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? "Đang lưu..." : `Chuyển sang ${nextLabel}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConcessionStatusModal;
