import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import QRCode from "qrcode";
import {
  HiOutlineCreditCard,
  HiOutlineLockClosed,
  HiOutlineSparkles,
  HiOutlineTag,
  HiOutlineTicket,
  HiOutlineUser,
} from "react-icons/hi";
import { changePassword, updateProfile } from "../api/authApi";
import { getMyTicketDetail, getMyTicketQr } from "../services/ticketService";
import { getBookingOrderQr, getMyBookings } from "../services/bookingService";
import { getMyVoucherWallet } from "../services/voucherService";
import { useAuth } from "../hooks/useAuth";
import { getApiErrorMessage, showToast } from "../utils/toast";
import {
  buildBookingOrderQrFilename,
  isBookingOrderExpanded,
  mapBookingOrderView,
  toggleBookingOrderExpanded,
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
  { id: "account", label: "Tài khoản của tôi", icon: HiOutlineUser },
  { id: "member", label: "Thông tin thẻ thành viên", icon: HiOutlineCreditCard },
  { id: "tickets", label: "Vé của tôi", icon: HiOutlineTicket },
  { id: "points", label: "Lịch sử điểm thưởng", icon: HiOutlineSparkles },
  { id: "vouchers", label: "Ví Voucher", icon: HiOutlineTag },
];

const ORDERS_PER_PAGE = 10;

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

