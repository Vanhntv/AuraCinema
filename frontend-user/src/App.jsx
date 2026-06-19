const navItems = [
  'Trang chủ',
  'Lịch chiếu',
  'Tin tức',
  'Khuyến mãi',
  'Giá vé',
  'Liên hoan phim, Tuần phim',
  'Giới thiệu',
]

const schedule = [
  ['19/6', 'Dế mèn: Cuộc phiêu lưu tới xóm lầy lội', '45.000đ'],
  ['20/6', 'Wolfoo & cuộc đua tam giới', '45.000đ'],
  ['21/6', 'Trạng Quỳnh nhí: Truyền thuyết Kim Ngưu', '45.000đ'],
  ['22/6', 'Mumbo giải cứu bé bự', '35.000đ'],
  ['23/6', 'Dế mèn: Cuộc phiêu lưu tới xóm lầy lội', '35.000đ'],
  ['24/6', 'Wolfoo & cuộc đua tam giới', '35.000đ'],
  ['25/6', 'Trạng Quỳnh nhí: Truyền thuyết Kim Ngưu', '35.000đ'],
]

const posterClass =
  'flex min-h-44 items-end overflow-hidden rounded-xl p-4 font-[Montserrat,Arial,sans-serif] text-xl font-black text-[#fff9d0] shadow-[inset_0_-80px_70px_rgba(0,0,0,0.44)] [text-shadow:0_3px_8px_rgba(0,0,0,0.55)] max-xl:min-h-36'

