import { useCallback, useEffect, useState } from "react";
import { changePassword } from "../../api/authApi";
import { useAuth } from "../../hooks/useAuth";
import "./AccountApprovalsPage.css";
import {
  approveAccountChangeRequest,
  getAccountChangeRequests,
  rejectAccountChangeRequest,
  resendApprovedPasswordReset,
} from "../services/userService";

const kindLabels = {
  profile: "Thay đổi thông tin / vai trò",
  status: "Khóa hoặc mở khóa tài khoản",
  password_reset: "Cấp quyền đặt lại mật khẩu",
  password_change: "Admin tự đổi mật khẩu",
  reward_adjustment: "Điều chỉnh điểm thưởng",
};
const statusLabels = { pending: "Chờ duyệt", approved: "Đã duyệt", applied: "Đã áp dụng", rejected: "Đã từ chối", expired: "Hết hạn" };
const fieldLabels = { full_name: "Họ tên", email: "Email", phone: "Số điện thoại", birth_date: "Ngày sinh", gender: "Giới tính", role: "Vai trò", member_tier: "Hạng thành viên", account_status: "Trạng thái", address: "Địa chỉ", avatar: "Ảnh đại diện", type: "Thao tác", points: "Số điểm" };
const formatValue = (value) => value == null || value === "" ? "—" : typeof value === "boolean" ? (value ? "Có" : "Không") : String(value);
const identity = (value) => String(value?._id || value?.id || value || "");
const visibleChanges = (request) => Object.entries(request.changes || {}).filter(([key]) => key !== "role_id" && key !== "status");

