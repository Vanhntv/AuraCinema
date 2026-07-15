import { BrowserRouter as Router, Link, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import HeroSlider from './components/HeroSlider';
import NowShowingMovies from './components/NowShowingMovies';
import MovieSchedule from './pages/MovieSchedule';
import NewsPage from './pages/NewsPage';
import PromotionPage from './pages/PromotionPage';

import Register from './components/RegisterModal';
import LoginModal from './components/LoginModal';

import { AboutPage, FilmFestivalPage, NotFoundPage, TicketPricePage } from './pages/InfoPages'

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
      <Header />
      <main>
        <HeroSlider />
        <NowShowingMovies />
      </main>
      <Footer />
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

          <Route path="/dang-ky" element={<Register />} />
          <Route path="/dang-nhap" element={<LoginModal />} />

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
