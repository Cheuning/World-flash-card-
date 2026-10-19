// @ts-ignore Node's regression runner executes TypeScript directly.
import { parseImport, detectLanguage, type Language } from './learning.ts';

/** Preserve legacy pipe/text imports, extending JSON and six-column text. */
export function parseContent(text:string) {
 const raw=text.trim().replace(/^```(?:json|text|txt)?\s*\n([\s\S]*?)\n```$/, '$1').trim();
 let source:any[];
 if(raw.startsWith('[')||raw.startsWith('{')){
  const parsed=JSON.parse(raw);source=Array.isArray(parsed)?parsed:parsed.words||parsed.items;
  if(!Array.isArray(source))throw Error('JSON 배열 또는 words/items 배열이 필요합니다.');
 }else source=raw.split(/\r?\n/).filter(x=>x.trim()).map(line=>{
  const p=line.includes('\t')?line.split('\t'):line.includes('|')?line.split(/\s*\|\s*/):null;
  return p?{english:p[0],meaning:p[1],pos:p[2],context:p[3],example:p[3],exampleMeaning:p[4],language:p[5]}:parseImport(line)[0];
 });
 if(!source.length)throw Error('가져올 단어를 입력해주세요.');
 if(source.length>500)throw Error('한 번에 500개까지 가져올 수 있습니다.');
 return source.map((row,i)=>{
  const english=String(row.english||row.text||row.japanese||'').trim();
  // The legacy parser caps vocabulary at 150 characters; sentence cards allow 2,000.
  if(!english||english.length>2000)throw Error(`${i+1}번째 단어/문장을 확인해주세요. (최대 2,000자)`);
  const base=parseImport(JSON.stringify([{...row,english:english.slice(0,150)}]))[0];
  if(row.language&&!['en','ja'].includes(row.language))throw Error(`${i+1}번째 언어는 en 또는 ja로 지정해주세요.`);
  const language:Language=row.language||detectLanguage(english);
  const itemType:'word'|'sentence'=row.itemType==='sentence'||row.type==='sentence'||/[.!?。！？]$/.test(english)?'sentence':'word';
  return {...base,english,language,itemType,example:String(row.example||row.context||'').slice(0,4000),exampleMeaning:String(row.exampleMeaning||row.exampleTranslation||'').slice(0,4000),reading:String(row.reading||'').slice(0,2000)};
 });
}
