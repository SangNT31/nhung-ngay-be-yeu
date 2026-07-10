const config = window.ALBUM_CONFIG || {};
const demoSlides = [
  { id: "demo-1", name: "Mỗi ngày bên con là một món quà", url: "assets/demo-1.svg", color: "#d8a28e" },
  { id: "demo-2", name: "Tuổi thơ dịu dàng", url: "assets/demo-2.svg", color: "#9eb2a4" },
  { id: "demo-3", name: "Lớn lên trong yêu thương", url: "assets/demo-3.svg", color: "#b6a4bd" },
];

const $ = (selector) => document.querySelector(selector);
let photo = $("#photo");
let photoBuffer = $("#photoBuffer");
const video = $("#video");
const viewer = $("#viewer");
const slideFrame = $(".slide-frame");
const playButton = $("#playButton");
const musicButton = $("#musicButton");
const soundPrompt = $("#soundPrompt");
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
let musicPlaying = false;
let trackIndex = 0;

const tracks = [
  { name: "Giấc mơ kẹo ngọt", tempo: .5, notes: [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880, 698.46, 659.25, 783.99, 1046.5, 783.99, 587.33, 659.25, 523.25, 392] },
  { name: "Vườn sao nhỏ", tempo: .56, notes: [392, 493.88, 587.33, 659.25, 587.33, 493.88, 440, 523.25, 659.25, 783.99, 659.25, 523.25, 493.88, 440, 392, 329.63] },
  { name: "Ngày nắng dịu dàng", tempo: .46, notes: [440, 554.37, 659.25, 739.99, 659.25, 554.37, 493.88, 587.33, 698.46, 880, 698.46, 587.33, 554.37, 493.88, 440, 369.99] },
];

function scheduleNote(frequency, startAt, duration, type, volume) {
  const oscillator = audioContext.createOscillator();
  const noteGain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  noteGain.gain.setValueAtTime(0, startAt);
  noteGain.gain.linearRampToValueAtTime(volume, startAt + .025);
  noteGain.gain.exponentialRampToValueAtTime(.001, startAt + duration);
  oscillator.connect(noteGain).connect(musicGain);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + .04);
}

function scheduleTrack() {
  if (!audioContext || !musicGain) return;
  const track = tracks[trackIndex % tracks.length];
  const startAt = audioContext.currentTime + .03;
  track.notes.forEach((frequency, noteIndex) => {
    const noteAt = startAt + noteIndex * track.tempo;
    scheduleNote(frequency, noteAt, track.tempo * .86, noteIndex % 4 === 0 ? "sine" : "triangle", .2);
    if (noteIndex % 4 === 0) scheduleNote(frequency / 2, noteAt, track.tempo * 3.2, "sine", .055);
  });
  musicButton.title = `Đang phát: ${track.name}`;
  trackIndex = (trackIndex + 1) % tracks.length;
  musicTimer = setTimeout(scheduleTrack, track.notes.length * track.tempo * 1000);
}

function updateMusicButton() {
  musicButton.classList.toggle("music-playing", musicPlaying);
  musicButton.setAttribute("aria-pressed", String(musicPlaying));
  musicButton.setAttribute("aria-label", musicPlaying ? "Tắt nhạc nền" : "Bật nhạc nền");
}

async function startMusic({ silentFailure = false } = {}) {
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
    soundPrompt.hidden = true;
    updateMusicButton();
    if (!musicTimer) scheduleTrack();
  } catch {
    musicPlaying = false;
    updateMusicButton();
    soundPrompt.hidden = false;
    if (!silentFailure) showError("Trình duyệt đang chặn tự phát nhạc. Hãy chạm nút nốt nhạc để bật.");
  }
}

function stopMusic() {
  if (audioContext && musicGain) {
    musicGain.gain.cancelScheduledValues(audioContext.currentTime);
    musicGain.gain.setTargetAtTime(0, audioContext.currentTime, .04);
    const contextToClose = audioContext;
    setTimeout(() => contextToClose.close(), 140);
  }
  clearTimeout(musicTimer);
  musicTimer = undefined;
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

  slideFrame.classList.add("media-loading");
  photo.onload = null;
  photo.onerror = null;
  photoBuffer.onload = null;
  photoBuffer.onerror = null;
  video.pause();
  video.oncanplay = null;
  video.onerror = null;
  video.onended = null;
  video.classList.remove("active", "ready");
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
    slideFrame.classList.remove("media-loading");
    showError(`Không tải được ${label} này. Đang chuyển sang mục tiếp theo…`);
    timer = setTimeout(() => showSlide(index + 1), 800);
  };

  if (slide.type === "video") {
    video.classList.add("active");
    video.muted = true;
    video.poster = slide.poster || "";
    video.src = slide.url;
    video.oncanplay = () => {
      if (requestId !== imageRequestId) return;
      clearTimeout(loadTimeout);
      slideFrame.classList.remove("media-loading");
      video.classList.add("ready");
      photo.classList.remove("ready", "leaving");
      photoBuffer.classList.remove("ready", "leaving");
      if (playing) video.play().catch(() => showError("Chạm nút phát trên video để bắt đầu xem."));
    };
    video.onerror = () => handleMediaError("video");
    video.onended = () => { if (playing && requestId === imageRequestId) showSlide(index + 1); };
    loadTimeout = setTimeout(() => handleMediaError("video"), 20000);
  } else {
    const sources = [...new Set([slide.url, slide.fallbackUrl].filter(Boolean))];
    const incomingPhoto = photoBuffer;
    const outgoingPhoto = photo;
    let sourceIndex = 0;
    incomingPhoto.classList.remove("ready", "leaving");
    const loadSource = () => {
      if (requestId !== imageRequestId) return;
      clearTimeout(loadTimeout);
      incomingPhoto.src = sources[sourceIndex];
      loadTimeout = setTimeout(handleImageError, 15000);
    };
    const handleImageError = () => {
      if (requestId !== imageRequestId) return;
      clearTimeout(loadTimeout);
      sourceIndex += 1;
      if (sourceIndex < sources.length) return loadSource();
      handleMediaError("ảnh");
    };
    incomingPhoto.onload = async () => {
      if (requestId !== imageRequestId) return;
      clearTimeout(loadTimeout);
      await incomingPhoto.decode?.().catch(() => {});
      if (requestId !== imageRequestId) return;
      slideFrame.classList.remove("media-loading");
      incomingPhoto.classList.add("ready");
      outgoingPhoto.classList.add("leaving");
      photo = incomingPhoto;
      photoBuffer = outgoingPhoto;
      setTimeout(() => {
        if (requestId !== imageRequestId) return;
        outgoingPhoto.classList.remove("ready", "leaving");
      }, 1050);
      if (playing) timer = setTimeout(() => showSlide(index + 1), Number(config.slideDuration) || 6000);
    };
    incomingPhoto.onerror = handleImageError;
    incomingPhoto.alt = `Ảnh ${slide.name}`;
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
soundPrompt.addEventListener("click", () => startMusic());
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
  startMusic({ silentFailure: true });
  document.querySelector(".brand span:last-child").textContent = config.albumTitle || "Những ngày bé xinh";
  try { slides = await loadDriveSlides(); }
  catch (error) { slides = demoSlides; showError(error.message); }
  buildProgress(); showSlide(0);
})();
