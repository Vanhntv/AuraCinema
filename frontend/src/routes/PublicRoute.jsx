import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function PublicRoute({ children }) {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <main className="auth-page">
        <p className="auth-loading">Đang kiểm tra quyền truy cập...</p>
      </main>
    );
  }

  if (isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default PublicRoute;
