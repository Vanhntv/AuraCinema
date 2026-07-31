import { useCallback, useEffect, useState } from "react";
import {
  HiOutlinePencil,
  HiOutlinePlus,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineTrash,
} from "react-icons/hi";
import ConfirmDialog from "../components/common/ConfirmDialog";
import Toast from "../components/common/Toast";
import {
  createAdminMarketingContent,
  deleteAdminMarketingContent,
  getAdminMarketingContent,
  updateAdminMarketingContent,
} from "../services/marketingContentAdminService";

const emptyForm = {
  type: "news",
  title: "",
  slug: "",
  summary: "",
  thumbnail: "",
  category: "",
  author: "AuraCinema",
  status: "draft",
  published_at: "",
  start_date: "",
  end_date: "",
  content_html: "",
};

const typeLabels = {
  news: "Tin tức",
  promotion: "Khuyến mãi",
};

const statusLabels = {
  draft: "Nháp",
  published: "Đã xuất bản",
  archived: "Lưu trữ",
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("vi-VN");
};

const toInputDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const statusBadgeClass = (status) => {
  if (status === "published") return "status-badge status-now-showing";
  if (status === "draft") return "status-badge status-coming-soon";
  return "status-badge status-ended";
};

const MarketingContentPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [formData, setFormData] = useState(emptyForm);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, message) => {
    setToasts((current) => [...current, { id: Date.now() + Math.random(), type, message }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAdminMarketingContent({
        limit: 100,
        q: searchQuery.trim(),
        type: typeFilter || undefined,
      });
      setItems(response.data || []);
    } catch (error) {
      addToast("error", error.response?.data?.message || "Không thể tải nội dung marketing");
    } finally {
      setLoading(false);
    }
  }, [addToast, searchQuery, typeFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingItem(null);
  };

  const handleChange = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      type: item.type || "news",
      title: item.title || "",
      slug: item.slug || "",
      summary: item.summary || "",
      thumbnail: item.thumbnail || "",
      category: item.category || "",
      author: item.author || "AuraCinema",
      status: item.status || "draft",
      published_at: toInputDate(item.published_at),
      start_date: toInputDate(item.start_date),
      end_date: toInputDate(item.end_date),
      content_html: item.content_html || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        start_date: formData.type === "promotion" ? formData.start_date : "",
        end_date: formData.type === "promotion" ? formData.end_date : "",
      };
      if (editingItem) {
        await updateAdminMarketingContent(editingItem._id, payload);
        addToast("success", "Đã cập nhật nội dung");
      } else {
        await createAdminMarketingContent(payload);
        addToast("success", "Đã tạo nội dung");
      }
      resetForm();
      await fetchItems();
    } catch (error) {
      addToast("error", error.response?.data?.message || "Không thể lưu nội dung");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    try {
      await deleteAdminMarketingContent(deletingItem._id);
      addToast("success", "Đã xóa nội dung");
      setDeletingItem(null);
      await fetchItems();
    } catch (error) {
      addToast("error", error.response?.data?.message || "Không thể xóa nội dung");
    }
  };

  return (
    <div className="marketing-page">
      <div className="page-header">
        <div className="page-header-info">
          <h1>Marketing CMS</h1>
          <p>Quản lý tin tức, landing khuyến mãi và nội dung chiến dịch voucher</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchItems} disabled={loading} type="button">
          <HiOutlineRefresh />
          Làm mới
        </button>
      </div>

      <form className="marketing-editor-panel" onSubmit={handleSubmit}>
        <div className="marketing-editor-header">
          <h2>{editingItem ? "Cập nhật nội dung" : "Tạo nội dung mới"}</h2>
          {editingItem && <button className="btn btn-secondary" onClick={resetForm} type="button">Tạo mới</button>}
        </div>
        <div className="marketing-form-grid">
          <select className="form-input" value={formData.type} onChange={(event) => handleChange("type", event.target.value)}>
            <option value="news">Tin tức</option>
            <option value="promotion">Khuyến mãi</option>
          </select>
          <select className="form-input" value={formData.status} onChange={(event) => handleChange("status", event.target.value)}>
            <option value="draft">Nháp</option>
            <option value="published">Xuất bản</option>
            <option value="archived">Lưu trữ</option>
          </select>
          <input className="form-input" value={formData.title} onChange={(event) => handleChange("title", event.target.value)} placeholder="Tiêu đề" />
          <input className="form-input" value={formData.slug} onChange={(event) => handleChange("slug", event.target.value)} placeholder="Slug URL, bỏ trống sẽ tự tạo" />
          <input className="form-input" value={formData.thumbnail} onChange={(event) => handleChange("thumbnail", event.target.value)} placeholder="URL ảnh thumbnail/banner" />
          <input className="form-input" value={formData.category} onChange={(event) => handleChange("category", event.target.value)} placeholder="Danh mục" />
          <input className="form-input" value={formData.author} onChange={(event) => handleChange("author", event.target.value)} placeholder="Tác giả" />
          <input className="form-input" type="date" value={formData.published_at} onChange={(event) => handleChange("published_at", event.target.value)} />
          {formData.type === "promotion" && (
            <>
              <input className="form-input" type="date" value={formData.start_date} onChange={(event) => handleChange("start_date", event.target.value)} />
              <input className="form-input" type="date" value={formData.end_date} onChange={(event) => handleChange("end_date", event.target.value)} />
            </>
          )}
        </div>
        <textarea className="form-input marketing-summary-input" value={formData.summary} onChange={(event) => handleChange("summary", event.target.value)} placeholder="Tóm tắt" />
        <textarea className="form-input marketing-content-input" value={formData.content_html} onChange={(event) => handleChange("content_html", event.target.value)} placeholder="<p>Nội dung HTML...</p>" />
        <button className="btn btn-primary" disabled={submitting} type="submit">
          <HiOutlinePlus />
          {submitting ? "Đang lưu..." : editingItem ? "Lưu thay đổi" : "Tạo nội dung"}
        </button>
      </form>

      <div className="marketing-toolbar">
        <div className="filter-search">
          <HiOutlineSearch />
          <input className="form-input" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Tìm tiêu đề, slug, danh mục" />
        </div>
        <select className="form-input" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
          <option value="">Tất cả loại</option>
          <option value="news">Tin tức</option>
          <option value="promotion">Khuyến mãi</option>
        </select>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="table-toolbar-left">
            <span className="table-toolbar-title">Danh sách nội dung</span>
            <span className="table-toolbar-count">{items.length} mục</span>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="data-table marketing-table">
            <thead>
              <tr>
                <th>Tiêu đề</th>
                <th>Loại</th>
                <th>Trạng thái</th>
                <th>Ngày xuất bản</th>
                <th>Lượt xem</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: "center" }}>Đang tải nội dung...</td></tr>
              ) : items.length ? (
                items.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <strong className="marketing-title-cell">{item.title}</strong>
                      <span className="table-muted">{item.slug}</span>
                    </td>
                    <td>{typeLabels[item.type] || item.type}</td>
                    <td><span className={statusBadgeClass(item.status)}>{statusLabels[item.status] || item.status}</span></td>
                    <td>{formatDate(item.published_at)}</td>
                    <td>{Number(item.view_count || 0).toLocaleString("vi-VN")}</td>
                    <td>
                      <div className="table-actions">
                        <button className="action-btn edit" onClick={() => handleEdit(item)} type="button"><HiOutlinePencil /></button>
                        <button className="action-btn delete" onClick={() => setDeletingItem(item)} type="button"><HiOutlineTrash /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="6" style={{ textAlign: "center" }}>Chưa có nội dung CMS</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        isOpen={Boolean(deletingItem)}
        title="Xóa nội dung?"
        message={`Nội dung "${deletingItem?.title || ""}" sẽ được chuyển sang lưu trữ.`}
        onCancel={() => setDeletingItem(null)}
        onConfirm={handleDelete}
      />
      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default MarketingContentPage;
