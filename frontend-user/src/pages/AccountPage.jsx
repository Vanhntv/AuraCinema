import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  HiOutlineCreditCard,
  HiOutlineGift,
  HiOutlineLockClosed,
  HiOutlineSparkles,
  HiOutlineTag,
  HiOutlineTicket,
  HiOutlineUser,
} from "react-icons/hi";
import { changePassword, updateProfile } from "../api/authApi";
import { promotionItems } from "../data/promotionContent";
import { getMyBookings } from "../services/bookingService";
import { getMarketingContent } from "../services/marketingContentService";
import { getMyVoucherWallet } from "../services/voucherService";
import { useAuth } from "../hooks/useAuth";
import { mapCmsContentItem } from "../utils/marketingContent";

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
  { id: "tickets", label: "Lịch sử mua vé", icon: HiOutlineTicket },
  { id: "points", label: "Lịch sử điểm thưởng", icon: HiOutlineSparkles },
  { id: "vouchers", label: "Ví Voucher", icon: HiOutlineTag },
  { id: "promotions", label: "Chương trình khuyến mãi", icon: HiOutlineGift },
];

const TICKETS_PER_PAGE = 5;

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

const getBookingMovieTitle = (booking) =>
  booking.showtime_id?.movie_id?.title || booking.showtime_id?.movieTitle || "Vé xem phim";

const getBookingSeatCount = (booking) => booking.showtime_seat_ids?.length || 0;

const getBookingCode = (booking) => booking.booking_code || booking.bookingCode || booking._id || "-";

const getBookingCinemaName = (booking) =>
  booking.showtime_id?.room_id?.cinema_id?.name ||
  booking.showtime_id?.cinemaName ||
  "Rạp đang cập nhật";

const getBookingRoomName = (booking) =>
  booking.showtime_id?.room_id?.name ||
  booking.showtime_id?.roomName ||
  "Phòng đang cập nhật";

const getBookingShowtime = (booking) => formatDateTime(booking.showtime_id?.start_time);

const getBookingSeatLabels = (booking) => {
  const labels = (booking.showtime_seat_ids || [])
    .map((item) => {
      const seat = item.seat_id || item;
      const row = seat.seat_row || seat.row || "";
      const number = seat.seat_number || seat.number || "";
      return row || number ? `${row}${number}` : "";
    })
    .filter(Boolean);

  return labels.length ? labels.join(", ") : "-";
};

const getBookingComboText = (booking) => {
  const combos = (booking.combos || [])
    .map((item) => {
      const name = item.name || item.combo_id?.name;
      const quantity = Number(item.quantity || 0);
      if (!name || quantity <= 0) return "";
      return `${name} x${quantity}`;
    })
    .filter(Boolean);

  return combos.length ? combos.join(", ") : "Không có";
};

const getBookingVoucherText = (booking) => {
  const code = booking.voucher?.code || booking.voucher?.voucher_id?.code;
  const discount = Number(booking.discount_amount || booking.voucher?.discount_amount || 0);

  if (!code && discount <= 0) return "Không có";
  if (!code) return `Giảm ${currencyFormatter.format(discount)}`;
  return discount > 0 ? `${code} · -${currencyFormatter.format(discount)}` : code;
};

const getBookingComboTotal = (booking) =>
  (booking.combos || []).reduce((total, item) => total + Number(item.subtotal || 0), 0);

const getBookingTicketTotal = (booking) =>
  Math.max(Number(booking.subtotal_price || 0) - getBookingComboTotal(booking), 0);

const getBookingPaymentProvider = (booking) => {
  const provider = String(booking.payment_provider || "").toLowerCase();
  if (provider.includes("sepay")) return "SePay";
  if (provider.includes("vnpay")) return "VNPay";
  return booking.payment_provider || "-";
};

const getBookingStatusLabel = (booking) => {
  if (booking.payment_status === "paid" && booking.status !== "cancelled") return "Đã thanh toán";
  return "Đã hủy";
};

