import path from "path";
import multer from "multer";

const MAX_POLICY_FILE_SIZE = 10 * 1024 * 1024;
const allowedExtensions = new Set([".docx", ".pdf"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_POLICY_FILE_SIZE, files: 1 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    if (!allowedExtensions.has(extension)) {
      const error = new Error("Chỉ hỗ trợ file .docx hoặc .pdf.");
      error.statusCode = 400;
      return callback(error);
    }
    return callback(null, true);
  },
});

export const uploadPolicyWordFile = (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (!error) return next();

    const message = error.code === "LIMIT_FILE_SIZE"
      ? "File chính sách không được vượt quá 10 MB."
      : error.message || "Không thể tải file chính sách.";

    return res.status(error.statusCode || 400).json({
      success: false,
      message,
    });
  });
};
