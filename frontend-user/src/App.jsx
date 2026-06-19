import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import HeroSlider from './components/HeroSlider';
import MovieSchedule from './pages/MovieSchedule';
import NewsPage from './pages/NewsPage';

// Hợp nhất Slider và nội dung trang chủ vào đây
function HomePage() {
  return (
    <>
      <HeroSlider />
      <div className="text-center py-20 text-gray-400">Nội dung Trang Chủ (Danh sách phim...)</div>
    </>
  );
}

function App() {
  return (
    <Router>
      <main className="min-h-screen bg-[radial-gradient(circle_at_78%_0%,rgba(255,98,111,0.18),transparent_28%),#0f141c] text-white flex flex-col justify-between">
        
        {/* Đầu trang cố định */}
        <Header />
        
        {/* Nơi nội dung thay đổi khi bấm chuyển trang */}
        <div className="flex-grow">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/lich-chieu" element={<MovieSchedule />} />
            <Route path="/tin-tuc" element={<NewsPage />} />
          </Routes>
        </div>

        {/* Chân trang cố định */}
        <Footer />

      </main>
    </Router>
  );
}

export default App;