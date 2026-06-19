import { Navigate, Routes, Route } from "react-router-dom";
import AdminLayout from "./components/layout/AdminLayout";
import DashboardPage from "./pages/DashboardPage";
import GenresPage from "./pages/GenresPage";
import MoviesPage from "./pages/MoviesPage";
import CinemasPage from "./pages/CinemasPage";

function App() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard" element={<DashboardPage />} />
        <Route path="/genres" element={<GenresPage />} />
        <Route path="/movies" element={<MoviesPage />} />
        <Route path="/cinemas" element={<CinemasPage />} />
      </Route>
    </Routes>
  );
}

export default App;
