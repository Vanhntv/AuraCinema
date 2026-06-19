import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import HeroSlider from './components/HeroSlider';
import MovieSchedule from './pages/MovieSchedule';
import NewsPage from './pages/NewsPage';
import PromotionPage from './pages/PromotionPage'; 
import BookingModal from './components/BookingModal';
import MovieDetailModal from './components/MovieDetailModal';

const homeMovies = [
  { id: 1, title: 'MA XÓ', tags: 'Kinh dị', image: 'https://cdn.galaxycine.vn/media/2026/5/29/ma-xo-2_1780061164303.jpg' },
  { id: 2, title: 'TOY STORY 5', tags: 'Hoạt hình', image: 'https://iguov8nhvyobj.vcdn.cloud/media/catalog/product/cache/1/image/c5f0a1eff4c394a251036189ccddaacd/p/o/poster_cau_chuyen_do_choi_5_.jpg' },
  { id: 3, title: 'LẦU CHÚ HỎA', tags: 'Kinh dị', image: 'https://iguov8nhvyobj.vcdn.cloud/media/catalog/product/cache/1/image/c5f0a1eff4c394a251036189ccddaacd/4/7/470wx700h-lch.jpg' },
  { id: 4, title: 'MUMBO GIẢI CỨU', tags: 'Hoạt hình', image: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=600&auto=format&fit=crop&q=80' },
  { id: 5, title: 'THỎ ƠI', tags: 'Tâm lý', image: 'https://cdn2.tuoitre.vn/thumb_w/640/471584752817336320/2026/2/21/base64-17716817771081137588961.jpeg' },
  { id: 6, title: 'MESDAMES THANH SẮC', tags: 'Tâm lý', image: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&auto=format&fit=crop&q=80' },
  { id: 7, title: 'ÁM ẢNH KINH HOÀNG', tags: 'Kinh dị', image: 'https://images.unsplash.com/photo-1505635552518-3448ff116af3?w=600&auto=format&fit=crop&q=80' },
  { id: 8, title: 'BẠCH XÀ', tags: 'Hoạt hình', image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80' },
  { id: 9, title: 'MA LU', tags: 'Kinh dị', image: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=600&auto=format&fit=crop&q=80' }
];

function HomePage() {
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [bookingMovie, setBookingMovie] = useState(null);

  const openMovieDetail = (movie) => {
    setSelectedMovie({
      ...movie,
      _id: movie._id || movie.id,
      poster: movie.poster || movie.image,
      banner: movie.banner || movie.image,
      status: movie.status || 'now_showing',
    });
  };

  const openBooking = (movie) => {
    setSelectedMovie(null);
    setBookingMovie({
      ...movie,
      _id: movie._id || movie.id,
      poster: movie.poster || movie.image,
      banner: movie.banner || movie.image,
    });
  };

  return (
    <>
      <HeroSlider />
      <div className="mx-auto mt-12 mb-24 w-[90%] max-w-[1400px]">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-12">
          
          <div>
            <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
              <h2 className="text-xl font-black uppercase text-[#ff6070] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#ff6070]"></span> Phim đang chiếu
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-5 gap-y-8">
              {homeMovies.map((movie) => (
                <button
                  key={movie.id}
                  className="group cursor-pointer text-left"
                  type="button"
                  onClick={() => openMovieDetail(movie)}
                >
                  <div className="w-full aspect-[2/3] rounded-lg overflow-hidden bg-slate-900 shadow-lg group-hover:ring-2 ring-[#ff6070] transition-all">
                    <img src={movie.image} alt={movie.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <h3 className="text-[13px] font-bold text-slate-200 mt-3 uppercase line-clamp-1 group-hover:text-[#ff6070]">
                    {movie.title}
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-1">{movie.tags}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="hidden lg:flex flex-col gap-10">
            <div>
              <div className="flex items-center justify-between mb-6 border-b-2 border-[#ff6070] pb-2">
                <h2 className="text-base font-black uppercase text-white">Khuyến mãi</h2>
                <a href="/khuyen-mai" className="text-xs text-slate-400 hover:text-[#ff6070]">Xem tất cả →</a>
              </div>
              <div className="flex flex-col gap-4">
                <div className="w-full aspect-[16/9] rounded-[16px] overflow-hidden border border-white/10 hover:border-[#ff6070] transition-all cursor-pointer">
                  <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRl-9NodLoecTCoa5B7DUIYWf9IqnBDkTI-N8WwwZlJ72hM1nMZzvS8yVv2&s=10" className="w-full h-full object-cover" alt="KM" />
                </div>
                <div className="w-full aspect-[16/9] rounded-[16px] overflow-hidden border border-white/10 hover:border-[#ff6070] transition-all cursor-pointer">
                  <img src="https://api-website.cinestar.com.vn/media/wysiwyg/CMSPage/Promotions/MONDAY.jpg" className="w-full h-full object-cover" alt="KM" />
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-6 border-b-2 border-[#ff6070] pb-2">
                <h2 className="text-base font-black uppercase text-white">Sự kiện</h2>
                <span className="text-xs text-slate-400 hover:text-[#ff6070] cursor-pointer">Xem tất cả →</span>
              </div>
              <div className="w-full aspect-[16/9] rounded-[16px] overflow-hidden border border-white/10 hover:border-[#ff6070] transition-all cursor-pointer">
                <img src="https://anmedia.vn/wp-content/uploads/2022/08/File-2656-scaled.jpg" className="w-full h-full object-cover" alt="Sự kiện" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <MovieDetailModal
        movie={selectedMovie}
        onClose={() => setSelectedMovie(null)}
        onBook={openBooking}
      />
      <BookingModal movie={bookingMovie} onClose={() => setBookingMovie(null)} />
    </>
  );
}

function App() {
  return (
    <Router>
      <main className="min-h-screen bg-[#0f141c] text-white">
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/lich-chieu" element={<MovieSchedule />} />
          <Route path="/tin-tuc" element={<NewsPage />} />
          <Route path="/khuyen-mai" element={<PromotionPage />} />
        </Routes>
        <Footer />
      </main>
    </Router>
  );
}

export default App;
