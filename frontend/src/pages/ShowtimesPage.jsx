import { useEffect, useMemo, useState } from "react";
import {
  HiOutlineCalendar,
  HiOutlineRefresh,
  HiOutlineSearch,
} from "react-icons/hi";
import axiosClient from "../api/axiosClient";

const ShowtimesPage = () => {
  const [showtimes, setShowtimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchShowtimes = async (query = "") => {
    try {
      setLoading(true);
      const response = await axiosClient.get("/showtimes", {
        params: { q: query },
      });
      setShowtimes(response.data?.data || []);
    } catch (error) {
      console.error(error);
      setShowtimes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShowtimes("");
  }, []);

  const filteredShowtimes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return showtimes;

    return showtimes.filter((showtime) => {
      const movieTitle = showtime.movieTitle?.toLowerCase() || "";
      const roomName = showtime.roomName?.toLowerCase() || "";
      const cinemaName = showtime.cinemaName?.toLowerCase() || "";

      return (
        movieTitle.includes(query) ||
        roomName.includes(query) ||
        cinemaName.includes(query)
      );
    });
  }, [searchQuery, showtimes]);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <HiOutlineCalendar style={{ marginRight: "12px" }} />
            Quản lý Suất chiếu
          </h1>
          <p className="page-subtitle">
            Danh sách các suất chiếu đã được tạo trong hệ thống
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => fetchShowtimes(searchQuery)}
        >
          <HiOutlineRefresh />
          Làm mới
        </button>
      </div>

      <div className="search-bar">
        <div className="search-input-wrapper">
          <HiOutlineSearch className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Tìm kiếm suất chiếu..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Đang tải dữ liệu...</p>
          </div>
        ) : filteredShowtimes.length === 0 ? (
          <div className="empty-state">Chưa có suất chiếu nào.</div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Phim</th>
                  <th>Phòng</th>
                  <th>Rạp</th>
                  <th>Giờ bắt đầu</th>
                  <th>Giờ kết thúc</th>
                </tr>
              </thead>
              <tbody>
                {filteredShowtimes.map((showtime) => (
                  <tr key={showtime.id || showtime._id}>
                    <td>{showtime.movieTitle || "—"}</td>
                    <td>{showtime.roomName || "—"}</td>
                    <td>{showtime.cinemaName || "—"}</td>
                    <td>{showtime.startTime || "—"}</td>
                    <td>{showtime.endTime || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShowtimesPage;
