import { useCallback, useEffect, useState } from "react";
import {
  HiOutlinePlus,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineTag,
  HiOutlineTrash,
} from "react-icons/hi";
import {
  createGenre,
  deleteGenre,
  deleteGenres,
  getGenres,
  toggleGenreStatus,
  updateGenre,
} from "../services/genreService";
import GenreTable from "../components/genres/GenreTable";
import GenreModal from "../components/genres/GenreModal";
import ConfirmDialog from "../components/common/ConfirmDialog";
import Toast from "../components/common/Toast";

const PAGE_SIZE = 10;

const GenresPage = () => {
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedIds, setSelectedIds] = useState([]);
  const [toasts, setToasts] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGenre, setEditingGenre] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingGenre, setDeletingGenre] = useState(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const addToast = useCallback((type, message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const fetchGenres = useCallback(
    async (page = 1, query = "") => {
      try {
        setLoading(true);
        const response = await getGenres({
          q: query.trim(),
          page,
          limit: PAGE_SIZE,
        });

        setGenres(response.data || []);
        setCurrentPage(response.pagination?.page || page);
        setTotalPages(response.pagination?.totalPages || 1);
        setTotalItems(response.pagination?.totalItems || 0);
        setSelectedIds([]);
      } catch (error) {
        addToast("error", "Không thể tải danh sách thể loại");
        console.error(error);
      } finally {
        setLoading(false);
      }
    },
    [addToast]
  );

  useEffect(() => {
    fetchGenres(1, "");
  }, [fetchGenres]);

  const handleSearch = (event) => {
    const query = event.target.value;
    setSearchQuery(query);
    setCurrentPage(1);
    fetchGenres(1, query);
  };

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
      fetchGenres(editingGenre ? currentPage : 1, searchQuery);
    } catch (error) {
      const message =
        error.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại";
      addToast("error", message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingGenre(null);
    setIsModalOpen(true);
  };

  const handleEdit = (genre) => {
    setEditingGenre(genre);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (genre) => {
    setDeletingGenre(genre);
    setIsBulkDeleting(false);
    setConfirmOpen(true);
  };

  const handleBulkDeleteClick = () => {
    if (selectedIds.length === 0) return;
    setDeletingGenre(null);
    setIsBulkDeleting(true);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      if (isBulkDeleting) {
        await deleteGenres(selectedIds);
        addToast("success", `Đã xóa ${selectedIds.length} thể loại`);
      } else if (deletingGenre) {
        await deleteGenre(deletingGenre._id);
        addToast("success", `Đã xóa thể loại "${deletingGenre.name}"`);
      }

      setConfirmOpen(false);
      setDeletingGenre(null);
      setIsBulkDeleting(false);
      fetchGenres(currentPage, searchQuery);
    } catch (error) {
      addToast("error", "Không thể xóa thể loại");
      console.error(error);
    }
  };

  const handleToggleStatus = async (genre) => {
    try {
      await toggleGenreStatus(genre._id);
      addToast(
        "success",
        `Đã ${genre.status ? "tắt" : "bật"} thể loại "${genre.name}"`
      );
      fetchGenres(currentPage, searchQuery);
    } catch (error) {
      addToast("error", "Không thể cập nhật trạng thái thể loại");
      console.error(error);
    }
  };

  const handleSelectOne = (id, checked) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((selectedId) => selectedId !== id)
    );
  };

  const handleSelectAll = (checked) => {
    setSelectedIds(checked ? genres.map((genre) => genre._id) : []);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      fetchGenres(currentPage - 1, searchQuery);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      fetchGenres(currentPage + 1, searchQuery);
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-info">
          <h1>Quản lý Thể loại</h1>
          <p>Quản lý danh mục thể loại phim trong hệ thống AuraCinema</p>
        </div>
        <div className="page-actions">
          <button
            className="btn btn-secondary"
            onClick={() => fetchGenres(currentPage, searchQuery)}
            id="btn-refresh-genres"
          >
            <HiOutlineRefresh />
            Làm mới
          </button>
          <button className="btn btn-primary" onClick={handleOpenCreate} id="btn-add-genre">
            <HiOutlinePlus />
            Thêm thể loại
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon purple">
            <HiOutlineTag />
          </div>
          <div>
            <div className="stat-card-value">{totalItems}</div>
            <div className="stat-card-label">Tổng thể loại</div>
          </div>
        </div>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="table-toolbar-left">
            <span className="table-toolbar-title">Danh sách thể loại</span>
            <span className="table-toolbar-count">{totalItems} kết quả</span>
            {selectedIds.length > 0 && (
              <button className="btn btn-danger btn-sm" onClick={handleBulkDeleteClick}>
                <HiOutlineTrash />
                Xóa {selectedIds.length} mục
              </button>
            )}
          </div>

          <div className="table-search">
            <HiOutlineSearch className="table-search-icon" />
            <input
              type="text"
              className="table-search-input"
              placeholder="Tìm kiếm thể loại..."
              value={searchQuery}
              onChange={handleSearch}
              id="search-genres"
            />
          </div>
        </div>

        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
        ) : (
          <>
            <GenreTable
              genres={genres}
              selectedIds={selectedIds}
              onSelectOne={handleSelectOne}
              onSelectAll={handleSelectAll}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
              onToggleStatus={handleToggleStatus}
              rowStart={(currentPage - 1) * PAGE_SIZE}
            />

            <div className="pagination">
              <button
                className="btn btn-secondary"
                onClick={handlePrevPage}
                disabled={currentPage === 1}
              >
                Trang trước
              </button>
              <span className="pagination-info">
                Trang {currentPage} / {totalPages}
              </span>
              <button
                className="btn btn-secondary"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
              >
                Trang sau
              </button>
            </div>
          </>
        )}
      </div>

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

      <ConfirmDialog
        isOpen={confirmOpen}
        title={isBulkDeleting ? "Xóa nhiều thể loại" : "Xóa thể loại"}
        message={
          isBulkDeleting
            ? `Bạn có chắc chắn muốn xóa ${selectedIds.length} thể loại đã chọn?`
            : `Bạn có chắc chắn muốn xóa thể loại "${deletingGenre?.name}"? Hành động này không thể hoàn tác.`
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setConfirmOpen(false);
          setDeletingGenre(null);
          setIsBulkDeleting(false);
        }}
      />

      <Toast toasts={toasts} onRemove={removeToast} />
    </>
  );
};

export default GenresPage;
