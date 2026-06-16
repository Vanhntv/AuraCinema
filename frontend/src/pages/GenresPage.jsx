import { useState, useEffect, useMemo, useCallback } from "react";
import {
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlineTag,
  HiOutlineRefresh,
} from "react-icons/hi";
import {
  getGenres,
  createGenre,
  updateGenre,
  deleteGenre,
} from "../services/genreService";
import GenreTable from "../components/genres/GenreTable";
import GenreModal from "../components/genres/GenreModal";
import ConfirmDialog from "../components/common/ConfirmDialog";
import Toast from "../components/common/Toast";
const GenresPage = () => {
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [toasts, setToasts] = useState([]);
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGenre, setEditingGenre] = useState(null);
  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingGenre, setDeletingGenre] = useState(null);
  // Toast helpers
  const addToast = useCallback((type, message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);
  // Fetch genres
  const fetchGenres = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getGenres();
      setGenres(data.data || []);
    } catch (error) {
      addToast("error", "Không thể tải danh sách thể loại");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [addToast]);
  useEffect(() => {
    fetchGenres();
  }, [fetchGenres]);
  // Filtered genres
  const filteredGenres = useMemo(() => {
    if (!searchQuery.trim()) return genres;
    const query = searchQuery.toLowerCase();
    return genres.filter(
      (g) =>
        g.name.toLowerCase().includes(query) ||
        g.description.toLowerCase().includes(query)
    );
  }, [genres, searchQuery]);
  // Create / Update
  const handleSubmit = async (formData) => {
    try {
      setSubmitting(true);
      if (editingGenre) {
        await updateGenre(editingGenre._id, formData);
        addToast("success", `Đã cập nhật thể loại "${formData.name}"`);
      } else {
        await createGenre(formData);
        addToast("success", `Đã thêm thể loại "${formData.name}"`);
      }
      setIsModalOpen(false);
      setEditingGenre(null);
      fetchGenres();
    } catch (error) {
      const msg =
        error.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại";
      addToast("error", msg);
    } finally {
      setSubmitting(false);
    }
  };
  // Open edit modal
  const handleEdit = (genre) => {
    setEditingGenre(genre);
    setIsModalOpen(true);
  };
  // Open confirm delete
  const handleDeleteClick = (genre) => {
    setDeletingGenre(genre);
    setConfirmOpen(true);
  };
  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!deletingGenre) return;
    try {
      await deleteGenre(deletingGenre._id);
      addToast("success", `Đã xóa thể loại "${deletingGenre.name}"`);
      setConfirmOpen(false);
      setDeletingGenre(null);
      fetchGenres();
    } catch (error) {
      addToast("error", "Không thể xóa thể loại");
      console.error(error);
    }
  };
  // Open create modal
  const handleOpenCreate = () => {
    setEditingGenre(null);
    setIsModalOpen(true);
  };
  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-info">
          <h1>Quản lý Thể loại</h1>
          <p>Quản lý danh mục thể loại phim trong hệ thống AuraCinema</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn btn-secondary" onClick={fetchGenres} id="btn-refresh-genres">
            <HiOutlineRefresh />
            Làm mới
          </button>
          <button className="btn btn-primary" onClick={handleOpenCreate} id="btn-add-genre">
            <HiOutlinePlus />
            Thêm thể loại
          </button>
        </div>
      </div>
      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon purple">
            <HiOutlineTag />
          </div>
          <div>
            <div className="stat-card-value">{genres.length}</div>
            <div className="stat-card-label">Tổng thể loại</div>
          </div>
        </div>
      </div>
      {/* Table */}
      <div className="table-container">
        <div className="table-toolbar">
          <div className="table-toolbar-left">
            <span className="table-toolbar-title">Danh sách thể loại</span>
            <span className="table-toolbar-count">
              {filteredGenres.length} kết quả
            </span>
          </div>
          <div className="table-search">
            <HiOutlineSearch className="table-search-icon" />
            <input
              type="text"
              className="table-search-input"
              placeholder="Tìm kiếm thể loại..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              id="search-genres"
            />
          </div>
        </div>
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
        ) : (
          <GenreTable
            genres={filteredGenres}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
          />
        )}
      </div>
      {/* Genre Modal */}
      <GenreModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingGenre(null);
        }}
        onSubmit={handleSubmit}
        initialData={editingGenre}
        isLoading={submitting}
      />
      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={confirmOpen}
        title="Xóa thể loại"
        message={`Bạn có chắc chắn muốn xóa thể loại "${deletingGenre?.name}"? Hành động này không thể hoàn tác.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setConfirmOpen(false);
          setDeletingGenre(null);
        }}
      />
      {/* Toast Notifications */}
      <Toast toasts={toasts} onRemove={removeToast} />
    </>
  );
};
export default GenresPage;