// Render authored vector artwork using the project's existing Next.js dependency.
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const require=createRequire(import.meta.url);
const sharp=createRequire(require.resolve('next/package.json'))('sharp');
const source=readFileSync(new URL('../public/favicon.svg',import.meta.url));
const dir=new URL('../public/icons/',import.meta.url);mkdirSync(dir,{recursive:true});
for(const [name,size] of [['icon-192.png',192],['icon-512.png',512],['icon-maskable-512.png',512],['apple-touch-icon.png',180]]){
 await sharp(source,{density:384}).resize(size,size).png().toFile(fileURLToPath(new URL(name,dir)));
}
console.log('WORLD icons generated: 192, 512, maskable 512, apple 180.');
