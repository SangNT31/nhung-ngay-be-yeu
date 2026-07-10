const VERSION = "v10";
const STATIC_CACHE = `baby-album-static-${VERSION}`;
const IMAGE_CACHE = `baby-album-images-${VERSION}`;
const MAX_CACHED_IMAGES = 60;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const activeCaches = new Set([STATIC_CACHE, IMAGE_CACHE]);
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.filter((name) => name.startsWith("baby-album-") && !activeCaches.has(name)).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

async function trimImageCache(cache) {
  const keys = await cache.keys();
  const overflow = keys.length - MAX_CACHED_IMAGES;
  if (overflow > 0) await Promise.all(keys.slice(0, overflow).map((key) => cache.delete(key)));
}

async function cacheFirstImage(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok || response.type === "opaque") {
    await cache.put(request, response.clone());
    await trimImageCache(cache);
  }
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error("Không có kết nối và tài nguyên chưa được cache");
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isDriveListRequest = url.hostname === "www.googleapis.com" && url.pathname.endsWith("/drive/v3/files");
  if (isDriveListRequest) return;

  if (request.destination === "image") {
    event.respondWith(cacheFirstImage(request));
    return;
  }

  if (url.origin === self.location.origin && ["document", "script", "style", "font"].includes(request.destination)) {
    event.respondWith(networkFirst(request));
  }
});
