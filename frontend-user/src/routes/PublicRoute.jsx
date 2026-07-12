import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <main className="auth-shell">
        <p className="auth-loading">Dang tai thong tin tai khoan...</p>
      </main>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default PublicRoute;
