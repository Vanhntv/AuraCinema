const pageClass = "mx-auto min-h-[55vh] w-[min(1120px,calc(100%_-_56px))] py-12 text-white max-sm:w-[calc(100%_-_28px)]"

function InfoPage({ eyebrow, title, description, children }) {
  return (
    <section className={pageClass}>
      <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#ff6070]">{eyebrow}</p>
      <h1 className="mt-3 text-3xl font-black uppercase md:text-4xl">{title}</h1>
      <p className="mt-5 max-w-3xl leading-7 text-slate-300">{description}</p>
      {children}
    </section>
  )
}

export function TicketPricePage() {
  const prices = [
    ['Vé 2D tiêu chuẩn', '45.000đ'],
    ['Vé cuối tuần', '55.000đ'],
    ['Học sinh, sinh viên', '40.000đ'],
  ]

  return (
    <InfoPage eyebrow="Aura Cinema" title="Giá vé" description="Bảng giá tham khảo tại hệ thống Aura Cinema.">
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {prices.map(([name, price]) => (
          <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-6" key={name}>
            <h2 className="font-bold text-slate-200">{name}</h2>
            <p className="mt-4 text-2xl font-black text-[#ff6070]">{price}</p>
          </article>
        ))}
      </div>
    </InfoPage>
  )
}

export function FilmFestivalPage() {
  return <InfoPage eyebrow="Sự kiện điện ảnh" title="Liên hoan phim, Tuần phim" description="Thông tin các tuần phim, chương trình giao lưu và sự kiện điện ảnh nổi bật sẽ được cập nhật tại đây." />
}

export function AboutPage() {
  return <InfoPage eyebrow="Về chúng tôi" title="Giới thiệu" description="Aura Cinema mang đến lịch chiếu cập nhật, không gian xem phim hiện đại và trải nghiệm đặt vé thuận tiện cho mọi khán giả." />
}

export function NotFoundPage() {
  return (
    <InfoPage eyebrow="404" title="Không tìm thấy trang" description="Đường dẫn bạn truy cập không tồn tại hoặc đã được thay đổi.">
      <a className="mt-8 inline-block rounded-full bg-[#ff6070] px-6 py-3 font-bold text-white" href="/">Về trang chủ</a>
    </InfoPage>
  )
}
