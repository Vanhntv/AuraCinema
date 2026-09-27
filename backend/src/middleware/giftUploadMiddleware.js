import crypto from "node:crypto";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

const imageExtension = (buffer) => {
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return ".png";
  if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return ".jpg";
  if (["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString())) return ".gif";
  if (buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP") return ".webp";
  return null;
};

export const createImageUpload = ({ folder, prefix, saveError }) => (req, res) => {
  upload.single("image")(req, res, async (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.code === "LIMIT_FILE_SIZE" ? "Ảnh tối đa 5 MB." : "Không thể tải ảnh lên. Vui lòng chọn một file ảnh.",
      });
    }
    const extension = req.file && imageExtension(req.file.buffer);
    if (!extension) {
      return res.status(400).json({ success: false, message: "Chỉ chấp nhận ảnh JPG, PNG, WEBP hoặc GIF." });
    }
    try {
      const uploadRoot = path.resolve("uploads", folder);
      const filename = `${prefix}-${crypto.randomUUID()}${extension}`;
      await mkdir(uploadRoot, { recursive: true });
      await writeFile(path.join(uploadRoot, filename), req.file.buffer);
      return res.status(201).json({
        success: true,
        data: { image_url: `${req.protocol}://${req.get("host")}/uploads/${folder}/${filename}` },
      });
    } catch {
      return res.status(500).json({ success: false, message: saveError });
    }
  });
};

export const uploadGiftImage = createImageUpload({ folder: "gifts", prefix: "gift", saveError: "Không thể lưu ảnh quà tặng." });
export const uploadVoucherImage = createImageUpload({ folder: "vouchers", prefix: "voucher", saveError: "Không thể lưu ảnh chương trình." });
