import { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { getUserLoginUrl } from "../utils/authRedirect";

function AdminRoute({ children }) {
  const { isAdmin, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isAdmin) {
      window.location.assign(getUserLoginUrl());
    }
  }, [isAdmin, loading]);

  if (loading) {
    return (
      <main className="auth-page">
        <p className="auth-loading">Đang kiểm tra quyền truy cập...</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="auth-page">
        <p className="auth-loading">Đang chuyển đến trang đăng nhập...</p>
      </main>
    );
  }

  return children;
}

export default AdminRoute;
