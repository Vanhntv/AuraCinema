import { Link, useLocation, useNavigate } from 'react-router-dom'
import { navItems } from '../data/homeData'
import { useAuth } from '../hooks/useAuth'
import Logo from './Logo'

function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, logout, user } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className="mx-auto grid h-[118px] w-[min(1760px,calc(100%_-_96px))] grid-cols-[260px_minmax(0,1fr)_300px] items-center gap-7 max-xl:h-auto max-xl:w-[min(1120px,calc(100%_-_56px))] max-xl:grid-cols-[1fr_auto] max-xl:gap-x-6 max-xl:gap-y-4 max-xl:py-5 max-sm:w-[calc(100%_-_28px)]">
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
              className={`relative whitespace-nowrap font-[var(--sans)] text-[15px] font-bold text-slate-100 no-underline transition-colors hover:text-[#ff6070] max-xl:text-[13px] ${
                isActive
                  ? 'text-[#ff6070] after:absolute after:-bottom-3 after:left-0 after:right-0 after:h-0.5 after:bg-[#ff6070] after:content-[""]'
                  : ''
              }`}
              to={item.path}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="flex justify-end gap-3.5 max-sm:col-span-full max-sm:w-full">
        {isAuthenticated ? (
          <>
            <Link
              className="flex h-[54px] min-w-32 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-7 font-[var(--sans)] text-base font-extrabold text-white no-underline shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)] max-sm:flex-1 max-sm:px-4 max-sm:text-sm"
              to="/profile"
            >
              {user?.full_name || 'Tài khoản'}
            </Link>
            <button
              className="h-[54px] min-w-[154px] rounded-full border border-transparent bg-gradient-to-b from-[#ff6f7b] to-[#ff5364] px-7 font-[var(--sans)] text-base font-extrabold text-white shadow-[0_16px_40px_rgba(255,83,100,0.36)] max-sm:flex-1 max-sm:px-4 max-sm:text-sm"
              type="button"
              onClick={handleLogout}
            >
              Đăng xuất
            </button>
          </>
        ) : (
          <>
            <Link
              className="flex h-[54px] min-w-32 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-7 font-[var(--sans)] text-base font-extrabold text-white no-underline shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)] max-sm:flex-1 max-sm:px-4 max-sm:text-sm"
              to="/register"
            >
              Đăng ký
            </Link>
            <Link
              className="flex h-[54px] min-w-[154px] items-center justify-center rounded-full border border-transparent bg-gradient-to-b from-[#ff6f7b] to-[#ff5364] px-7 font-[var(--sans)] text-base font-extrabold text-white no-underline shadow-[0_16px_40px_rgba(255,83,100,0.36)] max-sm:flex-1 max-sm:px-4 max-sm:text-sm"
              to="/login"
            >
              Đăng nhập
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

export default Header;
