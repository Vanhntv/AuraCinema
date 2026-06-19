import { navItems } from '../data/homeData'
import Logo from './Logo'

function Header() {
  return (
    <header className="mx-auto grid h-[118px] w-[min(1760px,calc(100%_-_96px))] grid-cols-[260px_minmax(0,1fr)_300px] items-center gap-7 max-xl:h-auto max-xl:w-[min(1120px,calc(100%_-_56px))] max-xl:grid-cols-[1fr_auto] max-xl:gap-x-6 max-xl:gap-y-4 max-xl:py-5 max-sm:w-[calc(100%_-_28px)]">
      <Logo />

      <nav
        className="flex min-w-0 items-center justify-between gap-[18px] max-xl:col-span-full max-xl:row-start-2 max-xl:justify-start max-xl:gap-8 max-xl:overflow-x-auto max-xl:py-2 max-lg:w-full"
        aria-label="Điều hướng chính"
      >
        {navItems.map((item, index) => (
          <a
            key={item}
            className={`relative whitespace-nowrap font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-[15px] font-bold text-slate-100 no-underline transition-colors hover:text-[#ff6070] max-xl:text-[13px] ${
              index === 0
                ? 'text-[#ff6070] after:absolute after:-bottom-3 after:left-0 after:right-0 after:h-0.5 after:bg-[#d7d9df] after:content-[""]'
                : ''
            }`}
            href="/"
          >
            {item}
          </a>
        ))}
      </nav>

      <div className="flex justify-end gap-3.5 max-sm:col-span-full max-sm:w-full">
        <button
          className="h-[54px] min-w-32 rounded-full border border-white/10 bg-white/[0.04] px-7 font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-base font-extrabold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)] max-sm:flex-1 max-sm:px-4 max-sm:text-sm"
          type="button"
        >
          Đăng ký
        </button>
        <button
          className="h-[54px] min-w-[154px] rounded-full border border-transparent bg-gradient-to-b from-[#ff6f7b] to-[#ff5364] px-7 font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-base font-extrabold text-white shadow-[0_16px_40px_rgba(255,83,100,0.36)] max-sm:flex-1 max-sm:px-4 max-sm:text-sm"
          type="button"
        >
          Đăng nhập
        </button>
      </div>
    </header>
  )
}

export default Header
