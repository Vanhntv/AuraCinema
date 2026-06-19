import { Routes, Route } from "react-router-dom";
import AdminLayout from "./components/layout/AdminLayout";
import DashboardPage from "./pages/DashboardPage";
import GenresPage from "./pages/GenresPage";
import MoviesPage from "./pages/MoviesPage";

function App() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/genres" element={<GenresPage />} />
        <Route path="/movies" element={<MoviesPage />} />
      </Route>
    </Routes>
  );
}

export default App;