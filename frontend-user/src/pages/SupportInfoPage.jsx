import { Navigate, useLocation } from "react-router-dom";

const supportPages = {
  "dieu-khoan-su-dung": {
    eyebrow: "Aura Cinema",
    title: "Điều khoản sử dụng",
    description:
      "Các quy định cơ bản khi truy cập website, đặt vé và sử dụng dịch vụ tại Aura Cinema.",
    sections: [
      {
        title: "Tài khoản và thông tin cá nhân",
        items: [
          "Khách hàng cần cung cấp thông tin chính xác khi đăng ký, đặt vé hoặc cập nhật hồ sơ.",
          "Bạn chịu trách nhiệm bảo mật tài khoản, mật khẩu và các giao dịch phát sinh từ tài khoản của mình.",
          "Aura Cinema có thể tạm khóa tài khoản khi phát hiện dấu hiệu gian lận hoặc sử dụng sai mục đích.",
        ],
      },
      {
        title: "Đặt vé và thanh toán",
        items: [
          "Vé chỉ được giữ sau khi hệ thống xác nhận thanh toán hoặc xác nhận đặt vé thành công.",
          "Giá vé, phụ thu và ưu đãi có thể thay đổi theo rạp, suất chiếu hoặc chương trình khuyến mãi.",
          "Khách hàng cần kiểm tra phim, ngày chiếu, giờ chiếu, phòng chiếu và ghế trước khi xác nhận.",
        ],
      },
    ],
  },
  "chinh-sach-bao-mat": {
    eyebrow: "Bảo mật",
    title: "Chính sách bảo mật",
    description:
      "Aura Cinema cam kết bảo vệ dữ liệu cá nhân và chỉ sử dụng thông tin trong phạm vi phục vụ trải nghiệm đặt vé.",
    sections: [
      {
        title: "Thông tin được thu thập",
        items: [
          "Thông tin tài khoản như họ tên, email, số điện thoại, ngày sinh và địa chỉ.",
          "Thông tin giao dịch như lịch sử đặt vé, điểm thưởng, hạng thành viên và trạng thái thanh toán.",
          "Thông tin kỹ thuật cần thiết để duy trì bảo mật và cải thiện chất lượng dịch vụ.",
        ],
      },
      {
        title: "Cách sử dụng thông tin",
        items: [
          "Xác thực tài khoản, xử lý đặt vé, gửi thông báo liên quan đến giao dịch.",
          "Quản lý ưu đãi, điểm thưởng, hạng thành viên và hỗ trợ chăm sóc khách hàng.",
          "Không bán hoặc chia sẻ dữ liệu cá nhân cho bên thứ ba ngoài phạm vi vận hành dịch vụ.",
        ],
      },
    ],
  },
  "huong-dan-dat-ve": {
    eyebrow: "Hỗ trợ",
    title: "Hướng dẫn đặt vé",
    description:
      "Các bước cơ bản để chọn phim, chọn suất chiếu, chọn ghế và hoàn tất đặt vé trực tuyến.",
    sections: [
      {
        title: "Quy trình đặt vé",
        items: [
          "Vào trang Lịch chiếu hoặc chọn phim đang chiếu trên trang chủ.",
          "Chọn rạp, ngày chiếu, suất chiếu phù hợp và bấm đặt vé.",
          "Chọn ghế còn trống, kiểm tra thông tin vé và xác nhận thanh toán.",
        ],
      },
      {
        title: "Lưu ý khi đặt vé",
        items: [
          "Vui lòng đăng nhập trước khi đặt vé để lưu lịch sử giao dịch và tích điểm.",
          "Kiểm tra kỹ thông tin trước khi thanh toán vì vé đã xác nhận có thể bị giới hạn đổi trả.",
          "Nếu gặp lỗi, hãy chụp màn hình và liên hệ bộ phận hỗ trợ qua hotline hoặc email.",
        ],
      },
    ],
  },
  "cau-hoi-thuong-gap": {
    eyebrow: "FAQ",
    title: "Câu hỏi thường gặp",
    description:
      "Một số câu hỏi phổ biến khi sử dụng website đặt vé và tài khoản thành viên Aura Cinema.",
    sections: [
      {
        title: "Tôi có cần đăng nhập để đặt vé không?",
        items: [
          "Bạn nên đăng nhập để hệ thống lưu lịch sử mua vé, điểm thưởng và thông tin thành viên.",
          "Một số ưu đãi hoặc chương trình thành viên có thể yêu cầu tài khoản đã đăng nhập.",
        ],
      },
      {
        title: "Tôi quên mật khẩu thì làm thế nào?",
        items: [
          "Vào trang Đăng nhập, chọn Quên mật khẩu và làm theo hướng dẫn khôi phục.",
          "Nếu không nhận được thông báo, hãy kiểm tra lại email hoặc liên hệ bộ phận hỗ trợ.",
        ],
      },
      {
        title: "Tôi có thể đổi thông tin cá nhân không?",
        items: [
          "Bạn có thể cập nhật một số thông tin trong trang Tài khoản sau khi đăng nhập.",
          "Các thông tin nhạy cảm hoặc dữ liệu giao dịch có thể cần hỗ trợ từ quản trị viên.",
        ],
      },
    ],
  },
};

function SupportInfoPage() {
  const { pathname } = useLocation();
  const slug = pathname.split("/").filter(Boolean).at(-1);
  const page = supportPages[slug];

  if (!page) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="mx-auto w-[min(1040px,calc(100%_-_40px))] py-12 max-sm:w-[calc(100%_-_28px)]">
      <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-8 shadow-[0_22px_90px_rgba(0,0,0,0.24)]">
        <p className="font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-sm font-black uppercase tracking-[0.18em] text-[#ff6070]">
          {page.eyebrow}
        </p>
        <h1 className="mt-3 text-4xl font-black text-white max-sm:text-3xl">
          {page.title}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
          {page.description}
        </p>
      </section>

      <section className="mt-6 grid gap-5">
        {page.sections.map((section) => (
          <article
            className="rounded-3xl border border-white/10 bg-[#141b26] p-6"
            key={section.title}
          >
            <h2 className="text-xl font-black text-white">{section.title}</h2>
            <ul className="mt-4 grid gap-3 text-sm leading-6 text-slate-300">
              {section.items.map((item) => (
                <li className="rounded-2xl bg-white/[0.035] px-4 py-3" key={item}>
                  {item}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </main>
  );
}

export default SupportInfoPage;