const resolveImageUrl = (image) => {
  if (!image) return "";
  if (/^https?:\/\//i.test(image)) return image;

  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5001/api";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${image.startsWith("/") ? image : `/${image}`}`;
};

const getTicketDate = (ticket) => formatDate(ticket.showtime?.startTime);

const getTicketTime = (ticket) => {
  const value = ticket.showtime?.startTime;
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
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
  const [expandedOrderIds, setExpandedOrderIds] = useState(() => new Set());
  const [loadingOrderQrId, setLoadingOrderQrId] = useState("");
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
  const [selectedTicketDetail, setSelectedTicketDetail] = useState(null);
  const [ticketQrDataUrl, setTicketQrDataUrl] = useState("");
  const [ticketQrError, setTicketQrError] = useState("");
  const [loadingTicketDetail, setLoadingTicketDetail] = useState(false);
  const [loadingTicketQr, setLoadingTicketQr] = useState(false);
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
          .map(mapBookingOrderView);
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

  const loadTicketQr = async (ticketId) => {
    try {
      setLoadingTicketQr(true);
      setTicketQrError("");
      setTicketQrDataUrl("");
      const response = await getMyTicketQr(ticketId);
      const payload = response.data?.qrPayload;

      if (!payload) {
        throw new Error("Không có dữ liệu QR cho vé này.");
      }

      const dataUrl = await QRCode.toDataURL(payload, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 260,
        color: {
          dark: "#101010",
          light: "#ffffff",
        },
      });

      setTicketQrDataUrl(dataUrl);
    } catch (error) {
      const message = getApiErrorMessage(error, "Không thể tải mã QR.");
      setTicketQrError(message);
      showToast("error", message);
    } finally {
      setLoadingTicketQr(false);
    }
  };

  const downloadTicketQr = (ticket, dataUrl = ticketQrDataUrl) => {
    if (!ticket || !dataUrl) return;

    const safeCode = String(ticket.ticketCode || "ve-qr").replace(/[^\w-]+/g, "-");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${safeCode}-qr.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const downloadTicketQrDirectly = async (ticket) => {
    setSelectedTicketDetail(ticket);
    setTicketQrDataUrl("");
    setTicketQrError("");

    try {
      setLoadingTicketQr(true);
      setLoadingTicketDetail(false);
      const response = await getMyTicketQr(ticket.id);
      const payload = response.data?.qrPayload;

      if (!payload) {
        throw new Error("Không có dữ liệu QR cho vé này.");
      }

      const dataUrl = await QRCode.toDataURL(payload, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 260,
        color: {
          dark: "#101010",
          light: "#ffffff",
        },
      });

      setTicketQrDataUrl(dataUrl);
      downloadTicketQr(ticket, dataUrl);
      showToast("success", "Đã tải mã QR của vé.");
    } catch (error) {
      const message = getApiErrorMessage(error, "Không thể tải mã QR.");
      setTicketQrError(message);
      showToast("error", message);
    } finally {
      setLoadingTicketQr(false);
    }
  };

  const openTicketDetail = async (ticket, { qrOnly = false } = {}) => {
    let detailedTicket = ticket;
    setSelectedTicketDetail(ticket);
    setTicketQrDataUrl("");
    setTicketQrError("");

    try {
      setLoadingTicketDetail(!qrOnly);
      const response = await getMyTicketDetail(ticket.id);
      detailedTicket = response.data || ticket;
      setSelectedTicketDetail(detailedTicket);
    } catch (error) {
      const message = getApiErrorMessage(error, "Không thể tải chi tiết vé.");
      setTicketQrError(message);
      showToast("error", message);
    } finally {
      setLoadingTicketDetail(false);
    }

    if (["VALID", "CHECKED_IN"].includes(detailedTicket.status)) {
      await loadTicketQr(ticket.id);
    } else {
      setTicketQrError("QR không khả dụng với vé đã hủy hoặc hết hạn.");
    }
  };

  const handleTicketPdf = async (ticket) => {
    try {
      const [detailResponse, qrResponse, pdfModule] = await Promise.all([
        getMyTicketDetail(ticket.id),
        getMyTicketQr(ticket.id),
        import("../utils/ticketPdf"),
      ]);
      const detailedTicket = detailResponse.data || ticket;
      const qrPayload = qrResponse.data?.qrPayload;
      if (!qrPayload?.startsWith("AURA_TICKET:")) {
        throw new Error("QR vé chưa sẵn sàng.");
      }

      await pdfModule.downloadTicketPdf(detailedTicket, qrPayload);
      showToast("success", "Đã tải PDF vé.");
    } catch (error) {
      showToast("error", getApiErrorMessage(error, "Không thể tạo PDF vé."));
    }
  };

  const loadOrderQr = async (order) => {
    if (!order?.id) return "";
    if (orderQrDataUrls[order.id]) return orderQrDataUrls[order.id];

    try {
      setLoadingOrderQrId(order.id);
      const response = await getBookingOrderQr(order.id);
      const payload = response.data?.qrPayload;
      if (!payload?.startsWith("AURA_BOOKING_V2:")) {
        throw new Error("QR đơn vé chưa sẵn sàng.");
      }
      const dataUrl = await QRCode.toDataURL(payload, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 260,
        color: { dark: "#101010", light: "#ffffff" },
      });
      setOrderQrDataUrls((current) => ({ ...current, [order.id]: dataUrl }));
      return dataUrl;
    } catch (error) {
      showToast("error", getApiErrorMessage(error, "Không thể tải QR đơn vé."));
      return "";
    } finally {
      setLoadingOrderQrId("");
    }
  };

  const toggleOrderDetails = (orderId) => {
    setExpandedOrderIds((current) => toggleBookingOrderExpanded(current, orderId));
  };

  const viewOrderQr = async (order) => {
    setExpandedOrderIds((current) => {
      if (isBookingOrderExpanded(current, order.id)) return current;
      return toggleBookingOrderExpanded(current, order.id);
    });
    await loadOrderQr(order);
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

  const renderTicketCard = (ticket) => {
    const status = getTicketStatusMeta(ticket.status);
    const poster = resolveImageUrl(ticket.movie?.poster);
    const qrAvailable = ["VALID", "CHECKED_IN"].includes(ticket.status);

    return (
      <article
        className="grid overflow-hidden rounded-2xl border border-white/10 bg-[#171d27] shadow-[0_18px_50px_rgba(0,0,0,0.18)] sm:grid-cols-[120px_minmax(0,1fr)]"
        key={ticket.id}
      >
        <div className="aspect-[3/4] bg-[#0f141c] sm:aspect-auto">
          {poster ? (
            <img className="h-full w-full object-cover" src={poster} alt={ticket.movie?.title || "Poster phim"} loading="lazy" decoding="async" />
          ) : (
            <div className="grid h-full min-h-40 place-items-center text-sm font-black text-slate-600">AuraCinema</div>
          )}
        </div>
        <div className="grid gap-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#ff8f99]">Mã vé</p>
              <h3 className="mt-1 break-words text-lg font-black text-white">{ticket.ticketCode}</h3>
            </div>
            <span className={`rounded-full border px-3 py-1.5 text-xs font-black ${status.className}`}>
              {status.label}
            </span>
          </div>
          <div>
            <p className="line-clamp-2 text-xl font-black text-white">{ticket.movie?.title || "Vé xem phim"}</p>
            <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
              <p><span className="text-slate-500">Ngày:</span> <strong className="text-white">{getTicketDate(ticket)}</strong></p>
              <p><span className="text-slate-500">Giờ:</span> <strong className="text-white">{getTicketTime(ticket)}</strong></p>
              <p><span className="text-slate-500">Rạp:</span> <strong className="text-white">{ticket.cinema?.name || "-"}</strong></p>
              <p><span className="text-slate-500">Phòng:</span> <strong className="text-white">{ticket.room?.name || "-"}</strong></p>
              <p><span className="text-slate-500">Ghế:</span> <strong className="text-white">{ticket.seat?.label || "-"}</strong></p>
              <p><span className="text-slate-500">Giá vé:</span> <strong className="text-[#ff9aa5]">{currencyFormatter.format(Number(ticket.price || 0))}</strong></p>
              <p><span className="text-slate-500">Check-in:</span> <strong className="text-white">{formatDateTime(ticket.checkedInAt)}</strong></p>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 pt-4">
            {qrAvailable ? (
              <>
            <button
              className="h-11 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 text-sm font-black text-emerald-100 hover:bg-emerald-400/20"
              type="button"
              onClick={() => openTicketDetail(ticket, { qrOnly: true })}
            >
              Xem QR
            </button>
            <button
              className="h-11 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 text-sm font-black text-emerald-100 hover:bg-emerald-400/20"
              type="button"
              onClick={() => downloadTicketQrDirectly(ticket)}
            >
              Tải QR
            </button>
            <button
              className="h-11 rounded-full border border-white/10 bg-white/[0.06] px-4 text-sm font-black text-white hover:border-[#ff6070]"
              type="button"
              onClick={() => handleTicketPdf(ticket)}
            >
              Tải PDF
            </button>
              </>
            ) : (
              <p className="mr-auto self-center text-xs font-semibold text-slate-500">QR không khả dụng với vé {status.label.toLowerCase()}.</p>
            )}
            <button
              className="h-11 rounded-full border border-white/10 bg-white/[0.06] px-4 text-sm font-black text-white hover:border-[#ff6070]"
              type="button"
              onClick={() => openTicketDetail(ticket)}
            >
              Xem chi tiết
            </button>
          </div>
        </div>
      </article>
    );
  };

  const renderBookingOrderCard = (order) => {
    const isExpanded = isBookingOrderExpanded(expandedOrderIds, order.id);
    const detailsId = `booking-order-details-${order.id}`;

    return (
    <article className="overflow-hidden rounded-3xl border border-white/10 bg-[#111722]" key={order.id}>
      <header className="grid gap-4 border-b border-white/10 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#ff8f99]">Đơn vé</p>
          <h3 className="mt-1 break-words text-xl font-black text-white">{order.bookingCode}</h3>
          <p className="mt-2 text-sm font-bold text-slate-200">{order.movie.title || "Phim đang cập nhật"}</p>
          <p className="mt-1 text-xs text-slate-400">
            {formatDateTime(order.showtime.startTime)} · {order.cinema.name || "Rạp đang cập nhật"} · {order.room.name || "Phòng đang cập nhật"}
          </p>
        </div>
        <div className="grid gap-2 text-sm md:justify-items-end md:text-right">
          <span className="text-slate-500">{order.tickets.length} vé</span>
          <strong className="text-lg text-[#ff9aa5]">{currencyFormatter.format(order.pricing.total)}</strong>
          {order.voucher && <span className="text-xs font-bold text-emerald-300">Voucher {order.voucher.code}: −{currencyFormatter.format(order.voucher.discountAmount)}</span>}
          <div className="mt-1 flex flex-wrap gap-2 md:justify-end">
            {order.ticketingVersion === 2 && (
              <>
                <button
                  className="h-10 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 text-xs font-black text-emerald-100 hover:bg-emerald-400/20 disabled:cursor-wait disabled:opacity-60"
                  type="button"
                  disabled={loadingOrderQrId === order.id}
                  onClick={() => viewOrderQr(order)}
                >
                  {loadingOrderQrId === order.id ? "Đang tải..." : "Xem QR đơn"}
                </button>
                <button
                  className="h-10 rounded-full border border-white/15 bg-white/[0.05] px-4 text-xs font-black text-white hover:border-emerald-400/50 disabled:cursor-wait disabled:opacity-60"
                  type="button"
                  disabled={loadingOrderQrId === order.id}
                  onClick={() => downloadOrderQr(order)}
                >
                  Tải QR đơn
                </button>
              </>
            )}
            <button
              className="h-10 rounded-full border border-[#ff6070]/40 bg-[#ff6070]/10 px-4 text-xs font-black text-[#ff9aa5] hover:bg-[#ff6070]/20"
              type="button"
              aria-expanded={isExpanded}
              aria-controls={detailsId}
              onClick={() => toggleOrderDetails(order.id)}
            >
              {isExpanded ? "Thu gọn đơn vé" : "Hiển thị toàn bộ đơn vé"}
            </button>
          </div>
        </div>
      </header>
      {isExpanded && (
        <div id={detailsId}>
          {orderQrDataUrls[order.id] && (
            <div className="grid gap-4 border-b border-white/10 bg-white/[0.025] p-5 sm:grid-cols-[150px_minmax(0,1fr)] sm:items-center">
              <div className="rounded-2xl bg-white p-3 text-black">
                <img className="mx-auto h-32 w-32 object-contain" src={orderQrDataUrls[order.id]} alt={`QR đơn ${order.bookingCode}`} />
              </div>
              <div>
                <h4 className="font-black text-white">QR đơn vé</h4>
                <p className="mt-2 text-sm leading-6 text-slate-400">Xuất trình tại quầy để tra cứu và in tất cả vé hợp lệ chưa in. Check-in vẫn sử dụng QR riêng của từng vé.</p>
              </div>
            </div>
          )}
          {(order.services.length > 0 || order.voucher) && (
            <div className="grid gap-2 border-b border-white/10 bg-black/10 px-5 py-4 text-xs text-slate-300 sm:grid-cols-2">
              <p><span className="text-slate-500">Dịch vụ:</span> {order.services.length ? order.services.map((service) => `${service.name} ×${service.quantity}`).join(", ") : "Không có"}</p>
              <p><span className="text-slate-500">Giảm giá:</span> {currencyFormatter.format(order.pricing.discount)}</p>
            </div>
          )}
          <div className="grid gap-5 p-5 xl:grid-cols-2">
            {order.tickets.map(renderTicketCard)}
          </div>
        </div>
      )}
      </article>
    );
  };

  const filteredBookingOrders = bookingOrders.filter((order) => {
    const query = normalizeFilterText(ticketFilters.query);
    const statusFilter = ticketFilters.status;
    const searchableText = normalizeFilterText([
      order.bookingCode,
      order.movie.title,
      order.cinema.name,
      order.room.name,
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
    setTicketPage(1);
  }, [ticketFilters.query, ticketFilters.status]);

  const renderTicketsTab = () => (
    <section className="rounded-[28px] border border-white/10 bg-[#141923]/95 p-8 max-sm:p-5">
      {ticketsError && (
        <div className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {ticketsError}
        </div>
      )}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Vé của tôi</h2>
          <p className="mt-1 text-sm text-slate-400">Mỗi lần đặt vé là một đơn; bên trong đơn, từng ghế vẫn có QR riêng để check-in.</p>
        </div>
        <button
          className="h-10 rounded-full border border-white/10 bg-white/[0.06] px-5 text-sm font-black text-white hover:border-[#ff6070]"
          type="button"
          onClick={() => window.history.back()}
        >
          Quay lại
        </button>
      </div>
      <div className="mb-5 grid gap-3 rounded-2xl border border-white/10 bg-black/15 p-4 md:grid-cols-[minmax(0,1fr)_190px_auto]">
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
          <option value="Đã hủy">Đã hủy</option>
          <option value="Đã hết hạn">Đã hết hạn</option>
        </select>
        <button
          className="h-11 rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm font-black text-white hover:border-[#ff6070]"
          type="button"
          onClick={() => setTicketFilters({ query: "", status: "" })}
        >
          Xóa lọc
        </button>
      </div>
      <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-white">Lịch sử đặt vé</h3>
            <p className="mt-1 text-xs text-slate-500">Danh sách đơn vé và các vé tương ứng với từng ghế.</p>
          </div>
          <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-black text-slate-300">
            {bookingOrders.length} đơn · {tickets.length} vé
          </span>
        </div>
        {loadingTickets ? (
          <EmptyState>Đang tải vé điện tử...</EmptyState>
        ) : bookingOrders.length ? (
          <>
            {filteredBookingOrders.length ? (
              <div className="grid gap-5">
                {paginatedBookingOrders.map(renderBookingOrderCard)}
              </div>
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
    </section>
  );

  const renderTicketDetailModal = () => {
    const ticket = selectedTicketDetail;
    if (!ticket) return null;

    const status = getTicketStatusMeta(ticket.status);
    const poster = resolveImageUrl(ticket.movie?.poster);

    return (
      <div className="fixed inset-0 z-[80] grid place-items-center bg-black/85 px-4 py-8" role="dialog" aria-modal="true" aria-label={`Chi tiết vé ${ticket.ticketCode}`} onClick={() => setSelectedTicketDetail(null)}>
        <div className="max-h-[90vh] w-[min(720px,100%)] overflow-y-auto rounded-[var(--aura-radius-lg)] border border-white/10 bg-[var(--aura-surface)] shadow-[var(--aura-shadow-floating)]" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff5364]">AuraCinema</p>
              <h2 className="mt-1 text-xl font-black text-white">Vé điện tử</h2>
            </div>
            <button className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-xl font-black text-white hover:bg-[#ff5364] hover:text-[var(--aura-coral-ink)]" type="button" onClick={() => setSelectedTicketDetail(null)} aria-label="Đóng chi tiết">
              ×
            </button>
          </div>

          <div className="p-5 text-white">
            {loadingTicketDetail ? (
              <EmptyState>Đang tải chi tiết vé...</EmptyState>
            ) : (
              <div className="overflow-hidden rounded-xl border border-white/10 bg-[#171717]">
                <div className="grid gap-5 p-5 sm:grid-cols-[120px_minmax(0,1fr)]">
                  <div className="aspect-[3/4] overflow-hidden rounded-xl bg-white/[0.04]">
                    {poster ? <img className="h-full w-full object-cover" src={poster} alt={ticket.movie?.title || "Poster phim"} loading="lazy" decoding="async" /> : null}
                  </div>
                  <div>
                    <span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-black ${status.className}`}>
                      {status.label}
                    </span>
                    <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-[#ff5364]">Vé xem phim</p>
                    <h3 className="mt-1 text-2xl font-black text-white">{ticket.movie?.title || "Vé xem phim"}</h3>
                    <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
                      <p><span className="text-slate-500">Ngày:</span> <strong className="text-white">{getTicketDate(ticket)}</strong></p>
                      <p><span className="text-slate-500">Giờ:</span> <strong className="text-white">{getTicketTime(ticket)}</strong></p>
                      <p><span className="text-slate-500">Rạp:</span> <strong className="text-white">{ticket.cinema?.name || "-"}</strong></p>
                      <p><span className="text-slate-500">Phòng:</span> <strong className="text-white">{ticket.room?.name || "-"}</strong></p>
                      <p><span className="text-slate-500">Ghế:</span> <strong className="text-white">{ticket.seat?.label || "-"}</strong></p>
                      <p><span className="text-slate-500">Loại ghế:</span> <strong className="text-white">{ticket.seat?.type || "Đang cập nhật"}</strong></p>
                      <p><span className="text-slate-500">Giá vé:</span> <strong className="text-[#ff9aa5]">{currencyFormatter.format(Number(ticket.price || 0))}</strong></p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/10 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Mã vé</p>
                  <p className="mt-1 break-words text-lg font-black text-white">{ticket.ticketCode}</p>
                </div>

                <div className="border-t border-white/10 bg-white p-5 text-center">
                  {loadingTicketQr ? (
                    <div className="grid min-h-48 place-items-center text-sm font-bold text-slate-500">Đang tạo mã QR...</div>
                  ) : ticketQrError ? (
                    <div className="mx-auto max-w-sm rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                      {ticketQrError}
                    </div>
                  ) : ticketQrDataUrl ? (
                    <>
                      <img className="mx-auto h-48 w-48 object-contain" src={ticketQrDataUrl} alt={`QR vé ${ticket.ticketCode}`} />
                      <button
                        className="mt-4 rounded-full bg-[var(--aura-coral)] px-5 py-2 text-sm font-black text-[var(--aura-coral-ink)] hover:bg-[var(--aura-coral-hover)]"
                        type="button"
                        onClick={() => downloadTicketQr(ticket)}
                      >
                        Tải mã QR
                      </button>
                      <div className="mt-3 flex flex-wrap justify-center gap-2">
                        <button className="min-h-11 rounded-full border border-slate-300 px-4 text-sm font-black text-slate-900" type="button" onClick={() => handleTicketPdf(ticket)}>Tải PDF</button>
                      </div>
                    </>
                  ) : null}
                  <p className="mt-3 text-xs font-black text-black">Vui lòng xuất trình mã QR tại cửa phòng chiếu</p>
                </div>

                <div className="grid gap-2 border-t border-white/10 p-5 text-sm text-slate-400 sm:grid-cols-2">
                  <p>Check-in: <strong className="text-white">{formatDateTime(ticket.checkedInAt)}</strong></p>
                </div>
              </div>
            )}
          </div>
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
              const Icon = tab.icon;
              const selected = activeTab === tab.id;

              return (
                <button
                  className={`flex min-w-fit items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition ${
                    selected
                      ? "bg-[var(--aura-coral)] text-[var(--aura-coral-ink)]"
                      : "text-slate-200 hover:bg-white/[0.04] hover:text-white"
                  }`}
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  type="button"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-white/[0.05]">
                    <Icon />
                  </span>
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      <div className="mt-5">{renderActiveTab()}</div>
      {renderTicketDetailModal()}
    </main>
  );
}

export default AccountPage;
