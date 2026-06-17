import { HiOutlineExclamation } from "react-icons/hi";

const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "420px" }}>
        <div className="modal-body" style={{ padding: "32px 24px 24px" }}>
          <div className="confirm-icon">
            <HiOutlineExclamation />
          </div>
          <h3 className="confirm-title">{title}</h3>
          <p className="confirm-message">{message}</p>
          <div className="confirm-actions">
            <button className="btn btn-secondary" onClick={onCancel}>
              Hủy bỏ
            </button>
            <button className="btn btn-danger" onClick={onConfirm}>
              Xác nhận xóa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
