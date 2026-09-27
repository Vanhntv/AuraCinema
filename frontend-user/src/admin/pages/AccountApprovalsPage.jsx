import { useCallback, useEffect, useState } from "react";
import { changePassword } from "../../api/authApi";
import { useAuth } from "../../hooks/useAuth";
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

export default function AccountApprovalsPage() {
  const { user, logout } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
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

  return (
    <div className="p-6 text-slate-900">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-2xl font-black">Phê duyệt tài khoản</h1><p className="mt-1 text-sm text-slate-500">Hai tài khoản admin độc lập phải xác nhận trước khi thay đổi có hiệu lực.</p></div>
        <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold" type="button" onClick={() => void reload()}>Làm mới</button>
      </div>
      {message && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-emerald-800">{message}</p>}
      {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 p-3 text-rose-800">{error}</p>}
      {loading ? <p>Đang tải yêu cầu...</p> : requests.length === 0 ? <p>Chưa có yêu cầu nào.</p> : (
        <div className="grid gap-4">
          {requests.map((request) => {
            const target = request.target_user_id || {};
            const targetId = String(target._id || target);
            const currentId = String(user?._id || user?.id || "");
            const approvedByMe = request.approvals?.some((item) => String(item.admin_id?._id || item.admin_id) === currentId);
            const canApprove = request.status === "pending" && new Date(request.expires_at) > new Date() && targetId !== currentId && !approvedByMe;
            const canFinish = request.status === "approved" && request.kind === "password_change" && targetId === currentId && new Date(request.expires_at) > new Date();
            return (
              <article key={request._id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><h2 className="font-black">{kindLabels[request.kind] || request.kind}</h2><p className="mt-1 text-sm text-slate-600">{target.full_name || "Tài khoản"} · {target.email || targetId}</p></div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{statusLabels[request.status] || request.status} · {request.approvals?.length || 0}/2</span>
                </div>
                <p className="mt-3 text-sm text-slate-600">Người yêu cầu: {request.requested_by?.full_name || request.requested_by?.email || "Admin"} · Lý do: {request.reason}</p>
                <p className="mt-1 text-xs text-slate-500">Hạn duyệt: {new Date(request.expires_at).toLocaleString("vi-VN")}</p>
                {Object.keys(request.changes || {}).filter((key) => key !== "role_id" && key !== "status").length > 0 && (
                  <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="py-2">Trường</th><th>Hiện tại</th><th>Đề xuất</th></tr></thead><tbody>{Object.entries(request.changes).filter(([key]) => key !== "role_id" && key !== "status").map(([key, value]) => <tr className="border-b border-slate-100" key={key}><td className="py-2 font-semibold">{fieldLabels[key] || key}</td><td>{formatValue(request.before?.[key])}</td><td>{formatValue(value)}</td></tr>)}</tbody></table></div>
                )}
                <p className="mt-3 text-xs text-slate-500">Đã duyệt: {request.approvals?.map((item) => item.admin_id?.full_name || item.admin_id?.email || "Admin").join(", ") || "Chưa có"}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {canApprove && <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white" type="button" onClick={() => openAction(request, "approve")}>Phê duyệt</button>}
                  {request.status === "pending" && targetId !== currentId && <button className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-bold text-rose-700" type="button" onClick={() => openAction(request, "reject")}>Từ chối</button>}
                  {canFinish && <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white" type="button" onClick={() => openAction(request, "finish")}>Hoàn tất đổi mật khẩu</button>}
                  {request.status === "approved" && request.kind === "password_reset" && <button className="rounded-lg border border-blue-300 px-4 py-2 text-sm font-bold text-blue-700" type="button" onClick={() => openAction(request, "resend")}>Gửi lại OTP</button>}
                </div>
              </article>
            );
          })}
        </div>
      )}
      {selected && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4" role="presentation">
          <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="approval-action-title" className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 id="approval-action-title" className="text-lg font-black">{action === "approve" ? "Xác nhận phê duyệt" : action === "reject" ? "Từ chối yêu cầu" : action === "finish" ? "Hoàn tất đổi mật khẩu" : "Gửi lại OTP"}</h2>
            <p className="mt-2 text-sm text-slate-600">{kindLabels[selected.kind]} · {selected.target_user_id?.email}</p>
            <p className="mt-1 text-sm text-slate-600">Lý do: {selected.reason}</p>
            {Object.keys(selected.changes || {}).filter((key) => key !== "role_id" && key !== "status").length > 0 && (
              <div className="mt-4 max-h-40 overflow-y-auto rounded-lg border p-3 text-sm">
                {Object.entries(selected.changes).filter(([key]) => key !== "role_id" && key !== "status").map(([key, value]) => (
                  <p key={key} className="py-1"><strong>{fieldLabels[key] || key}:</strong> {formatValue(selected.before?.[key])} → {formatValue(value)}</p>
                ))}
              </div>
            )}
            {action === "reject" && <label className="mt-4 block text-sm font-semibold">Lý do từ chối<textarea className="mt-2 w-full rounded-lg border p-3" value={reason} onChange={(event) => setReason(event.target.value)} required /></label>}
            {["approve", "finish"].includes(action) && <label className="mt-4 block text-sm font-semibold">Mật khẩu hiện tại<input autoFocus className="mt-2 w-full rounded-lg border p-3" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>}
            {action === "finish" && <><label className="mt-4 block text-sm font-semibold">Mật khẩu mới<input className="mt-2 w-full rounded-lg border p-3" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={8} /></label><label className="mt-4 block text-sm font-semibold">Nhập lại mật khẩu mới<input className="mt-2 w-full rounded-lg border p-3" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label></>}
            {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
            <div className="mt-6 flex justify-end gap-3"><button type="button" className="rounded-lg border px-4 py-2" onClick={() => setSelected(null)}>Hủy</button><button disabled={Boolean(busyId)} className="rounded-lg bg-blue-600 px-4 py-2 font-bold text-white disabled:opacity-50" type="submit">{busyId ? "Đang xử lý..." : "Xác nhận"}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
