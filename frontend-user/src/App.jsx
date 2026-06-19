import './App.css'

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
  ['19/6', 'De men: Cuoc phieu luu toi xom lay loi', '45.000d'],
  ['20/6', 'Wolfoo & cuoc dua tam gioi', '45.000d'],
  ['21/6', 'Trang Quynh nhi: Truyen thuyet Kim Nguu', '45.000d'],
  ['22/6', 'Mumbo giai cuu be bu', '35.000d'],
  ['23/6', 'De men: Cuoc phieu luu toi xom lay loi', '35.000d'],
  ['24/6', 'Wolfoo & cuoc dua tam gioi', '35.000d'],
  ['25/6', 'Trang Quynh nhi: Truyen thuyet Kim Nguu', '35.000d'],
]

function App() {
  return (
    <main className="cinema-page">
      <header className="site-header">
        <a className="brand" href="/" aria-label="National Cinema Center">
          <span className="brand-mark">
            <span></span>
          </span>
          <span className="brand-text">
            <strong>NATIONAL</strong>
            <strong>CINEMA</strong>
            <strong>CENTER</strong>
          </span>
        </a>

        <nav className="main-nav" aria-label="Điều hướng chính">
          {navItems.map((item, index) => (
            <a key={item} className={index === 0 ? 'active' : ''} href="/">
              {item}
            </a>
          ))}
        </nav>

        <div className="auth-actions">
          <button className="btn btn-outline" type="button">
            Đăng ký
          </button>
          <button className="btn btn-primary" type="button">
            Đăng nhập
          </button>
        </div>
      </header>

      <section className="hero-slider" aria-label="Chuong trinh phim he 2026">
        <button className="slider-btn prev" type="button" aria-label="Anh truoc">
          {'<'}
        </button>

        <div className="summer-banner">
          <div className="banner-clouds"></div>
          <div className="banner-top">
            <p className="eyebrow">Suat chieu 9h30 hang ngay</p>
            <h1>Chuong trinh phim he 2026</h1>
            <p className="date-range">Lich chieu phim 19.6 - 25.6.2026</p>
          </div>

          <div className="banner-grid">
            <aside className="poster-stack left-posters">
              <div className="poster poster-green">
                <span>Trang Quynh Nhi</span>
              </div>
              <div className="poster poster-blue">
                <span>Mumbo</span>
              </div>
            </aside>

            <div className="schedule-card">
              <div className="schedule-head">
                <span>Ngay</span>
                <span>Ten phim</span>
                <span>Gia ve</span>
              </div>
              {schedule.map(([day, title, price]) => (
                <div className="schedule-row" key={`${day}-${title}`}>
                  <strong>{day}</strong>
                  <span>{title}</span>
                  <strong>{price}</strong>
                </div>
              ))}
            </div>

            <aside className="poster-stack right-posters">
              <div className="poster poster-yellow">
                <span>De Men</span>
              </div>
              <div className="poster poster-red">
                <span>Wolfoo</span>
              </div>
            </aside>
          </div>

          <div className="banner-footer">
            <span>Mua ve tai auracinema.vn/movies</span>
          </div>
        </div>

        <button className="slider-btn next" type="button" aria-label="Anh tiep">
          {'>'}
        </button>
      </section>
    </main>
  )
}

export default App
