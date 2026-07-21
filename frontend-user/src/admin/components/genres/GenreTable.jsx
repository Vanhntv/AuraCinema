import { HiOutlinePencil, HiOutlineTrash } from "react-icons/hi";

const GenreTable = ({
  genres,
  selectedIds,
  onSelectOne,
  onSelectAll,
  onEdit,
  onDelete,
  onToggleStatus,
  rowStart = 0,
}) => {
  const allSelected =
    genres.length > 0 && genres.every((genre) => selectedIds.includes(genre._id));

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";

    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th style={{ width: "44px" }}>
            <input
              type="checkbox"
              className="table-checkbox"
              checked={allSelected}
              onChange={(event) => onSelectAll(event.target.checked)}
              aria-label="Chọn tất cả thể loại"
            />
          </th>
          <th style={{ width: "58px" }}>#</th>
          <th>Tên thể loại</th>
          <th>Mô tả</th>
          <th style={{ width: "110px" }}>Số phim</th>
          <th style={{ width: "140px" }}>Trạng thái</th>
          <th style={{ width: "150px" }}>Ngày tạo</th>
          <th style={{ width: "128px", textAlign: "center" }}>Thao tác</th>
        </tr>
      </thead>
      <tbody>
        {genres.length === 0 ? (
          <tr>
            <td colSpan="8">
              <div className="table-empty">
                <div className="table-empty-icon">🎬</div>
                <div className="table-empty-text">Chưa có thể loại nào</div>
                <div className="table-empty-sub">
                  Hãy thêm thể loại đầu tiên cho hệ thống
                </div>
              </div>
            </td>
          </tr>
        ) : (
          genres.map((genre, index) => (
            <tr key={genre._id}>
              <td>
                <input
                  type="checkbox"
                  className="table-checkbox"
                  checked={selectedIds.includes(genre._id)}
                  onChange={(event) =>
                    onSelectOne(genre._id, event.target.checked)
                  }
                  aria-label={`Chọn ${genre.name}`}
                />
              </td>
              <td style={{ color: "var(--color-text-muted)", fontWeight: 500 }}>
                {rowStart + index + 1}
              </td>
              <td className="table-cell-name">{genre.name}</td>
              <td className="table-cell-desc">{genre.description}</td>
              <td>{genre.movieCount || 0}</td>
              <td>
                <button
                  type="button"
                  className={`toggle-switch ${genre.status ? "active" : ""}`}
                  onClick={() => onToggleStatus(genre)}
                  title={genre.status ? "Tắt thể loại" : "Bật thể loại"}
                >
                  <span></span>
                  {genre.status ? "Hoạt động" : "Tạm tắt"}
                </button>
              </td>
              <td className="table-cell-date">{formatDate(genre.createdAt)}</td>
              <td>
                <div className="table-actions" style={{ justifyContent: "center" }}>
                  <button
                    className="btn btn-icon btn-ghost"
                    style={{ color: "var(--color-info)" }}
                    onClick={() => onEdit(genre)}
                    title="Chỉnh sửa"
                    id={`btn-edit-${genre._id}`}
                  >
                    <HiOutlinePencil />
                  </button>
                  <button
                    className="btn btn-icon btn-ghost"
                    style={{ color: "var(--color-danger)" }}
                    onClick={() => onDelete(genre)}
                    title="Xóa"
                    id={`btn-delete-${genre._id}`}
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

export default GenreTable;
