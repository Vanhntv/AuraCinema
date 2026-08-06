import { useEffect, useRef } from "react";
import { showToast } from "../../../utils/toast";

const Toast = ({ toasts, onRemove }) => {
  const shownToastIdsRef = useRef(new Set());

  useEffect(() => {
    toasts.forEach((item) => {
      if (shownToastIdsRef.current.has(item.id)) return;

      shownToastIdsRef.current.add(item.id);
      showToast(item.type, item.message, { id: String(item.id) });
      onRemove?.(item.id);
    });
  }, [onRemove, toasts]);

  return null;
};

export default Toast;
