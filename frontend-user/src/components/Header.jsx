import { Link, useLocation, useNavigate } from "react-router-dom";
import { navItems } from "../data/homeData";
import { useAuth } from "../hooks/useAuth";
import Logo from "./Logo";

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, logout, user } = useAuth();
  const accountLabel =
    user?.full_name || user?.name || user?.email || "Tài khoản";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="mx-auto grid h-[118px] w-[min(1760px,calc(100%_-_96px))] grid-cols-[220px_minmax(0,1fr)_420px] items-center gap-6 max-xl:h-auto max-xl:w-[min(1120px,calc(100%_-_56px))] max-xl:grid-cols-[1fr_auto] max-xl:gap-x-6 max-xl:gap-y-4 max-xl:py-5 max-sm:w-[calc(100%_-_28px)]">
      <Logo />

      <nav
        className="flex min-w-0 items-center justify-between gap-[18px] max-xl:col-span-full max-xl:row-start-2 max-xl:justify-start max-xl:gap-8 max-xl:overflow-x-auto max-xl:py-2 max-lg:w-full"
        aria-label="Điều hướng chính"
      >
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.name}
              to={item.path}
              aria-current={isActive ? "page" : undefined}
              className={`relative inline-flex min-h-11 items-center whitespace-nowrap font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-[15px] font-bold text-slate-100 no-underline transition-colors hover:text-[#ff6070] max-xl:text-[13px] ${
                isActive
                  ? 'text-[#ff6070] after:absolute after:-bottom-3 after:left-0 after:right-0 after:h-0.5 after:bg-[#ff6070] after:content-[""]'
                  : ""
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-nowrap justify-end gap-3.5 overflow-x-auto max-sm:col-span-full max-sm:w-full max-sm:justify-start">
        {isAuthenticated ? (
          <>
            <button
              onClick={() => navigate("/tai-khoan")}
              className="h-[54px] min-w-fit whitespace-nowrap rounded-full border border-white/10 bg-white/[0.04] px-7 font-bold text-white transition hover:border-[#ff6070] hover:text-[#ff6070]"
              title={accountLabel}
              type="button"
            >
              {accountLabel}
            </button>
            <button
              onClick={handleLogout}
              className="h-[54px] min-w-fit whitespace-nowrap rounded-full border border-white/10 bg-white/[0.04] px-7 font-bold text-white transition hover:border-red-500 hover:text-red-500"
              type="button"
            >
              Đăng xuất
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => navigate("/dang-ky")}
              className="h-[54px] min-w-fit whitespace-nowrap rounded-full border border-white/10 bg-white/[0.04] px-7 font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-base font-extrabold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)] transition hover:border-[#ff6070] hover:text-[#ff6070]"
            >
              Đăng ký
            </button>

            <button
              type="button"
              onClick={() => navigate("/dang-nhap")}
              className="h-[54px] min-w-fit whitespace-nowrap rounded-full bg-[var(--aura-coral)] px-7 font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-base font-extrabold text-[var(--aura-coral-ink)] transition-colors hover:bg-[var(--aura-coral-hover)]"
            >
              Đăng nhập
            </button>
          </>
        )}
      </div>
    </header>
  );
}

export default Header;
