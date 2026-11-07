const $ = id => document.getElementById(id);
const urlInput = $("videoUrl"), result = $("resultCard"), errorBox = $("errorBox");
let currentVideo = null, format = "mp4";

function showError(message) { errorBox.textContent = message; errorBox.style.display = "block"; }
function clearError() { errorBox.textContent = ""; errorBox.style.display = "none"; }
function duration(seconds) {
  const n = Number(seconds || 0), h = Math.floor(n / 3600), m = Math.floor(n % 3600 / 60), s = Math.floor(n % 60);
  return h ? `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}` : `${m}:${String(s).padStart(2,"0")}`;
}
function setQualityOptions() {
  $("qualitySelect").innerHTML = format === "mp4"
    ? '<option value="360">MP4 · 360p</option><option value="720" selected>MP4 · 720p</option><option value="1080">MP4 · 1080p</option>'
    : '<option value="128">MP3 · 128 kbps</option><option value="192" selected>MP3 · 192 kbps</option><option value="320">MP3 · 320 kbps</option>';
}
document.querySelectorAll(".format-tab").forEach(btn => btn.addEventListener("click", () => {
  format = btn.dataset.format;
  document.querySelectorAll(".format-tab").forEach(x => x.classList.toggle("active", x === btn));
  setQualityOptions();
}));

$("pasteBtn").addEventListener("click", async () => {
  try { urlInput.value = await navigator.clipboard.readText(); clearError(); }
  catch { showError("Clipboard tidak bisa diakses. Tempel link secara manual."); }
});
$("fetchBtn").addEventListener("click", fetchInfo);
urlInput.addEventListener("keydown", e => { if (e.key === "Enter") fetchInfo(); });

async function fetchInfo() {
  clearError();
  const url = urlInput.value.trim();
  if (!url) return showError("Masukkan link YouTube terlebih dahulu.");
  const btn = $("fetchBtn"); btn.disabled = true; btn.querySelector("span").textContent = "FETCHING...";
  try {
    const response = await fetch("/api/info", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({url}) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Tidak bisa mengambil informasi video.");
    currentVideo = { url, ...data };
    $("thumbnail").src = data.thumbnail;
    $("thumbnail").onerror = () => { $("thumbnail").src = ""; };
    $("videoTitle").textContent = data.title;
    $("uploader").textContent = data.uploader;
    $("duration").textContent = duration(data.duration);
    result.classList.remove("hidden");
    $("progressWrap").classList.add("hidden");
  } catch (err) { showError(err.message); }
  finally { btn.disabled = false; btn.querySelector("span").textContent = "FETCH VIDEO"; }
}

$("downloadBtn").addEventListener("click", async () => {
  if (!currentVideo) return showError("Fetch video terlebih dahulu.");
  clearError();
  const quality = $("qualitySelect").value, progress = $("progressWrap");
  progress.classList.remove("hidden"); $("progressText").textContent = "Memproses file di server...";
  $("progressPercent").textContent = "•••"; $("progressBar").style.width = "35%";
  const btn = $("downloadBtn"); btn.disabled = true; btn.textContent = "PROCESSING...";
  try {
    const response = await fetch("/api/download", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({url:currentVideo.url, format, quality}) });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Download gagal.");
    }
    $("progressText").textContent = "File siap — menyiapkan unduhan...";
    $("progressBar").style.width = "85%";
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = objectUrl;
    a.download = `${currentVideo.title.replace(/[^\w\- ]/g, "").slice(0,70) || "sarkas-video"}.${format}`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(objectUrl);
    $("progressBar").style.width = "100%"; $("progressPercent").textContent = "100%";
    $("progressText").textContent = "Selesai! File berhasil disiapkan.";
  } catch (err) { showError(err.message); progress.classList.add("hidden"); }
  finally { btn.disabled = false; btn.innerHTML = "↓ &nbsp; DOWNLOAD NOW"; }
});

// Ambient particle canvas
const canvas = $("particles"), ctx = canvas.getContext("2d");
let dots = [];
function resize() {
  canvas.width = innerWidth * devicePixelRatio; canvas.height = innerHeight * devicePixelRatio;
  ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
  dots = Array.from({length: Math.min(75, Math.floor(innerWidth/16))}, () => ({
    x:Math.random()*innerWidth,y:Math.random()*innerHeight,
    r:Math.random()*1.5+.3,v:Math.random()*.35+.08,a:Math.random()*.55+.15
  }));
}
function animate() {
  ctx.clearRect(0,0,innerWidth,innerHeight);
  for (const p of dots) {
    p.y -= p.v; if (p.y < -5) {p.y=innerHeight+5;p.x=Math.random()*innerWidth;}
    ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fillStyle=`rgba(112,220,255,${p.a})`;ctx.shadowBlur=10;ctx.shadowColor="#4cf4ef";ctx.fill();
  }
  requestAnimationFrame(animate);
}
addEventListener("resize",resize); resize(); animate();
