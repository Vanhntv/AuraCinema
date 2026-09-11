import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import QRCode from "qrcode";
import { HiOutlineLockClosed } from "react-icons/hi";
import { changePassword, updateProfile } from "../api/authApi";
import { getBookingOrderQr, getMyBookings } from "../services/bookingService";
import { getMyVoucherWallet } from "../services/voucherService";
import { useAuth } from "../hooks/useAuth";
import { getApiErrorMessage, showToast } from "../utils/toast";
import {
  buildBookingOrderQrFilename,
  mapBookingOrderView,
} from "../utils/bookingOrderView";

const tierTargets = {
  member: { label: "Member", next: "VIP", target: 3000000 },
  vip: { label: "VIP", next: "VVIP", target: 10000000 },
  vvip: { label: "VVIP", next: null, target: 10000000 },
};

const genderLabels = {
  male: "Nam",
  female: "Nữ",
  other: "Khác",
};

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const tabs = [
  { id: "account", label: "Tài khoản của tôi" },
  { id: "member", label: "Thông tin thẻ thành viên" },
  { id: "tickets", label: "Hành trình điện ảnh" },
  { id: "points", label: "Lịch sử điểm thưởng" },
  { id: "vouchers", label: "Ví Voucher" },
];

const ORDERS_PER_PAGE = 5;

const formatDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("vi-VN");
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const getTabFromParam = (value) => {
  if (!value) return tabs[0].id;
  const numericIndex = Number(value);
  if (Number.isInteger(numericIndex) && tabs[numericIndex]) {
    return tabs[numericIndex].id;
  }
  return tabs.some((tab) => tab.id === value) ? value : tabs[0].id;
};

const splitFullName = (fullName = "") => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { first_name: parts[0] || "", last_name: "" };
  }
  return {
    first_name: parts.slice(0, -1).join(" "),
    last_name: parts.at(-1),
  };
};

const getFullName = (form) =>
  [form.first_name, form.last_name].map((item) => item.trim()).filter(Boolean).join(" ");

const normalizeFilterText = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const ticketStatusMeta = {
  VALID: {
    label: "Chưa sử dụng",
    className: "bg-emerald-400/10 text-emerald-200 border-emerald-400/20",
  },
  CHECKED_IN: {
    label: "Đã sử dụng",
    className: "bg-sky-400/10 text-sky-200 border-sky-400/20",
  },
  CANCELLED: {
    label: "Đã hủy",
    className: "bg-red-500/10 text-red-200 border-red-400/20",
  },
  EXPIRED: {
    label: "Đã hết hạn",
    className: "bg-amber-400/10 text-amber-200 border-amber-400/20",
  },
};

const getTicketStatusMeta = (status) =>
  ticketStatusMeta[status] || {
    label: status || "Không xác định",
    className: "bg-white/[0.06] text-slate-200 border-white/10",
  };

const formatTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getOrderSeatLabels = (order) =>
  order.tickets.map((ticket) => ticket.seat?.label).filter(Boolean).join(", ") || "-";

const getOrderSeatTypeLabels = (order) => {
  const seatTypes = [...new Set(order.tickets.map((ticket) => ticket.seat?.type).filter(Boolean))];
  if (seatTypes.length) return seatTypes.join(", ");
  return order.tickets.length ? `${order.tickets.length} vé` : "Chưa có dữ liệu ghế";
};

const getOrderServiceLabels = (order) =>
  order.services.map((service) => `${service.name} ×${service.quantity}`).join(", ") || "Không có";

const getOrderServiceItems = (order) =>
  order.services
    .map((service) => `${service.name} ×${service.quantity}`)
    .filter(Boolean);

const BOOKING_CODE_FULL_LENGTH = 17;
const BOOKING_CODE_PREVIEW_LENGTH = 15;

const getBookingCodePreview = (bookingCode) => {
  const code = String(bookingCode || "").trim();
  if (!code) return "-";
  return code.length > BOOKING_CODE_FULL_LENGTH ? `${code.slice(0, BOOKING_CODE_PREVIEW_LENGTH)}...` : code;
};

const getOrderServiceSubtotal = (order) => {
  const serviceTotal = Number(order.pricing?.serviceSubtotal || 0);
  if (serviceTotal > 0) return serviceTotal;

  return order.services.reduce(
    (total, service) => total + Number(service.subtotal || service.unitPrice * service.quantity || 0),
    0,
  );
};

const getOrderTicketStatusLabels = (order) => {
  const labels = [...new Set(order.tickets.map((ticket) => getTicketStatusMeta(ticket.status).label))];
  return labels.length ? labels.join(", ") : "Đang cập nhật";
};

function EmptyState({ children = "Không có dữ liệu" }) {
  return (
    <div className="grid min-h-28 place-items-center text-sm text-slate-500">
      {children}
    </div>
  );
}

