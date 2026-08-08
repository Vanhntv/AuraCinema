import { useState } from 'react';

const pageCopy = {
  eyebrow: 'Giới thiệu rạp phim',
  title: 'Rạp chiếu phim AuraCinema',
  description:
    'AuraCinema là điểm hẹn xem phim dành cho khán giả yêu điện ảnh, với lịch chiếu rõ ràng, đặt vé nhanh và không gian rạp thoải mái.',
};

const tabs = [
  { id: 'intro', label: 'Giới thiệu' },
  { id: 'services', label: 'Dịch vụ' },
];

const cinemaInfo = [
  { label: 'Ngày thành lập', value: '01/05/2026' },
  { label: 'Địa chỉ', value: '87 Láng Hạ, Ba Đình, Hà Nội' },
  { label: 'Hotline', value: '1900 1234' },
  { label: 'Email', value: 'support@auracinema.vn' },
];

const auraSpaces = [
  {
    title: 'Sảnh rạp',
    description: 'Không gian đón khách rộng rãi, dễ tìm quầy vé và khu vực check-in.',
    src: 'https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=900&auto=format&fit=crop&q=80',
  },
  {
    title: 'Quầy bắp nước',
    description: 'Combo bắp nước được chuẩn bị nhanh để bạn sẵn sàng vào suất chiếu.',
    src: 'https://images.unsplash.com/photo-1585647347384-2593bc35786b?w=900&auto=format&fit=crop&q=80',
  },
  {
    title: 'Phòng chiếu',
    description: 'Ghế ngồi thoải mái, màn hình lớn và âm thanh sống động cho từng bộ phim.',
    src: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=900&auto=format&fit=crop&q=80',
  },
  {
    title: 'Khu vực chờ',
    description: 'Nơi gặp bạn bè, kiểm tra vé và thư giãn trước khi phim bắt đầu.',
    src: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=900&auto=format&fit=crop&q=80',
  },
];

const services = [
  {
    title: 'Đặt vé trực tuyến',
    description:
      'Chọn phim, suất chiếu và ghế ngồi ngay trên website. Thông tin vé được hiển thị rõ để bạn kiểm tra trước khi xác nhận.',
    src: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=900&auto=format&fit=crop&q=80',
  },
  {
    title: 'Combo bắp nước',
    description:
      'Các combo bắp nước tiện lợi cho một người, cặp đôi hoặc nhóm bạn, giúp buổi xem phim trọn vẹn hơn.',
    src: 'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?w=900&auto=format&fit=crop&q=80',
  },
  {
    title: 'Ưu đãi thành viên',
    description:
      'Tích điểm, theo dõi hạng thành viên và nhận các chương trình ưu đãi phù hợp với lịch xem phim của bạn.',
    src: 'https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=900&auto=format&fit=crop&q=80',
  },
  {
    title: 'Hỗ trợ khách hàng',
    description:
      'Đội ngũ hỗ trợ luôn sẵn sàng giúp bạn kiểm tra lịch chiếu, thông tin vé và các vấn đề phát sinh khi đặt vé.',
    src: 'https://images.unsplash.com/photo-1556745757-8d76bdb6984b?w=900&auto=format&fit=crop&q=80',
  },
];

