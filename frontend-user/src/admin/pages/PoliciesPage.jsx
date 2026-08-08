import { useCallback, useEffect, useRef, useState } from "react";
import {
  HiOutlineDocumentText,
  HiOutlinePencilAlt,
  HiOutlinePlus,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineTrash,
  HiOutlineUpload,
} from "react-icons/hi";
import ConfirmDialog from "../components/common/ConfirmDialog";
import Toast from "../components/common/Toast";
import {
  deleteAdminPolicy,
  getAdminPolicies,
  importAdminPolicyFromWord,
  updateAdminPolicy,
} from "../services/policyAdminService";

const emptyForm = {
  title: "",
  content: "",
  surface: "payment",
  status: "draft",
  requires_confirmation: true,
  display_order: 0,
  source_type: "manual",
  source_file_name: "",
};

const surfaceLabels = {
  payment: "Trang thanh toán",
  terms: "Điều khoản sử dụng",
  privacy: "Chính sách bảo mật",
  booking: "Luồng đặt vé",
  general: "Chính sách chung",
};

const statusLabels = {
  draft: "Bản nháp",
  published: "Đang áp dụng",
  archived: "Ngừng áp dụng",
};

const statusBadgeClass = (status) => {
  if (status === "published") return "status-badge status-now-showing";
  if (status === "draft") return "status-badge status-coming-soon";
  return "status-badge status-ended";
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formFromPolicy = (policy) => ({
  title: policy?.title || "",
  content: policy?.content || "",
  surface: policy?.surface || "general",
  status: policy?.status || "draft",
  requires_confirmation: Boolean(policy?.requires_confirmation),
  display_order: Number(policy?.display_order || 0),
  source_type: policy?.source_type || "manual",
  source_file_name: policy?.source_file_name || "",
});

function PoliciesPage() {
  const fileInputRef = useRef(null);
  const [policies, setPolicies] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [surfaceFilter, setSurfaceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, message) => {
    setToasts((current) => [
      ...current,
      { id: Date.now() + Math.random(), type, message },
    ]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const fetchPolicies = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAdminPolicies({
        limit: 100,
        q: searchQuery.trim() || undefined,
        surface: surfaceFilter || undefined,
        status: statusFilter || undefined,
      });
      setPolicies(response.data || []);
    } catch (error) {
      addToast("error", error.response?.data?.message || "Không thể tải danh sách chính sách.");
    } finally {
      setLoading(false);
    }
  }, [addToast, searchQuery, statusFilter, surfaceFilter]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void fetchPolicies();
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [fetchPolicies]);

  const resetEditor = () => {
    setEditingPolicy(null);
    setFormData(emptyForm);
    setSelectedFile(null);
  };

  const editPolicy = (policy) => {
    setEditingPolicy(policy);
    setFormData(formFromPolicy(policy));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        display_order: Number(formData.display_order || 0),
      };

      if (editingPolicy?._id) {
        const response = await updateAdminPolicy(editingPolicy._id, payload);
        addToast("success", response.message || "Đã cập nhật chính sách.");
      } else {
        if (!selectedFile) {
          addToast("error", "Vui lòng tải lên file .docx hoặc .pdf.");
          return;
        }
        const response = await importAdminPolicyFromWord(selectedFile, payload);
        addToast("success", response.message || "Đã tạo chính sách.");
      }

      resetEditor();
      await fetchPolicies();
    } catch (error) {
      addToast("error", error.response?.data?.message || "Không thể lưu chính sách.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWordFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      setImporting(true);
      const response = await importAdminPolicyFromWord(file);
      const importedPolicy = response.data;
      addToast("success", response.message || "Đã nhập chính sách từ file.");
      setEditingPolicy(importedPolicy);
      setFormData(formFromPolicy(importedPolicy));
      await fetchPolicies();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      addToast("error", error.response?.data?.message || "Không thể nhập file.");
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?._id) return;

    try {
      setSubmitting(true);
      const response = await deleteAdminPolicy(deleteTarget._id);
      addToast("success", response.message || "Đã lưu trữ chính sách.");
      if (editingPolicy?._id === deleteTarget._id) resetEditor();
      setDeleteTarget(null);
      await fetchPolicies();
    } catch (error) {
      addToast("error", error.response?.data?.message || "Không thể lưu trữ chính sách.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="policies-page">
      <Toast toasts={toasts} onRemove={removeToast} />

      <div className="page-header">
        <div className="page-header-info">
          <h1>Chính sách</h1>
          <p>Quản lý chính sách bằng file DOCX hoặc PDF</p>
        </div>
        <div className="policy-header-actions">
          <input
            ref={fileInputRef}
            className="policy-file-input"
            type="file"
            accept=".docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleWordFile}
          />
          <button
            className="btn btn-secondary"
            type="button"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
          >
            <HiOutlineUpload />
            {importing ? "Đang đọc file..." : "Nhập file chính sách"}
          </button>
          <button className="btn btn-primary" type="button" onClick={resetEditor}>
            <HiOutlinePlus />
            Tạo chính sách
          </button>
        </div>
      </div>

      <div className="policy-workspace">
        <form className="policy-editor" onSubmit={handleSubmit}>
          <div className="policy-editor-heading">
            <div>
              <h2>{editingPolicy ? "Chỉnh sửa chính sách" : "Chính sách mới"}</h2>
              <p>{editingPolicy?.source_file_name ? `Đã nhập từ ${editingPolicy.source_file_name}` : "Tải lên file để tạo chính sách"}</p>
            </div>
            {editingPolicy && (
              <button className="policy-text-button" type="button" onClick={resetEditor}>
                Tạo mới
              </button>
            )}
          </div>

          <label className="policy-field">
            <span>Tiêu đề</span>
            <input
              className="form-input"
              maxLength="160"
              required
              value={formData.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="Ví dụ: Chính sách hủy và hoàn vé"
            />
          </label>

          <div className="policy-form-row">
            <label className="policy-field">
              <span>Vị trí áp dụng</span>
              <select className="form-input" value={formData.surface} onChange={(event) => updateField("surface", event.target.value)}>
                {Object.entries(surfaceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="policy-field">
              <span>Trạng thái</span>
              <select className="form-input" value={formData.status} onChange={(event) => updateField("status", event.target.value)}>
                {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>

          <label className="policy-field policy-upload-field">
            <span>Nội dung chính sách</span>
            <input
              className="form-input"
              type="file"
              accept=".docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              required={!editingPolicy}
              disabled={Boolean(editingPolicy)}
              onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
            />
            <small>{selectedFile ? `Đã chọn: ${selectedFile.name}` : editingPolicy ? `Nguồn hiện tại: ${editingPolicy.source_file_name || "file đã nhập"}` : "Bắt buộc tải lên .docx hoặc .pdf (tối đa 10 MB)."}</small>
          </label>

          <div className="policy-form-footer">
            <label className="policy-confirmation-toggle">
              <input
                type="checkbox"
                checked={formData.requires_confirmation}
                onChange={(event) => updateField("requires_confirmation", event.target.checked)}
              />
              <span>Yêu cầu khách xác nhận đã đọc</span>
            </label>
            <label className="policy-order-field">
              <span>Thứ tự</span>
              <input
                className="form-input"
                type="number"
                min="0"
                value={formData.display_order}
                onChange={(event) => updateField("display_order", event.target.value)}
              />
            </label>
          </div>

          <button className="btn btn-primary policy-save-button" disabled={submitting} type="submit">
            {submitting ? "Đang lưu..." : editingPolicy ? "Lưu thay đổi" : "Tạo chính sách"}
          </button>
        </form>

        <section className="policy-list-panel">
          <div className="policy-list-toolbar">
            <div className="filter-search">
              <HiOutlineSearch />
              <input className="form-input" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Tìm tiêu đề hoặc nội dung" />
            </div>
            <select className="form-input" value={surfaceFilter} onChange={(event) => setSurfaceFilter(event.target.value)}>
              <option value="">Tất cả vị trí</option>
              {Object.entries(surfaceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select className="form-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">Tất cả trạng thái</option>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <button className="btn btn-secondary policy-refresh-button" type="button" disabled={loading} onClick={() => void fetchPolicies()} aria-label="Làm mới danh sách">
              <HiOutlineRefresh />
            </button>
          </div>

          <div className="policy-list-heading">
            <h2>Danh sách chính sách</h2>
            <span>{policies.length} kết quả</span>
          </div>

          {loading ? (
            <div className="policy-empty-state">Đang tải chính sách...</div>
          ) : policies.length === 0 ? (
            <div className="policy-empty-state">
              <HiOutlineDocumentText />
              <strong>Chưa có chính sách phù hợp</strong>
              <span>Tạo mới bằng cách tải lên file DOCX hoặc PDF.</span>
            </div>
          ) : (
            <div className="policy-list">
              {policies.map((policy) => (
                <article className={`policy-list-item ${editingPolicy?._id === policy._id ? "selected" : ""}`} key={policy._id}>
                  <div className="policy-list-item-main">
                    <div className="policy-list-item-title">
                      <h3>{policy.title}</h3>
                      <span className={statusBadgeClass(policy.status)}>{statusLabels[policy.status]}</span>
                    </div>
                    <p>{policy.content?.slice(0, 220) || "Chưa có nội dung"}</p>
                    <div className="policy-list-meta">
                      <span>{surfaceLabels[policy.surface]}</span>
              <span>{policy.source_file_name ? `File: ${policy.source_file_name}` : "Chưa có file nguồn"}</span>
                      <span>Cập nhật {formatDateTime(policy.updated_at)}</span>
                    </div>
                  </div>
                  <div className="policy-list-actions">
                    <button className="action-btn edit" type="button" title="Chỉnh sửa" onClick={() => editPolicy(policy)}><HiOutlinePencilAlt /></button>
                    <button className="action-btn delete" type="button" title="Lưu trữ" onClick={() => setDeleteTarget(policy)}><HiOutlineTrash /></button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Lưu trữ chính sách?"
        message={`Chính sách “${deleteTarget?.title || ""}” sẽ ngừng hiển thị và được chuyển vào lưu trữ.`}
        confirmLabel="Lưu trữ"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isLoading={submitting}
      />
    </div>
  );
}

export default PoliciesPage;
