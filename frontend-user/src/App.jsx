import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import Header from "./components/Header";
import HeroSlider from "./components/HeroSlider";
import Footer from "./components/Footer";
import NowShowingMovies from "./components/NowShowingMovies";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProtectedRoute from "./routes/ProtectedRoute";
import PublicRoute from "./routes/PublicRoute";

function LandingPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_78%_0%,rgba(255,98,111,0.18),transparent_28%),#0f141c] text-slate-50">
      <Header />
      <HeroSlider />
      <NowShowingMovies />
      <Footer />
    </main>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
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
