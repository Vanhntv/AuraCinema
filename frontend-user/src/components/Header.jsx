import { useState } from "react";
import { navItems } from "../data/homeData";
import Logo from "./Logo";
import { Link, useLocation } from "react-router-dom";

import LoginModal from "./LoginModal";
import RegisterModal from "./RegisterModal";

function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, logout, user } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const [openLogin, setOpenLogin] = useState(false);
  const [openRegister, setOpenRegister] = useState(false);

  return (
    <>
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
                to={item.path}
                className={`relative whitespace-nowrap font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-[15px] font-bold text-slate-100 no-underline transition-colors hover:text-[#ff6070] max-xl:text-[13px] ${
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

        <div className="flex justify-end gap-3.5 max-sm:col-span-full max-sm:w-full">
          <button
            type="button"
            onClick={() => setOpenRegister(true)}
            className="h-[54px] min-w-32 rounded-full border border-white/10 bg-white/[0.04] px-7 font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-base font-extrabold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)] transition hover:border-[#ff6070] hover:text-[#ff6070]"
          >
            Đăng ký
          </button>

          <button
            type="button"
            onClick={() => setOpenLogin(true)}
            className="h-[54px] min-w-[154px] rounded-full bg-gradient-to-b from-[#ff6f7b] to-[#ff5364] px-7 font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-base font-extrabold text-white shadow-[0_16px_40px_rgba(255,83,100,0.36)]"
          >
            Đăng nhập
          </button>
        </div>
      </header>

      {/* Modal đăng nhập */}
      {openLogin && (
        <LoginModal
          onClose={() => setOpenLogin(false)}
        />
      )}

      {/* Modal đăng ký */}
      {openRegister && (
        <RegisterModal
          onClose={() => setOpenRegister(false)}
        />
      )}
    </>
  );
}

export default Header;
