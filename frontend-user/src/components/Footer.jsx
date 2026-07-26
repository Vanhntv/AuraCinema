import { Link } from "react-router-dom";
import Logo from "./Logo";

const quickLinks = [
  { label: "Lịch chiếu", to: "/lich-chieu" },
  { label: "Tin tức", to: "/tin-tuc" },
  { label: "Khuyến mãi", to: "/khuyen-mai" },
  { label: "Giá vé", to: "/gia-ve" },
  { label: "Giới thiệu", to: "/gioi-thieu" },
];

const supportLinks = [
  { label: "Điều khoản sử dụng", to: "/dieu-khoan-su-dung" },
  { label: "Chính sách bảo mật", to: "/chinh-sach-bao-mat" },
  { label: "Hướng dẫn đặt vé", to: "/huong-dan-dat-ve" },
  { label: "Câu hỏi thường gặp", to: "/cau-hoi-thuong-gap" },
];

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

        </div>

        <div>
          <h2 className="font-[Montserrat,Arial,sans-serif] text-base font-black uppercase text-white">
            Liên kết
          </h2>
          <ul className="mt-5 grid gap-3">
            {quickLinks.map((item) => (
              <li key={item.to}>
                <Link
                  className="font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-sm text-slate-400 no-underline transition-colors hover:text-[#ff6070]"
                  to={item.to}
                >
                  {item.label}
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
              <li key={item.to}>
                <Link
                  className="font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-sm text-slate-400 no-underline transition-colors hover:text-[#ff6070]"
                  to={item.to}
                >
                  {item.label}
                </Link>
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
  );
}

export default Footer;
