// 트리거 드릴 서비스 워커: 한 번 접속하면 앱·카드·KaTeX·폰트를 폰에 저장해 오프라인에서도 동작
const VERSION = "td-v12";
const CORE = ["./", "index.html", "cards.json", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png",
  "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(CORE.map(u => c.add(new Request(u, {mode: u.startsWith("http") ? "no-cors" : "same-origin"})).catch(() => {}))))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // 동기화(GitHub API·Gist 원본)는 절대 저장본을 쓰지 않음
  if (url.hostname === "api.github.com" || url.hostname === "gist.githubusercontent.com") return;
  // 카드·페이지: 인터넷 되면 최신, 안 되면 저장본
  if (url.origin === location.origin && (url.pathname.endsWith("cards.json") || req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith("index.html"))) {
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return r; })
      .catch(() => caches.match(req, {ignoreSearch: true}).then(r => r || caches.match("index.html"))));
    return;
  }
  // 나머지(KaTeX, 폰트, 아이콘): 저장본 우선, 없으면 받아서 저장
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return r;
  })));
});
