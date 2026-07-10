const config = window.ALBUM_CONFIG || {};
const demoSlides = [
  { id: "demo-1", name: "Mỗi ngày bên con là một món quà", url: "assets/demo-1.svg", color: "#d8a28e" },
  { id: "demo-2", name: "Tuổi thơ dịu dàng", url: "assets/demo-2.svg", color: "#9eb2a4" },
  { id: "demo-3", name: "Lớn lên trong yêu thương", url: "assets/demo-3.svg", color: "#b6a4bd" },
];

const $ = (selector) => document.querySelector(selector);
const photo = $("#photo");
const video = $("#video");
const viewer = $("#viewer");
const playButton = $("#playButton");
const musicButton = $("#musicButton");
const progress = $("#progress");
let slides = [];
let index = 0;
let playing = true;
let timer;
let touchStartX = 0;
let imageRequestId = 0;
const storageKey = "baby-album-reactions-v1";
let reactions = loadReactions();
let audioContext;
let musicGain;
let musicTimer;
let musicStarted = false;
let musicPlaying = false;

const melody = [
  [523.25, 0], [659.25, .5], [783.99, 1], [659.25, 1.5],
  [587.33, 2], [698.46, 2.5], [880, 3], [698.46, 3.5],
  [659.25, 4], [783.99, 4.5], [1046.5, 5], [783.99, 5.5],
  [587.33, 6], [659.25, 6.5], [523.25, 7], [392, 7.5],
];

function scheduleMelody() {
  if (!audioContext || !musicGain) return;
  const startAt = audioContext.currentTime + .03;
  melody.forEach(([frequency, offset], noteIndex) => {
    const oscillator = audioContext.createOscillator();
    const noteGain = audioContext.createGain();
    oscillator.type = noteIndex % 4 === 0 ? "sine" : "triangle";
    oscillator.frequency.value = frequency;
    noteGain.gain.setValueAtTime(0, startAt + offset);
    noteGain.gain.linearRampToValueAtTime(.24, startAt + offset + .025);
    noteGain.gain.exponentialRampToValueAtTime(.001, startAt + offset + .42);
    oscillator.connect(noteGain).connect(musicGain);
    oscillator.start(startAt + offset);
    oscillator.stop(startAt + offset + .45);
  });
}

function updateMusicButton() {
  musicButton.classList.toggle("music-playing", musicPlaying);
  musicButton.setAttribute("aria-pressed", String(musicPlaying));
  musicButton.setAttribute("aria-label", musicPlaying ? "Tắt nhạc nền" : "Bật nhạc nền");
}

async function startMusic() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) throw new Error("Trình duyệt không hỗ trợ Web Audio");
    if (!audioContext) {
      audioContext = new AudioContext();
      musicGain = audioContext.createGain();
      musicGain.gain.value = .42;
      musicGain.connect(audioContext.destination);
    }
    await audioContext.resume();
    if (audioContext.state !== "running") throw new Error("Trình duyệt đang chặn âm thanh");
    musicGain.gain.cancelScheduledValues(audioContext.currentTime);
    musicGain.gain.setValueAtTime(.42, audioContext.currentTime);
    musicPlaying = true;
    updateMusicButton();
    if (!musicStarted) {
      musicStarted = true;
      scheduleMelody();
      musicTimer = setInterval(scheduleMelody, 8000);
    }
  } catch {
    musicPlaying = false;
    updateMusicButton();
    showError("Không thể phát nhạc. Hãy bật âm lượng thiết bị rồi chạm lại nút nốt nhạc.");
  }
}

function stopMusic() {
  if (audioContext && musicGain) {
    musicGain.gain.cancelScheduledValues(audioContext.currentTime);
    musicGain.gain.setTargetAtTime(0, audioContext.currentTime, .04);
    const contextToClose = audioContext;
    setTimeout(() => contextToClose.close(), 140);
  }
  clearInterval(musicTimer);
  musicTimer = undefined;
  musicStarted = false;
  audioContext = undefined;
  musicGain = undefined;
  musicPlaying = false;
  updateMusicButton();
}

function toggleMusic() {
  if (musicPlaying) stopMusic();
  else startMusic();
}

function startMusicOnFirstInteraction(event) {
  if (event.target instanceof Element && event.target.closest("#musicButton")) return;
  document.removeEventListener("pointerdown", startMusicOnFirstInteraction);
  document.removeEventListener("keydown", startMusicOnFirstInteraction);
  startMusic();
}

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

function preferredImageWidth(originalWidth) {
  const frameWidth = viewer?.clientWidth || window.innerWidth || 1280;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const configuredMax = Number(config.maxImageWidth) || 1600;
  const connectionMax = navigator.connection?.saveData ? 960 : configuredMax;
  const targetWidth = Math.max(640, Math.ceil(frameWidth * pixelRatio / 160) * 160);
  return Math.min(targetWidth, connectionMax, Number(originalWidth) || connectionMax);
}

