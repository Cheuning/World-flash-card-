import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url),sharp=createRequire(require.resolve('next/package.json'))('sharp');
const manifest=JSON.parse(readFileSync('public/manifest.webmanifest','utf8'));
assert.equal(manifest.name,'WORLD');assert.equal(manifest.short_name,'WORLD');assert.equal(manifest.display,'standalone');
for(const icon of manifest.icons){const data=await sharp('public'+icon.src).metadata();assert.equal(`${data.width}x${data.height}`,icon.sizes);assert.equal(data.format,'png');}
const handlers={},cached=[],removed=[];let claimed=false,skipped=false;
const offline=new Response('WORLD offline',{headers:{'Content-Type':'text/html'}});
const network=async()=>new Response('WORLD online');
const context={URL,Response,fetch:network,caches:{open:async()=>({addAll:async list=>cached.push(...list)}),keys:async()=>['world-install-old','other-app-cache','world-install-v1'],delete:async key=>{removed.push(key);return true;},match:async path=>path==='/offline.html'?offline.clone():undefined},self:{location:{origin:'https://world.example'},clients:{claim:async()=>{claimed=true;}},skipWaiting:()=>{skipped=true;},addEventListener:(name,handler)=>{handlers[name]=handler;}}};
runInNewContext(readFileSync('public/sw.js','utf8'),context);
let promise;handlers.install({waitUntil:p=>{promise=p;}});await promise;assert.ok(cached.includes('/offline.html'));assert.ok(!cached.some(x=>x.startsWith('/api/')));
handlers.activate({waitUntil:p=>{promise=p;}});await promise;assert.deepEqual(removed,['world-install-old']);assert.ok(claimed);
for(const request of [new Request('https://world.example/api/data'),new Request('https://world.example/api/data',{method:'POST'}),new Request('https://outside.example/test'),new Request('https://world.example/',{headers:{RSC:'1'}})]){
 let intercepted=false;handlers.fetch({request,respondWith:()=>{intercepted=true;}});assert.equal(intercepted,false);
}
const request={method:'GET',url:'https://world.example/',mode:'navigate',headers:new Headers()};
handlers.fetch({request,respondWith:p=>{promise=p;}});assert.equal(await(await promise).text(),'WORLD online');
context.fetch=async()=>{throw Error('offline');};
handlers.fetch({request,respondWith:p=>{promise=p;}});assert.equal(await(await promise).text(),'WORLD offline');
handlers.message({data:{type:'SKIP_WAITING'}});assert.ok(skipped);
console.log('PASS: WORLD manifest, real PNG dimensions, static assets, offline fallback, cache isolation, no interception of API/writes/RSC, explicit update.');
