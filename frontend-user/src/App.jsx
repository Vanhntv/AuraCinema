import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import Header from './components/Header';
import Footer from './components/Footer';
import HeroSlider from './components/HeroSlider';
import NowShowingMovies from './components/NowShowingMovies';
import ProtectedRoute from './routes/ProtectedRoute';

const MovieSchedule = lazy(() => import('./pages/MovieSchedule'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const NewsPage = lazy(() => import('./pages/NewsPage'));
const NewsDetailPage = lazy(() => import('./pages/NewsDetailPage'));
const PromotionPage = lazy(() => import('./pages/PromotionPage'));
const PromotionDetailPage = lazy(() => import('./pages/PromotionDetailPage'));
const TicketPricePage = lazy(() => import('./pages/ticket-price/TicketPricePage'));
const AboutPage = lazy(() => import('./pages/about/AboutPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));
const SupportInfoPage = lazy(() => import('./pages/SupportInfoPage'));
const MovieDetailPage = lazy(() => import('./pages/MovieDetailPage'));
const VnpayReturnPage = lazy(() => import('./pages/VnpayReturnPage'));
const SepayPgReturnPage = lazy(() => import('./pages/SepayPgReturnPage'));
const PaymentPage = lazy(() => import('./pages/PaymentPage'));
const BookingResultPage = lazy(() => import('./pages/BookingResultPage'));

const AdminLayout = lazy(() => import('./admin/components/layout/AdminLayout'));
const AdminRoute = lazy(() => import('./admin/routes/AdminRoute'));
const AdminDashboardPage = lazy(() => import('./admin/pages/DashboardPage'));
const AdminGenresPage = lazy(() => import('./admin/pages/GenresPage'));
const AdminMoviesPage = lazy(() => import('./admin/pages/MoviesPage'));
const AdminRoomsPage = lazy(() => import('./admin/pages/RoomsPage'));
const AdminShowtimesPage = lazy(() => import('./admin/pages/ShowtimesPage'));
const AdminBookingsPage = lazy(() => import('./admin/pages/BookingsPage'));
const AdminMarketingContentPage = lazy(() => import('./admin/pages/MarketingContentPage'));
const AdminTrailersPage = lazy(() => import('./admin/pages/TrailersPage'));
const AdminUsersPage = lazy(() => import('./admin/pages/UsersPage'));
const AdminConcessionsPage = lazy(() => import('./admin/pages/ConcessionsPage'));
const AdminVouchersPage = lazy(() => import('./admin/pages/VouchersPage'));
const AdminTicketScannerPage = lazy(() => import('./admin/pages/TicketScannerPage'));
const AdminTicketScanHistoryPage = lazy(() => import('./admin/pages/TicketScanHistoryPage'));
const AdminGiftsPage = lazy(() => import('./admin/pages/GiftsPage'));

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
      <nav aria-label="Lối tắt đặt vé" className="mx-auto mb-16 grid w-[min(1280px,calc(100%_-_40px))] grid-cols-2 gap-4 max-sm:w-[calc(100%_-_28px)] max-sm:grid-cols-1">
        <Link to="/lich-chieu" className="rounded-2xl border border-white/10 bg-[var(--aura-surface)] p-5 text-white no-underline transition hover:border-[#ff6070]/50 hover:bg-[var(--aura-surface-raised)]"><strong className="block text-lg">Xem lịch chiếu</strong><span className="mt-1 block text-sm text-slate-400">Chọn ngày và khung giờ phù hợp</span></Link>
        <Link to="/khuyen-mai" className="rounded-2xl border border-white/10 bg-[var(--aura-surface)] p-5 text-white no-underline transition hover:border-[#ff6070]/50 hover:bg-[var(--aura-surface-raised)]"><strong className="block text-lg">Xem ưu đãi</strong><span className="mt-1 block text-sm text-slate-400">Kiểm tra mã giảm giá đang áp dụng</span></Link>
      </nav>
    </>
  );
}

function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen bg-[var(--aura-ink)] text-white">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3600,
          style: {
            background: 'var(--aura-surface)',
            border: '1px solid var(--aura-border)',
            color: 'var(--aura-projector-white)',
            fontWeight: 700,
          },
          success: {
            iconTheme: {
              primary: '#34d399',
              secondary: '#0f172a',
            },
          },
          error: {
            iconTheme: {
              primary: '#fb7185',
              secondary: '#0f172a',
            },
          },
        }}
      />
      <ScrollToTop />
      {!isAdminRoute && <Header />}
      <Suspense fallback={<main className="grid min-h-[55vh] place-items-center"><p className="text-sm font-bold text-slate-400">Đang tải nội dung...</p></main>}>
        <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/lich-chieu" element={<MovieSchedule />} />
        <Route path="/phim/:movieId" element={<MovieDetailPage />} />
        <Route path="/dat-ve/:showtimeId" element={<BookingPage />} />
        <Route path="/tin-tuc" element={<NewsPage />} />
        <Route path="/tin-tuc/:slug" element={<NewsDetailPage />} />
        <Route path="/khuyen-mai" element={<PromotionPage />} />
        <Route path="/khuyen-mai/:slug" element={<PromotionDetailPage />} />
        <Route path="/gia-ve" element={<TicketPricePage />} />
        <Route path="/gioi-thieu" element={<AboutPage />} />
        <Route path="/dieu-khoan-su-dung" element={<SupportInfoPage />} />
        <Route path="/chinh-sach-bao-mat" element={<SupportInfoPage />} />
        <Route path="/huong-dan-dat-ve" element={<SupportInfoPage />} />
        <Route path="/cau-hoi-thuong-gap" element={<SupportInfoPage />} />
        <Route path="/dang-ky" element={<RegisterPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dang-nhap" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/quen-mat-khau" element={<ForgotPasswordPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/payment/vnpay-return" element={<VnpayReturnPage />} />
        <Route path="/payment/sepay-pg-return" element={<SepayPgReturnPage />} />
        <Route
          path="/payment/:bookingId"
          element={
            <ProtectedRoute>
              <PaymentPage />
            </ProtectedRoute>
          }
        />
        <Route path="/booking/success/:bookingId" element={<BookingResultPage result="success" />} />
        <Route path="/booking/failed" element={<BookingResultPage result="failed" />} />
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
          <Route path="rooms" element={<AdminRoomsPage />} />
          <Route path="showtimes" element={<AdminShowtimesPage />} />
          <Route path="bookings" element={<AdminBookingsPage />} />
          <Route path="ticket-scanner" element={<AdminTicketScannerPage />} />
          <Route path="ticket-scan-history" element={<AdminTicketScanHistoryPage />} />
          <Route path="concessions" element={<AdminConcessionsPage />} />
          <Route path="vouchers" element={<AdminVouchersPage />} />
          <Route path="marketing" element={<AdminMarketingContentPage />} />
          <Route path="gifts" element={<AdminGiftsPage />} />
          <Route path="trailers" element={<AdminTrailersPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="settings" element={<Navigate to="/admin/movies" replace />} />
        </Route>
        {/* Các route InfoPages đã xóa theo yêu cầu của bạn */}
        </Routes>
      </Suspense>
      {!isAdminRoute && <Footer />}
    </div>
  );
}

export default App;
