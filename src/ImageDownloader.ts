import * as crypto from "node:crypto";
import * as fs from "node:fs";

const IMAGE_DIR = "images";

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/avif": "avif",
};

// Fallback for servers answering with a generic content-type
// (e.g. application/octet-stream)
const sniffExtension = (buffer: Buffer): string | undefined => {
  if (
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "png";
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    return "jpg";
  }
  if (buffer.subarray(0, 4).toString("latin1") === "GIF8") {
    return "gif";
  }
  if (
    buffer.subarray(0, 4).toString("latin1") === "RIFF" &&
    buffer.subarray(8, 12).toString("latin1") === "WEBP"
  ) {
    return "webp";
  }
  return undefined;
};

/**
 * Download an image and store it as `images/<sha256>.<ext>`.
 * Returns the repository-relative path of the saved file.
 */
export const downloadImage = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image (${response.status}): ${url}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const mime = response.headers.get("content-type")?.split(";")[0].trim() ?? "";
  const extension = EXTENSION_BY_MIME[mime] ?? sniffExtension(buffer);
  if (extension === undefined) {
    throw new Error(`Not an image (content-type: ${mime}): ${url}`);
  }
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  const filePath = `${IMAGE_DIR}/${hash}.${extension}`;
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
  fs.writeFileSync(filePath, buffer);
  return filePath;
};
