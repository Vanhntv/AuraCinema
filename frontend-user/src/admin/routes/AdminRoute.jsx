import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

function AdminRoute({ children }) {
  const { isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <main className="auth-page">
        <p className="auth-loading">Đang kiểm tra quyền truy cập...</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <Navigate
        to="/dang-nhap"
        replace
        state={{
          from: location,
          message: "Vui lòng đăng nhập bằng tài khoản quản trị để vào trang admin.",
        }}
      />
    );
  }

  return children;
}

export default AdminRoute;
