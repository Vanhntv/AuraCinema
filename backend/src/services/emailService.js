const mailError = () => Object.assign(new Error("Email delivery unavailable"), {
  statusCode: 503,
  code: "EMAIL_DELIVERY_FAILED",
  publicMessage: "Chưa thể gửi email. Vui lòng thử gửi lại sau ít phút.",
});

export const assertEmailConfigured = (env = process.env) => {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) throw mailError();
};

// Never log provider requests/responses: they may contain addresses and OTPs.
export const sendOtpEmail = async ({ email, otp, purpose, requestId }, {
  env = process.env, fetchFn = globalThis.fetch,
} = {}) => {
  assertEmailConfigured(env);
  const action = purpose === "verification" ? "xác minh email" : "đặt lại mật khẩu";
  try {
    const response = await fetchFn("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": requestId,
      },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [email],
        subject: `AuraCinema — Mã ${action}`,
        text: `Mã ${action} của bạn là ${otp}. Mã có hiệu lực trong 10 phút và chỉ dùng một lần. Không chia sẻ mã này. Nếu bạn không yêu cầu, hãy bỏ qua email này.`,
        html: `<div lang="vi"><h1>AuraCinema</h1><p>Mã ${action} của bạn:</p><p style="font-size:32px;font-weight:700;letter-spacing:6px">${otp}</p><p>Mã có hiệu lực trong 10 phút và chỉ dùng một lần. Không chia sẻ mã này.</p><p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p></div>`,
      }),
    });
    if (!response.ok) throw mailError();
    const result = await response.json();
    if (!result.id) throw mailError();
    return { id: result.id };
  } catch {
    throw mailError();
  }
};
