/* ══════════════════════════════════════════════════════════
   NEWNORMAL Service Worker — 오프라인 지원
   저장소 루트(index.html과 같은 위치)에 업로드하세요.
   ══════════════════════════════════════════════════════════ */

const VERSION   = 'nn-v1';
const CORE      = 'nn-core-' + VERSION;   /* 페이지 본문 */
const ASSET     = 'nn-asset-' + VERSION;  /* 폰트·이미지 등 */
const MAX_ASSET = 160;                    /* 이미지 캐시 최대 개수 */

/* 항상 네트워크로만 처리 (실시간 데이터·위젯) */
const NETWORK_ONLY = [
  'workers.dev',
  'tradingview.com',
  's3.tradingview.com',
  'finnhub.io',
  'min-api.cryptocompare.com',
  'api.coingecko.com',
  'financialmodelingprep.com',
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'www.gstatic.com/firebasejs'
];

/* 오래 두고 쓰는 정적 자원 (캐시 우선) */
const ASSET_HOSTS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'i.postimg.cc',
  'images.pexels.com',
  'unavatar.io',
  'www.google.com/s2/favicons',
  's0.wp.com/mshots',
  'image.thum.io'
];

const isNetworkOnly = (url) => NETWORK_ONLY.some(h => url.includes(h));
const isAsset       = (url) => ASSET_HOSTS.some(h => url.includes(h));

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CORE)
      .then(c => c.addAll(['./', './index.html']).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CORE && k !== ASSET).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

/* 자산 캐시 개수 제한 */
async function trim(cacheName, max) {
  const c = await caches.open(cacheName);
  const keys = await c.keys();
  if (keys.length > max) {
    for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
  }
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = req.url;
  if (url.startsWith('chrome-extension')) return;
  if (isNetworkOnly(url)) return;   /* 그대로 통과 */

  /* ── 페이지 이동: 네트워크 우선 (최신 유지) → 실패 시 캐시 ── */
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const c = await caches.open(CORE);
        c.put('./index.html', fresh.clone());
        return fresh;
      } catch (err) {
        const c = await caches.open(CORE);
        return (await c.match('./index.html')) || (await c.match('./')) ||
               new Response('오프라인 상태이며 저장된 페이지가 없습니다.', {
                 status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
               });
      }
    })());
    return;
  }

  /* ── 정적 자산: 캐시 우선 + 백그라운드 갱신 ── */
  if (isAsset(url)) {
    e.respondWith((async () => {
      const c = await caches.open(ASSET);
      const hit = await c.match(req);
      const net = fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          c.put(req, res.clone());
          trim(ASSET, MAX_ASSET);
        }
        return res;
      }).catch(() => null);
      return hit || (await net) || new Response('', { status: 504 });
    })());
    return;
  }

  /* ── 같은 도메인 기타 파일: 캐시 우선 ── */
  if (new URL(url).origin === self.location.origin) {
    e.respondWith((async () => {
      const c = await caches.open(ASSET);
      const hit = await c.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res && res.ok) { c.put(req, res.clone()); trim(ASSET, MAX_ASSET); }
        return res;
      } catch (err) {
        return new Response('', { status: 504 });
      }
    })());
  }
});
