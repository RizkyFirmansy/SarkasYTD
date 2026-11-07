const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const YTDLP = process.env.YTDLP_PATH || "yt-dlp";

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/api/", rateLimit({ windowMs: 60_000, limit: 20 }));

function validateYouTubeUrl(raw) {
  let url;
  try { url = new URL(raw); } catch { throw new Error("URL tidak valid."); }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (!["youtube.com", "m.youtube.com", "youtu.be", "music.youtube.com"].includes(host)) {
    throw new Error("Masukkan URL YouTube yang valid.");
  }
  if (host === "youtu.be" && !url.pathname.slice(1)) throw new Error("ID video tidak ditemukan.");
  if (host.includes("youtube.com") && !url.pathname.startsWith("/watch") &&
      !url.pathname.startsWith("/shorts/") && !url.pathname.startsWith("/embed/")) {
    throw new Error("URL harus mengarah ke video YouTube.");
  }
  return url.toString();
}

function runYtDlp(args, timeoutMs = 120_000) {
  return new Promise((resolve, reject) => {
    const child = spawn(YTDLP, args, { windowsHide: true });
    let stdout = "", stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Proses terlalu lama. Coba lagi."));
    }, timeoutMs);
    child.stdout.on("data", d => stdout += d.toString());
    child.stderr.on("data", d => stderr += d.toString());
    child.on("error", err => { clearTimeout(timer); reject(new Error(
      `yt-dlp tidak ditemukan. Install yt-dlp terlebih dahulu. (${err.message})`
    )); });
    child.on("close", code => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(stderr.trim().split("\n").slice(-2).join(" ") || "Gagal memproses video."));
      resolve(stdout);
    });
  });
}

app.post("/api/info", async (req, res) => {
  try {
    const url = validateYouTubeUrl(req.body.url || "");
    const raw = await runYtDlp(["--no-warnings", "--skip-download", "--no-playlist", "--dump-single-json", url]);
    const data = JSON.parse(raw);
    res.json({
      id: data.id,
      title: data.title || "Untitled video",
      thumbnail: data.thumbnail || "",
      duration: data.duration || 0,
      uploader: data.uploader || "YouTube creator",
      webpage_url: data.webpage_url || url
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/download", async (req, res) => {
  let dir;
  try {
    const url = validateYouTubeUrl(req.body.url || "");
    const format = req.body.format === "mp3" ? "mp3" : "mp4";
    const quality = String(req.body.quality || (format === "mp3" ? "192" : "720"));
    const allowedVideo = ["360", "720", "1080"];
    const allowedAudio = ["128", "192", "320"];
    if (format === "mp4" && !allowedVideo.includes(quality)) throw new Error("Kualitas MP4 tidak valid.");
    if (format === "mp3" && !allowedAudio.includes(quality)) throw new Error("Kualitas MP3 tidak valid.");

    dir = fs.mkdtempSync(path.join(os.tmpdir(), "sarkas-"));
    const output = path.join(dir, `video-${crypto.randomBytes(5).toString("hex")}.%(ext)s`);
    const args = ["--no-warnings", "--no-playlist", "--no-part", "--restrict-filenames", "-o", output];

    if (format === "mp3") {
      args.push("-x", "--audio-format", "mp3", "--audio-quality", `${quality}K`);
    } else {
      args.push("-f", `bestvideo[height<=${quality}]+bestaudio/best[height<=${quality}]/best`, "--merge-output-format", "mp4");
    }
    args.push(url);

    await runYtDlp(args, 10 * 60_000);
    const files = fs.readdirSync(dir);
    const file = files.find(name => /\.(mp4|mp3|mkv|webm|m4a)$/i.test(name));
    if (!file) throw new Error("File hasil tidak ditemukan. Pastikan FFmpeg terpasang untuk penggabungan/konversi.");
    const fullPath = path.join(dir, file);
    const mime = file.toLowerCase().endsWith(".mp3") ? "audio/mpeg" : "video/mp4";
    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Disposition", `attachment; filename="${file.replace(/["\r\n]/g, "")}"`);
    const stream = fs.createReadStream(fullPath);
    stream.on("error", () => { if (!res.headersSent) res.status(500).end("Gagal membaca file."); });
    stream.on("close", () => fs.rm(dir, { recursive: true, force: true }, () => {}));
    stream.pipe(res);
  } catch (err) {
    if (dir) fs.rm(dir, { recursive: true, force: true }, () => {});
    if (!res.headersSent) res.status(400).json({ error: err.message });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true, app: "Sarkas YouTube Downloader" }));
app.listen(PORT, () => console.log(`Sarkas berjalan di http://localhost:${PORT}`));
