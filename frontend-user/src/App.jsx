import { BrowserRouter as Router, Link, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import HeroSlider from './components/HeroSlider';
import NowShowingMovies from './components/NowShowingMovies';
import MovieSchedule from './pages/MovieSchedule';
import NewsPage from './pages/NewsPage';
import PromotionPage from './pages/PromotionPage';
import { AboutPage, FilmFestivalPage, NotFoundPage, TicketPricePage } from './pages/InfoPages';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}

function HomePage() {
  return (
    <>
      <HeroSlider />
      <div className="mx-auto mb-24 mt-12 w-[90%] max-w-[1400px]">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_300px]">
          <NowShowingMovies />

          <div className="hidden flex-col gap-10 lg:flex">
            <div>
              <div className="mb-6 flex items-center justify-between border-b-2 border-[#ff6070] pb-2">
                <h2 className="text-base font-black uppercase text-white">Khuyến mãi</h2>
                <Link to="/khuyen-mai" className="text-xs text-slate-400 hover:text-[#ff6070]">Xem tất cả →</Link>
              </div>
              <div className="flex flex-col gap-4">
                <div className="aspect-[16/9] w-full cursor-pointer overflow-hidden rounded-[16px] border border-white/10 transition-all hover:border-[#ff6070]">
                  <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRl-9NodLoecTCoa5B7DUIYWf9IqnBDkTI-N8WwwZlJ72hM1nMZzvS8yVv2&s=10" className="h-full w-full object-cover" alt="Khuyến mãi" />
                </div>
                <div className="aspect-[16/9] w-full cursor-pointer overflow-hidden rounded-[16px] border border-white/10 transition-all hover:border-[#ff6070]">
                  <img src="https://api-website.cinestar.com.vn/media/wysiwyg/CMSPage/Promotions/MONDAY.jpg" className="h-full w-full object-cover" alt="Khuyến mãi" />
                </div>
              </div>
            </div>
            <div>
              <div className="mb-6 flex items-center justify-between border-b-2 border-[#ff6070] pb-2">
                <h2 className="text-base font-black uppercase text-white">Sự kiện</h2>
                <span className="cursor-pointer text-xs text-slate-400 hover:text-[#ff6070]">Xem tất cả →</span>
              </div>
              <div className="aspect-[16/9] w-full cursor-pointer overflow-hidden rounded-[16px] border border-white/10 transition-all hover:border-[#ff6070]">
                <img src="https://anmedia.vn/wp-content/uploads/2022/08/File-2656-scaled.jpg" className="h-full w-full object-cover" alt="Sự kiện" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function App() {
  return (
    <Router>
      <main className="min-h-screen bg-[#0f141c] text-white">
        <ScrollToTop />
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/lich-chieu" element={<MovieSchedule />} />
          <Route path="/tin-tuc" element={<NewsPage />} />
          <Route path="/khuyen-mai" element={<PromotionPage />} />
          <Route path="/gia-ve" element={<TicketPricePage />} />
          <Route path="/lien-hoan-phim" element={<FilmFestivalPage />} />
          <Route path="/gioi-thieu" element={<AboutPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <Footer />
      </main>
    </Router>
  );
}

export default App;
