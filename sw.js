// Service Worker. VERSION должен совпадать с APP_VERSION в index.html
// (скрипт release.py меняет оба значения сразу). Изменился sw.js -> браузер
// скачает новую версию в фоне и приложение покажет «Доступна новая версия».
const VERSION = "1.20";
const CACHE = "uchet-" + VERSION;
const FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png"
];

self.addEventListener("install", function(e){
  // cache:"reload" — мимо HTTP-кэша GitHub Pages, чтобы взять свежие файлы
  e.waitUntil(caches.open(CACHE).then(function(c){
    return Promise.all(FILES.map(function(u){
      return fetch(new Request(u, {cache:"reload"})).then(function(r){
        if(!r.ok) throw new Error("fetch failed: "+u);
        return c.put(u, r);
      });
    }));
  }));
  // skipWaiting НЕ вызываем: новая версия ждёт, пока пользователь нажмёт «Обновить»
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k.indexOf("uchet-")===0 && k!==CACHE; })
        .map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("message", function(e){
  if(e.data === "SKIP_WAITING") self.skipWaiting();
  if(e.data === "GET_VERSION" && e.source) e.source.postMessage({type:"VERSION", version:VERSION});
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  if(req.method !== "GET") return;
  var url = new URL(req.url);
  if(url.origin !== location.origin) return;
  e.respondWith(
    caches.match(req, {ignoreSearch:true}).then(function(hit){
      if(hit) return hit;
      return fetch(req).catch(function(){
        if(req.mode === "navigate") return caches.match("./index.html");
      });
    })
  );
});
