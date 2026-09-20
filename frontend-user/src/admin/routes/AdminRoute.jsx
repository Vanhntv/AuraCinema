import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { LOGIN_PATH } from "../../utils/authRoutes";

function AdminRoute({ children }) {
  const { isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <main className="admin-auth-page">
        <p className="admin-auth-loading">Đang kiểm tra quyền truy cập...</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <Navigate
        to={LOGIN_PATH}
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
