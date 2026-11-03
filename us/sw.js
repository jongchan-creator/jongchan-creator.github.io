/* J들의 시트 — 알림 전용 서비스 워커
   · 화면·파일을 저장(캐시)하지 않아요 — 앱은 늘 최신으로 열려요
   · 서버(Apps Script)가 보낸 '내일 일정' 알림을 휴대폰 알림으로 띄우고, 누르면 앱을 열어 그날을 보여 줘요 */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (er) { try { d = { body: e.data.text() }; } catch (er2) {} }
  var title = String(d.title || 'J들의 시트').slice(0, 120);
  var date = /^\d{4}-\d{2}-\d{2}$/.test(d.date || '') ? d.date : '';
  e.waitUntil(self.registration.showNotification(title, {
    body: String(d.body || '').slice(0, 1200),
    tag: String(d.tag || 'ourtwo'),
    renotify: true,
    icon: 'icon-192.png',
    badge: 'badge-96.png',
    lang: 'ko',
    timestamp: Date.now(),
    data: { date: date }
  }));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var date = (e.notification.data || {}).date || '';
  var scope = self.registration.scope;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (c.url.indexOf(scope) === 0 && 'focus' in c) {
        return c.focus().then(function (w) {
          if (date) (w || c).postMessage({ ourtwo: 1, open: date });
        }, function () {
          if (date) c.postMessage({ ourtwo: 1, open: date });
        });
      }
    }
    return self.clients.openWindow(scope + (date ? '?open=' + date : ''));
  }));
});

// 브라우저가 구독을 바꿨을 때(드묾): 같은 설정으로 다시 구독 — 앱을 다음에 열면 서버에도 저절로 반영돼요
self.addEventListener('pushsubscriptionchange', function (e) {
  var o = e.oldSubscription && e.oldSubscription.options;
  if (o) e.waitUntil(self.registration.pushManager.subscribe(o).catch(function () {}));
});
