import { Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "./components/layout/AdminLayout";
import DashboardPage from "./pages/DashboardPage";
import GenresPage from "./pages/GenresPage";
import MoviesPage from "./pages/MoviesPage";
import ShowtimesPage from "./pages/ShowtimesPage";
import UsersPage from "./pages/UsersPage";
import AdminRoute from "./routes/AdminRoute";

function App() {
  return (
    <Routes>
      <Route
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard" element={<DashboardPage />} />
        <Route path="/admin/genres" element={<GenresPage />} />
        <Route path="/admin/movies" element={<MoviesPage />} />
        <Route path="/admin/showtimes" element={<ShowtimesPage />} />
        <Route path="/admin/users" element={<UsersPage />} />
        <Route
          path="/genres"
          element={<Navigate to="/admin/genres" replace />}
        />
        <Route
          path="/movies"
          element={<Navigate to="/admin/movies" replace />}
        />
        <Route
          path="/showtimes"
          element={<Navigate to="/admin/showtimes" replace />}
        />
        <Route path="/users" element={<Navigate to="/admin/users" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );
}

export default App;
