import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { execFileSync } from "node:child_process";

const IMAGE_DIR = "images";

// Zenn rejects deploys containing files larger than 3MB
const MAX_FILE_SIZE = 3 * 1024 * 1024;

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

const isMp4 = (buffer: Buffer, mime: string): boolean => {
  if (mime === "video/mp4") {
    return true;
  }
  if (buffer.subarray(4, 8).toString("latin1") === "ftyp") {
    // A "qt" brand means QuickTime (.mov), which is not supported
    return buffer.subarray(8, 12).toString("latin1").trim() !== "qt";
  }
  return false;
};

// Google Drive links pasted into Notion point at the HTML viewer page;
// rewrite them to the direct-download endpoint.
const normalizeUrl = (url: string): string => {
  const driveId =
    url.match(/drive\.google\.com\/file\/d\/([^/?#]+)/)?.[1] ??
    url.match(/drive\.google\.com\/(?:open|uc)\?[^#]*id=([^&#]+)/)?.[1];
  if (driveId !== undefined) {
    return `https://drive.google.com/uc?export=download&id=${driveId}`;
  }
  return url;
};

const fetchMedia = async (url: string): Promise<{ buffer: Buffer; mime: string }> => {
  const response = await fetch(normalizeUrl(url));
  if (!response.ok) {
    throw new Error(`Failed to download media (${response.status}): ${url}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const mime = response.headers.get("content-type")?.split(";")[0].trim() ?? "";
  if (mime === "text/html") {
    throw new Error(
      `Got an HTML page instead of media — is the file shared publicly ("anyone with the link")?: ${url}`,
    );
  }
  return { buffer, mime };
};

const saveImage = (buffer: Buffer, extension: string, url: string): string => {
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(
      `Image exceeds 3MB (${(buffer.length / 1024 / 1024).toFixed(1)}MB): ${url}`,
    );
  }
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  const filePath = `${IMAGE_DIR}/${hash}.${extension}`;
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
  fs.writeFileSync(filePath, buffer);
  return filePath;
};

// Compression presets tried in order until the result fits into Zenn's
// 3MB file size limit
const WEBP_PRESETS = [
  { fps: 10, width: 720, quality: 60 },
  { fps: 8, width: 560, quality: 50 },
  { fps: 5, width: 420, quality: 40 },
];

// Convert an mp4 to an animated webp named after the sha256 of the source,
// skipping the (slow) conversion when the file is already there.
const convertMp4ToWebp = (buffer: Buffer, url: string): string => {
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  const filePath = `${IMAGE_DIR}/${hash}.webp`;
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
  if (fs.existsSync(filePath)) {
    return filePath;
  }
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "zenn-video-"));
  const tmpFile = path.join(tmpDir, "video.mp4");
  const tmpOut = path.join(tmpDir, "video.webp");
  try {
    fs.writeFileSync(tmpFile, buffer);
    for (const preset of WEBP_PRESETS) {
      execFileSync("ffmpeg", [
        "-y",
        "-loglevel",
        "error",
        "-i",
        tmpFile,
        "-vf",
        `fps=${preset.fps},scale='min(${preset.width},iw)':-2:flags=lanczos`,
        "-an",
        "-c:v",
        "libwebp",
        "-loop",
        "0",
        "-quality",
        `${preset.quality}`,
        tmpOut,
      ]);
      if (fs.statSync(tmpOut).size <= MAX_FILE_SIZE) {
        fs.copyFileSync(tmpOut, filePath);
        return filePath;
      }
    }
    throw new Error(
      `Converted webp exceeds 3MB even at the lowest preset (${(
        fs.statSync(tmpOut).size /
        1024 /
        1024
      ).toFixed(1)}MB) — use a shorter video: ${url}`,
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
};

/**
 * Download an image — or an mp4, which Notion's API only lets us attach as
 * an image block — and store it as `images/<sha256>.<ext>`. Images are kept
 * as-is while mp4s are converted to an animated webp.
 * Returns the repository-relative path of the saved file.
 */
export const downloadMedia = async (url: string): Promise<string> => {
  const { buffer, mime } = await fetchMedia(url);
  if (isMp4(buffer, mime)) {
    return convertMp4ToWebp(buffer, url);
  }
  const extension = EXTENSION_BY_MIME[mime] ?? sniffExtension(buffer);
  if (extension === undefined) {
    throw new Error(
      `Unsupported media, only images and mp4 are supported (content-type: ${mime}): ${url}`,
    );
  }
  return saveImage(buffer, extension, url);
};
