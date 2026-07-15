const Register = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-3xl rounded-3xl border border-gray-700 bg-[#14122B] p-8 shadow-2xl">
        {/* Nút đóng */}
        <button
          type="button"
          onClick={() => onClose?.()}
          className="absolute right-5 top-5 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-gray-700 text-white transition hover:bg-red-500"
        >
          ✕
        </button>

        <h2 className="text-3xl font-bold text-white">
          Đăng ký
        </h2>

        <p className="mt-2 text-sm text-gray-400">
          Tạo tài khoản mới để đặt vé nhanh hơn.
        </p>

        <form className="mt-8 space-y-5">
          {/* Họ - Tên */}
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="mb-2 block text-white">Họ</label>
              <input
                type="text"
                placeholder="Nhập họ"
                className="w-full rounded-xl border border-gray-700 bg-[#1D1B38] px-4 py-3 text-white outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-white">Tên</label>
              <input
                type="text"
                placeholder="Nhập tên"
                className="w-full rounded-xl border border-gray-700 bg-[#1D1B38] px-4 py-3 text-white outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="mb-2 block text-white">Email</label>
            <input
              type="email"
              placeholder="Nhập email"
              className="w-full rounded-xl border border-gray-700 bg-[#1D1B38] px-4 py-3 text-white outline-none focus:border-orange-500"
            />
          </div>

          {/* Số điện thoại */}
          <div>
            <label className="mb-2 block text-white">Số điện thoại</label>
            <input
              type="text"
              placeholder="Nhập số điện thoại"
              className="w-full rounded-xl border border-gray-700 bg-[#1D1B38] px-4 py-3 text-white outline-none focus:border-orange-500"
            />
          </div>

          {/* Mật khẩu */}
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="mb-2 block text-white">Mật khẩu</label>
              <input
                type="password"
                placeholder="Nhập mật khẩu"
                className="w-full rounded-xl border border-gray-700 bg-[#1D1B38] px-4 py-3 text-white outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-white">
                Xác nhận mật khẩu
              </label>
              <input
                type="password"
                placeholder="Nhập lại mật khẩu"
                className="w-full rounded-xl border border-gray-700 bg-[#1D1B38] px-4 py-3 text-white outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Nút đăng ký */}
          <button
            type="submit"
            className="w-full rounded-full bg-gradient-to-r from-red-500 to-orange-500 py-3 text-lg font-semibold text-white transition hover:opacity-90"
          >
            Đăng ký
          </button>

          <p className="text-center text-gray-400">
            Bạn đã có tài khoản?{" "}
            <button
              type="button"
              className="font-semibold text-orange-500 hover:underline"
            >
              Đăng nhập
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;