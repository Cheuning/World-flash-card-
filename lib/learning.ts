export type Settings = { goal:number; newRatio:number; direction:'mixed'|'en-ko'|'ko-en'; enRatio:number; retryGap:number; intervals:number[]; resetMode:'reset'|'demote'; demoteBy:number; pronunciation:boolean; accent:'us'|'uk'|'mixed'; dayStartHour:number };
export const defaults:Settings={goal:30,newRatio:30,direction:'en-ko',enRatio:50,retryGap:5,intervals:[1,3,7,14,30,90],resetMode:'reset',demoteBy:2,pronunciation:true,accent:'us',dayStartHour:0};
export type Language='en'|'ja';
export function detectLanguage(text:string):Language { return /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(text)?'ja':'en'; }
export function wordLanguage(word:{english:string;language?:Language}):Language { return word.language||detectLanguage(word.english); }
// Calendar arithmetic preserves local day boundaries, including daylight-saving changes.
export function learningDay(value:string|number|Date,dayStartHour=0):Date {
 const day=new Date(value);
 if(day.getHours()<dayStartHour)day.setDate(day.getDate()-1);
 day.setHours(0,0,0,0);
 return day;
}
export function learningDayKey(value:string|number|Date,hour=0,timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone):string {
 const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value));
 const part=(name:string)=>Number(parts.find(p=>p.type===name)!.value);
 const day=new Date(Date.UTC(part('year'),part('month')-1,part('day')));
 if(part('hour')<hour)day.setUTCDate(day.getUTCDate()-1);
 return day.toISOString().slice(0,10);
}
function previousDay(key:string){const d=new Date(key+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-1);return d.toISOString().slice(0,10);}
function passedIds(sessions:Session[],key:string,hour:number,timeZone?:string){
 return new Set(sessions.flatMap(s=>s.entries.filter(e=>e.passed&&(e.passedDay||learningDayKey(e.passedAt||s.startedAt,hour,timeZone))===key).map(e=>e.wordId)));
}
export function completedOnDay(sessions:Session[],value:string|number|Date,dayStartHour=0,timeZone?:string):number {
 return passedIds(sessions,learningDayKey(value,dayStartHour,timeZone),dayStartHour,timeZone).size;
}
function targetOnDay(sessions:Session[],words:Word[],key:string,hour:number,timeZone?:string,fallback=0){
 const ordered=[...sessions].sort((a,b)=>a.startedAt.localeCompare(b.startedAt));
 const snapshot=ordered.find(s=>s.dayKey===key&&s.dailyTarget!==undefined);
 if(snapshot)return snapshot.dailyTarget!;
 const legacy=ordered.find(s=>learningDayKey(s.startedAt,hour,timeZone)===key||s.entries.some(e=>e.passed&&learningDayKey(e.passedAt||s.startedAt,hour,timeZone)===key));
 if(!legacy)return fallback;
 const available=words.filter(w=>w.addedAt<=legacy.startedAt&&(!w.deletedAt||w.deletedAt>legacy.startedAt)).length;
 return words.length?Math.min(legacy.requestedGoal,available):legacy.requestedGoal;
}
export function dailyProgress(state:State,value:string|number|Date,timeZone?:string){
 const hour=state.settings.dayStartHour,key=learningDayKey(value,hour,timeZone);
 const sessions=state.sessions.filter(s=>(s.dayKey||learningDayKey(s.startedAt,hour,timeZone))===key);
 const first=[...sessions].sort((a,b)=>a.startedAt.localeCompare(b.startedAt))[0];
 const baseTarget=Math.min(first?.requestedGoal??state.settings.goal,state.words.filter(w=>!w.deletedAt).length);
 const target=Math.max(baseTarget,...sessions.map(s=>s.studyGoal||0));
 const completed=passedIds(state.sessions,key,hour,timeZone).size;
 const asked=new Set(sessions.flatMap(s=>s.entries.filter(e=>e.appearances>0).map(e=>e.wordId)));
 const remaining=state.words.filter(w=>!w.deletedAt&&!asked.has(w.id)).length;
 return {key,target,baseTarget,completed,remaining,extra:sessions.some(s=>s.additional),achieved:sessions.some(s=>s.achievedDay)||(baseTarget>0&&completed>=baseTarget)};
}
export function syncDailyGoal(state:State,now:string,timeZone?:string){
 const progress=dailyProgress(state,now,timeZone);
 for(const s of state.sessions.filter(s=>(s.dayKey||learningDayKey(s.startedAt,state.settings.dayStartHour,timeZone))===progress.key)){
  s.dayKey=progress.key;s.dailyTarget=progress.baseTarget;
  if(progress.achieved)s.achievedDay=true;
 }
}
export function completionStreak(sessions:Session[],value:string|number|Date,dayStartHour=0,words:Word[]=[],timeZone?:string):number {
 const keys=new Set(sessions.flatMap(s=>s.entries.filter(e=>e.passed).map(e=>e.passedDay||learningDayKey(e.passedAt||s.startedAt,dayStartHour,timeZone))));
 const completed=new Set([...keys].filter(key=>{if(sessions.some(s=>s.dayKey===key&&s.achievedDay))return true;const target=targetOnDay(sessions,words,key,dayStartHour,timeZone);return target>0&&passedIds(sessions,key,dayStartHour,timeZone).size>=target;}));
 let day=learningDayKey(value,dayStartHour,timeZone),count=0;
 if(!completed.has(day))day=previousDay(day);
 while(completed.has(day)){count++;day=previousDay(day);}return count;
}
export type Word={id:string; english:string; meaning:string; pos:string; context:string; language?:Language; itemType?:'word'|'sentence'; example?:string; exampleMeaning?:string; reading?:string; addedAt:string; firstAskedAt:string; sources:{at:string;context:string}[]; level:number; nextReview:string|null; correct:number; wrong:number; lastStudiedAt:string|null; deletedAt?:string};
export type Question={id:string; wordId:string; direction:'en-ko'|'ko-en'; issuedAt:string; occurrence:number};
export type Entry={wordId:string; direction?:'en-ko'|'ko-en'; kind:'new'|'review'; passed:boolean; passedAt?:string; passedDay?:string; appearances:number; availableAt:number};
export type Session={language?:Language; achievedDay?:boolean; studyGoal?:number; additional?:boolean; id:string; dayKey?:string; dailyTarget?:number; timeZone?:string; closedReason?:'day-boundary'; startedAt:string; endedAt:string|null; settings:Settings; target:number; requestedGoal:number; entries:Entry[]; attempts:number; correct:number; wrong:number; activeMs:number; question:Question|null; lastFeedback?:{attemptId:string;wordId:string;correct:boolean;expected:string;answer:string;beforeWord:Word;corrected?:boolean}};
export type Attempt={id:string;sessionId:string;wordId:string;english:string;prompt:string;expectedAnswer:string;presentedAt:string;issuedAt:string;answeredAt:string;direction:string;answer:string;correct:boolean;responseMs:number;inputMethod:string;levelBefore:number;levelAfter:number;previousStudyAt:string|null;elapsedSincePreviousMs:number|null;occurrence:number;kind:string;settings:Settings;settingsVersion:string;judging:'normalized-exact'|'self-assessed';questionId:string};
export type History={id:string;language?:Language;changedAt:string;before:Settings|null;after:Settings};
export type State={version:number;words:Word[];sessions:Session[];settings:Settings;history:History[]};
export type HistoryAttempt=Pick<Attempt,'id'|'sessionId'|'wordId'|'answeredAt'|'correct'|'responseMs'|'kind'>;
export function dailyHistory(attempts:HistoryAttempt[],dayStartHour=0){
 const groups=new Map<number,HistoryAttempt[]>();
 for(const a of attempts){const day=learningDay(a.answeredAt,dayStartHour).getTime();if(!Number.isFinite(day))continue;const rows=groups.get(day)||[];rows.push(a);groups.set(day,rows);}
 return [...groups].sort(([a],[b])=>b-a).map(([day,rows])=>{
  const first=new Map<string,HistoryAttempt>();
  for(const a of [...rows].sort((a,b)=>Date.parse(a.answeredAt)-Date.parse(b.answeredAt)))if(!first.has(a.wordId))first.set(a.wordId,a);
  const words=first.size,immediateCorrect=[...first.values()].filter(a=>a.correct).length;
  return {day,words,immediateCorrect,rate:Math.round(immediateCorrect/words*100),attempts:rows.length,correct:rows.filter(a=>a.correct).length,activeMs:rows.reduce((n,a)=>n+a.responseMs,0),sessions:new Set(rows.map(a=>a.sessionId)).size,newWords:[...first.values()].filter(a=>a.kind==='new').length};
 });
}
export const uuid=()=>crypto.randomUUID();
export const normalize=(s:string)=>s.normalize('NFKC').toLocaleLowerCase().trim().replace(/[.,!?。！？]/g,'').replace(/\s+/g,'');
const spellingPairs:[string,string][]=[['color','colour'],['favorite','favourite'],['honor','honour'],['labor','labour'],['center','centre'],['theater','theatre'],['meter','metre'],['organize','organise'],['realize','realise'],['recognize','recognise'],['analyze','analyse'],['traveler','traveller'],['canceled','cancelled'],['defense','defence'],['license','licence'],['practice','practise'],['check','cheque'],['gray','grey']];
export function englishVariants(value:string){const normalized=normalize(value);const pair=spellingPairs.find(([us,uk])=>normalized===us||normalized===uk);return pair?[...pair]:[normalized];}
export function isCorrect(answer:string,expected:string){const a=normalize(answer);return !!a&&expected.split(/[;,/|\n]/).some(x=>englishVariants(x).includes(a));}
// Match whole words/phrases from actual recognition candidates, not substrings or phonetic guesses.
export function selectVoiceAnswer(transcripts:string[],expected:string):string|null {
 const tokens=(s:string)=>s.normalize('NFKC').toLocaleLowerCase().replace(/[’‘]/g,"'").match(/[\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)*/gu)||[];
 const alternatives=expected.split(/[;,/|\n]/).map(s=>s.trim()).filter(Boolean);
 for(const transcript of transcripts){
  const heard=tokens(transcript);
  for(const alternative of alternatives){
   if(isCorrect(transcript,alternative))return alternative;
   const target=tokens(alternative);if(!target.length)continue;
   for(let i=0;i<=heard.length-target.length;i++)if(target.every((token,j)=>heard[i+j]===token))return alternative;
  }
 }
 return null;
}
export function candidates(words:Word[],settings:Settings,now=Date.now(),random= Math.random){
 const live=words.filter(w=>!w.deletedAt),shuffled=[...live];
 for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
 const selected=shuffled.slice(0,settings.goal),newCount=selected.filter(w=>!w.lastStudiedAt).length;
 return {selected,target:selected.length,newCount,reviewCount:selected.length-newCount};
}
export function nextQuestion(s:Session,now:string){
 const waiting=s.entries.filter(e=>!e.passed); if(!waiting.length){s.endedAt=now;s.question=null;return;}
 const next=waiting.find(e=>e.availableAt<=s.attempts)||[...waiting].sort((a,b)=>a.availableAt-b.availableAt)[0];
 next.appearances++;s.question={id:uuid(),wordId:next.wordId,direction:next.direction||(s.settings.direction==='mixed'?(Math.random()*100<s.settings.enRatio?'en-ko':'ko-en'):s.settings.direction),issuedAt:now,occurrence:next.appearances};
}
export function startSession(state:State,now:string,timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone,additionalCount?:number){
 const key=learningDayKey(now,state.settings.dayStartHour,timeZone),active=state.sessions.find(s=>!s.endedAt);
 if(active&&(active.dayKey||learningDayKey(active.startedAt,state.settings.dayStartHour,timeZone))===key){
  active.timeZone=timeZone;
  if(!active.dayKey){active.dailyTarget=dailyProgress(state,now,timeZone).target;active.dayKey=key;}
  return active;
 }
 const live=state.words.filter(w=>!w.deletedAt);if(!live.length)throw new Error('먼저 단어를 추가해주세요.');
 const progress=dailyProgress(state,now,timeZone),done=passedIds(state.sessions,key,state.settings.dayStartHour,timeZone);
 const additional=progress.completed>=progress.target;
 if(additional&&(!Number.isInteger(additionalCount)||additionalCount!<1||additionalCount!>300))throw new Error('추가 학습할 단어 수를 1~300개로 정해주세요.');
 const target=additional?additionalCount!:progress.target-progress.completed;
 const pending=active?active.entries.filter(e=>!e.passed).map(e=>live.find(w=>w.id===e.wordId)).filter((w):w is Word=>!!w&&!done.has(w.id)):[];
 const carryIds=new Set(pending.map(w=>w.id));
 const asked=new Set(state.sessions.filter(s=>(s.dayKey||learningDayKey(s.startedAt,state.settings.dayStartHour,timeZone))===key).flatMap(s=>s.entries.filter(e=>e.appearances>0).map(e=>e.wordId)));
 const pool=live.filter(w=>!done.has(w.id)&&(!additional||!asked.has(w.id)));
 const selected=[...pending,...candidates(pool.filter(w=>!carryIds.has(w.id)),{...state.settings,goal:target},Date.parse(now)).selected].slice(0,target);
 if(!selected.length)throw new Error('오늘 출제하지 않은 단어가 없어요.');
 if(active){active.endedAt=now;active.closedReason='day-boundary';}
 const s:Session={id:uuid(),dayKey:key,dailyTarget:progress.target,timeZone,startedAt:now,endedAt:null,settings:structuredClone(state.settings),target:selected.length,requestedGoal:state.settings.goal,entries:selected.map(w=>({wordId:w.id,kind:w.lastStudiedAt?'review':'new',passed:false,appearances:0,availableAt:0})),attempts:0,correct:0,wrong:0,activeMs:0,question:null};
 s.additional=additional;s.studyGoal=additional?progress.completed+selected.length:progress.target;
 s.dailyTarget=progress.baseTarget;
 const enCount=state.settings.direction==='mixed'?Math.round(selected.length*state.settings.enRatio/100):state.settings.direction==='en-ko'?selected.length:0;
 const directions:('en-ko'|'ko-en')[]=selected.map((_,i)=>i<enCount?'en-ko':'ko-en');
 for(let i=directions.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[directions[i],directions[j]]=[directions[j],directions[i]];}
 s.entries.forEach((e,i)=>e.direction=directions[i]);
 state.sessions.unshift(s);nextQuestion(s,now);return s;
}
export function grade(state:State,payload:any,now:string):Attempt {
 const s=state.sessions.find(x=>x.id===payload.sessionId);if(!s||s.endedAt||!s.question||s.lastFeedback)throw new Error('현재 문제를 다시 확인해주세요.');
 const q=s.question;if(q.id!==payload.questionId)throw new Error('다른 기기에서 문제가 변경되었습니다. 새로고침해주세요.');
 const w=state.words.find(x=>x.id===q.wordId)!;const entry=s.entries.find(e=>e.wordId===w.id)!;const answer=String(payload.answer||'').slice(0,2000), expected=q.direction==='en-ko'?w.meaning:w.english;
 if(payload.inputMethod==='flashcard'&&typeof payload.known!=='boolean')throw new Error('카드 판정을 확인해주세요.');
 const correct=payload.inputMethod==='flashcard'?payload.known:isCorrect(answer,expected),before=structuredClone(w);const shown=Math.max(Date.parse(q.issuedAt),Math.min(Date.parse(now),Date.parse(payload.presentedAt)||Date.parse(q.issuedAt)));
 const responseMs=Math.max(0,Math.min(Date.parse(now)-shown,Number(payload.responseMs)||0));
 s.attempts++;s.activeMs+=responseMs;if(correct){s.correct++;w.correct++;entry.passed=true;entry.passedAt=now;entry.passedDay=learningDayKey(now,state.settings.dayStartHour,s.timeZone);w.level=Math.min(w.level+1,s.settings.intervals.length);w.nextReview=new Date(Date.parse(now)+s.settings.intervals[w.level-1]*86400000).toISOString();}
 else{s.wrong++;w.wrong++;w.level=s.settings.resetMode==='reset'?0:Math.max(0,w.level-s.settings.demoteBy);w.nextReview=now;entry.availableAt=s.attempts+s.settings.retryGap;}
 w.lastStudiedAt=now;
 const a:Attempt={id:uuid(),sessionId:s.id,wordId:w.id,english:w.english,prompt:q.direction==='en-ko'?w.english:w.meaning,expectedAnswer:expected,presentedAt:new Date(shown).toISOString(),issuedAt:q.issuedAt,answeredAt:now,direction:q.direction,answer,correct,responseMs,inputMethod:payload.inputMethod==='voice'?'voice':'typing',levelBefore:before.level,levelAfter:w.level,previousStudyAt:before.lastStudiedAt,elapsedSincePreviousMs:before.lastStudiedAt?Date.parse(now)-Date.parse(before.lastStudiedAt):null,occurrence:q.occurrence,kind:entry.kind,settings:structuredClone(s.settings),settingsVersion:state.history.filter(h=>h.changedAt<=s.startedAt).at(-1)?.id||'initial',judging:'normalized-exact',questionId:q.id};
 if(payload.inputMethod==='flashcard'){a.inputMethod='flashcard';a.judging='self-assessed';a.answer=correct?'외움':'모름';}
 s.lastFeedback={attemptId:a.id,wordId:w.id,correct,expected,answer,beforeWord:before};return a;
}
export function correctJudgment(state:State,id:string,now:string){
 const s=state.sessions.find(x=>x.id===id),f=s?.lastFeedback;if(!s||!f||f.correct||f.corrected)throw new Error('정정할 답변이 없습니다.');
 const w=state.words.find(x=>x.id===f.wordId)!,e=s.entries.find(x=>x.wordId===w.id)!;w.wrong--;w.correct++;w.level=Math.min(f.beforeWord.level+1,s.settings.intervals.length);w.nextReview=new Date(Date.parse(now)+s.settings.intervals[w.level-1]*86400000).toISOString();e.passed=true;e.passedAt=now;e.passedDay=learningDayKey(now,state.settings.dayStartHour,s.timeZone);s.wrong--;s.correct++;f.correct=true;f.corrected=true;
 return {id:uuid(),attemptId:f.attemptId,sessionId:id,wordId:w.id,at:now,originalCorrect:false,correctedCorrect:true,reason:'user-marked-correct',levelAfter:w.level};
}
export function validateSettings(v:any):Settings{
 v={...v,dayStartHour:v?.dayStartHour??defaults.dayStartHour,accent:v?.accent??defaults.accent};
 if(!Number.isInteger(v.dayStartHour)||v.dayStartHour<0||v.dayStartHour>23)throw new Error('하루 기준시는 0~23시 사이로 설정해주세요.');
 for(const [key,min,max] of [['goal',1,300],['newRatio',0,100],['enRatio',0,100],['retryGap',1,30],['demoteBy',1,20]] as const){if(!Number.isInteger(v[key])||v[key]<min||v[key]>max)throw new Error('설정값의 범위를 확인해주세요.');}
 if(!Array.isArray(v.intervals)||v.intervals.length<1||v.intervals.length>12||v.intervals.some((n:any,i:number)=>!Number.isInteger(n)||n<1||n>3650||(i>0&&n<=v.intervals[i-1])))throw new Error('복습 간격은 작은 수부터, 1~3650일 사이로 입력해주세요.');
 if(!['mixed','en-ko','ko-en'].includes(v.direction)||!['reset','demote'].includes(v.resetMode)||!['us','uk','mixed'].includes(v.accent)||typeof v.pronunciation!=='boolean')throw new Error('설정을 확인해주세요.');return structuredClone(v);
}
export function parseImport(text:string){
 const t=text.trim().replace(/^```(?:text|txt|json)?[ \t]*\r?\n([\s\S]*?)\r?\n```$/, '$1').trim();if(!t)throw new Error('가져올 단어를 입력해주세요.');let rows:any[];
 if(t.startsWith('[')||t.startsWith('{')){const parsed=JSON.parse(t);rows=Array.isArray(parsed)?parsed:parsed.words;if(!Array.isArray(rows))throw new Error('JSON 배열 또는 words 배열이 필요합니다.');}
 else rows=t.split('\n').filter(x=>x.trim()).map((line,i)=>{
  let p:string[];
  if(line.includes('\t'))p=line.split('\t');
  else if(line.includes('|'))p=line.split(/\s*\|\s*/);
  else {const separator=/\s+[-–—]\s+/.exec(line);p=separator?[line.slice(0,separator.index),line.slice(separator.index+separator[0].length)]:[line];}
  if(p.length<2)throw new Error(`${i+1}번째 줄: 영어 - 한국어 뜻 형식으로 입력해주세요.`);
  return {english:p[0],meaning:p[1],pos:p[2]||'',context:p[3]||''};
 });
 if(rows.length>500)throw new Error('한 번에 500개까지 가져올 수 있습니다.');return rows.map((r,i)=>{if(typeof r.english!=='string'||typeof r.meaning!=='string'||!r.english.trim()||!r.meaning.trim())throw new Error(`${i+1}번째 단어의 영어와 뜻을 확인해주세요.`);if(r.english.length>150||r.meaning.length>2000)throw new Error('단어 또는 뜻이 너무 깁니다.');return {english:r.english.trim(),meaning:r.meaning.trim(),pos:String(r.pos||'').slice(0,100),context:String(r.context||'').slice(0,4000),firstAskedAt:r.firstAskedAt&&Number.isFinite(Date.parse(r.firstAskedAt))?new Date(r.firstAskedAt).toISOString():undefined};});
}
export function importWords(state:State,rows:ReturnType<typeof parseImport>,now:string){let added=0,merged=0;
 for(const r of rows){const extra=r as typeof r & Partial<Word>;const old=state.words.find(w=>wordLanguage(w)===wordLanguage(extra)&&normalize(w.english)===normalize(r.english));if(old){old.deletedAt=undefined;const meanings=[...new Set([...old.meaning.split(/\s*[;|/]\s*/),...r.meaning.split(/\s*[;|/]\s*/)])];old.meaning=meanings.join('; ');if(r.context&&!old.sources.some(s=>s.context===r.context))old.sources.push({at:now,context:r.context});if(!old.context)old.context=r.context;if(!old.pos)old.pos=r.pos;if(r.firstAskedAt&&r.firstAskedAt<old.firstAskedAt)old.firstAskedAt=r.firstAskedAt;for(const field of ['language','itemType','example','exampleMeaning','reading'] as const)if(extra[field])Object.assign(old,{[field]:extra[field]});merged++;}
 else{state.words.push({id:uuid(),...r,firstAskedAt:r.firstAskedAt||now,addedAt:now,sources:[{at:now,context:r.context}],level:0,nextReview:null,correct:0,wrong:0,lastStudiedAt:null});added++;}}
 return {added,merged};
}
