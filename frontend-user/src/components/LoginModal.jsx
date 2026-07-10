const LoginModal = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-md rounded-3xl border border-gray-700 bg-[#14122B] p-8 shadow-2xl">
        {/* Nút đóng */}
        <button
          type="button"
          onClick={() => onClose?.()}
          className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-gray-700 text-white transition hover:bg-red-500"
        >
          ✕
        </button>

        <h2 className="text-3xl font-bold text-white">
          Đăng nhập
        </h2>

        <p className="mt-2 text-sm text-gray-400">
          Đăng nhập để đặt vé và quản lý tài khoản của bạn.
        </p>

        <form className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-white font-medium">
              Email
            </label>

            <input
              type="email"
              placeholder="Nhập email"
              className="w-full rounded-xl border border-gray-700 bg-[#1D1B38] px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-white font-medium">
              Mật khẩu
            </label>

            <input
              type="password"
              placeholder="Nhập mật khẩu"
              className="w-full rounded-xl border border-gray-700 bg-[#1D1B38] px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-orange-500"
            />

            <div className="mt-2 text-right">
              <button
                type="button"
                className="text-sm text-orange-500 hover:underline"
              >
                Quên mật khẩu?
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-full bg-gradient-to-r from-red-500 to-orange-500 py-3 text-lg font-semibold text-white transition hover:opacity-90"
          >
            Đăng nhập
          </button>

          <p className="text-center text-gray-400">
            Bạn chưa có tài khoản?{" "}
            <button
              type="button"
              className="font-semibold text-orange-500 hover:underline"
            >
              Đăng ký
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;