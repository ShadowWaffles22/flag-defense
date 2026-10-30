// Flag Defense FPS service worker: lets the game open offline after the first visit.
// Bump VERSION when you upload a new index.html, so installed copies pick it up.
const VERSION = 'ffps-alpha-1.2';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png'];
const CDN = ['cdnjs.cloudflare.com', 'unpkg.com'];                       // three.js and PeerJS
const CDN_FILES = ['https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js'];   // saved on install so the first visit also works offline later

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL).then(()=>Promise.all(CDN_FILES.map(u=>c.add(new Request(u, {mode:'no-cors'})).catch(()=>{}))))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k !== VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', e=>{
  const req = e.request, url = new URL(req.url);
  if(req.method !== 'GET') return;
  if(url.origin === location.origin){
    // the game itself: newest copy when online, the saved copy when offline
    e.respondWith(fetch(req).then(res=>{ if(res.ok){ const copy = res.clone(); caches.open(VERSION).then(c=>c.put(req, copy)); } return res; })
      .catch(()=>caches.match(req).then(r=>r || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
  } else if(CDN.includes(url.hostname)){
    // libraries: saved copy first (fast and offline), refreshed in the background
    e.respondWith(caches.open(VERSION).then(c=>c.match(req).then(hit=>{
      const net = fetch(req).then(res=>{ if(res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(()=>hit);
      return hit || net;
    })));
  }
  // everything else (the PeerJS connection service, etc.) goes straight to the network
});