export default function AccountApprovalsPage() {
  const { user, logout } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [busyId, setBusyId] = useState("");
  const [selected, setSelected] = useState(null);
  const [action, setAction] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getAccountChangeRequests();
      setRequests(response.data || []);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Không thể tải yêu cầu phê duyệt.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getAccountChangeRequests()
      .then((response) => { if (active) setRequests(response.data || []); })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || "Không thể tải yêu cầu phê duyệt."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const openAction = (request, nextAction) => {
    setSelected(request);
    setAction(nextAction);
    setPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setReason("");
    setError("");
    setMessage("");
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!selected) return;
    try {
      setBusyId(String(selected._id));
      let response;
      if (action === "approve") response = await approveAccountChangeRequest(selected._id, password);
      if (action === "reject") response = await rejectAccountChangeRequest(selected._id, reason);
      if (action === "resend") response = await resendApprovedPasswordReset(selected._id, selected.target_user_id?._id);
      if (action === "finish") {
        if (newPassword !== confirmPassword) throw new Error("Mật khẩu xác nhận không khớp.");
        response = await changePassword({ current_password: password, password: newPassword, confirm_password: confirmPassword, approval_request_id: selected._id });
      }
      setMessage(response?.message || "Đã xử lý yêu cầu.");
      setSelected(null);
      await reload();
      if (action === "finish") window.setTimeout(logout, 1200);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || "Không thể xử lý yêu cầu.");
    } finally {
      setBusyId("");
    }
  };

  const currentId = identity(user);
  const pendingCount = requests.filter((request) => ["pending", "approved"].includes(request.status)).length;
  const displayed = requests.filter((request) => filter === "all" || (filter === "pending" ? ["pending", "approved"].includes(request.status) : !["pending", "approved"].includes(request.status)));

  return (
    <div className="approval-page">
      <header className="approval-page-header">
        <div>
          <h1>Phê duyệt tài khoản</h1>
          <p>Người tạo đề xuất không thể tự duyệt. Một admin khác xác nhận thì thay đổi mới có hiệu lực.</p>
        </div>
        <button className="approval-button approval-button-secondary" type="button" onClick={() => void reload()} disabled={loading}>Làm mới</button>
      </header>
      {message && <p role="status" className="approval-alert approval-alert-success">{message}</p>}
      {error && !selected && <p role="alert" className="approval-alert approval-alert-error">{error}</p>}
      <div className="approval-toolbar">
        <div className="approval-filters" role="group" aria-label="Lọc yêu cầu phê duyệt">
          <button type="button" className={filter === "pending" ? "is-active" : ""} aria-pressed={filter === "pending"} onClick={() => setFilter("pending")}>Chờ duyệt <span>{pendingCount}</span></button>
          <button type="button" className={filter === "processed" ? "is-active" : ""} aria-pressed={filter === "processed"} onClick={() => setFilter("processed")}>Đã xử lý</button>
          <button type="button" className={filter === "all" ? "is-active" : ""} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>Tất cả</button>
        </div>
        <span className="approval-count">{displayed.length} yêu cầu</span>
      </div>
      {loading ? <div className="approval-empty" role="status">Đang tải yêu cầu...</div> : displayed.length === 0 ? (
        <div className="approval-empty">{filter === "pending" ? "Không có yêu cầu nào đang chờ duyệt." : "Chưa có yêu cầu trong mục này."}</div>
      ) : (
        <div className="approval-list">
          {displayed.map((request) => {
            const target = request.target_user_id || {};
            const targetId = identity(target);
            const requesterId = identity(request.requested_by);
            const isRequester = requesterId === currentId;
            const isTarget = targetId === currentId;
            const reviewers = request.approvals?.filter((item) => identity(item.admin_id) !== requesterId) || [];
            const reviewNames = reviewers.map((item) => item.admin_id?.full_name || item.admin_id?.email || "Admin");
            const isPending = request.status === "pending" && new Date(request.expires_at) > new Date();
            const canReview = isPending && !isRequester && !isTarget && !reviewers.length;
            const canFinish = request.status === "approved" && request.kind === "password_change" && isTarget && new Date(request.expires_at) > new Date();
            const changes = visibleChanges(request);
            return (
              <article className="approval-card" key={request._id}>
                <div className="approval-card-top">
                  <div><h2>{kindLabels[request.kind] || request.kind}</h2><p>{target.full_name || "Tài khoản"} <span>·</span> {target.email || targetId}</p></div>
                  <span className={`approval-status approval-status-${request.status}`}>{statusLabels[request.status] || request.status}</span>
                </div>
                <dl className="approval-meta">
                  <div><dt>Người đề xuất</dt><dd>{request.requested_by?.full_name || request.requested_by?.email || "Admin"}{isRequester ? " (bạn)" : ""}</dd></div>
                  <div><dt>Lý do</dt><dd>{request.reason}</dd></div>
                  <div><dt>Hạn xử lý</dt><dd>{new Date(request.expires_at).toLocaleString("vi-VN")}</dd></div>
                </dl>
                {changes.length > 0 && <div className="approval-diff-wrap"><table className="approval-diff"><thead><tr><th scope="col">Thông tin</th><th scope="col">Hiện tại</th><th scope="col">Đề xuất</th></tr></thead><tbody>{changes.map(([key, value]) => <tr key={key}><th scope="row">{fieldLabels[key] || key}</th><td>{formatValue(request.before?.[key])}</td><td className="approval-proposed">{formatValue(value)}</td></tr>)}</tbody></table></div>}
                <div className="approval-card-bottom">
                  <p className="approval-review-note">
                    {request.status === "pending" && isRequester ? "Bạn đã tạo đề xuất này. Đang chờ admin khác xác nhận." :
                      request.status === "pending" && isTarget ? "Yêu cầu liên quan đến tài khoản của bạn. Bạn không thể tự duyệt." :
                        request.status === "pending" ? "Cần một admin khác người đề xuất xác nhận." :
                          reviewNames.length ? `Đã xác nhận bởi ${reviewNames.join(", ")}.` : statusLabels[request.status]}
                  </p>
                  <div className="approval-actions">
                    {canReview && <><button className="approval-button approval-button-primary" type="button" onClick={() => openAction(request, "approve")}>Phê duyệt</button><button className="approval-button approval-button-danger" type="button" onClick={() => openAction(request, "reject")}>Từ chối</button></>}
                    {canFinish && <button className="approval-button approval-button-primary" type="button" onClick={() => openAction(request, "finish")}>Hoàn tất đổi mật khẩu</button>}
                    {request.status === "approved" && request.kind === "password_reset" && <button className="approval-button approval-button-secondary" type="button" onClick={() => openAction(request, "resend")}>Gửi lại OTP</button>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {selected && (
        <div className="approval-modal-backdrop" role="presentation">
          <form className="approval-modal" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="approval-action-title" onKeyDown={(event) => { if (event.key === "Escape" && !busyId) setSelected(null); }}>
            <div className="approval-modal-heading"><div><h2 id="approval-action-title">{action === "approve" ? "Xác nhận phê duyệt" : action === "reject" ? "Từ chối đề xuất" : action === "finish" ? "Hoàn tất đổi mật khẩu" : "Gửi lại OTP"}</h2><p>{kindLabels[selected.kind]} · {selected.target_user_id?.email}</p></div><button className="approval-close" type="button" onClick={() => setSelected(null)} disabled={Boolean(busyId)}>Đóng</button></div>
            <p className="approval-modal-reason"><strong>Lý do đề xuất:</strong> {selected.reason}</p>
            {visibleChanges(selected).length > 0 && <div className="approval-modal-diff">{visibleChanges(selected).map(([key, value]) => <p key={key}><strong>{fieldLabels[key] || key}</strong><span>{formatValue(selected.before?.[key])} → {formatValue(value)}</span></p>)}</div>}
            {action === "reject" && <label className="approval-field">Lý do từ chối<textarea value={reason} onChange={(event) => setReason(event.target.value)} required rows={3} /></label>}
            {["approve", "finish"].includes(action) && <label className="approval-field">Mật khẩu hiện tại<input autoFocus type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>}
            {action === "finish" && <><label className="approval-field">Mật khẩu mới<input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={8} /></label><label className="approval-field">Nhập lại mật khẩu mới<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label></>}
            {error && <p role="alert" className="approval-alert approval-alert-error">{error}</p>}
            <div className="approval-modal-actions"><button className="approval-button approval-button-secondary" type="button" onClick={() => setSelected(null)} disabled={Boolean(busyId)}>Hủy</button><button className="approval-button approval-button-primary" type="submit" disabled={Boolean(busyId)}>{busyId ? "Đang xử lý..." : "Xác nhận"}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
