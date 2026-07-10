const config = window.ALBUM_CONFIG || {};
const demoSlides = [
  { id: "demo-1", name: "Mỗi ngày bên con là một món quà", url: "assets/demo-1.svg", color: "#d8a28e" },
  { id: "demo-2", name: "Tuổi thơ dịu dàng", url: "assets/demo-2.svg", color: "#9eb2a4" },
  { id: "demo-3", name: "Lớn lên trong yêu thương", url: "assets/demo-3.svg", color: "#b6a4bd" },
];

const $ = (selector) => document.querySelector(selector);
const photo = $("#photo");
const viewer = $("#viewer");
const playButton = $("#playButton");
const progress = $("#progress");
let slides = [];
let index = 0;
let playing = true;
let timer;
let touchStartX = 0;
let imageRequestId = 0;
const storageKey = "baby-album-reactions-v1";
let reactions = loadReactions();

function loadReactions() {
  try { return JSON.parse(localStorage.getItem(storageKey)) || {}; }
  catch { return {}; }
}
function saveReactions() { localStorage.setItem(storageKey, JSON.stringify(reactions)); }
function currentReaction() {
  const id = slides[index]?.id;
  if (!reactions[id]) reactions[id] = { loved: false, comments: [] };
  return reactions[id];
}

function driveMediaUrl(id) {
  return `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media&key=${encodeURIComponent(config.googleDriveApiKey)}`;
}

function driveThumbnailUrl(thumbnailLink) {
  if (!thumbnailLink) return "";
  return thumbnailLink.replace(/=s\d+(?:-[^#?]+)?(?=$|[?#])/, "=w1920");
}

async function loadDriveSlides() {
  if (!config.googleDriveApiKey || !config.googleDriveFolderId) return demoSlides;
  const query = `'${config.googleDriveFolderId}' in parents and mimeType contains 'image/' and trashed = false`;
  const params = new URLSearchParams({ q: query, fields: "files(id,name,imageMediaMetadata,createdTime,thumbnailLink)", orderBy: "createdTime desc", pageSize: "100", key: config.googleDriveApiKey });
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error("Không thể đọc album. Hãy kiểm tra API key và quyền chia sẻ thư mục Drive.");
  const data = await response.json();
  if (!data.files?.length) throw new Error("Thư mục Drive chưa có ảnh hoặc ảnh chưa được chia sẻ công khai.");
  $("#demoBadge").hidden = true;
  return data.files
    .sort((a, b) => new Date(b.createdTime || 0) - new Date(a.createdTime || 0))
    .map((file, i) => ({
    id: file.id,
    name: file.name.replace(/\.[^.]+$/, ""),
    url: driveThumbnailUrl(file.thumbnailLink) || driveMediaUrl(file.id),
    fallbackUrl: driveMediaUrl(file.id),
    color: ["#c89d88", "#8fa49a", "#aa98b1", "#bea96f"][i % 4],
    date: file.createdTime ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "long" }).format(new Date(file.createdTime)) : "",
  }));
}

function buildProgress() {
  progress.innerHTML = "";
  slides.forEach((slide, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.ariaLabel = `Xem ảnh ${i + 1}: ${slide.name}`;
    button.addEventListener("click", () => showSlide(i, true));
    progress.append(button);
  });
  $("#totalCount").textContent = String(slides.length).padStart(2, "0");
}

function updateProgress() {
  [...progress.children].forEach((item, i) => item.style.setProperty("--fill", i < index ? "100%" : i === index ? "45%" : "0%"));
}

function updateSocial() {
  const reaction = currentReaction();
  const heartButton = $("#heartButton");
  heartButton.classList.toggle("loved", reaction.loved);
  heartButton.setAttribute("aria-pressed", String(reaction.loved));
  heartButton.setAttribute("aria-label", reaction.loved ? "Bỏ tim ảnh này" : "Thả tim ảnh này");
  $("#heartCount").textContent = reaction.loved ? "1" : "0";
  $("#commentCount").textContent = reaction.comments.length;
  if ($("#commentDrawer").classList.contains("open")) renderComments();
}

function showSlide(nextIndex, userAction = false) {
  clearTimeout(timer);
  index = (nextIndex + slides.length) % slides.length;
  const slide = slides[index];
  const requestId = ++imageRequestId;
  const sources = [...new Set([slide.url, slide.fallbackUrl].filter(Boolean))];
  let sourceIndex = 0;
  let loadTimeout;
  photo.classList.remove("ready");
  const loadSource = () => {
    if (requestId !== imageRequestId) return;
    clearTimeout(loadTimeout);
    photo.src = sources[sourceIndex];
    loadTimeout = setTimeout(handleLoadError, 15000);
  };
  const handleLoadError = () => {
    if (requestId !== imageRequestId) return;
    clearTimeout(loadTimeout);
    sourceIndex += 1;
    if (sourceIndex < sources.length) {
      loadSource();
      return;
    }
    showError("Không tải được ảnh này. Đang chuyển sang ảnh tiếp theo…");
    timer = setTimeout(() => showSlide(index + 1), 800);
  };
  photo.onload = () => {
    if (requestId !== imageRequestId) return;
    clearTimeout(loadTimeout);
    photo.classList.add("ready");
    if (playing) timer = setTimeout(() => showSlide(index + 1), Number(config.slideDuration) || 6000);
  };
  photo.onerror = handleLoadError;
  photo.alt = `Ảnh ${slide.name}`;
  $("#captionTitle").innerHTML = slide.name.replace(/\s+(?=\S+$)/, "<br>");
  $("#captionMeta").textContent = slide.date || "Một album nhỏ đầy yêu thương";
  $("#currentIndex").textContent = String(index + 1).padStart(2, "0");
  $("#ambient").style.background = slide.color;
  updateProgress();
  updateSocial();
  preload(slides[(index + 1) % slides.length]?.url);
  loadSource();
  if (userAction && navigator.vibrate) navigator.vibrate(8);
}

function toggleHeart() {
  const reaction = currentReaction();
  reaction.loved = !reaction.loved;
  saveReactions(); updateSocial();
  if (reaction.loved && navigator.vibrate) navigator.vibrate([18, 35, 18]);
}

function openComments() {
  $("#commentDrawer").classList.add("open");
  $("#drawerBackdrop").classList.add("open");
  $("#commentDrawer").setAttribute("aria-hidden", "false");
  renderComments();
  setTimeout(() => $("#commentText").focus(), 250);
}
function closeComments() {
  $("#commentDrawer").classList.remove("open");
  $("#drawerBackdrop").classList.remove("open");
  $("#commentDrawer").setAttribute("aria-hidden", "true");
  $("#commentButton").focus();
}
function renderComments() {
  const comments = currentReaction().comments;
  const list = $("#commentList");
  if (!comments.length) {
    list.innerHTML = '<div class="empty-comments"><p><span>♡</span>Chưa có lời nhắn nào.<br>Hãy để lại một chút yêu thương nhé.</p></div>';
    return;
  }
  list.innerHTML = "";
  comments.forEach((comment) => {
    const item = document.createElement("article"); item.className = "comment-item";
    const author = document.createElement("p"); author.className = "comment-author"; author.textContent = comment.name;
    const content = document.createElement("p"); content.className = "comment-content"; content.textContent = comment.text;
    const time = document.createElement("time"); time.className = "comment-time"; time.dateTime = comment.createdAt;
    time.textContent = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(comment.createdAt));
    const remove = document.createElement("button"); remove.type = "button"; remove.className = "delete-comment"; remove.ariaLabel = "Xoá bình luận"; remove.textContent = "×";
    remove.addEventListener("click", () => deleteComment(comment.id));
    item.append(author, content, time, remove); list.append(item);
  });
  list.scrollTop = list.scrollHeight;
}
function deleteComment(id) {
  const reaction = currentReaction();
  reaction.comments = reaction.comments.filter((comment) => comment.id !== id);
  saveReactions(); renderComments(); updateSocial();
}

