import Logo from './Logo'
import { Link } from 'react-router-dom'

const quickLinks = [
  ['Lịch chiếu', '/lich-chieu'],
  ['Tin tức', '/tin-tuc'],
  ['Khuyến mãi', '/khuyen-mai'],
  ['Giá vé', '/gia-ve'],
  ['Liên hoan phim', '/lien-hoan-phim'],
  ['Giới thiệu', '/gioi-thieu'],
]

const supportLinks = [
  'Điều khoản sử dụng',
  'Chính sách bảo mật',
  'Hướng dẫn đặt vé',
  'Câu hỏi thường gặp',
]

function Footer() {
  return (
    <footer className="mt-16 border-t border-white/10 bg-[#0b1018]">
      <div className="mx-auto grid w-[min(1760px,calc(100%_-_96px))] grid-cols-[1.2fr_0.8fr_0.8fr_1fr] gap-10 py-12 max-xl:w-[min(1120px,calc(100%_-_56px))] max-lg:grid-cols-2 max-sm:w-[calc(100%_-_28px)] max-sm:grid-cols-1">
        <div>
          <Logo compact />

          <p className="mt-5 max-w-md font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-sm leading-6 text-slate-400">
            Trung tâm chiếu phim với lịch chiếu cập nhật mỗi ngày, ưu đãi đặt vé
            trực tuyến và không gian xem phim dành cho mọi khán giả.
          </p>

          <div className="mt-6 flex gap-3">
            {['F', 'Y', 'T'].map((item) => (
              <a
                className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.04] font-bold text-white transition-colors hover:border-[#ff6070] hover:text-[#ff6070]"
                href="/"
                key={item}
                aria-label={`Mạng xã hội ${item}`}
              >
                {item}
              </a>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-[Montserrat,Arial,sans-serif] text-base font-black uppercase text-white">
            Liên kết
          </h2>
          <ul className="mt-5 grid gap-3">
            {quickLinks.map(([label, path]) => (
              <li key={path}>
                <Link
                  className="font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-sm text-slate-400 no-underline transition-colors hover:text-[#ff6070]"
                  to={path}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-[Montserrat,Arial,sans-serif] text-base font-black uppercase text-white">
            Hỗ trợ
          </h2>
          <ul className="mt-5 grid gap-3">
            {supportLinks.map((item) => (
              <li key={item}>
                <a
                  className="font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-sm text-slate-400 no-underline transition-colors hover:text-[#ff6070]"
                  href="/"
                >
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-[Montserrat,Arial,sans-serif] text-base font-black uppercase text-white">
            Liên hệ
          </h2>
          <div className="mt-5 grid gap-3 font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-sm leading-6 text-slate-400">
            <p>87 Láng Hạ, Ba Đình, Hà Nội</p>
            <p>Hotline: 1900 1234</p>
            <p>Email: support@auracinema.vn</p>
            <p>Giờ mở cửa: 8:00 - 23:00 hằng ngày</p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex w-[min(1760px,calc(100%_-_96px))] items-center justify-between gap-4 py-5 font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-xs text-slate-500 max-xl:w-[min(1120px,calc(100%_-_56px))] max-sm:w-[calc(100%_-_28px)] max-sm:flex-col max-sm:items-start">
          <span>© 2026 Aura Cinema. All rights reserved.</span>
          <span>Thiết kế cho trải nghiệm đặt vé nhanh và rõ ràng.</span>
        </div>
      </div>
    </footer>
  )
}

export default Footer
