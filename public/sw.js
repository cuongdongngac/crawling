/* Service worker của VPHA M&E (PWA).
 * Nguyên tắc: KHÔNG cache dữ liệu người dùng, kết quả quét, server action hay Supabase.
 * Chỉ cache: tài nguyên tĩnh có mã băm (/_next/static), icon, và trang "mất mạng".
 * Trang HTML luôn lấy từ mạng; mất mạng thì hiện /offline.html.
 * Đổi VERSION khi sửa file này để xoá cache cũ.
 */
const VERSION = "vpha-v1";
const STATIC_CACHE = `${VERSION}-static`;
const PRECACHE = [
  "/offline.html",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // server action, đăng nhập… đi thẳng
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase, Apify… không đụng tới

  // Trang HTML: luôn lấy mạng, mất mạng thì trang offline.
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("/offline.html")));
    return;
  }

  // Tài nguyên tĩnh bất biến: lấy cache trước.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
      )
    );
  }
  // Còn lại (RSC, API, manifest…): để trình duyệt tự xử lý.
});
