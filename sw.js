// 社區施工裝潢紀錄：離線快取＋接收分享檔案
const VER = 'cb-shell-v3.1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VER).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k !== VER && k !== 'cb-inbox').map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Android：別的 App 把 JSON 檔「分享到 施工紀錄」
  if (e.request.method === 'POST' && url.pathname.endsWith('/share-target')) {
    e.respondWith((async () => {
      try {
        const fd = await e.request.formData();
        const f = fd.get('file');
        if (f) {
          const c = await caches.open('cb-inbox');
          await c.put('inbox-file', new Response(f));
        }
      } catch (err) {}
      return Response.redirect('./?inbox=1', 303);
    })());
    return;
  }
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // 先用快取（離線可用），同時在背景更新
  e.respondWith((async () => {
    const c = await caches.open(VER);
    const hit = await c.match(e.request, {ignoreSearch: true});
    const net = fetch(e.request).then(r => { if (r && r.ok) c.put(e.request, r.clone()); return r; }).catch(() => null);
    return hit || (await net) || (await c.match('index.html'));
  })());
});
