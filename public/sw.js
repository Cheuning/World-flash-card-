/* WORLD: cache only public install assets. Study data always goes to the server. */
const CACHE='world-install-v1';
const ASSETS=['/offline.html','/favicon.svg','/icons/icon-192.png','/icons/icon-512.png','/icons/icon-maskable-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('world-install-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})());});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||request.headers.has('RSC'))return;
 if(request.mode==='navigate'){
  event.respondWith(fetch(request).catch(async()=>await caches.match('/offline.html')||new Response('WORLD에 연결할 수 없습니다.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}})));
 }else if(ASSETS.includes(url.pathname)){
  event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));
 }
});