function App() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_78%_0%,rgba(255,98,111,0.18),transparent_28%),#0f141c] text-slate-50">
      <header className="mx-auto grid h-[118px] w-[min(1760px,calc(100%_-_96px))] grid-cols-[250px_minmax(0,1fr)_300px] items-center gap-7 max-xl:h-auto max-xl:w-[min(1120px,calc(100%_-_56px))] max-xl:grid-cols-[1fr_auto] max-xl:gap-x-6 max-xl:gap-y-4 max-xl:py-5 max-sm:w-[calc(100%_-_28px)]">
        <a
          className="inline-flex items-center gap-2 text-white no-underline"
          href="/"
          aria-label="National Cinema Center"
        >
          <span className="h-[52px] w-[68px] rounded-[7px] bg-white p-[5px] shadow-[0_0_0_1px_rgba(255,255,255,0.45)] max-sm:h-[42px] max-sm:w-[54px]">
            <span className="relative block h-full rounded bg-[linear-gradient(135deg,#f4265b_0_25%,transparent_25%),linear-gradient(135deg,transparent_36%,#2eba70_36%_55%,transparent_55%),linear-gradient(135deg,transparent_62%,#4757d9_62%_100%),#ffd94a]">
              <span className="absolute inset-y-[5px] left-[5px] w-[7px] rounded bg-[repeating-linear-gradient(to_bottom,#fff_0_6px,transparent_6px_12px)]"></span>
            </span>
          </span>
          <span className="grid gap-px font-[Montserrat,Arial,sans-serif] text-base font-black leading-[0.92] tracking-[0.9px] max-sm:text-xs">
            <strong>NATIONAL</strong>
            <strong>CINEMA</strong>
            <strong>CENTER</strong>
          </span>
        </a>

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

      <section
        className="relative mx-auto mt-2.5 w-[min(1760px,calc(100%_-_120px))] max-xl:w-[min(1120px,calc(100%_-_56px))] max-sm:w-[calc(100%_-_28px)]"
        aria-label="Chương trình phim hè 2026"
      >
        <button
          className="absolute left-[-40px] top-[45%] z-30 grid h-14 w-14 place-items-center rounded-full border border-white/20 bg-[#121821]/85 text-[38px] leading-none text-white max-lg:hidden"
          type="button"
          aria-label="Ảnh trước"
        >
          {'<'}
        </button>

        <div className="relative grid min-h-[748px] grid-rows-[auto_1fr_auto] overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0)_68%,rgba(10,20,40,0.62)),radial-gradient(circle_at_15%_18%,rgba(255,255,255,0.98)_0_9%,transparent_10%),radial-gradient(circle_at_82%_12%,rgba(255,211,230,0.95)_0_12%,transparent_13%),linear-gradient(180deg,#55c6ff_0%,#e7f8ff_48%,#8ce3ff_100%)] px-28 pb-5 pt-11 shadow-[0_20px_50px_rgba(0,0,0,0.35)] max-xl:min-h-[640px] max-xl:px-14 max-xl:py-9 max-lg:px-6 max-lg:py-8 max-sm:min-h-0">
          <div className="absolute inset-x-0 bottom-0 h-52 bg-[radial-gradient(circle_at_9%_78%,#ff8cc3_0_40px,transparent_42px),radial-gradient(circle_at_16%_88%,#ffbdd9_0_62px,transparent_64px),radial-gradient(circle_at_88%_78%,#ff8cc3_0_44px,transparent_46px),radial-gradient(circle_at_95%_88%,#ffc0de_0_66px,transparent_68px)] opacity-80"></div>

          <div className="relative z-10 text-center">
            <p className="mx-auto mb-3.5 w-max max-w-full rounded-full border-2 border-[#347ee8] bg-white/80 px-9 py-2 font-[Montserrat,Arial,sans-serif] text-[19px] font-black uppercase text-[#1263d8] max-lg:text-[15px]">
              Suất chiếu 9h30 hằng ngày
            </p>
            <h1 className="m-0 font-[Impact,Haettenschweiler,'Arial_Black',Montserrat,sans-serif] text-[clamp(34px,4vw,64px)] uppercase leading-none tracking-[1px] text-[#ff2e75] [text-shadow:0_4px_0_#fff,0_8px_0_rgba(39,117,232,0.7),0_12px_28px_rgba(25,70,160,0.35)]">
              Chương trình phim hè 2026
            </h1>
            <p className="mt-4 font-[Montserrat,Arial,sans-serif] text-[23px] font-black uppercase text-[#1256d5] max-lg:text-[17px]">
              Lịch chiếu phim 19.6 - 25.6.2026
            </p>
          </div>

          <div className="relative z-10 mt-8 grid grid-cols-[minmax(230px,300px)_minmax(560px,1fr)_minmax(230px,300px)] items-end gap-8 max-xl:grid-cols-[205px_minmax(430px,1fr)_205px] max-xl:gap-5 max-lg:grid-cols-1 max-lg:gap-5">
            <aside className="grid gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
              <div className={`${posterClass} bg-[radial-gradient(circle_at_30%_20%,#ffcf7c_0_18%,transparent_19%),linear-gradient(135deg,#53d889,#08715c)]`}>
                <span>Trạng Quỳnh Nhí</span>
              </div>
              <div className={`${posterClass} bg-[radial-gradient(circle_at_62%_30%,#ffd2e5_0_18%,transparent_19%),linear-gradient(135deg,#91dbff,#1a77ca)]`}>
                <span>Mumbo</span>
              </div>
            </aside>

            <div className="overflow-hidden rounded-[26px] bg-white/80 shadow-[0_20px_50px_rgba(47,83,137,0.22)] max-lg:order-first max-sm:rounded-2xl">
              <div className="grid min-h-14 grid-cols-[22%_58%_20%] items-center bg-gradient-to-b from-[#fa75a7] to-[#f1649a] text-center font-[Montserrat,Arial,sans-serif] text-[17px] font-black uppercase text-white max-sm:text-[13px]">
                <span>Ngày</span>
                <span>Tên phim</span>
                <span>Giá vé</span>
              </div>
              {schedule.map(([day, title, price]) => (
                <div
                  className="grid min-h-13 grid-cols-[22%_58%_20%] items-center border-t border-[#2c5ca0]/10 text-center font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-base font-extrabold text-[#235fd0] max-lg:grid-cols-[22%_54%_24%] max-lg:text-[13px] max-sm:min-h-14 max-sm:text-[11px]"
                  key={`${day}-${title}`}
                >
                  <strong>{day}</strong>
                  <span className="uppercase text-[#2264c7]">{title}</span>
                  <strong className="text-[#e12d68]">{price}</strong>
                </div>
              ))}
            </div>

            <aside className="grid gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
              <div className={`${posterClass} bg-[radial-gradient(circle_at_30%_28%,#ffe783_0_18%,transparent_19%),linear-gradient(135deg,#ffc64a,#4ba84b)]`}>
                <span>Dế Mèn</span>
              </div>
              <div className={`${posterClass} bg-[radial-gradient(circle_at_72%_20%,#fff1d0_0_14%,transparent_15%),linear-gradient(135deg,#ff7a5f,#7d2fd1)]`}>
                <span>Wolfoo</span>
              </div>
            </aside>
          </div>

          <div className="relative z-10 mx-auto mt-4 w-max max-w-full rounded-full bg-white/70 px-[76px] py-3 font-[Montserrat,Arial,sans-serif] text-[19px] font-black text-[#1d5fbf] max-sm:px-5 max-sm:text-[13px]">
            <span>Mua vé tại auracinema.vn/movies</span>
          </div>
        </div>

        <button
          className="absolute right-[-40px] top-[45%] z-30 grid h-14 w-14 place-items-center rounded-full border border-white/20 bg-[#121821]/85 text-[38px] leading-none text-white max-lg:hidden"
          type="button"
          aria-label="Ảnh tiếp"
        >
          {'>'}
        </button>
      </section>
    </main>
  )
}

export default App
