import {
  HiOutlineLocationMarker,
  HiOutlinePencil,
  HiOutlinePhone,
  HiOutlineTrash,
} from "react-icons/hi";

const CinemaTable = ({ cinemas, onEdit, onDelete, rowStart = 0 }) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";

    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th style={{ width: "58px" }}>#</th>
          <th style={{ width: "110px" }}>Hình ảnh</th>
          <th style={{ minWidth: "170px" }}>Tên rạp</th>
          <th style={{ minWidth: "220px" }}>Địa chỉ</th>
          <th style={{ width: "140px" }}>Thành phố</th>
          <th style={{ width: "140px" }}>Điện thoại</th>
          <th style={{ width: "110px" }}>Ngày tạo</th>
          <th style={{ width: "128px", textAlign: "center" }}>Thao tác</th>
        </tr>
      </thead>
      <tbody>
        {cinemas.length === 0 ? (
          <tr>
            <td colSpan="8">
              <div className="table-empty">
                <div className="table-empty-icon">🏢</div>
                <div className="table-empty-text">Chưa có rạp chiếu nào</div>
                <div className="table-empty-sub">
                  Hãy thêm rạp chiếu đầu tiên cho hệ thống
                </div>
              </div>
            </td>
          </tr>
        ) : (
          cinemas.map((cinema, index) => (
            <tr key={cinema._id}>
              <td style={{ color: "var(--color-text-muted)", fontWeight: 500 }}>
                {rowStart + index + 1}
              </td>
              <td>
                <div className="table-cinema-image">
                  {cinema.image ? (
                    <img
                      src={cinema.image}
                      alt={cinema.name}
                      onError={(event) => {
                        event.currentTarget.src =
                          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='64'%3E%3Crect fill='%23151c2e' width='96' height='64'/%3E%3C/svg%3E";
                      }}
                    />
                  ) : (
                    <span>No Image</span>
                  )}
                </div>
              </td>
              <td className="table-cell-name">{cinema.name}</td>
              <td>
                <div className="cinema-info-line">
                  <HiOutlineLocationMarker />
                  <span>{cinema.address || "-"}</span>
                </div>
              </td>
              <td>{cinema.city || "-"}</td>
              <td>
                <div className="cinema-info-line">
                  <HiOutlinePhone />
                  <span>{cinema.phone || "-"}</span>
                </div>
              </td>
              <td className="table-cell-date">{formatDate(cinema.created_at)}</td>
              <td>
                <div className="table-actions" style={{ justifyContent: "center" }}>
                  <button
                    className="btn btn-icon btn-ghost"
                    style={{ color: "var(--color-info)" }}
                    onClick={() => onEdit(cinema)}
                    title="Chỉnh sửa"
                    id={`btn-edit-cinema-${cinema._id}`}
                  >
                    <HiOutlinePencil />
                  </button>
                  <button
                    className="btn btn-icon btn-ghost"
                    style={{ color: "var(--color-danger)" }}
                    onClick={() => onDelete(cinema)}
                    title="Xóa"
                    id={`btn-delete-cinema-${cinema._id}`}
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

export default CinemaTable;
