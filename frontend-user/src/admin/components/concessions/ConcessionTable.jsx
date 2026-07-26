import { HiOutlinePencil, HiOutlinePhotograph } from "react-icons/hi";

const formatCurrency = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const typeLabels = {
  combo: "Combo",
  popcorn: "Bắp",
  drink: "Nước",
  snack: "Snack",
};

const resolveImageUrl = (image) => {
  if (!image) return "";
  if (/^https?:\/\//i.test(image)) return image;

  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5001/api";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${image.startsWith("/") ? image : `/${image}`}`;
};

const ConcessionTable = ({ items, rowStart = 0, onToggleStatus, onEditPrice }) => {
  return (
    <div className="table-wrapper concession-table-wrapper">
      <table className="data-table concession-table">
        <thead>
          <tr>
            <th style={{ width: "58px" }}>#</th>
            <th style={{ width: "92px" }}>Ảnh</th>
            <th>Dịch vụ</th>
            <th style={{ width: "120px" }}>Loại</th>
            <th style={{ width: "150px" }}>Giá bán</th>
            <th style={{ width: "110px" }}>Tồn kho</th>
            <th style={{ width: "150px" }}>Trạng thái</th>
            <th style={{ width: "160px" }}>Cập nhật</th>
            <th style={{ width: "110px", textAlign: "center" }}>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan="9">
                <div className="table-empty">
                  <div className="table-empty-icon">BN</div>
                  <div className="table-empty-text">Chưa có dịch vụ phù hợp</div>
                  <div className="table-empty-sub">
                    Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.
                  </div>
                </div>
              </td>
            </tr>
          ) : (
            items.map((item, index) => (
              <tr key={item._id}>
                <td style={{ color: "var(--color-text-muted)", fontWeight: 500 }}>
                  {rowStart + index + 1}
                </td>
                <td>
                  <div className="concession-thumb">
                    {item.image ? (
                      <img src={resolveImageUrl(item.image)} alt={item.name} />
                    ) : (
                      <HiOutlinePhotograph />
                    )}
                  </div>
                </td>
                <td>
                  <div className="table-cell-name">{item.name}</div>
                  <div className="table-cell-desc">
                    {item.description || "Chưa có mô tả"}
                  </div>
                </td>
                <td>
                  <span className="status-badge status-coming-soon">
                    {typeLabels[item.type] || "Combo"}
                  </span>
                </td>
                <td className="concession-price">{formatCurrency(item.price)}</td>
                <td>{Number(item.stock || 0)}</td>
                <td>
                  <button
                    type="button"
                    className={`toggle-switch ${item.status ? "active" : ""}`}
                    onClick={() => onToggleStatus(item)}
                    title={item.status ? "Chuyển sang ngừng bán" : "Mở bán lại"}
                  >
                    <span></span>
                    {item.status ? "Đang bán" : "Ngừng bán"}
                  </button>
                </td>
                <td className="table-cell-date">
                  {formatDate(item.updated_at || item.created_at)}
                </td>
                <td>
                  <div className="table-actions" style={{ justifyContent: "center" }}>
                    <button
                      className="btn btn-icon btn-ghost"
                      style={{ color: "var(--color-info)" }}
                      onClick={() => onEditPrice(item)}
                      title="Cập nhật giá bán"
                    >
                      <HiOutlinePencil />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ConcessionTable;