const getBookingStatusTone = (booking) => {
  if (booking.payment_status === "paid" && booking.status !== "cancelled") return "success";
  return "danger";
};

const getBookingStatusClassName = (booking) => {
  const tone = getBookingStatusTone(booking);
  if (tone === "success") return "bg-emerald-400/10 text-emerald-200";
  return "bg-red-500/10 text-red-200";
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
  const qrSeed = cardCode.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const qrCells = Array.from({ length: 81 }, (_, index) => {
    const row = Math.floor(index / 9);
    const col = index % 9;
    return row < 2 || col < 2 || (index + qrSeed + row * col) % 3 !== 0;
  });

  return (
    <div className="relative aspect-[3/5] w-full max-w-[310px] overflow-hidden rounded-[28px] border border-white/15 bg-[linear-gradient(135deg,#f7e441_0%,#62a7ff_52%,#222b7a_100%)] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.35)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.7),transparent_18%),radial-gradient(circle_at_82%_70%,rgba(255,115,0,0.45),transparent_24%)]" />
      <div className="relative z-10">
        <div className="text-sm font-black uppercase leading-tight text-[#1a2455]">
          Aura
          <br />
          Cinema
          <br />
          Center
        </div>
        <div className="mx-auto mt-10 grid w-40 grid-cols-9 gap-1 rounded-2xl bg-white p-4 shadow-xl">
          {qrCells.map((filled, index) => (
            <span
              className={`aspect-square rounded-[2px] ${filled ? "bg-black" : "bg-white"}`}
              key={index}
            />
          ))}
        </div>
        <div className="absolute bottom-6 left-0 right-0 text-center">
          <p className="text-2xl font-black uppercase tracking-[0.08em] text-white drop-shadow">
            {user?.full_name || "Aura Member"}
          </p>
          <p className="mt-1 text-xl font-black tracking-[0.08em] text-white drop-shadow">
            {cardCode}
          </p>
        </div>
      </div>
      <span className="absolute right-5 top-5 rounded-full bg-white px-4 py-1 text-xs font-black uppercase text-[#101827]">
        {loyalty.label}
      </span>
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
  const [bookings, setBookings] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [activePromotions, setActivePromotions] = useState(() =>
    promotionItems.filter((item) => item.status !== "expired"),
  );
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [bookingsError, setBookingsError] = useState("");
  const [vouchersError, setVouchersError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingVouchers, setLoadingVouchers] = useState(true);
  const [voucherFilter, setVoucherFilter] = useState("available");
  const [showPasswordPanel, setShowPasswordPanel] = useState(false);
  const [selectedBookingDetail, setSelectedBookingDetail] = useState(null);
  const [ticketFilters, setTicketFilters] = useState({
    query: "",
    seatCount: "",
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

    async function loadBookings() {
      try {
        setLoadingBookings(true);
        setBookingsError("");
        const response = await getMyBookings();
        if (isActive) setBookings(response.data || []);
      } catch (error) {
        if (isActive) {
          setBookingsError(
            error.response?.data?.message || "Không thể tải lịch sử mua vé.",
          );
        }
      } finally {
        if (isActive) setLoadingBookings(false);
      }
    }

    loadBookings();

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
          setVouchersError(
            error.response?.data?.message || "Không thể tải ví Voucher cá nhân.",
          );
        }
      })
      .finally(() => {
        if (isActive) setLoadingVouchers(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    getMarketingContent({ type: "promotion", limit: 100 })
      .then((response) => {
        const items = (response.data || []).map(mapCmsContentItem);
        if (isActive && items.length) setActivePromotions(items);
      })
      .catch(() => {
        if (isActive) {
          setActivePromotions(promotionItems.filter((item) => item.status !== "expired"));
        }
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
      setProfileError("Họ tên không được để trống.");
      return;
    }

    if (profileForm.birth_date && new Date(profileForm.birth_date) > new Date()) {
      setProfileError("Ngày sinh không thể lớn hơn ngày hiện tại.");
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
    } catch (error) {
      setProfileError(error.response?.data?.message || "Cập nhật thông tin thất bại.");
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
      setPasswordError("Mật khẩu mới phải có ít nhất 8 ký tự, gồm chữ hoa và số.");
      return;
    }

    if (passwordForm.password !== passwordForm.confirm_password) {
      setPasswordError("Mật khẩu xác nhận không khớp.");
      return;
    }

    try {
      setSavingPassword(true);
      await changePassword(passwordForm);
      setPasswordMessage("Đổi mật khẩu thành công. Vui lòng đăng nhập lại.");
      setPasswordForm({
        current_password: "",
        password: "",
        confirm_password: "",
      });
      window.setTimeout(logout, 1200);
    } catch (error) {
      setPasswordError(error.response?.data?.message || "Đổi mật khẩu thất bại.");
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
            className="h-12 rounded-full bg-gradient-to-b from-[#ff7b39] to-[#ff321d] px-8 font-extrabold text-white shadow-[0_18px_45px_rgba(255,70,30,0.28)] disabled:opacity-60"
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
    <section className="rounded-[28px] border border-white/10 bg-[#141923]/95 p-8">
      <h2 className="text-center text-xl font-black text-white">Thông tin thẻ thành viên</h2>
      <div className="mx-auto mt-7 grid max-w-[860px] items-center gap-8 md:grid-cols-[300px_minmax(0,1fr)]">
        <MemberCard user={user} loyalty={loyalty} />
        <div className="grid gap-1 text-sm">
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
            Đăng ký U22
          </button>
        </div>
      </div>
    </section>
  );

  const renderTicketRow = (booking) => (
    <div className="grid grid-cols-[1.25fr_1.6fr_1fr_0.55fr_0.9fr_1fr_0.75fr] items-center gap-3 border-b border-white/10 px-5 py-4 last:border-b-0" key={booking._id}>
      <strong className="min-w-0 break-words text-sm font-black text-white">{getBookingCode(booking)}</strong>
      <span className="line-clamp-1 min-w-0 text-sm font-bold text-slate-200">{getBookingMovieTitle(booking)}</span>
      <span className="min-w-0 text-sm font-semibold text-slate-200">{getBookingShowtime(booking)}</span>
      <span className="min-w-0 text-sm font-semibold text-white">{getBookingSeatCount(booking)} ghế</span>
      <span className="min-w-0 text-sm text-slate-400">{formatDateTime(booking.created_at)}</span>
      <span className={`inline-flex min-w-0 justify-center rounded-full px-3 py-1.5 text-xs font-black ${getBookingStatusClassName(booking)}`}>
        {getBookingStatusLabel(booking)}
      </span>
      <button
        className="inline-flex h-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-3 text-xs font-black text-white hover:border-[#ff6070]"
        type="button"
        onClick={() => setSelectedBookingDetail(booking)}
      >
        Chi tiết
      </button>
    </div>
  );

  const filteredBookings = bookings.filter((booking) => {
    const query = normalizeFilterText(ticketFilters.query);
    const seatCountFilter = ticketFilters.seatCount;
    const statusFilter = ticketFilters.status;
    const seatCount = getBookingSeatCount(booking);
    const statusLabel = getBookingStatusLabel(booking);
    const searchableText = normalizeFilterText([
      getBookingCode(booking),
      getBookingMovieTitle(booking),
      getBookingShowtime(booking),
      `${seatCount} ghế`,
      formatDateTime(booking.created_at),
      statusLabel,
    ].join(" "));

    if (query && !searchableText.includes(query)) return false;
    if (seatCountFilter === "1" && seatCount !== 1) return false;
    if (seatCountFilter === "2" && seatCount !== 2) return false;
    if (seatCountFilter === "3plus" && seatCount < 3) return false;
    if (statusFilter && statusLabel !== statusFilter) return false;

    return true;
  });
  const ticketTotalPages = Math.max(1, Math.ceil(filteredBookings.length / TICKETS_PER_PAGE));
  const normalizedTicketPage = Math.min(ticketPage, ticketTotalPages);
  const paginatedBookings = filteredBookings.slice(
    (normalizedTicketPage - 1) * TICKETS_PER_PAGE,
    normalizedTicketPage * TICKETS_PER_PAGE,
  );

  useEffect(() => {
    setTicketPage(1);
  }, [ticketFilters.query, ticketFilters.seatCount, ticketFilters.status]);

  const renderTicketsTab = () => (
    <section className="rounded-[28px] border border-white/10 bg-[#141923]/95 p-8">
      {bookingsError && (
        <div className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {bookingsError}
        </div>
      )}
      <div className="mb-5 grid gap-3 rounded-2xl border border-white/10 bg-black/15 p-4 lg:grid-cols-[minmax(0,1fr)_170px_180px_auto]">
        <input
          className="h-11 rounded-xl border border-white/10 bg-[#101722] px-4 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-[#ff6070]"
          type="search"
          value={ticketFilters.query}
          onChange={(event) => setTicketFilters((current) => ({ ...current, query: event.target.value }))}
          placeholder="Tìm mã hóa đơn, phim, suất chiếu, ngày đặt..."
        />
        <select
          className="h-11 rounded-xl border border-white/10 bg-[#101722] px-4 text-sm font-semibold text-white outline-none focus:border-[#ff6070]"
          value={ticketFilters.seatCount}
          onChange={(event) => setTicketFilters((current) => ({ ...current, seatCount: event.target.value }))}
        >
          <option value="">Tất cả số ghế</option>
          <option value="1">1 ghế</option>
          <option value="2">2 ghế</option>
          <option value="3plus">Từ 3 ghế</option>
        </select>
        <select
          className="h-11 rounded-xl border border-white/10 bg-[#101722] px-4 text-sm font-semibold text-white outline-none focus:border-[#ff6070]"
          value={ticketFilters.status}
          onChange={(event) => setTicketFilters((current) => ({ ...current, status: event.target.value }))}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="Đã thanh toán">Đã thanh toán</option>
          <option value="Đã hủy">Đã hủy</option>
        </select>
        <button
          className="h-11 rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm font-black text-white hover:border-[#ff6070]"
          type="button"
          onClick={() => setTicketFilters({ query: "", seatCount: "", status: "" })}
        >
          Xóa lọc
        </button>
      </div>
      {loadingBookings ? (
        <EmptyState>Đang tải lịch sử mua vé...</EmptyState>
      ) : bookings.length ? (
        <>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#171d27] shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
            <div className="grid grid-cols-[1.25fr_1.6fr_1fr_0.55fr_0.9fr_1fr_0.75fr] gap-3 border-b border-white/10 bg-white/[0.04] px-5 py-4 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
              <span>Mã hóa đơn</span>
              <span>Phim</span>
              <span>Suất chiếu</span>
              <span>Ghế</span>
              <span>Ngày đặt</span>
              <span>Trạng thái</span>
              <span>Hành động</span>
            </div>
            {filteredBookings.length ? (
              <div>{paginatedBookings.map(renderTicketRow)}</div>
            ) : (
              <EmptyState>Không có hóa đơn phù hợp.</EmptyState>
            )}
          </div>
          {filteredBookings.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-slate-400">
              <span>
                Hiển thị {(normalizedTicketPage - 1) * TICKETS_PER_PAGE + 1}-
                {Math.min(normalizedTicketPage * TICKETS_PER_PAGE, filteredBookings.length)} / {filteredBookings.length} vé
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
                  className={`h-9 min-w-9 rounded-xl border px-3 font-black ${page === normalizedTicketPage ? "border-[#ff6070] bg-[#ff5364] text-white" : "border-white/10 bg-white/[0.05] text-slate-300 hover:border-[#ff6070]/70"}`}
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
        <EmptyState>Không có dữ liệu</EmptyState>
      )}
    </section>
  );

  const renderTicketDetailModal = () => {
    const booking = selectedBookingDetail;
    if (!booking) return null;

    const code = getBookingCode(booking);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(code)}`;
    const combos = booking.combos || [];
    const seats = getBookingSeatLabels(booking);
    const isPaid = booking.payment_status === "paid";

    return (
      <div className="fixed inset-0 z-[80] grid place-items-center bg-black/75 px-4 py-8 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`Chi tiết đơn ${code}`} onClick={() => setSelectedBookingDetail(null)}>
        <div className="max-h-[90vh] w-[min(620px,100%)] overflow-y-auto rounded-2xl border border-white/10 bg-[#101010] shadow-[0_30px_90px_rgba(0,0,0,0.65)]" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff5364]">Chi tiết đơn vé</p>
              <h2 className="mt-1 text-xl font-black text-white">{code}</h2>
            </div>
            <button className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-xl font-black text-white hover:bg-[#ff5364]" type="button" onClick={() => setSelectedBookingDetail(null)} aria-label="Đóng chi tiết">
              ×
            </button>
          </div>

          <div className="p-5 text-white">
            <div className="text-center">
              <div className={`mx-auto grid h-14 w-14 place-items-center rounded-full border text-3xl ${isPaid ? "border-emerald-400/30 bg-emerald-400/15 text-emerald-300" : "border-red-400/30 bg-red-400/15 text-red-200"}`}>
                {isPaid ? "✓" : "!"}
              </div>
              <h3 className="mt-3 text-2xl font-black">{isPaid ? "Đặt vé thành công!" : getBookingStatusLabel(booking)}</h3>
              <p className="mt-2 text-sm text-slate-400">{isPaid ? "Đưa mã này cho nhân viên soát vé tại rạp." : "Đơn này chưa có vé hợp lệ để soát vé."}</p>
            </div>

            <div className="mt-6 rounded-xl border border-white/10 bg-[#171717]">
              <div className="p-5">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#ff5364]">Vé xem phim</p>
                <h4 className="mt-1 text-2xl font-black text-white">{getBookingMovieTitle(booking)}</h4>
                <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
                  <p><span className="text-slate-500">Rạp:</span> <strong className="text-white">{getBookingCinemaName(booking)}</strong></p>
                  <p><span className="text-slate-500">Phòng:</span> <strong className="text-white">{getBookingRoomName(booking)}</strong></p>
                  <p><span className="text-slate-500">Suất:</span> <strong className="text-white">{getBookingShowtime(booking)}</strong></p>
                  <p><span className="text-slate-500">Ghế:</span> <strong className="text-white">{seats}</strong></p>
                  <p><span className="text-slate-500">Ngày đặt:</span> <strong className="text-white">{formatDateTime(booking.created_at)}</strong></p>
                  <p><span className="text-slate-500">Thanh toán:</span> <strong className="text-white">{getBookingPaymentProvider(booking)}</strong></p>
                </div>
              </div>

              <div className="border-t border-white/10 p-5">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Ghế đã đặt ({getBookingSeatCount(booking)})</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {seats.split(", ").filter(Boolean).map((seat) => (
                    <span className="rounded-md border border-[#ff5364]/30 bg-[#ff5364]/15 px-3 py-1 text-xs font-black text-[#ff8f99]" key={seat}>{seat}</span>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 border-t border-white/10 p-5 text-sm text-slate-300">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Dịch vụ đi kèm</p>
                  {combos.length ? (
                    <div className="mt-2 grid gap-2">
                      {combos.map((item) => (
                        <p className="flex justify-between gap-4" key={item._id || item.name}>
                          <span>{item.name || item.combo_id?.name} x {item.quantity}</span>
                          <strong className="text-slate-200">{currencyFormatter.format(Number(item.subtotal || 0))}</strong>
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-slate-500">Không có</p>
                  )}
                </div>
                <p><span className="text-slate-500">Voucher:</span> {getBookingVoucherText(booking)}</p>
              </div>

              <div className="border-t border-white/10 p-5 text-sm">
                <p className="flex justify-between gap-4 text-slate-400"><span>Tiền vé</span><strong className="text-slate-200">{currencyFormatter.format(getBookingTicketTotal(booking))}</strong></p>
                <p className="mt-2 flex justify-between gap-4 text-slate-400"><span>Dịch vụ đi kèm</span><strong className="text-slate-200">{currencyFormatter.format(getBookingComboTotal(booking))}</strong></p>
                <p className="mt-5 flex justify-between gap-4 text-base font-black text-white"><span>Tổng đã thanh toán</span><strong className="text-2xl text-[#ff5364]">{currencyFormatter.format(Number(booking.total_price || 0))}</strong></p>
              </div>

              {isPaid && (
                <div className="bg-white p-5 text-center">
                  <img className="mx-auto h-40 w-40 object-contain" src={qrUrl} alt={`QR vé ${code}`} />
                  <p className="mt-2 text-xs font-black text-black">Đưa mã này cho nhân viên soát vé</p>
                </div>
              )}
            </div>
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
      />
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
                    ? "border-[#ff6070] bg-[#ff5364] text-white"
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

  const renderPromotionsTab = () => {
    const rows = activePromotions.map((promotion, index) => (
      <tr key={promotion.slug}>
        <td className="whitespace-nowrap px-5 py-4">{index + 1}</td>
        <td className="px-5 py-4 font-bold text-white">
          <Link className="text-white no-underline hover:text-[#ff5364]" to={`/khuyen-mai/${promotion.slug}`}>
            {promotion.title}
          </Link>
        </td>
        <td className="px-5 py-4 text-slate-400">{promotion.summary}</td>
        <td className="whitespace-nowrap px-5 py-4 text-[#ff9aa5]">{promotion.category}</td>
        <td className="whitespace-nowrap px-5 py-4">Theo chương trình</td>
        <td className="whitespace-nowrap px-5 py-4">-</td>
        <td className="whitespace-nowrap px-5 py-4">{promotion.startDate}</td>
        <td className="whitespace-nowrap px-5 py-4">{promotion.endDate}</td>
      </tr>
    ));

    return (
      <section className="rounded-[28px] border border-white/10 bg-[#141923]/95 p-8">
        <AccountTable
          empty="Không có dữ liệu"
          headers={[
            "STT",
            "Chiến dịch voucher",
            "Mô tả",
            "Giá trị",
            "Giá trị đơn tối thiểu",
            "Số lượng vé tối thiểu",
            "Ngày bắt đầu",
            "Ngày kết thúc",
          ]}
        >
          {rows.length ? rows : null}
        </AccountTable>
      </section>
    );
  };

  const renderActiveTab = () => {
    if (activeTab === "member") return renderMemberTab();
    if (activeTab === "tickets") return renderTicketsTab();
    if (activeTab === "points") return renderPointsTab();
    if (activeTab === "vouchers") return renderVouchersTab();
    if (activeTab === "promotions") return renderPromotionsTab();
    return renderAccountTab();
  };

  return (
    <main className="mx-auto w-[min(1280px,calc(100%_-_56px))] py-10 max-sm:w-[calc(100%_-_28px)]">
      <h1 className="text-center text-3xl font-black text-white">Thông tin cá nhân</h1>

      <nav className="mt-10 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-2">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;

            return (
              <button
                className={`flex min-w-fit items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition ${
                  selected
                    ? "bg-gradient-to-r from-[#ff321d] to-[#7b4652] text-white shadow-[0_15px_35px_rgba(255,62,29,0.22)]"
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

      <div className="mt-5">{renderActiveTab()}</div>
      {renderTicketDetailModal()}
    </main>
  );
}

export default AccountPage;
