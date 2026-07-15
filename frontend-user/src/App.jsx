import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import Header from "./components/Header";
import HeroSlider from "./components/HeroSlider";
import Footer from "./components/Footer";
import NowShowingMovies from "./components/NowShowingMovies";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import MovieSchedule from "./pages/MovieSchedule";
import RegisterPage from "./pages/RegisterPage";
import ProtectedRoute from "./routes/ProtectedRoute";
import PublicRoute from "./routes/PublicRoute";

function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0f141c]">
      <Header />
      <main className="overflow-hidden">
        <HeroSlider />
        <NowShowingMovies />
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/lich-chieu"
        element={
          <>
            <Header />
            <MovieSchedule />
            <Footer />
          </>
        }
      />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
