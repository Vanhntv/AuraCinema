import { useEffect, useMemo, useState } from "react";
import { changePassword, updateProfile } from "../api/authApi";
import { getMyBookings } from "../services/bookingService";
import { useAuth } from "../hooks/useAuth";

const tierTargets = {
  member: { label: "Member", next: "VIP", target: 3000000 },
  vip: { label: "VIP", next: "VVIP", target: 10000000 },
  vvip: { label: "VVIP", next: null, target: 10000000 },
};

const genderLabels = {
  male: "Nam",
  female: "Nu",
  other: "Khac",
};

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const formatDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const formatDateTime = (value) => {
  if (!value) return "Chua cap nhat";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chua cap nhat";
  return date.toLocaleString("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const getBookingStatusGroup = (booking) => {
  if (booking.status === "cancelled") return "cancelled";

  const endTime = booking.showtime_id?.end_time || booking.showtime_id?.start_time;
  if (endTime && new Date(endTime) < new Date()) return "past";
  return "upcoming";
};

function AccountPage() {
  const { user, logout, refreshProfile } = useAuth();
  const [profileForm, setProfileForm] = useState({
    full_name: "",
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
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [bookingsError, setBookingsError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(true);

  useEffect(() => {
    if (!user) return;

    setProfileForm({
      full_name: user.full_name || "",
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
          setBookingsError(error.response?.data?.message || "Khong the tai lich su dat ve.");
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

  const groupedBookings = useMemo(() => {
    return bookings.reduce(
      (groups, booking) => {
        groups[getBookingStatusGroup(booking)].push(booking);
        return groups;
      },
      { upcoming: [], past: [], cancelled: [] },
    );
  }, [bookings]);

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

    if (!profileForm.full_name.trim()) {
      setProfileError("Ho ten khong duoc de trong.");
      return;
    }

    if (profileForm.birth_date && new Date(profileForm.birth_date) > new Date()) {
      setProfileError("Ngay sinh khong the lon hon ngay hien tai.");
      return;
    }

    try {
      setSavingProfile(true);
      await updateProfile({
        full_name: profileForm.full_name,
        birth_date: profileForm.birth_date || null,
        gender: profileForm.gender || null,
        address: profileForm.address,
        avatar: profileForm.avatar,
      });
      await refreshProfile();
      setProfileMessage("Cap nhat thong tin thanh cong.");
    } catch (error) {
      setProfileError(error.response?.data?.message || "Cap nhat thong tin that bai.");
    } finally {
      setSavingProfile(false);
    }
  };

  const submitPassword = async (event) => {
    event.preventDefault();
    setPasswordMessage("");
    setPasswordError("");

    if (passwordForm.password.length < 8 || !/[A-Z]/.test(passwordForm.password) || !/\d/.test(passwordForm.password)) {
      setPasswordError("Mat khau moi phai co it nhat 8 ky tu, gom chu hoa va so.");
      return;
    }

    if (passwordForm.password !== passwordForm.confirm_password) {
      setPasswordError("Mat khau xac nhan khong khop.");
      return;
    }

    try {
      setSavingPassword(true);
      await changePassword(passwordForm);
      setPasswordMessage("Doi mat khau thanh cong. Vui long dang nhap lai.");
      setPasswordForm({
        current_password: "",
        password: "",
        confirm_password: "",
      });
      window.setTimeout(logout, 1200);
    } catch (error) {
      setPasswordError(error.response?.data?.message || "Doi mat khau that bai.");
    } finally {
      setSavingPassword(false);
    }
  };

  const renderBookingList = (items, emptyText) => {
    if (!items.length) {
      return <p className="rounded-2xl bg-white/[0.03] px-4 py-3 text-sm text-slate-400">{emptyText}</p>;
    }

    return (
      <div className="grid gap-3">
        {items.map((booking) => (
          <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4" key={booking._id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 className="text-base font-black text-white">
                  {booking.showtime_id?.movie_id?.title || booking.showtime_id?.movieTitle || "Ve xem phim"}
                </h4>
                <p className="mt-1 text-sm text-slate-400">
                  Ma dat ve: <span className="text-slate-200">{booking.booking_code || booking._id}</span>
                </p>
              </div>
              <strong className="text-[#ff9aa5]">{currencyFormatter.format(Number(booking.total_price || 0))}</strong>
            </div>
            <div className="mt-3 grid gap-2 text-sm text-slate-300 md:grid-cols-2">
              <p>Thoi gian: {formatDateTime(booking.showtime_id?.start_time)}</p>
              <p>Ghe: {booking.showtime_seat_ids?.map((seat) => `${seat.seat_id?.seat_row || ""}${seat.seat_id?.seat_number || ""}`).filter(Boolean).join(", ") || "Chua co thong tin"}</p>
              <p>Phong: {booking.showtime_id?.room_id?.name || "Chua co thong tin"}</p>
              <p>Trang thai: {booking.status || "confirmed"}</p>
            </div>
          </article>
        ))}
      </div>
    );
  };

  return (
    <main className="mx-auto grid w-[min(1180px,calc(100%_-_40px))] gap-7 py-8 max-sm:w-[calc(100%_-_28px)]">
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <div className="flex flex-wrap items-center gap-5">
          <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#ff5364] to-[#f97316] text-3xl font-black text-white">
            {user?.avatar ? <img alt={user.full_name || "Avatar"} className="h-full w-full object-cover" src={user.avatar} /> : (user?.full_name || user?.email || "U").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#ff6070]">Tai khoan cua toi</p>
            <h1 className="mt-1 text-3xl font-black text-white">{user?.full_name || "Nguoi dung AuraCinema"}</h1>
            <p className="mt-1 text-slate-400">{user?.email}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-7 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-7">
          <section className="rounded-3xl border border-white/10 bg-[#141b26] p-6">
            <h2 className="text-xl font-black text-white">Thong tin ca nhan</h2>
            <div className="mt-5 grid gap-4 text-sm text-slate-300 md:grid-cols-2">
              <p><span className="text-slate-500">Ho ten:</span> {user?.full_name || "Chua cap nhat"}</p>
              <p><span className="text-slate-500">Email:</span> {user?.email}</p>
              <p><span className="text-slate-500">So dien thoai:</span> {user?.phone || "Chua cap nhat"}</p>
              <p><span className="text-slate-500">Ngay sinh:</span> {user?.birth_date ? new Date(user.birth_date).toLocaleDateString("vi-VN") : "Chua cap nhat"}</p>
              <p><span className="text-slate-500">Gioi tinh:</span> {genderLabels[user?.gender] || "Chua cap nhat"}</p>
              <p><span className="text-slate-500">Dia chi:</span> {user?.address || "Chua cap nhat"}</p>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-[#141b26] p-6">
            <h2 className="text-xl font-black text-white">Cap nhat thong tin</h2>
            <p className="mt-2 text-sm text-slate-400">Email, so dien thoai, diem thuong va hang thanh vien khong the tu sua tai day.</p>
            <form className="mt-5 grid gap-4 md:grid-cols-2" noValidate onSubmit={submitProfile}>
              {profileMessage && <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200 md:col-span-2">{profileMessage}</div>}
              {profileError && <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200 md:col-span-2">{profileError}</div>}

              <label className="grid gap-2 text-sm font-bold text-white md:col-span-2">
                Ho ten
                <input className="rounded-xl border border-white/10 bg-[#1d2633] px-4 py-3 text-white outline-none focus:border-[#ff6070]" name="full_name" onChange={handleProfileChange} value={profileForm.full_name} />
              </label>
              <label className="grid gap-2 text-sm font-bold text-white">
                Ngay sinh
                <input className="rounded-xl border border-white/10 bg-[#1d2633] px-4 py-3 text-white outline-none focus:border-[#ff6070]" name="birth_date" onChange={handleProfileChange} type="date" value={profileForm.birth_date} />
              </label>
              <label className="grid gap-2 text-sm font-bold text-white">
                Gioi tinh
                <select className="rounded-xl border border-white/10 bg-[#1d2633] px-4 py-3 text-white outline-none focus:border-[#ff6070]" name="gender" onChange={handleProfileChange} value={profileForm.gender}>
                  <option value="">Chua cap nhat</option>
                  <option value="male">Nam</option>
                  <option value="female">Nu</option>
                  <option value="other">Khac</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-bold text-white md:col-span-2">
                Dia chi
                <input className="rounded-xl border border-white/10 bg-[#1d2633] px-4 py-3 text-white outline-none focus:border-[#ff6070]" name="address" onChange={handleProfileChange} placeholder="Nhap dia chi" value={profileForm.address} />
              </label>
              <label className="grid gap-2 text-sm font-bold text-white md:col-span-2">
                Avatar URL
                <input className="rounded-xl border border-white/10 bg-[#1d2633] px-4 py-3 text-white outline-none focus:border-[#ff6070]" name="avatar" onChange={handleProfileChange} placeholder="https://..." value={profileForm.avatar} />
              </label>
              <button className="h-12 rounded-full bg-gradient-to-b from-[#ff6f7b] to-[#ff5364] px-6 font-extrabold text-white disabled:opacity-60 md:col-span-2" disabled={savingProfile} type="submit">
                {savingProfile ? "Dang luu..." : "Luu thong tin"}
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-white/10 bg-[#141b26] p-6">
            <h2 className="text-xl font-black text-white">Doi mat khau</h2>
            <form className="mt-5 grid gap-4" noValidate onSubmit={submitPassword}>
              {passwordMessage && <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{passwordMessage}</div>}
              {passwordError && <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{passwordError}</div>}
              <label className="grid gap-2 text-sm font-bold text-white">
                Mat khau hien tai
                <input className="rounded-xl border border-white/10 bg-[#1d2633] px-4 py-3 text-white outline-none focus:border-[#ff6070]" name="current_password" onChange={handlePasswordChange} type="password" value={passwordForm.current_password} />
              </label>
              <label className="grid gap-2 text-sm font-bold text-white">
                Mat khau moi
                <input className="rounded-xl border border-white/10 bg-[#1d2633] px-4 py-3 text-white outline-none focus:border-[#ff6070]" name="password" onChange={handlePasswordChange} type="password" value={passwordForm.password} />
              </label>
              <label className="grid gap-2 text-sm font-bold text-white">
                Xac nhan mat khau moi
                <input className="rounded-xl border border-white/10 bg-[#1d2633] px-4 py-3 text-white outline-none focus:border-[#ff6070]" name="confirm_password" onChange={handlePasswordChange} type="password" value={passwordForm.confirm_password} />
              </label>
              <button className="h-12 rounded-full border border-white/10 bg-white/[0.05] px-6 font-extrabold text-white hover:border-[#ff6070] disabled:opacity-60" disabled={savingPassword} type="submit">
                {savingPassword ? "Dang doi..." : "Doi mat khau"}
              </button>
            </form>
          </section>
        </div>

        <aside className="grid content-start gap-7">
          <section className="rounded-3xl border border-white/10 bg-[#141b26] p-6">
            <h2 className="text-xl font-black text-white">Hang thanh vien</h2>
            <div className="mt-5 rounded-2xl bg-white/[0.04] p-4">
              <p className="text-sm text-slate-400">Cap hien tai</p>
              <strong className="mt-1 block text-2xl text-[#ff9aa5]">{loyalty.label}</strong>
              <p className="mt-3 text-sm text-slate-300">Diem thuong: <strong>{Number(user?.reward_points || 0).toLocaleString("vi-VN")}</strong></p>
              <p className="mt-1 text-sm text-slate-300">Tong chi tieu: <strong>{currencyFormatter.format(loyalty.spent)}</strong></p>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-black/30">
                <div className="h-full rounded-full bg-gradient-to-r from-[#ff5364] to-[#f97316]" style={{ width: `${loyalty.progress}%` }} />
              </div>
              <p className="mt-3 text-xs text-slate-400">
                {loyalty.next ? `Can chi tieu them ${currencyFormatter.format(loyalty.remaining)} de len ${loyalty.next}.` : "Ban da o hang cao nhat."}
              </p>
            </div>
          </section>
        </aside>
      </section>

      <section className="rounded-3xl border border-white/10 bg-[#141b26] p-6">
        <h2 className="text-xl font-black text-white">Lich su dat ve</h2>
        {bookingsError && <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{bookingsError}</div>}
        {loadingBookings ? (
          <p className="mt-4 text-sm text-slate-400">Dang tai lich su dat ve...</p>
        ) : (
          <div className="mt-5 grid gap-6">
            <div>
              <h3 className="mb-3 text-base font-black text-white">Sap chieu</h3>
              {renderBookingList(groupedBookings.upcoming, "Chua co ve sap chieu.")}
            </div>
            <div>
              <h3 className="mb-3 text-base font-black text-white">Da xem</h3>
              {renderBookingList(groupedBookings.past, "Chua co ve da xem.")}
            </div>
            <div>
              <h3 className="mb-3 text-base font-black text-white">Da huy</h3>
              {renderBookingList(groupedBookings.cancelled, "Chua co ve da huy.")}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export default AccountPage;
