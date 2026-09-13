import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import LoyaltyPanel from "../components/LoyaltyPanel";
import QRCode from "qrcode";
import { HiOutlineLockClosed } from "react-icons/hi";
import { changePassword, updateProfile } from "../api/authApi";
import { getBookingOrderQr, getMyBookings } from "../services/bookingService";
import { useAuth } from "../hooks/useAuth";
import { getApiErrorMessage, showToast } from "../utils/toast";
import {
  buildBookingOrderQrFilename,
  mapBookingOrderView,
} from "../utils/bookingOrderView";

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

const TABLE_SERVICE_PREVIEW_LIMIT = 2;
const MOBILE_SERVICE_PREVIEW_LIMIT = 3;

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
  const [bookingOrders, setBookingOrders] = useState([]);
  const [orderQrDataUrls, setOrderQrDataUrls] = useState({});
  const preloadingOrderQrIds = useRef(new Set());
  const isAccountPageMounted = useRef(false);
  const [loadingOrderQrId, setLoadingOrderQrId] = useState("");
  const [selectedOrderForQr, setSelectedOrderForQr] = useState(null);
  const [selectedOrderForServices, setSelectedOrderForServices] = useState(null);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [ticketsError, setTicketsError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [showPasswordPanel, setShowPasswordPanel] = useState(false);
  const [ticketFilters, setTicketFilters] = useState({
    query: "",
    status: "",
  });
  const [ticketPage, setTicketPage] = useState(1);

  useEffect(() => {
    isAccountPageMounted.current = true;
    return () => {
      isAccountPageMounted.current = false;
    };
  }, []);

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
          .map(mapBookingOrderView)
          .filter((order) => order.status === "confirmed" && order.paymentStatus === "paid");
        if (isActive) {
          setBookingOrders(allOrders);
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
    const visibleLimit = isMobile ? MOBILE_SERVICE_PREVIEW_LIMIT : TABLE_SERVICE_PREVIEW_LIMIT;
    const visibleServiceItems = serviceItems.slice(0, visibleLimit);
    const hiddenServiceCount = Math.max(serviceItems.length - visibleServiceItems.length, 0);

    return (
      <div className={`grid ${isMobile ? "gap-1.5" : "gap-2"} text-sm`}>
        {hasServices ? (
          <ul className="grid min-w-0 gap-1">
            {visibleServiceItems.map((serviceLabel) => (
              <li className="min-w-0 truncate font-bold text-white" key={serviceLabel}>
                {serviceLabel}
              </li>
            ))}
            {hiddenServiceCount > 0 && (
              <li>
                <button
                  className="w-fit rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-left text-xs font-black text-slate-300 transition hover:border-[#ff6070]/70 hover:text-white focus-visible:outline-[#ff9aa5]"
                  type="button"
                  onClick={() => setSelectedOrderForServices(order)}
                >
                  +{hiddenServiceCount} dịch vụ khác
                </button>
              </li>
            )}
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

  const renderOrderServicesModal = () => {
    if (!selectedOrderForServices) return null;

    const services = selectedOrderForServices.services || [];
    const serviceSubtotal = getOrderServiceSubtotal(selectedOrderForServices);
    const voucherCode = String(selectedOrderForServices.voucher?.code || "").trim().toUpperCase();

    return (
      <div
        className="fixed inset-0 z-[80] grid place-items-center bg-black/85 px-4 py-8"
        role="dialog"
        aria-modal="true"
        aria-label={`Dịch vụ trong đơn ${selectedOrderForServices.bookingCode}`}
        onClick={() => setSelectedOrderForServices(null)}
      >
        <div
          className="w-[min(680px,100%)] rounded-[24px] border border-white/10 bg-[#141923] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.45)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#ff8f99]">Dịch vụ đã đặt</p>
              <h2 className="mt-1 break-words text-xl font-black text-white">{selectedOrderForServices.bookingCode}</h2>
              <p className="mt-1 text-sm text-slate-400">{selectedOrderForServices.movie.title || "Đang cập nhật"}</p>
            </div>
            <button
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-lg font-black text-white hover:border-[#ff6070]"
              type="button"
              onClick={() => setSelectedOrderForServices(null)}
              aria-label="Đóng danh sách dịch vụ"
            >
              x
            </button>
          </div>

          <div className="mt-5 max-h-[48vh] overflow-y-auto rounded-2xl border border-white/10 bg-black/15">
            {services.length ? (
              <ul className="divide-y divide-white/10">
                {services.map((service, index) => {
                  const quantity = Number(service.quantity || 0);
                  const subtotal = Number(service.subtotal || service.unitPrice * quantity || 0);

                  return (
                    <li className="grid gap-3 px-4 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start" key={`${service.id || service.name}-${index}`}>
                      <div className="min-w-0">
                        <strong className="block break-words text-base font-black text-white">{service.name || "Dịch vụ"}</strong>
                        <span className="mt-1 block text-slate-500">Số lượng: {quantity || 1}</span>
                      </div>
                      <strong className="whitespace-nowrap text-left text-base text-slate-100 sm:text-right">
                        {currencyFormatter.format(subtotal)}
                      </strong>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="p-5 text-sm font-bold text-slate-400">Không có đồ ăn</div>
            )}
          </div>

          <div className="mt-5 grid gap-2 rounded-2xl bg-white/[0.04] p-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">Giá đồ ăn</span>
              <strong className="text-base text-white">{currencyFormatter.format(serviceSubtotal)}</strong>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">Mã giảm giá</span>
              <strong className={voucherCode ? "text-emerald-300" : "text-slate-300"}>
                {voucherCode || "Không có"}
              </strong>
            </div>
          </div>
        </div>
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
          Thành tiền: <strong className="text-lg font-black text-[#ff9aa5]">{currencyFormatter.format(total)}</strong>
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
                <dt className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Tổng tiền</dt>
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
      if (!isAccountPageMounted.current) return;

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
                        <th className="break-words px-4 py-4 font-black">Tổng tiền</th>
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

  const renderActiveTab = () => {
    if (["member", "points", "vouchers"].includes(activeTab)) return <LoyaltyPanel tab={activeTab} user={user} refreshProfile={refreshProfile} onTabChange={tab => setSearchParams({ tab })} />;
    if (activeTab === "tickets") return renderTicketsTab();
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
      {renderOrderServicesModal()}
    </main>
  );
}

export default AccountPage;