function driveThumbnailUrl(thumbnailLink, originalWidth) {
  if (!thumbnailLink) return "";
  const width = preferredImageWidth(originalWidth);
  return thumbnailLink.replace(/=[^#?]+(?=$|[?#])/, `=w${width}`);
}

async function loadDriveSlides() {
  if (!config.googleDriveApiKey || !config.googleDriveFolderId) return demoSlides;
  const query = `'${config.googleDriveFolderId}' in parents and (mimeType contains 'image/' or mimeType contains 'video/') and trashed = false`;
  const params = new URLSearchParams({ q: query, fields: "files(id,name,mimeType,imageMediaMetadata,videoMediaMetadata,createdTime,thumbnailLink)", orderBy: "createdTime desc", pageSize: "100", key: config.googleDriveApiKey });
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error("Không thể đọc album. Hãy kiểm tra API key và quyền chia sẻ thư mục Drive.");
  const data = await response.json();
  if (!data.files?.length) throw new Error("Thư mục Drive chưa có ảnh/video hoặc chưa được chia sẻ công khai.");
  $("#demoBadge").hidden = true;
  return data.files
    .sort((a, b) => new Date(b.createdTime || 0) - new Date(a.createdTime || 0))
    .map((file, i) => ({
    id: file.id,
    name: file.name.replace(/\.[^.]+$/, ""),
    type: file.mimeType?.startsWith("video/") ? "video" : "image",
    url: file.mimeType?.startsWith("video/") ? driveMediaUrl(file.id) : driveThumbnailUrl(file.thumbnailLink, file.imageMediaMetadata?.width) || driveMediaUrl(file.id),
    fallbackUrl: file.mimeType?.startsWith("video/") ? "" : driveMediaUrl(file.id),
    poster: file.mimeType?.startsWith("video/") ? driveThumbnailUrl(file.thumbnailLink, file.videoMediaMetadata?.width) : "",
    color: ["#c89d88", "#8fa49a", "#aa98b1", "#bea96f"][i % 4],
    date: file.createdTime ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "long" }).format(new Date(file.createdTime)) : "",
  }));
}

function buildProgress() {
  progress.innerHTML = "";
  slides.forEach((slide, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.ariaLabel = `Xem ${slide.type === "video" ? "video" : "ảnh"} ${i + 1}: ${slide.name}`;
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
  let loadTimeout;

  photo.onload = null;
  photo.onerror = null;
  photo.classList.remove("ready");
  video.pause();
  video.onloadeddata = null;
  video.onerror = null;
  video.onended = null;
  video.classList.remove("active");
  video.removeAttribute("src");
  video.removeAttribute("poster");
  video.load();

  $("#captionTitle").innerHTML = slide.name.replace(/\s+(?=\S+$)/, "<br>");
  $("#captionMeta").textContent = slide.type === "video" ? `${slide.date || "Một video nhỏ đầy yêu thương"} • Chạm biểu tượng loa để bật tiếng` : slide.date || "Một album nhỏ đầy yêu thương";
  $("#currentIndex").textContent = String(index + 1).padStart(2, "0");
  $("#ambient").style.background = slide.color;
  updateProgress();
  updateSocial();

  const handleMediaError = (label) => {
    if (requestId !== imageRequestId) return;
    clearTimeout(loadTimeout);
    showError(`Không tải được ${label} này. Đang chuyển sang mục tiếp theo…`);
    timer = setTimeout(() => showSlide(index + 1), 800);
  };

  if (slide.type === "video") {
    video.classList.add("active");
    video.muted = true;
    video.poster = slide.poster || "";
    video.src = slide.url;
    video.onloadeddata = () => {
      if (requestId !== imageRequestId) return;
      clearTimeout(loadTimeout);
      if (playing) video.play().catch(() => showError("Chạm nút phát trên video để bắt đầu xem."));
    };
    video.onerror = () => handleMediaError("video");
    video.onended = () => { if (playing && requestId === imageRequestId) showSlide(index + 1); };
    loadTimeout = setTimeout(() => handleMediaError("video"), 20000);
  } else {
    const sources = [...new Set([slide.url, slide.fallbackUrl].filter(Boolean))];
    let sourceIndex = 0;
    const loadSource = () => {
      if (requestId !== imageRequestId) return;
      clearTimeout(loadTimeout);
      photo.src = sources[sourceIndex];
      loadTimeout = setTimeout(handleImageError, 15000);
    };
    const handleImageError = () => {
      if (requestId !== imageRequestId) return;
      clearTimeout(loadTimeout);
      sourceIndex += 1;
      if (sourceIndex < sources.length) return loadSource();
      handleMediaError("ảnh");
    };
    photo.onload = () => {
      if (requestId !== imageRequestId) return;
      clearTimeout(loadTimeout);
      photo.classList.add("ready");
      if (playing) timer = setTimeout(() => showSlide(index + 1), Number(config.slideDuration) || 6000);
    };
    photo.onerror = handleImageError;
    photo.alt = `Ảnh ${slide.name}`;
    loadSource();
  }

  const nextSlide = slides[(index + 1) % slides.length];
  if (nextSlide?.type !== "video") preload(nextSlide?.url);
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
  if (slides[index]?.type === "video") {
    if (playing) video.play().catch(() => showError("Chạm nút phát trên video để tiếp tục xem."));
    else video.pause();
  } else {
    showSlide(index);
  }
}
function showError(message) {
  const toast = $("#errorToast"); toast.textContent = message; toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 4500);
}

function registerImageCache() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    const workerUrl = new URL("sw.js", import.meta.url);
    navigator.serviceWorker.register(workerUrl, { scope: "./" }).catch(() => {
      // Album vẫn hoạt động bình thường nếu trình duyệt chặn Service Worker.
    });
  });
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
musicButton.addEventListener("click", toggleMusic);
document.addEventListener("pointerdown", startMusicOnFirstInteraction);
document.addEventListener("keydown", startMusicOnFirstInteraction);
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
document.addEventListener("visibilitychange", () => {
  clearTimeout(timer);
  if (slides[index]?.type === "video") {
    if (document.hidden) video.pause();
    else if (playing) video.play().catch(() => {});
  } else if (!document.hidden && playing) {
    showSlide(index);
  }
});

(async function init() {
  registerImageCache();
  document.querySelector(".brand span:last-child").textContent = config.albumTitle || "Những ngày bé xinh";
  try { slides = await loadDriveSlides(); }
  catch (error) { slides = demoSlides; showError(error.message); }
  buildProgress(); showSlide(0);
})();
