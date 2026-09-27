import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import path from "node:path";
import os from "node:os";
import { mkdtemp, rm } from "node:fs/promises";
import { uploadGiftImage, uploadVoucherImage } from "../src/middleware/giftUploadMiddleware.js";

for (const [folder, handler] of [["gifts", uploadGiftImage], ["vouchers", uploadVoucherImage]]) {
test(`${folder} image upload saves a readable image and rejects invalid or oversized files`, async () => {
  const previousDirectory = process.cwd();
  const directory = await mkdtemp(path.join(os.tmpdir(), "aura-gift-upload-"));
  process.chdir(directory);
  const app = express();
  app.post("/upload", handler);
  app.use("/uploads", express.static(path.join(directory, "uploads")));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const postImage = (bytes, name, type) => {
    const form = new FormData();
    form.append("image", new Blob([bytes], { type }), name);
    return fetch(`${base}/upload`, { method: "POST", body: form });
  };
  try {
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=", "base64");
    const uploaded = await postImage(png, "gift.png", "image/png");
    assert.equal(uploaded.status, 201);
    const result = await uploaded.json();
    assert.equal(new URL(result.data.image_url).pathname.startsWith(`/uploads/${folder}/`), true);
    const image = await fetch(result.data.image_url);
    assert.equal(image.status, 200);
    assert.deepEqual(Buffer.from(await image.arrayBuffer()), png);

    const invalid = await postImage("not an image", "fake.png", "image/png");
    assert.equal(invalid.status, 400);
    const oversized = await postImage(Buffer.alloc(5 * 1024 * 1024 + 1), "large.png", "image/png");
    assert.equal(oversized.status, 400);
    const missing = await fetch(`${base}/upload`, { method: "POST", body: new FormData() });
    assert.equal(missing.status, 400);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    process.chdir(previousDirectory);
    await rm(directory, { recursive: true, force: true });
  }
});
}
