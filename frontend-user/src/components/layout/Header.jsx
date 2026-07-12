import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

function Header() {
  const navigate = useNavigate();
  const { isAuthenticated, loading, logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="site-header">
      <Link className="site-logo" to="/">
        AuraCinema
      </Link>

      <nav className="site-nav" aria-label="Tai khoan">
        {loading ? (
          <span className="nav-status">Dang tai...</span>
        ) : isAuthenticated ? (
          <>
            <span className="nav-user">{user?.full_name || user?.email}</span>
            <button className="nav-button" type="button" onClick={handleLogout}>
              Dang xuat
            </button>
          </>
        ) : (
          <>
            <Link className="nav-link" to="/login">
              Dang nhap
            </Link>
            <Link className="nav-button" to="/register">
              Dang ky
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}

export default Header;
