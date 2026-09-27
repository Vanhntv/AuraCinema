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
import { supportSamplePolicies } from "../../data/supportInformation";
import {
  createAdminPolicy,
  deleteAdminPolicy,
  getAdminPolicies,
  importAdminPolicyFromWord,
  updateAdminPolicy,
} from "../services/policyAdminService";

const emptyForm = {
  title: "",
  summary: "",
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
  booking: "Hướng dẫn đặt vé",
  faq: "Câu hỏi thường gặp",
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
  summary: policy?.summary || "",
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
  const [importingSamples, setImportingSamples] = useState(false);
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
    setSelectedFile(null);
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
        const response = selectedFile
          ? await importAdminPolicyFromWord(selectedFile, payload)
          : await createAdminPolicy(payload);
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

  const handleImportSamples = async () => {
    try {
      setImportingSamples(true);
      const existingKeys = new Set();
      let page = 1;
      let totalPages = 1;
      do {
        const response = await getAdminPolicies({ limit: 100, page });
        (response.data || []).forEach((policy) => {
          existingKeys.add(`${policy.surface}:${policy.title}`);
        });
        totalPages = response.pagination?.totalPages || 1;
        page += 1;
      } while (page <= totalPages);
      const missing = supportSamplePolicies.filter(
        (policy) => !existingKeys.has(`${policy.surface}:${policy.title}`),
      );
      if (missing.length === 0) {
        addToast("success", "Các nội dung mẫu đã có trong danh sách.");
        return;
      }

      let created = 0;
      for (const policy of missing) {
        await createAdminPolicy({
          ...policy,
          status: "draft",
          source_type: "manual",
          requires_confirmation: false,
          display_order: supportSamplePolicies
            .filter((item) => item.surface === policy.surface)
            .findIndex((item) => item.title === policy.title) + 1,
        });
        created += 1;
      }
      addToast("success", `Đã tạo ${created} bản nháp mẫu. Hãy kiểm tra trước khi xuất bản.`);
      await fetchPolicies();
    } catch (error) {
      addToast("error", error.response?.data?.message || "Chưa tạo đủ nội dung mẫu. Bấm lại để tiếp tục.");
      await fetchPolicies();
    } finally {
      setImportingSamples(false);
    }
  };

  return (
    <div className="policies-page">
      <Toast toasts={toasts} onRemove={removeToast} />

      <div className="page-header">
        <div className="page-header-info">
          <h1>Chính sách</h1>
          <p>Biên soạn thủ công hoặc nhập từ DOCX/PDF; xuất bản để hiển thị trên website.</p>
        </div>
        <div className="policy-header-actions">
          <button
            className="btn btn-secondary"
            type="button"
            disabled={importingSamples}
            onClick={() => void handleImportSamples()}
          >
            <HiOutlineDocumentText />
            {importingSamples ? "Đang tạo mẫu..." : "Thêm nội dung mẫu"}
          </button>
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
              <p>{editingPolicy?.source_file_name ? `Đã nhập từ ${editingPolicy.source_file_name}` : "Soạn nội dung trực tiếp hoặc nhập từ file"}</p>
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

          <label className="policy-field">
            <span>Mô tả ngắn</span>
            <input
              className="form-input"
              maxLength="500"
              value={formData.summary}
              onChange={(event) => updateField("summary", event.target.value)}
              placeholder="Tóm tắt nội dung cho khách hàng"
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

          <label className="policy-field policy-content-field">
            <span>Nội dung</span>
            <textarea
              className="form-input policy-content-input"
              rows="10"
              required={!selectedFile}
              value={formData.content}
              onChange={(event) => updateField("content", event.target.value)}
              placeholder="Nhập nội dung; cách dòng để tách các đoạn văn."
            />
          </label>

          <label className="policy-field policy-upload-field">
            <span>Hoặc nhập nội dung từ file</span>
            <input
              className="form-input"
              type="file"
              accept=".docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              disabled={Boolean(editingPolicy)}
              onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
            />
            <small>{selectedFile ? `Đã chọn: ${selectedFile.name}` : "Tùy chọn .docx hoặc .pdf (tối đa 10 MB); khi tạo mới, nội dung file sẽ thay nội dung nhập tay."}</small>
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
              <span>Soạn nội dung, nhập file hoặc thêm các bản nháp mẫu.</span>
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
                      <span>{policy.source_file_name ? `File: ${policy.source_file_name}` : "Soạn thủ công"}</span>
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
