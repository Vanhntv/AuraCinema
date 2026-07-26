import fs from "fs";
import path from "path";
import crypto from "crypto";
import multer from "multer";

const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const uploadRoot = path.resolve("uploads", "combos");

if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadRoot);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `combo-${Date.now()}-${crypto.randomUUID()}${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedExtensions.has(ext) || !allowedMimeTypes.has(file.mimetype)) {
    const error = new Error("Chi chap nhan file jpg, jpeg, png, webp");
    error.statusCode = 400;
    return cb(error, false);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

const toPublicUploadPath = (filePath) =>
  `/${path.relative(process.cwd(), filePath).split(path.sep).join("/")}`;

export const uploadComboImage = (req, res, next) => {
  upload.single("image")(req, res, (error) => {
    if (error) {
      const uploadError = new Error(
        error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE"
          ? "File anh toi da 5MB"
          : error.message || "Upload anh khong thanh cong",
      );

      uploadError.statusCode = 400;

      if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        uploadError.message = "File anh toi da 5MB";
      }

      return next(uploadError);
    }

    if (req.file) {
      req.body.image = toPublicUploadPath(req.file.path);
    }

    next();
  });
};
