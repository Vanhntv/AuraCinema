import { useEffect, useCallback } from "react";
import {
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineExclamation,
  HiOutlineX,
} from "react-icons/hi";

const icons = {
  success: <HiOutlineCheckCircle />,
  error: <HiOutlineExclamationCircle />,
  warning: <HiOutlineExclamation />,
};

const Toast = ({ toasts, onRemove }) => {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};

const ToastItem = ({ toast, onRemove }) => {
  const handleRemove = useCallback(() => {
    onRemove(toast.id);
  }, [toast.id, onRemove]);

  useEffect(() => {
    const timer = setTimeout(handleRemove, 3500);
    return () => clearTimeout(timer);
  }, [handleRemove]);

  return (
    <div className={`toast ${toast.type}`}>
      <span className="toast-icon">{icons[toast.type]}</span>
      <span className="toast-message">{toast.message}</span>
      <button className="toast-close" onClick={handleRemove}>
        <HiOutlineX />
      </button>
    </div>
  );
};

export default Toast;
