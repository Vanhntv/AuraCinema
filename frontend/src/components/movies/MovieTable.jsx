import { HiOutlinePencil, HiOutlineTrash } from "react-icons/hi";

const MovieTable = ({ movies, onEdit, onDelete }) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      coming_soon: "status-badge status-coming-soon",
      now_showing: "status-badge status-now-showing",
      ended: "status-badge status-ended",
    };
    return statusMap[status] || "status-badge";
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      coming_soon: "Sắp chiếu",
      now_showing: "Đang chiếu",
      ended: "Đã kết thúc",
    };
    return statusMap[status] || status;
  };

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th style={{ width: "50px" }}>#</th>
          <th style={{ width: "80px" }}>Poster</th>
          <th style={{ minWidth: "150px" }}>Tên phim</th>
          <th style={{ minWidth: "120px" }}>Thể loại</th>
          <th style={{ width: "80px" }}>Thời lượng</th>
          <th style={{ width: "100px" }}>Ngày phát hành</th>
          <th style={{ width: "100px" }}>Trạng thái</th>
          <th style={{ width: "120px", textAlign: "center" }}>Thao tác</th>
        </tr>
      </thead>
      <tbody>
        {movies.length === 0 ? (
          <tr>
            <td colSpan="8">
              <div className="table-empty">
                <div className="table-empty-icon">🎬</div>
                <div className="table-empty-text">Chưa có phim nào</div>
                <div className="table-empty-sub">
                  Hãy thêm phim đầu tiên cho hệ thống
                </div>
              </div>
            </td>
          </tr>
        ) : (
          movies.map((movie, index) => (
            <tr key={movie._id}>
              <td style={{ color: "var(--color-text-muted)", fontWeight: 500 }}>
                {index + 1}
              </td>
              <td>
                <div className="table-poster">
                  {movie.poster ? (
                    <img
                      src={movie.poster}
                      alt={movie.title}
                      onError={(e) => {
                        e.target.src =
                          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='80'%3E%3Crect fill='%23333' width='60' height='80'/%3E%3C/svg%3E";
                      }}
                    />
                  ) : (
                    <div className="table-poster-placeholder">No Image</div>
                  )}
                </div>
              </td>
              <td className="table-cell-name">{movie.title}</td>
              <td className="table-cell-genres">
                {movie.genres && movie.genres.length > 0
                  ? movie.genres.map((g) => g.name).join(", ")
                  : "—"}
              </td>
              <td>{movie.duration ? `${movie.duration} phút` : "—"}</td>
              <td className="table-cell-date">{formatDate(movie.releaseDate)}</td>
              <td>
                <span className={getStatusBadgeClass(movie.status)}>
                  {getStatusLabel(movie.status)}
                </span>
              </td>
              <td>
                <div className="table-actions" style={{ justifyContent: "center" }}>
                  <button
                    className="btn btn-icon btn-ghost"
                    style={{ color: "var(--color-info)" }}
                    onClick={() => onEdit(movie)}
                    title="Chỉnh sửa"
                    id={`btn-edit-${movie._id}`}
                  >
                    <HiOutlinePencil />
                  </button>
                  <button
                    className="btn btn-icon btn-ghost"
                    style={{ color: "var(--color-danger)" }}
                    onClick={() => onDelete(movie)}
                    title="Xóa"
                    id={`btn-delete-${movie._id}`}
                  >
                    <HiOutlineTrash />
                  </button>
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
};

export default MovieTable;
