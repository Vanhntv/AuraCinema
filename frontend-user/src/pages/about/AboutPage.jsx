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
      className={`min-w-[140px] rounded-full px-5 py-3 text-sm font-extrabold transition-all duration-200 sm:min-w-[160px] ${
        active
          ? 'bg-gradient-to-r from-[#ff5364] via-[#ff6b4a] to-[#b86a2f] text-white shadow-[0_16px_40px_rgba(255,83,100,0.3)]'
          : 'border border-white/10 bg-white/[0.03] text-slate-300 hover:border-[#ff6070]/40 hover:text-white'
      }`}
    >
      {tab.label}
    </button>
  );
}

function SectionShell({ eyebrow, title, description, children }) {
  return (
    <section className="rounded-[32px] border border-white/10 bg-[#111823] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.25)] sm:p-8">
      <div className="max-w-4xl">
        <span className="block text-sm font-bold uppercase tracking-[0.2em] text-[#ff6070]">
          {eyebrow}
        </span>
        <h1 className="mt-3 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-300">{description}</p>
      </div>
      <div className="mt-8">{children}</div>
    </section>
  );
}

function ImageGrid({ images, columnsClass = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' }) {
  return (
    <div className={`grid gap-4 ${columnsClass}`}>
      {images.map((image) => (
        <figure
          key={image.title}
          className="group overflow-hidden rounded-[24px] border border-white/10 bg-[#0f141c]"
        >
          <img
            src={image.src}
            alt={image.title}
            className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <figcaption className="p-4">
            <h3 className="text-base font-black text-white">{image.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">{image.description}</p>
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
      <div className="grid gap-8">
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-2xl font-black uppercase text-white">Thông tin rạp</h2>
            <dl className="mt-5 grid gap-4">
              {cinemaInfo.map((item) => (
                <div className="rounded-2xl border border-white/10 bg-[#0f141c] p-4" key={item.label}>
                  <dt className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                    {item.label}
                  </dt>
                  <dd className="mt-2 text-lg font-extrabold text-white">{item.value}</dd>
                </div>
              ))}
            </dl>
          </article>

          <article className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-2xl font-black uppercase text-white">AuraCinema có gì?</h2>
            <p className="mt-4 text-base leading-7 text-slate-300">
              AuraCinema được xây dựng cho những buổi xem phim nhẹ nhàng và tiện lợi:
              tìm lịch chiếu nhanh, chọn ghế rõ ràng, đặt vé gọn và đến rạp là có thể
              bắt đầu tận hưởng bộ phim mình thích.
            </p>
            <div className="mt-6 rounded-[24px] border border-[#ff6070]/20 bg-[#ff6070]/10 p-4 text-sm leading-7 text-[#ffd2d6]">
              Chúng tôi tập trung vào trải nghiệm quen thuộc của khán giả: lịch chiếu dễ xem,
              không gian sạch sẽ, dịch vụ nhanh và đội ngũ hỗ trợ thân thiện.
            </div>
          </article>
        </div>

        <article className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-2xl font-black uppercase text-white">Không gian AuraCinema</h2>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400">
            Từ sảnh rạp, quầy bắp nước đến phòng chiếu và khu vực chờ, mọi khu vực
            được sắp xếp để khách dễ di chuyển, dễ nhận vé và có thời gian thoải mái
            trước khi suất chiếu bắt đầu.
          </p>
          <div className="mt-5">
            <ImageGrid images={auraSpaces} />
          </div>
        </article>
      </div>
    ),
    services: (
      <div className="grid gap-6 sm:grid-cols-2">
        {services.map((service) => (
          <article
            key={service.title}
            className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03]"
          >
            <img
              src={service.src}
              alt={service.title}
              className="aspect-[16/9] w-full object-cover"
            />
            <div className="p-6">
              <h2 className="text-2xl font-black uppercase text-white">{service.title}</h2>
              <p className="mt-4 text-base leading-7 text-slate-300">{service.description}</p>
            </div>
          </article>
        ))}
      </div>
    ),
  };

  return (
    <main className="bg-[#0f141c] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1360px]">
        <SectionShell
          eyebrow={pageCopy.eyebrow}
          title={pageCopy.title}
          description={pageCopy.description}
        >
          <div className="flex flex-wrap gap-3">
            {tabs.map((tab) => (
              <TabButton
                key={tab.id}
                tab={tab}
                active={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              />
            ))}
          </div>

          <div className="mt-8">{contentMap[activeTab]}</div>
        </SectionShell>
      </div>
    </main>
  );
}

export default AboutPage;
