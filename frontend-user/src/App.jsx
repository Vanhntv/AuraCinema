import { Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import HeroSlider from './components/HeroSlider';
import NowShowingMovies from './components/NowShowingMovies';
import MovieSchedule from './pages/MovieSchedule';
import NewsPage from './pages/NewsPage';
import NewsDetailPage from './pages/NewsDetailPage';
import PromotionPage from './pages/PromotionPage';
import TicketPricePage from './pages/ticket-price/TicketPricePage';
import AboutPage from './pages/about/AboutPage';

import Register from './components/RegisterModal';
import LoginModal from './components/LoginModal';

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
      <NowShowingMovies />
    </>
  );
}

function App() {
  return (
    <main className="min-h-screen bg-[#0f141c] text-white">
      <ScrollToTop />
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/lich-chieu" element={<MovieSchedule />} />
        <Route path="/tin-tuc" element={<NewsPage />} />
        <Route path="/tin-tuc/:slug" element={<NewsDetailPage />} />
        <Route path="/khuyen-mai" element={<PromotionPage />} />
        <Route path="/gia-ve" element={<TicketPricePage />} />
        <Route path="/gioi-thieu" element={<AboutPage />} />
        <Route path="/dang-ky" element={<Register />} />
        <Route path="/dang-nhap" element={<LoginModal />} />
        {/* Các route InfoPages đã xóa theo yêu cầu của bạn */}
      </Routes>
      <Footer />
    </main>
  );
}

export default App;