function AccountTable({ headers, children, empty }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.025] text-slate-100">
              {headers.map((header) => (
                <th className="whitespace-nowrap px-5 py-4 font-black" key={header}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 text-slate-300">
            {children || (
              <tr>
                <td colSpan={headers.length}>
                  <EmptyState>{empty}</EmptyState>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MemberCard({ user, loyalty }) {
  const cardCode = String(user?._id || user?.id || user?.phone || "8434534492295")
    .replace(/\W/g, "")
    .slice(-13)
    .padStart(13, "8");

  return (
    <div className="relative flex min-h-[360px] w-full max-w-[340px] overflow-hidden rounded-[28px] border border-white/15 bg-[linear-gradient(135deg,#f7e441_0%,#62a7ff_52%,#222b7a_100%)] p-7 shadow-[0_28px_80px_rgba(0,0,0,0.35)] max-sm:min-h-[300px] max-sm:max-w-full">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.75),transparent_18%),radial-gradient(circle_at_82%_72%,rgba(255,115,0,0.45),transparent_25%)]" />
      <div className="absolute -bottom-20 -right-16 h-52 w-52 rounded-full border border-white/25 bg-white/10" />
      <div className="relative z-10 flex w-full flex-col justify-between">
        <div className="flex items-start justify-between gap-4">
          <div className="text-xl font-black uppercase leading-tight tracking-[0.04em] text-[#1a2455]">
            AuraCinema
          </div>
          <span className="rounded-full bg-white px-4 py-1.5 text-xs font-black uppercase text-[#101827] shadow-sm">
            {loyalty.label}
          </span>
        </div>

        <div className="my-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#263066]/75">
            Hạng thẻ
          </p>
          <p className="mt-3 text-4xl font-black uppercase leading-none text-white drop-shadow max-sm:text-3xl">
            {loyalty.label}
          </p>
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#263066]/80">
            Chủ thẻ
          </p>
          <p className="mt-2 break-words text-2xl font-black uppercase tracking-[0.06em] text-white drop-shadow max-sm:text-xl">
            {user?.full_name || "Aura Member"}
          </p>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-[#263066]/80">
            Mã thẻ
          </p>
          <p className="mt-2 font-mono text-xl font-black tracking-[0.08em] text-white drop-shadow max-sm:text-lg">
            {cardCode}
          </p>
        </div>
      </div>
    </div>
  );
}

function AccountPage() {
  const { user, logout, refreshProfile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => getTabFromParam(searchParams.get("tab")));
  const [profileForm, setProfileForm] = useState({
    first_name: "",
    last_name: "",
    birth_date: "",
    gender: "",
    address: "",
    avatar: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    password: "",
    confirm_password: "",
  });
  const [tickets, setTickets] = useState([]);
  const [bookingOrders, setBookingOrders] = useState([]);
  const [orderQrDataUrls, setOrderQrDataUrls] = useState({});
  const preloadingOrderQrIds = useRef(new Set());
  const [loadingOrderQrId, setLoadingOrderQrId] = useState("");
  const [selectedOrderForQr, setSelectedOrderForQr] = useState(null);
  const [vouchers, setVouchers] = useState([]);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [ticketsError, setTicketsError] = useState("");
  const [vouchersError, setVouchersError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [loadingVouchers, setLoadingVouchers] = useState(true);
  const [voucherFilter, setVoucherFilter] = useState("available");
  const [showPasswordPanel, setShowPasswordPanel] = useState(false);
  const [ticketFilters, setTicketFilters] = useState({
    query: "",
    status: "",
  });
  const [ticketPage, setTicketPage] = useState(1);

  useEffect(() => {
    const nextTab = getTabFromParam(searchParams.get("tab"));
    setActiveTab(nextTab);
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    const nameParts = splitFullName(user.full_name || "");

    setProfileForm({
      first_name: nameParts.first_name,
      last_name: nameParts.last_name,
      birth_date: formatDateInput(user.birth_date),
      gender: user.gender || "",
      address: user.address || "",
      avatar: user.avatar || "",
    });
  }, [user]);

  useEffect(() => {
    if (activeTab !== "points") return;

    let isActive = true;
    refreshProfile().catch((error) => {
      if (!isActive) return;
      showToast("error", getApiErrorMessage(error, "Không thể tải lịch sử điểm thưởng mới nhất."));
    });

    return () => {
      isActive = false;
    };
  }, [activeTab, refreshProfile]);

  useEffect(() => {
    let isActive = true;

    async function loadTickets() {
      try {
        setLoadingTickets(true);
        setTicketsError("");
        const firstPage = await getMyBookings({ page: 1, limit: 50 });
        const totalPages = Number(firstPage.pagination?.totalPages || 1);
        const remainingPages = totalPages > 1
          ? await Promise.all(Array.from({ length: totalPages - 1 }, (_, index) =>
            getMyBookings({ page: index + 2, limit: 50 })))
          : [];
        const allOrders = [firstPage, ...remainingPages]
          .flatMap((response) => response.data || [])
          .map(mapBookingOrderView)
          .filter((order) => order.status === "confirmed" && order.paymentStatus === "paid");
        if (isActive) {
          setBookingOrders(allOrders);
          setTickets(allOrders.flatMap((order) => order.tickets));
        }
      } catch (error) {
        if (isActive) {
          const message = getApiErrorMessage(error, "Không thể tải vé điện tử.");
          setTicketsError(message);
          showToast("error", message);
        }
      } finally {
        if (isActive) setLoadingTickets(false);
      }
    }

    loadTickets();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    getMyVoucherWallet()
      .then((response) => {
        if (isActive) setVouchers(response.data || []);
      })
      .catch((error) => {
        if (isActive) {
          const message = getApiErrorMessage(error, "Không thể tải ví Voucher cá nhân.");
          setVouchersError(message);
        }
      })
      .finally(() => {
        if (isActive) setLoadingVouchers(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const loyalty = useMemo(() => {
    const tier = tierTargets[user?.member_tier] || tierTargets.member;
    const spent = Number(user?.total_spent || 0);
    const progress = tier.next ? Math.min((spent / tier.target) * 100, 100) : 100;
    const remaining = tier.next ? Math.max(tier.target - spent, 0) : 0;

    return {
      ...tier,
      spent,
      progress,
      remaining,
    };
  }, [user]);

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const submitProfile = async (event) => {
    event.preventDefault();
    setProfileMessage("");
    setProfileError("");

    const fullName = getFullName(profileForm);
    if (!fullName) {
      const message = "Họ tên không được để trống.";
      setProfileError(message);
      showToast("error", message);
      return;
    }

    if (profileForm.birth_date && new Date(profileForm.birth_date) > new Date()) {
      const message = "Ngày sinh không thể lớn hơn ngày hiện tại.";
      setProfileError(message);
      showToast("error", message);
      return;
    }

    try {
      setSavingProfile(true);
      await updateProfile({
        full_name: fullName,
        birth_date: profileForm.birth_date || null,
        gender: profileForm.gender || null,
        address: profileForm.address,
        avatar: profileForm.avatar,
      });
      await refreshProfile();
      setProfileMessage("Cập nhật thông tin thành công.");
      showToast("success", "Cập nhật thông tin thành công.");
    } catch (error) {
      const message = getApiErrorMessage(error, "Cập nhật thông tin thất bại.");
      setProfileError(message);
      showToast("error", message);
    } finally {
      setSavingProfile(false);
    }
  };

  const submitPassword = async (event) => {
    event.preventDefault();
    setPasswordMessage("");
    setPasswordError("");

    if (
      passwordForm.password.length < 8 ||
      !/[A-Z]/.test(passwordForm.password) ||
      !/\d/.test(passwordForm.password)
    ) {
      const message = "Mật khẩu mới phải có ít nhất 8 ký tự, gồm chữ hoa và số.";
      setPasswordError(message);
      showToast("error", message);
      return;
    }

    if (passwordForm.password !== passwordForm.confirm_password) {
      const message = "Mật khẩu xác nhận không khớp.";
      setPasswordError(message);
      showToast("error", message);
      return;
    }

    try {
      setSavingPassword(true);
      await changePassword(passwordForm);
      setPasswordMessage("Đổi mật khẩu thành công. Vui lòng đăng nhập lại.");
      showToast("success", "Đổi mật khẩu thành công. Vui lòng đăng nhập lại.");
      setPasswordForm({
        current_password: "",
        password: "",
        confirm_password: "",
      });
      window.setTimeout(logout, 1200);
    } catch (error) {
      const message = getApiErrorMessage(error, "Đổi mật khẩu thất bại.");
      setPasswordError(message);
      showToast("error", message);
    } finally {
      setSavingPassword(false);
    }
  };

  const renderAccountTab = () => (
    <section className="rounded-[28px] border border-white/10 bg-[#141923]/95 p-8 shadow-[0_22px_90px_rgba(0,0,0,0.24)]">
      <form className="mx-auto grid max-w-[860px] gap-6 md:grid-cols-2" noValidate onSubmit={submitProfile}>
        {profileMessage && (
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200 md:col-span-2">
            {profileMessage}
          </div>
        )}
        {profileError && (
          <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200 md:col-span-2">
            {profileError}
          </div>
        )}

        <label className="grid gap-2 text-sm font-bold text-slate-200">
          Họ <span className="text-[#ff5364]">*</span>
          <input
            className="rounded-lg border border-white/10 bg-[#080b1c] px-4 py-3 text-white outline-none transition focus:border-[#ff5364]"
            name="first_name"
            onChange={handleProfileChange}
            value={profileForm.first_name}
          />
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-200">
          Tên <span className="text-[#ff5364]">*</span>
          <input
            className="rounded-lg border border-white/10 bg-[#080b1c] px-4 py-3 text-white outline-none transition focus:border-[#ff5364]"
            name="last_name"
            onChange={handleProfileChange}
            value={profileForm.last_name}
          />
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-200">
          Số điện thoại <span className="text-[#ff5364]">*</span>
          <input
            className="rounded-lg border border-white/10 bg-[#080b1c] px-4 py-3 text-slate-400 outline-none"
            disabled
            value={user?.phone || ""}
          />
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-200">
          Địa chỉ
          <input
            className="rounded-lg border border-white/10 bg-[#080b1c] px-4 py-3 text-white outline-none transition focus:border-[#ff5364]"
            name="address"
            onChange={handleProfileChange}
            placeholder="Địa chỉ"
            value={profileForm.address}
          />
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-200">
          Ngày sinh
          <input
            className="rounded-lg border border-white/10 bg-[#080b1c] px-4 py-3 text-white outline-none transition focus:border-[#ff5364]"
            name="birth_date"
            onChange={handleProfileChange}
            type="date"
            value={profileForm.birth_date}
          />
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-200">
          Giới tính
          <select
            className="rounded-lg border border-white/10 bg-[#080b1c] px-4 py-3 text-white outline-none transition focus:border-[#ff5364]"
            name="gender"
            onChange={handleProfileChange}
            value={profileForm.gender}
          >
            <option value="">Chưa cập nhật</option>
            <option value="male">Nam</option>
            <option value="female">Nữ</option>
            <option value="other">Khác</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-200">
          Tên đăng nhập
          <input
            className="rounded-lg border border-white/10 bg-[#080b1c] px-4 py-3 text-slate-500 outline-none"
            disabled
            value={user?.email || ""}
          />
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-200">
          Email
          <input
            className="rounded-lg border border-white/10 bg-[#080b1c] px-4 py-3 text-slate-500 outline-none"
            disabled
            value={user?.email || ""}
          />
        </label>

        <div className="mt-4 flex flex-wrap justify-end gap-3 md:col-span-2">
          <button
            className="inline-flex h-12 items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-7 font-extrabold text-white transition hover:border-[#ff5364]"
            onClick={() => setShowPasswordPanel((current) => !current)}
            type="button"
          >
            <HiOutlineLockClosed />
            Đổi mật khẩu
          </button>
          <button
            className="h-12 rounded-full bg-[var(--aura-coral)] px-8 font-extrabold text-[var(--aura-coral-ink)] transition-colors hover:bg-[var(--aura-coral-hover)] disabled:opacity-60"
            disabled={savingProfile}
            type="submit"
          >
            {savingProfile ? "Đang lưu..." : "Lưu thông tin"}
          </button>
        </div>
      </form>

      {showPasswordPanel && (
        <form
          className="mx-auto mt-8 grid max-w-[860px] gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-5"
          noValidate
          onSubmit={submitPassword}
        >
          {passwordMessage && (
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
              {passwordMessage}
            </div>
          )}
          {passwordError && (
            <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
              {passwordError}
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-2 text-sm font-bold text-white">
              Mật khẩu hiện tại
              <input className="rounded-xl border border-white/10 bg-[#1d2633] px-4 py-3 text-white outline-none focus:border-[#ff6070]" name="current_password" onChange={handlePasswordChange} type="password" value={passwordForm.current_password} />
            </label>
            <label className="grid gap-2 text-sm font-bold text-white">
              Mật khẩu mới
              <input className="rounded-xl border border-white/10 bg-[#1d2633] px-4 py-3 text-white outline-none focus:border-[#ff6070]" name="password" onChange={handlePasswordChange} type="password" value={passwordForm.password} />
            </label>
            <label className="grid gap-2 text-sm font-bold text-white">
              Xác nhận mật khẩu mới
              <input className="rounded-xl border border-white/10 bg-[#1d2633] px-4 py-3 text-white outline-none focus:border-[#ff6070]" name="confirm_password" onChange={handlePasswordChange} type="password" value={passwordForm.confirm_password} />
            </label>
          </div>
          <button className="justify-self-end rounded-full border border-white/10 bg-white/[0.06] px-8 py-3 font-extrabold text-white hover:border-[#ff5364] disabled:opacity-60" disabled={savingPassword} type="submit">
            {savingPassword ? "Đang đổi..." : "Cập nhật mật khẩu"}
          </button>
        </form>
      )}
    </section>
  );

  const renderMemberTab = () => (
    <section className="rounded-[28px] border border-white/10 bg-[#141923]/95 p-8 max-sm:p-5">
      <h2 className="text-center text-xl font-black text-white">Thông tin thẻ thành viên</h2>
      <div className="mx-auto mt-7 grid max-w-[960px] items-start gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="flex justify-center lg:justify-start">
          <MemberCard user={user} loyalty={loyalty} />
        </div>
        <div className="grid gap-1 rounded-[24px] border border-white/10 bg-black/15 p-5 text-sm sm:p-6">
          {[
            ["Mã thẻ", String(user?._id || user?.id || "-").slice(-13).toUpperCase()],
            ["Hạng thẻ", loyalty.label],
            ["Chủ thẻ", user?.full_name || "-"],
            ["Ngày sinh", formatDate(user?.birth_date)],
            ["Giới tính", genderLabels[user?.gender] || "-"],
            ["Địa chỉ", user?.address || "-"],
            ["Trạng thái thẻ", "Đang hoạt động"],
            ["Điểm tích lũy", Number(user?.reward_points || 0).toLocaleString("vi-VN")],
            ["Ngày kích hoạt", formatDate(user?.created_at || user?.createdAt)],
          ].map(([label, value]) => (
            <div className="grid grid-cols-[150px_minmax(0,1fr)] border-b border-white/10 py-3" key={label}>
              <span className="text-slate-400">{label}</span>
              <strong className={label === "Trạng thái thẻ" ? "text-emerald-400" : "text-white"}>
                {value}
              </strong>
            </div>
          ))}
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-black/30">
            <div className="h-full rounded-full bg-gradient-to-r from-[#ff321d] to-[#ff8a2a]" style={{ width: `${loyalty.progress}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {loyalty.next
              ? `Cần chi tiêu thêm ${currencyFormatter.format(loyalty.remaining)} để lên ${loyalty.next}.`
              : "Bạn đang ở hạng thành viên cao nhất."}
          </p>
          <button className="mt-5 rounded-full bg-gradient-to-b from-[#ff7b39] to-[#ff321d] px-8 py-3 font-extrabold text-white">
            Đăng ký 
          </button>
        </div>
      </div>
    </section>
  );

  const createOrderQrDataUrl = useCallback(async (order) => {
    const response = await getBookingOrderQr(order.id);
    const payload = response.data?.qrPayload;
    if (!payload?.startsWith("AURA_BOOKING_V2:")) {
      throw new Error("QR đơn vé chưa sẵn sàng.");
    }

    return QRCode.toDataURL(payload, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 260,
      color: { dark: "#101010", light: "#ffffff" },
    });
  }, []);

  const loadOrderQr = async (order) => {
    if (!order?.id) return "";
    if (orderQrDataUrls[order.id]) return orderQrDataUrls[order.id];

    try {
      setLoadingOrderQrId(order.id);
      const dataUrl = await createOrderQrDataUrl(order);
      setOrderQrDataUrls((current) => ({ ...current, [order.id]: dataUrl }));
      return dataUrl;
    } catch (error) {
      showToast("error", getApiErrorMessage(error, "Không thể tải QR đơn vé."));
      return "";
    } finally {
      setLoadingOrderQrId("");
    }
  };

  const downloadOrderQr = async (order) => {
    const dataUrl = await loadOrderQr(order);
    if (!dataUrl) return;

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = buildBookingOrderQrFilename(order.bookingCode);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast("success", "Đã tải QR đơn vé.");
  };

  const openOrderQrModal = async (order) => {
    if (order.ticketingVersion !== 2) {
      showToast("error", "QR đơn vé không khả dụng.");
      return;
    }

    setSelectedOrderForQr(order);
    if (!orderQrDataUrls[order.id]) {
      await loadOrderQr(order);
    }
  };

  const renderBookingOrderQrThumb = (order, variant = "table") => {
    if (order.ticketingVersion !== 2) {
      return (
        <span className="mt-3 block text-xs font-semibold text-slate-500">
          QR không khả dụng
        </span>
      );
    }

    const dataUrl = orderQrDataUrls[order.id];
    const sizeClass = variant === "mobile" ? "h-20 w-20" : "h-16 w-16";

    return (
      <button
        className={`${variant === "mobile" ? "" : "mx-auto mt-3"} grid w-fit rounded-xl bg-white p-2 text-black transition hover:scale-[1.03] focus-visible:outline-[#ff9aa5] disabled:cursor-wait disabled:opacity-80`}
        type="button"
        disabled={loadingOrderQrId === order.id && !dataUrl}
        onClick={() => openOrderQrModal(order)}
        aria-label={`Mở QR đơn ${order.bookingCode}`}
      >
        {dataUrl ? (
          <img
            className={`${sizeClass} object-contain`}
            src={dataUrl}
            alt={`QR đơn ${order.bookingCode}`}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className={`${sizeClass} grid place-items-center text-center text-[10px] font-black uppercase leading-4 text-slate-500`}>
            Đang tải QR
          </div>
        )}
      </button>
    );
  };

  const renderOrderServiceInfo = (order, variant = "table") => {
    const serviceItems = getOrderServiceItems(order);
    const hasServices = serviceItems.length > 0;
    const serviceSubtotal = getOrderServiceSubtotal(order);
    const voucherCode = String(order.voucher?.code || "").trim().toUpperCase();
    const isMobile = variant === "mobile";

    return (
      <div className={`grid ${isMobile ? "gap-1.5" : "gap-2"} text-sm`}>
        {hasServices ? (
          <ul className="grid gap-1">
            {serviceItems.map((serviceLabel) => (
              <li className="break-words font-bold text-white" key={serviceLabel}>
                {serviceLabel}
              </li>
            ))}
          </ul>
        ) : (
          <span className="break-words text-slate-500">Không có đồ ăn</span>
        )}
        <span className="text-slate-500">
          Giá đồ ăn: <strong className="font-bold text-slate-300">{currencyFormatter.format(serviceSubtotal)}</strong>
        </span>
        <span className="text-slate-500">
          Mã giảm giá:{" "}
          <strong className={voucherCode ? "font-black text-emerald-300" : "font-bold text-slate-400"}>
            {voucherCode || "Không có"}
          </strong>
        </span>
      </div>
    );
  };

  const renderOrderPaymentInfo = (order) => {
    const discount = Number(order.pricing?.discount || 0);
    const total = Number(order.pricing?.total || 0);

    return (
      <div className="grid items-start gap-1.5 text-left">
        {discount > 0 && (
          <p className="text-sm font-bold text-emerald-300">
            Giảm: {currencyFormatter.format(discount)}
          </p>
        )}
        <p className="text-sm text-slate-500">
          Tổng tiền: <strong className="text-lg font-black text-[#ff9aa5]">{currencyFormatter.format(total)}</strong>
        </p>
      </div>
    );
  };

  const renderBookingCodeLabel = (order, className = "") => (
    <span
      className={`block max-w-full truncate text-left font-black text-white ${className}`}
      title={order.bookingCode}
    >
      {getBookingCodePreview(order.bookingCode)}
    </span>
  );

  const renderBookingOrderMobileCard = (order) => {
    return (
      <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#111722]" key={order.id}>
        <div className="grid gap-4 p-4">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4">
            <div className="min-w-0 self-start">
              <p className="text-xs font-black uppercase tracking-[0.1em] text-[#ff8f99]">Mã hóa đơn</p>
              <h3 className="mt-1">
                {renderBookingCodeLabel(order, "text-lg")}
              </h3>
              <p className="mt-3 text-xs font-bold text-slate-500">{getOrderTicketStatusLabels(order)}</p>
            </div>
            <div className="shrink-0">
              {renderBookingOrderQrThumb(order, "mobile")}
            </div>
          </div>
          <dl className="grid gap-3 text-sm">
            <div>
              <dt className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Phim</dt>
              <dd className="mt-1 min-w-0 break-words text-base font-black text-white">
                {order.movie.title || "Đang cập nhật"}
              </dd>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Suất chiếu</dt>
                <dd className="mt-1 font-bold text-white">{formatDate(order.showtime.startTime)} · {formatTime(order.showtime.startTime)}</dd>
                <dd className="mt-1 text-slate-500">{order.room.name || "Phòng đang cập nhật"}</dd>
              </div>
              <div>
                <dt className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Ghế</dt>
                <dd className="mt-1 break-words font-bold text-white">{getOrderSeatLabels(order)}</dd>
                <dd className="mt-1 text-slate-500">{getOrderSeatTypeLabels(order)}</dd>
              </div>
            </div>
            <div className="grid gap-3 border-t border-white/10 pt-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Ngày đặt</dt>
                <dd className="mt-1 text-slate-200">{formatDateTime(order.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Thanh toán</dt>
                <dd className="mt-1">{renderOrderPaymentInfo(order)}</dd>
              </div>
            </div>
            <div>
              <dt className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Dịch vụ</dt>
              <dd className="mt-1">{renderOrderServiceInfo(order, "mobile")}</dd>
            </div>
          </dl>
        </div>
      </article>
    );
  };

  const renderBookingOrderTableRows = (order) => {
    return (
      <tr className="align-top text-base leading-6 text-slate-300 hover:bg-white/[0.025]" key={order.id}>
        <td className="overflow-hidden px-4 py-4">
          {renderBookingCodeLabel(order)}
          {renderBookingOrderQrThumb(order)}
        </td>
        <td className="break-words px-4 py-4">
          <strong className="block font-bold text-white">{order.movie.title || "Đang cập nhật"}</strong>
          <span className="mt-2 block font-bold text-white">{formatDate(order.showtime.startTime)} · {formatTime(order.showtime.startTime)}</span>
          <span className="mt-1 block text-sm text-slate-500">{order.room.name || "Phòng đang cập nhật"}</span>
        </td>
        <td className="break-words px-4 py-4">
          <strong className="block font-bold text-white">{getOrderSeatLabels(order)}</strong>
          <span className="mt-2 block text-sm text-slate-500">{getOrderSeatTypeLabels(order)}</span>
        </td>
        <td className="break-words px-4 py-4">
          <span className="block">{formatDateTime(order.createdAt)}</span>
        </td>
        <td className="break-words px-4 py-4">
          {renderOrderServiceInfo(order)}
        </td>
        <td className="break-words px-4 py-4">
          {renderOrderPaymentInfo(order)}
        </td>
      </tr>
    );
  };

  const filteredBookingOrders = bookingOrders.filter((order) => {
    const query = normalizeFilterText(ticketFilters.query);
    const statusFilter = ticketFilters.status;
    const searchableText = normalizeFilterText([
      order.bookingCode,
      order.movie.title,
      order.room.name,
      getOrderServiceLabels(order),
      order.voucher?.code,
      ...order.tickets.flatMap((ticket) => [
        ticket.ticketCode,
        ticket.seat?.label,
        getTicketStatusMeta(ticket.status).label,
      ]),
    ].join(" "));

    if (query && !searchableText.includes(query)) return false;
    if (statusFilter && !order.tickets.some((ticket) => getTicketStatusMeta(ticket.status).label === statusFilter)) return false;

    return true;
  });
  const ticketTotalPages = Math.max(1, Math.ceil(filteredBookingOrders.length / ORDERS_PER_PAGE));
  const normalizedTicketPage = Math.min(ticketPage, ticketTotalPages);
  const paginatedBookingOrders = filteredBookingOrders.slice(
    (normalizedTicketPage - 1) * ORDERS_PER_PAGE,
    normalizedTicketPage * ORDERS_PER_PAGE,
  );

  useEffect(() => {
    if (activeTab !== "tickets" || loadingTickets) return;

    let isActive = true;
    const ordersNeedingQr = paginatedBookingOrders.filter((order) => (
      order.ticketingVersion === 2 &&
      !orderQrDataUrls[order.id] &&
      !preloadingOrderQrIds.current.has(order.id)
    ));

    if (!ordersNeedingQr.length) return;

    ordersNeedingQr.forEach((order) => preloadingOrderQrIds.current.add(order.id));

    Promise.all(
      ordersNeedingQr.map(async (order) => {
        try {
          const dataUrl = await createOrderQrDataUrl(order);
          return [order.id, dataUrl];
        } catch {
          return null;
        } finally {
          preloadingOrderQrIds.current.delete(order.id);
        }
      }),
    ).then((entries) => {
      if (!isActive) return;

      const validEntries = entries.filter(Boolean);
      if (!validEntries.length) return;

      setOrderQrDataUrls((current) => {
        const next = { ...current };
        validEntries.forEach(([orderId, dataUrl]) => {
          next[orderId] = dataUrl;
        });
        return next;
      });
    });

    return () => {
      isActive = false;
    };
  }, [activeTab, createOrderQrDataUrl, loadingTickets, orderQrDataUrls, paginatedBookingOrders]);

  useEffect(() => {
    setTicketPage(1);
  }, [ticketFilters.query, ticketFilters.status]);

  const renderTicketsTab = () => (
    <>
      {ticketsError && (
        <div className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {ticketsError}
        </div>
      )}
      <div className="mb-5 grid gap-3 rounded-2xl border border-white/10 bg-black/15 p-4 md:grid-cols-[minmax(0,1fr)_190px]">
        <input
          className="h-11 rounded-xl border border-white/10 bg-[#101722] px-4 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-[#ff6070]"
          type="search"
          value={ticketFilters.query}
          onChange={(event) => setTicketFilters((current) => ({ ...current, query: event.target.value }))}
          placeholder="Tìm mã đơn, mã vé, phim, phòng, ghế..."
        />
        <select
          className="h-11 rounded-xl border border-white/10 bg-[#101722] px-4 text-sm font-semibold text-white outline-none focus:border-[#ff6070]"
          value={ticketFilters.status}
          onChange={(event) => setTicketFilters((current) => ({ ...current, status: event.target.value }))}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="Chưa sử dụng">Chưa sử dụng</option>
          <option value="Đã sử dụng">Đã sử dụng</option>
        </select>
      </div>
      <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-white">Lịch sử đặt vé</h3>
            <p className="mt-1 text-xs text-slate-500">Nhấm vào mã QR để xem mã đơn và tải QR đơn</p>
          </div>
          <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-black text-slate-300">
            {bookingOrders.length} đơn
          </span>
        </div>
        {loadingTickets ? (
          <EmptyState>Đang tải vé điện tử...</EmptyState>
        ) : bookingOrders.length ? (
          <>
            {filteredBookingOrders.length ? (
              <>
                <div className="grid gap-4 lg:hidden">
                  {paginatedBookingOrders.map(renderBookingOrderMobileCard)}
                </div>
                <div className="hidden overflow-hidden rounded-2xl border border-white/10 lg:block">
                  <table className="w-full table-fixed border-collapse text-left">
                    <colgroup>
                      <col className="w-[15%]" />
                      <col className="w-[24%]" />
                      <col className="w-[14%]" />
                      <col className="w-[13%]" />
                      <col className="w-[18%]" />
                      <col className="w-[13%]" />
                    </colgroup>
                    <thead className="bg-white/[0.045] text-sm uppercase tracking-[0.04em] text-slate-400">
                      <tr>
                        <th className="break-words px-4 py-4 font-black">Mã / QR</th>
                        <th className="break-words px-4 py-4 font-black">Phim & suất</th>
                        <th className="break-words px-4 py-4 font-black">Ghế đã đặt</th>
                        <th className="break-words px-4 py-4 font-black">Ngày đặt</th>
                        <th className="break-words px-4 py-4 font-black">Dịch vụ</th>
                        <th className="break-words px-4 py-4 font-black">Thanh toán</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {paginatedBookingOrders.map(renderBookingOrderTableRows)}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <EmptyState>Không có đơn vé phù hợp.</EmptyState>
            )}
            {filteredBookingOrders.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-slate-400">
                <span>
                  Hiển thị {(normalizedTicketPage - 1) * ORDERS_PER_PAGE + 1}-
                  {Math.min(normalizedTicketPage * ORDERS_PER_PAGE, filteredBookingOrders.length)} / {filteredBookingOrders.length} đơn
                </span>
                <div className="flex items-center gap-2">
                  <button
                    className="h-9 rounded-xl border border-white/10 bg-white/[0.05] px-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                    type="button"
                    onClick={() => setTicketPage((current) => Math.max(current - 1, 1))}
                    disabled={normalizedTicketPage <= 1}
                  >
                    Trước
                  </button>
                  {Array.from({ length: ticketTotalPages }, (_, index) => index + 1).map((page) => (
                    <button
                      className={`h-11 min-w-11 rounded-xl border px-3 font-black ${page === normalizedTicketPage ? "border-[var(--aura-coral)] bg-[var(--aura-coral)] text-[var(--aura-coral-ink)]" : "border-white/10 bg-white/[0.05] text-slate-300 hover:border-[#ff6070]/70"}`}
                      type="button"
                      key={page}
                      onClick={() => setTicketPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    className="h-9 rounded-xl border border-white/10 bg-white/[0.05] px-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                    type="button"
                    onClick={() => setTicketPage((current) => Math.min(current + 1, ticketTotalPages))}
                    disabled={normalizedTicketPage >= ticketTotalPages}
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <EmptyState>Bạn chưa có đơn vé điện tử nào.</EmptyState>
        )}
      </div>
    </>
  );

  const renderOrderQrModal = () => {
    if (!selectedOrderForQr) return null;

    const dataUrl = orderQrDataUrls[selectedOrderForQr.id];

    return (
      <div
        className="fixed inset-0 z-[80] grid place-items-center bg-black/85 px-4 py-8"
        role="dialog"
        aria-modal="true"
        aria-label={`QR đơn ${selectedOrderForQr.bookingCode}`}
        onClick={() => setSelectedOrderForQr(null)}
      >
        <div
          className="w-[min(420px,100%)] rounded-[24px] border border-white/10 bg-[#141923] p-6 text-center shadow-[0_28px_80px_rgba(0,0,0,0.45)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 text-left">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#ff8f99]">QR đơn vé</p>
              <h2 className="mt-1 break-words text-xl font-black text-white">{selectedOrderForQr.bookingCode}</h2>
              <p className="mt-1 text-sm text-slate-400">{selectedOrderForQr.movie.title || "Đang cập nhật"}</p>
            </div>
            <button
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-lg font-black text-white hover:border-[#ff6070]"
              type="button"
              onClick={() => setSelectedOrderForQr(null)}
              aria-label="Đóng QR đơn"
            >
              x
            </button>
          </div>

          <div className="mx-auto mt-6 grid h-72 w-72 max-w-full place-items-center rounded-2xl bg-white p-4 text-black">
            {dataUrl ? (
              <img
                className="h-full w-full object-contain"
                src={dataUrl}
                alt={`QR đơn ${selectedOrderForQr.bookingCode}`}
              />
            ) : (
              <div className="text-sm font-black uppercase text-slate-500">Đang tải QR</div>
            )}
          </div>

          <button
            className="mt-5 min-h-11 rounded-full bg-[var(--aura-coral)] px-6 text-sm font-black text-[var(--aura-coral-ink)] hover:bg-[var(--aura-coral-hover)] disabled:cursor-wait disabled:opacity-60"
            type="button"
            disabled={!dataUrl || loadingOrderQrId === selectedOrderForQr.id}
            onClick={() => downloadOrderQr(selectedOrderForQr)}
          >
            Tải QR đơn
          </button>
        </div>
      </div>
    );
  };

  const renderPointsTab = () => (
    <section className="rounded-[28px] border border-white/10 bg-[#141923]/95 p-8">
      <AccountTable
        empty="Không có dữ liệu"
        headers={["Ngày giao dịch", "Loại giao dịch", "Tên giao dịch", "Số điểm"]}
      >
        {(user?.reward_point_logs || []).length > 0 ? user.reward_point_logs.map((log) => (
          <tr key={log._id}>
            <td className="whitespace-nowrap px-5 py-4 text-slate-400">{formatDateTime(log.created_at)}</td>
            <td className="px-5 py-4 font-bold text-white">{log.type === "earn" ? "Tích điểm" : log.type === "redeem" ? "Đổi điểm" : log.type === "add" ? "Cộng điểm" : "Trừ điểm"}</td>
            <td className="px-5 py-4 text-slate-400">{log.reason || "Điều chỉnh điểm thưởng"}</td>
            <td className={`px-5 py-4 text-right font-black ${["subtract", "redeem"].includes(log.type) ? "text-red-300" : "text-emerald-300"}`}>
              {["subtract", "redeem"].includes(log.type) ? "-" : "+"}{Number(log.points || 0).toLocaleString("vi-VN")}
            </td>
          </tr>
        )) : null}
      </AccountTable>
    </section>
  );

  const renderVouchersTab = () => {
    const statusLabels = {
      available: "Có thể sử dụng",
      used: "Đã sử dụng",
      expired: "Đã hết hạn",
    };
    const filteredVouchers = vouchers.filter((item) => item.status === voucherFilter);
    const formatVoucherValue = (voucher) =>
      voucher.discount_type === "percent"
        ? `Giảm ${Number(voucher.discount_value || 0)}%`
        : `Giảm ${currencyFormatter.format(Number(voucher.discount_value || 0))}`;

    return (
      <section className="rounded-[28px] border border-white/10 bg-[#141923]/95 p-8 max-sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-white">Ví Voucher cá nhân</h2>
            <p className="mt-1 text-sm text-slate-400">Các ưu đãi đã được thêm vào tài khoản của bạn.</p>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {Object.entries(statusLabels).map(([status, label]) => (
              <button
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-bold transition ${
                  voucherFilter === status
                    ? "border-[var(--aura-coral)] bg-[var(--aura-coral)] text-[var(--aura-coral-ink)]"
                    : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-[#ff6070]/60"
                }`}
                key={status}
                onClick={() => setVoucherFilter(status)}
                type="button"
              >
                {label} ({vouchers.filter((item) => item.status === status).length})
              </button>
            ))}
          </div>
        </div>

        {vouchersError && (
          <div className="mt-6 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {vouchersError}
          </div>
        )}

        {loadingVouchers ? (
          <EmptyState>Đang tải ví Voucher...</EmptyState>
        ) : filteredVouchers.length ? (
          <div className="mt-7 grid gap-5 md:grid-cols-2">
            {filteredVouchers.map((item) => (
              <article
                className={`relative overflow-hidden rounded-2xl border bg-[#101620] p-5 ${
                  item.status === "available" ? "border-[#ff6070]/35" : "border-white/10 opacity-70"
                }`}
                key={item.id}
              >
                <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#ff5364]/10" />
                <div className="relative flex items-start justify-between gap-4">
                  <div>
                    <span className="rounded-full bg-[#ff5364]/15 px-3 py-1 text-xs font-black uppercase text-[#ff8b96]">
                      {statusLabels[item.status]}
                    </span>
                    <h3 className="mt-3 text-lg font-black text-white">
                      {item.voucher?.name || item.voucher?.code}
                    </h3>
                    <p className="mt-1 text-2xl font-black text-[#ff6070]">
                      {formatVoucherValue(item.voucher || {})}
                    </p>
                  </div>
                  <span className="rounded-lg border border-dashed border-[#ff6070]/50 bg-black/20 px-3 py-2 font-mono text-sm font-black text-white">
                    {item.voucher?.code}
                  </span>
                </div>
                {item.voucher?.description && (
                  <p className="mt-4 text-sm leading-6 text-slate-400">{item.voucher.description}</p>
                )}
                <div className="mt-4 border-t border-dashed border-white/10 pt-4 text-xs text-slate-400">
                  <p>Đơn tối thiểu: {currencyFormatter.format(Number(item.voucher?.min_order || 0))}</p>
                  <p className="mt-1">Hạn sử dụng: {formatDate(item.expires_at)}</p>
                  {item.used_at && <p className="mt-1">Đã dùng: {formatDateTime(item.used_at)}</p>}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState>Không có Voucher ở trạng thái này.</EmptyState>
        )}
      </section>
    );
  };

  const renderActiveTab = () => {
    if (activeTab === "member") return renderMemberTab();
    if (activeTab === "tickets") return renderTicketsTab();
    if (activeTab === "points") return renderPointsTab();
    if (activeTab === "vouchers") return renderVouchersTab();
    return renderAccountTab();
  };

  return (
    <main className="mx-auto w-[min(1280px,calc(100%_-_56px))] py-10 max-sm:w-[calc(100%_-_28px)]">
      <h1 className="text-center text-3xl font-black text-white">Thông tin cá nhân</h1>

      <div className="mt-10 flex justify-center">
        <nav className="max-w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-2">
          <div className="flex w-fit max-w-full gap-2 overflow-x-auto">
            {tabs.map((tab) => {
              const selected = activeTab === tab.id;

              return (
                <button
                  className={`flex min-h-12 min-w-fit items-center justify-center whitespace-nowrap rounded-2xl px-6 py-3 text-sm font-black transition ${
                    selected
                      ? "bg-[var(--aura-coral)] text-[var(--aura-coral-ink)]"
                      : "text-slate-200 hover:bg-white/[0.04] hover:text-white"
                  }`}
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  type="button"
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      <div className="mt-5">{renderActiveTab()}</div>
      {renderOrderQrModal()}
    </main>
  );
}

export default AccountPage;
