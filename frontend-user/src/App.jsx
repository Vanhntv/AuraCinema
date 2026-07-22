import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import HeroSlider from './components/HeroSlider';
import NowShowingMovies from './components/NowShowingMovies';
import MovieSchedule from './pages/MovieSchedule';
import NewsPage from './pages/NewsPage';
import NewsDetailPage from './pages/NewsDetailPage';
import PromotionPage from './pages/PromotionPage';
import PromotionDetailPage from './pages/PromotionDetailPage';
import TicketPricePage from './pages/ticket-price/TicketPricePage';
import AboutPage from './pages/about/AboutPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import AccountPage from './pages/AccountPage';
import ProtectedRoute from './routes/ProtectedRoute';

const AdminLayout = lazy(() => import('./admin/components/layout/AdminLayout'));
const AdminRoute = lazy(() => import('./admin/routes/AdminRoute'));
const AdminDashboardPage = lazy(() => import('./admin/pages/DashboardPage'));
const AdminGenresPage = lazy(() => import('./admin/pages/GenresPage'));
const AdminMoviesPage = lazy(() => import('./admin/pages/MoviesPage'));
const AdminCinemasPage = lazy(() => import('./admin/pages/CinemasPage'));
const AdminShowtimesPage = lazy(() => import('./admin/pages/ShowtimesPage'));
const AdminTrailersPage = lazy(() => import('./admin/pages/TrailersPage'));
const AdminUsersPage = lazy(() => import('./admin/pages/UsersPage'));

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
      <section className="mx-auto mt-6 grid w-[min(1280px,calc(100%_-_40px))] grid-cols-2 gap-4 max-sm:w-[calc(100%_-_28px)] max-sm:grid-cols-1">
        <a href="/lich-chieu" className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-white no-underline transition hover:border-[#ff6070]/50 hover:bg-[#ff5364]/5"><strong className="block text-lg">Lịch chiếu hôm nay</strong><span className="mt-1 block text-sm text-slate-400">Chọn phim, rạp và khung giờ phù hợp</span></a>
        <a href="/khuyen-mai" className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-white no-underline transition hover:border-[#ff6070]/50 hover:bg-[#ff5364]/5"><strong className="block text-lg">Ưu đãi nổi bật</strong><span className="mt-1 block text-sm text-slate-400">Khám phá chương trình dành riêng cho bạn</span></a>
      </section>
      <NowShowingMovies />
    </>
  );
}

function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <main className="min-h-screen bg-[#0f141c] text-white">
      <ScrollToTop />
      {!isAdminRoute && <Header />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/lich-chieu" element={<MovieSchedule />} />
        <Route path="/tin-tuc" element={<NewsPage />} />
        <Route path="/tin-tuc/:slug" element={<NewsDetailPage />} />
        <Route path="/khuyen-mai" element={<PromotionPage />} />
        <Route path="/khuyen-mai/:slug" element={<PromotionDetailPage />} />
        <Route path="/gia-ve" element={<TicketPricePage />} />
        <Route path="/gioi-thieu" element={<AboutPage />} />
        <Route path="/dang-ky" element={<RegisterPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dang-nhap" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/quen-mat-khau" element={<ForgotPasswordPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route
          path="/tai-khoan"
          element={
            <ProtectedRoute>
              <AccountPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <Suspense
              fallback={
                <main className="auth-shell">
                  <p className="auth-loading">Đang tải trang quản trị...</p>
                </main>
              }
            >
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            </Suspense>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="genres" element={<AdminGenresPage />} />
          <Route path="movies" element={<AdminMoviesPage />} />
          <Route path="cinemas" element={<AdminCinemasPage />} />
          <Route path="showtimes" element={<AdminShowtimesPage />} />
          <Route path="trailers" element={<AdminTrailersPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="settings" element={<Navigate to="/admin/dashboard" replace />} />
        </Route>
        {/* Các route InfoPages đã xóa theo yêu cầu của bạn */}
      </Routes>
      {!isAdminRoute && <Footer />}
    </main>
  );
}

export default App;
