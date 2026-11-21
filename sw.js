const C='jewel-v2',A=['./','index.html','app.js','i18n.js','manifest.json','logo.jpg','icon-192.png','icon-512.png','lib/jspdf.umd.min.js','lib/html2canvas.min.js'];
self.addEventListener('install',e=>e.waitUntil(
  caches.open(C).then(c=>c.addAll(A.map(u=>new Request(u,{cache:'reload'}))))
  // v1 থেকে প্রথমবার আপগ্রেডে (v1-এ আপডেট বার্তা নেই) নিজে চালু হবে; এরপর থেকে ব্যবহারকারী "আপডেট করুন" চাপলে
  .then(()=>caches.keys()).then(k=>{if(k.includes('jewel-v1'))return self.skipWaiting()})));
self.addEventListener('message',e=>{if(e.data&&e.data.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>clients.claim())));
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||!(u.origin===location.origin||u.hostname==='www.gstatic.com'))return;
  e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>{
    const f=fetch(e.request).then(n=>{if(n.ok)caches.open(C).then(c=>c.put(e.request,n.clone()));return n}).catch(()=>r||(e.request.mode==='navigate'?caches.match('index.html'):undefined));
    return r||f;
  }));
});