function TabButton({ tab, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-[132px] rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-200 sm:min-w-[150px] ${
        active
          ? 'bg-gradient-to-r from-[#ff4f5f] to-[#ff7a32] text-white shadow-[0_10px_24px_rgba(255,83,100,0.16)]'
          : 'border border-white/10 bg-white/[0.025] text-slate-300 hover:border-white/20 hover:bg-white/[0.05] hover:text-white'
      }`}
    >
      {tab.label}
    </button>
  );
}

function SectionShell({ eyebrow, title, description, children }) {
  return (
    <section className="rounded-[26px] border border-white/[0.08] bg-[#111823] p-5 shadow-[0_18px_48px_rgba(0,0,0,0.22)] sm:p-6 lg:p-7">
      <div className="max-w-3xl">
        <span className="block text-xs font-bold tracking-[0.16em] text-[#ff6070]">
          {eyebrow}
        </span>
        <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl">
          {title}
        </h1>
        <p className="mt-3 text-[15px] leading-7 text-slate-300">{description}</p>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function ImageGrid({ images, columnsClass = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' }) {
  return (
    <div className={`grid gap-4 ${columnsClass}`}>
      {images.map((image) => (
        <figure
          key={image.title}
          className="group overflow-hidden rounded-[18px] border border-white/[0.08] bg-[#0f141c] transition duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.025]"
        >
          <img
            src={image.src}
            alt={image.title}
            loading="lazy"
            decoding="async"
            className="aspect-[16/10] w-full object-cover transition-transform duration-200 group-hover:scale-[1.025]"
          />
          <figcaption className="p-3.5">
            <h3 className="text-[15px] font-extrabold text-white">{image.title}</h3>
            <p className="mt-1.5 text-sm leading-6 text-slate-400">{image.description}</p>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

function AboutPage() {
  const [activeTab, setActiveTab] = useState('intro');

  const contentMap = {
    intro: (
      <div className="grid gap-5">
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <article className="rounded-[22px] border border-white/[0.08] bg-white/[0.025] p-5">
            <h2 className="text-xl font-extrabold text-white">Thông tin rạp</h2>
            <dl className="mt-4 grid gap-3">
              {cinemaInfo.map((item) => (
                <div className="rounded-[16px] border border-white/[0.07] bg-[#0f141c]/80 p-3.5" key={item.label}>
                  <dt className="text-[11px] font-bold tracking-[0.14em] text-slate-400">
                    {item.label}
                  </dt>
                  <dd className="mt-1.5 text-base font-bold leading-6 text-white">{item.value}</dd>
                </div>
              ))}
            </dl>
          </article>

          <article className="rounded-[22px] border border-white/[0.08] bg-white/[0.025] p-5">
            <h2 className="text-xl font-extrabold text-white">AuraCinema có gì?</h2>
            <p className="mt-3 text-[15px] leading-7 text-slate-300">
              AuraCinema được xây dựng cho những buổi xem phim nhẹ nhàng và tiện lợi:
              tìm lịch chiếu nhanh, chọn ghế rõ ràng, đặt vé gọn và đến rạp là có thể
              bắt đầu tận hưởng bộ phim mình thích.
            </p>
            <div className="mt-4 rounded-[18px] border border-[#ff6070]/15 bg-[#ff6070]/[0.07] p-4 text-sm leading-7 text-[#ffd2d6]">
              Chúng tôi tập trung vào trải nghiệm quen thuộc của khán giả: lịch chiếu dễ xem,
              không gian sạch sẽ, dịch vụ nhanh và đội ngũ hỗ trợ thân thiện.
            </div>
          </article>
        </div>

        <article className="rounded-[22px] border border-white/[0.08] bg-white/[0.025] p-5">
          <h2 className="text-xl font-extrabold text-white">Không gian AuraCinema</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">
            Từ sảnh rạp, quầy bắp nước đến phòng chiếu và khu vực chờ, mọi khu vực
            được sắp xếp để khách dễ di chuyển, dễ nhận vé và có thời gian thoải mái
            trước khi suất chiếu bắt đầu.
          </p>
          <div className="mt-4">
            <ImageGrid images={auraSpaces} />
          </div>
        </article>
      </div>
    ),
    services: (
      <div className="grid gap-4 lg:grid-cols-2">
        {services.map((service) => (
          <article
            key={service.title}
            className="grid overflow-hidden rounded-[22px] border border-white/[0.08] bg-white/[0.025] transition duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.04] md:grid-cols-[180px_1fr] xl:grid-cols-[200px_1fr]"
          >
            <img
              src={service.src}
              alt={service.title}
              loading="lazy"
              decoding="async"
              className="aspect-[16/9] w-full object-cover md:h-full md:min-h-[170px]"
            />
            <div className="p-5">
              <h2 className="text-xl font-extrabold text-white">{service.title}</h2>
              <p className="mt-2.5 text-[15px] leading-7 text-slate-300">{service.description}</p>
            </div>
          </article>
        ))}
      </div>
    ),
  };

  return (
    <main className="bg-[#0f141c] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1360px]">
        <SectionShell
          eyebrow={pageCopy.eyebrow}
          title={pageCopy.title}
          description={pageCopy.description}
        >
          <div className="flex flex-wrap gap-2.5">
            {tabs.map((tab) => (
              <TabButton
                key={tab.id}
                tab={tab}
                active={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              />
            ))}
          </div>

          <div className="mt-6">{contentMap[activeTab]}</div>
        </SectionShell>
      </div>
    </main>
  );
}

export default AboutPage;