function preload(url) { if (url) { const image = new Image(); image.src = url; } }
function togglePlay() {
  playing = !playing;
  playButton.classList.toggle("paused", !playing);
  playButton.ariaLabel = playing ? "Tạm dừng trình chiếu" : "Tiếp tục trình chiếu";
  showSlide(index);
}
function showError(message) {
  const toast = $("#errorToast"); toast.textContent = message; toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 4500);
}

$("#prevButton").addEventListener("click", () => showSlide(index - 1, true));
$("#nextButton").addEventListener("click", () => showSlide(index + 1, true));
$("#heartButton").addEventListener("click", toggleHeart);
$("#commentButton").addEventListener("click", openComments);
$("#closeComments").addEventListener("click", closeComments);
$("#drawerBackdrop").addEventListener("click", closeComments);
$("#commentForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = $("#commentName").value.trim();
  const text = $("#commentText").value.trim();
  if (!name || !text) return;
  currentReaction().comments.push({ id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`, name, text, createdAt: new Date().toISOString() });
  saveReactions(); $("#commentText").value = ""; renderComments(); updateSocial();
});
playButton.addEventListener("click", togglePlay);
$("#fullscreenButton").addEventListener("click", () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.());
document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") showSlide(index - 1, true);
  if (event.key === "ArrowRight") showSlide(index + 1, true);
  if (event.key === " ") { event.preventDefault(); togglePlay(); }
  if (event.key === "Escape" && $("#commentDrawer").classList.contains("open")) closeComments();
});
viewer.addEventListener("touchstart", (event) => { touchStartX = event.changedTouches[0].clientX; }, { passive: true });
viewer.addEventListener("touchend", (event) => {
  const delta = event.changedTouches[0].clientX - touchStartX;
  if (Math.abs(delta) > 45) showSlide(index + (delta < 0 ? 1 : -1), true);
}, { passive: true });
document.addEventListener("visibilitychange", () => { clearTimeout(timer); if (!document.hidden && playing) showSlide(index); });

(async function init() {
  document.querySelector(".brand span:last-child").textContent = config.albumTitle || "Những ngày bé xinh";
  try { slides = await loadDriveSlides(); }
  catch (error) { slides = demoSlides; showError(error.message); }
  buildProgress(); showSlide(0);
})();
