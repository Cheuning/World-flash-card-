import assert from 'node:assert/strict';
// @ts-ignore Node executes the TypeScript source directly.
import { syncDailyGoal, defaults, importWords,parseImport,startSession,grade,nextQuestion,correctJudgment,candidates,validateSettings,learningDay,completedOnDay,completionStreak,selectVoiceAnswer,isCorrect,dailyHistory,dailyProgress,learningDayKey,type HistoryAttempt,type State } from '../lib/learning.ts';
const now='2026-09-23T12:00:00.000Z';
const fresh=():State=>({version:0,words:[],sessions:[],settings:{...structuredClone(defaults),direction:'en-ko'},history:[]});
const s=fresh();importWords(s,parseImport(Array.from({length:8},(_,i)=>`word${i} | 뜻${i}`).join('\n')),now);
let se=startSession(s,now);assert.equal(se.target,8);const first=se.question!.wordId;
function answer(text:string){const a=grade(s,{sessionId:se.id,questionId:se.question!.id,answer:text,presentedAt:now,responseMs:500,inputMethod:'typing'},now);delete se.lastFeedback;nextQuestion(se,now);return a;}
answer('wrong');for(let i=0;i<5;i++){assert.notEqual(se.question!.wordId,first);answer(s.words.find(w=>w.id===se.question!.wordId)!.meaning);}
assert.equal(se.question!.wordId,first);answer(s.words.find(w=>w.id===first)!.meaning);while(!se.endedAt)answer(s.words.find(w=>w.id===se.question!.wordId)!.meaning);
assert.equal(se.attempts,9);assert.equal(se.entries.filter(e=>e.passed).length,8);assert.equal(s.words[0].level,1);assert.equal(s.words.find(w=>w.id===first)!.wrong,1);assert.equal(s.words[0].nextReview,'2026-09-24T12:00:00.000Z');assert.equal(candidates(s.words,s.settings,Date.parse(now)).target,8);
const s2=fresh();importWords(s2,parseImport('Deficient | 부족한\ndeficient | 결핍된'),now);assert.equal(s2.words.length,1);assert.ok(s2.words[0].meaning.includes('결핍된'));
s2.words[0].level=4;s2.words[0].lastStudiedAt='2026-09-01T12:00:00Z';s2.words[0].nextReview='2026-09-02T12:00:00Z';const review=startSession(s2,now);const attempt=grade(s2,{sessionId:review.id,questionId:review.question!.id,answer:'모자란',responseMs:1000,presentedAt:now},now);assert.equal(s2.words[0].level,0);const correction=correctJudgment(s2,review.id,now);assert.equal(attempt.correct,false);assert.equal(correction.correctedCorrect,true);assert.equal(s2.words[0].level,5);assert.equal(s2.words[0].wrong,0);assert.equal(review.correct,1);
assert.throws(()=>validateSettings({...defaults,intervals:[7,1]}));assert.throws(()=>parseImport('invalid'));
const s3=fresh();importWords(s3,parseImport(Array.from({length:60},(_,i)=>`x${i} | 뜻`).join('\n')),now);s3.words.slice(0,35).forEach(w=>{w.lastStudiedAt='2026-09-20T00:00:00Z';w.nextReview='2026-09-21T00:00:00Z';w.level=2;});const p=candidates(s3.words,s3.settings,Date.parse(now));assert.equal(p.target,30);assert.equal(new Set(p.selected.map(w=>w.id)).size,30);
console.log('PASS: delayed retry, completion, next-day schedule, additional practice selection, duplicate merge, review reset, append-only correction, settings validation, random pool size');

const dayKey=(d:Date)=>[d.getFullYear(),d.getMonth()+1,d.getDate()].join('-');
assert.equal(dayKey(learningDay(new Date(2026,8,24,1),4)),'2026-9-23');
assert.equal(dayKey(learningDay(new Date(2026,8,24,3,59,59),4)),'2026-9-23');
assert.equal(dayKey(learningDay(new Date(2026,8,24,4),4)),'2026-9-24');
assert.equal(dayKey(learningDay(new Date(2026,8,24,0),0)),'2026-9-24');
assert.equal(dayKey(learningDay(new Date(2026,0,1,1),4)),'2025-12-31');
assert.equal(dayKey(learningDay(new Date(2026,2,1,1),4)),'2026-2-28');
assert.equal(validateSettings({...defaults,dayStartHour:undefined}).dayStartHour,0);
for(const dayStartHour of [-1,24,1.5,'4',NaN])assert.throws(()=>validateSettings({...defaults,dayStartHour}));
assert.equal(validateSettings({...defaults,dayStartHour:23}).dayStartHour,23);
assert.equal(se.entries[0].passedAt,now);
assert.equal(review.entries[0].passedAt,now);
const across=structuredClone(se);
across.startedAt=new Date(2026,8,23,23).toISOString();
across.entries=[
 {wordId:'before',kind:'new',passed:true,passedAt:new Date(2026,8,24,1).toISOString(),appearances:1,availableAt:0},
 {wordId:'after',kind:'new',passed:true,passedAt:new Date(2026,8,24,4).toISOString(),appearances:1,availableAt:0},
 {wordId:'legacy',kind:'new',passed:true,appearances:1,availableAt:0},
];
assert.equal(completedOnDay([across],new Date(2026,8,24,1),4),2);
assert.equal(completedOnDay([across],new Date(2026,8,24,4),4),1);
assert.equal(completedOnDay([across,across],new Date(2026,8,24,4),4),1);
console.log('PASS: local learning-day boundaries, month/year rollover, setting validation, completion/correction timestamps, cross-day and legacy counts');

assert.equal(selectVoiceAnswer(['april apple apple'],'apple'),'apple');
assert.equal(selectVoiceAnswer(['whole some','wholesome'],'wholesome'),'wholesome');
assert.equal(selectVoiceAnswer(['I said ice cream twice'],'ice cream'),'ice cream');
assert.equal(selectVoiceAnswer(['부족한 결핍된'],'부족한; 결핍된'),'부족한');
assert.equal(selectVoiceAnswer(['음 결핍된'],'부족한; 결핍된'),'결핍된');
assert.equal(selectVoiceAnswer(['The dog'],'he'),null);
assert.equal(selectVoiceAnswer(['scar cart'],'car'),null);
assert.equal(selectVoiceAnswer(['apples'],'apple'),null);
assert.equal(selectVoiceAnswer(['I can’t go'],"can't"),"can't");
assert.equal(selectVoiceAnswer(['cant'],"can't"),null);
assert.equal(selectVoiceAnswer(['wrong answer'],'apple'),null);
assert.equal(selectVoiceAnswer([], 'apple'),null);
assert.equal(isCorrect('colour','color'),true);
assert.equal(isCorrect('color','colour'),true);
assert.equal(isCorrect('organise','organize'),true);
assert.equal(isCorrect('cheque','check'),true);
assert.equal(isCorrect('grey','green'),false);
assert.equal(validateSettings({...defaults,accent:undefined}).accent,'us');
assert.equal(validateSettings({...defaults,accent:'uk'}).accent,'uk');
assert.throws(()=>validateSettings({...defaults,accent:'au'}));
const finished=(year:number,month:number,day:number,hour=12)=>{const at=new Date(year,month-1,day,hour).toISOString();return {...structuredClone(se),startedAt:at,endedAt:at,dayKey:undefined,dailyTarget:undefined,requestedGoal:8,entries:se.entries.map(e=>({...e,passedAt:at,passedDay:undefined}))};};
assert.equal(completionStreak([finished(2026,9,24),finished(2026,9,24),finished(2026,9,23),finished(2026,9,21)],new Date(2026,8,24,12),4),2);
assert.equal(completionStreak([finished(2026,9,24,1),finished(2026,9,22)],new Date(2026,8,24,1),4),2);
assert.equal(completionStreak([finished(2026,9,24,4),finished(2026,9,23,4)],new Date(2026,8,24,4),4),2);
assert.equal(completionStreak([finished(2026,1,1),finished(2025,12,31)],new Date(2026,0,1,12),0),2);
assert.equal(completionStreak([{...finished(2026,9,24),endedAt:null}],new Date(2026,8,24,12),0),1);
assert.equal(completionStreak([{...finished(2026,9,24),requestedGoal:30}],new Date(2026,8,24,12),0),0);
console.log('PASS: repeated voice candidates, word boundaries, phrases, Korean alternatives, contractions, completion streak deduplication and day boundaries');

// The goal limits session size, never access to study or the daily number of sessions.
assert.throws(()=>startSession(s,now),/추가 학습할 단어 수/);
assert.throws(()=>startSession(s,now,undefined,1),/오늘 출제하지 않은/);
const one=fresh();importWords(one,parseImport('one | 하나'),now);assert.equal(startSession(one,now).target,1);
const practice=fresh();importWords(practice,parseImport('a | 가\nb | 나\nc | 다'),now);practice.settings.goal=1;
practice.words.forEach((w,i)=>{w.lastStudiedAt=`2026-09-${22-i}T12:00:00.000Z`;w.nextReview='2026-10-01T12:00:00.000Z';});
assert.equal(candidates(practice.words,practice.settings,Date.parse(now)).target,1);
practice.words[2].deletedAt=now;
assert.ok(candidates(practice.words,practice.settings,Date.parse(now)).selected.every(w=>!w.deletedAt));
practice.words[0].lastStudiedAt=null;
assert.equal(candidates(practice.words,practice.settings,Date.parse(now),()=>0).selected[0].english,'b');
practice.words.forEach(w=>w.deletedAt=now);assert.throws(()=>startSession(practice,now),/단어를 추가/);
const h=(id:string,wordId:string,sessionId:string,day:number,hour:number,correct:boolean):HistoryAttempt=>({id,wordId,sessionId,answeredAt:new Date(2026,8,day,hour).toISOString(),correct,responseMs:500,kind:'review'});
const records=[h('1','a','morning',24,8,false),h('2','a','morning',24,9,true),h('3','b','evening',24,20,true),h('4','a','evening',24,21,true),h('5','c','overnight',25,1,true),h('6','c','overnight',25,4,false)];
const grouped=dailyHistory([...records].reverse(),4);
assert.equal(grouped.length,2);assert.equal(dayKey(new Date(grouped[1].day)),'2026-9-24');
assert.equal(grouped[1].words,3);assert.equal(grouped[1].attempts,5);assert.equal(grouped[1].sessions,3);assert.equal(grouped[1].immediateCorrect,2);assert.equal(grouped[1].rate,67);assert.equal(grouped[1].activeMs,2500);
assert.equal(grouped[0].words,1);assert.equal(grouped[0].rate,0);
assert.equal(dailyHistory(records,0)[1].words,2);
const correctedRecords=records.map(r=>r.id==='1'?{...r,correct:true}:r);
assert.equal(dailyHistory(correctedRecords,4)[1].rate,100);assert.equal(records[0].correct,false);
assert.deepEqual(dailyHistory([],4),[]);
console.log('PASS: single word below goal, continue after completion, future-review eligibility, random selection, deletion, daily session merge, unique words, first-answer rate, corrections, day boundary');

// Explicit timezone boundaries: the Worker can be UTC while the learner is in Korea.
assert.equal(learningDayKey('2026-09-27T18:59:59Z',4,'Asia/Seoul'),'2026-09-27');
assert.equal(learningDayKey('2026-09-27T19:00:00Z',4,'Asia/Seoul'),'2026-09-28');
assert.equal(learningDayKey('2026-12-31T16:00:00Z',4,'Asia/Seoul'),'2026-12-31');
const dayState=fresh();dayState.settings.goal=30;dayState.settings.dayStartHour=4;
const day1='2026-09-27T10:00:00Z',day2='2026-09-28T10:00:00Z';
importWords(dayState,parseImport(Array.from({length:40},(_,i)=>`daily${i} | 뜻${i}`).join('\n')),day1);
const old=startSession(dayState,day1,'Asia/Seoul');assert.equal(old.target,30);
function pass(state:State,session:typeof old,at:string){const w=state.words.find(w=>w.id===session.question!.wordId)!;grade(state,{sessionId:session.id,questionId:session.question!.id,answer:w.meaning,responseMs:1},at);delete session.lastFeedback;nextQuestion(session,at);}
for(let i=0;i<20;i++)pass(dayState,old,day1);
assert.equal(dailyProgress(dayState,day1,'Asia/Seoul').completed,20);
assert.equal(completionStreak(dayState.sessions,day1,4,dayState.words,'Asia/Seoul'),0);
const remaining=old.entries.filter(e=>!e.passed).map(e=>e.wordId);
assert.equal(startSession(dayState,day1,'Asia/Seoul').id,old.id);
assert.equal(dailyProgress(dayState,day2,'Asia/Seoul').completed,0);
const resumed=startSession(dayState,day2,'Asia/Seoul');assert.notEqual(resumed.id,old.id);assert.equal(old.closedReason,'day-boundary');assert.equal(resumed.target,30);
assert.deepEqual(resumed.entries.slice(0,10).map(e=>e.wordId),remaining);
assert.equal(new Set(resumed.entries.map(e=>e.wordId)).size,30);
for(let i=0;i<10;i++)pass(dayState,resumed,day2);
assert.equal(dailyProgress(dayState,day2,'Asia/Seoul').completed,10);assert.equal(dailyProgress(dayState,day2,'Asia/Seoul').achieved,false);
for(let i=0;i<20;i++)pass(dayState,resumed,day2);
assert.equal(dailyProgress(dayState,day2,'Asia/Seoul').achieved,true);
assert.equal(completionStreak(dayState.sessions,day2,4,dayState.words,'Asia/Seoul'),1);
dayState.settings.goal=100;assert.equal(dailyProgress(dayState,day2,'Asia/Seoul').target,30);
assert.equal(completionStreak(dayState.sessions,'2026-09-29T10:00:00Z',4,dayState.words,'Asia/Seoul'),1);
assert.equal(completionStreak(dayState.sessions,'2026-09-30T10:00:00Z',4,dayState.words,'Asia/Seoul'),0);
const scarce=fresh();importWords(scarce,parseImport(Array.from({length:19},(_,i)=>`few${i} | 뜻${i}`).join('\n')),day1);
const small=startSession(scarce,day1,'Asia/Seoul');assert.equal(small.target,19);assert.equal(small.dailyTarget,19);
for(let i=0;i<18;i++)pass(scarce,small,day1);
assert.equal(dailyProgress(scarce,day1,'Asia/Seoul').achieved,false);
pass(scarce,small,day1);assert.equal(dailyProgress(scarce,day1,'Asia/Seoul').achieved,true);
assert.equal(completionStreak(scarce.sessions,day1,0,scarce.words,'Asia/Seoul'),1);
assert.equal(dailyProgress(fresh(),day1,'Asia/Seoul').achieved,false);
// Growing vocabulary expands today's base goal without losing completed words.
syncDailyGoal(scarce,day1,'Asia/Seoul');
importWords(scarce,parseImport('extra19 | 추가'),day1);
syncDailyGoal(scarce,day1,'Asia/Seoul');
assert.equal(dailyProgress(scarce,day1,'Asia/Seoul').achieved,true);
assert.equal(completionStreak(scarce.sessions,day1,0,scarce.words,'Asia/Seoul'),1);
assert.equal(dailyProgress(scarce,day1,'Asia/Seoul').target,20);
assert.equal(dailyProgress(scarce,day1,'Asia/Seoul').completed,19);
const twentieth=startSession(scarce,day1,'Asia/Seoul');assert.equal(twentieth.target,1);
pass(scarce,twentieth,day1);
importWords(scarce,parseImport(Array.from({length:20},(_,i)=>`extra${20+i} | 추가`).join('\n')),day1);
assert.equal(dailyProgress(scarce,day1,'Asia/Seoul').target,30);
const topup=startSession(scarce,day1,'Asia/Seoul');assert.equal(topup.target,10);
while(!topup.endedAt)pass(scarce,topup,day1);
assert.equal(dailyProgress(scarce,day1,'Asia/Seoul').completed,30);
scarce.settings.direction='mixed';scarce.settings.enRatio=70;
const prior=new Set(scarce.sessions.flatMap(s=>s.entries.map(e=>e.wordId)));
const more=startSession(scarce,day1,'Asia/Seoul',7);
assert.equal(more.target,7);assert.equal(more.studyGoal,37);
assert.equal(more.entries.filter(e=>e.direction==='en-ko').length,5);
assert.ok(more.entries.every(e=>!prior.has(e.wordId)));
assert.equal(startSession(scarce,day1,'Asia/Seoul',3).id,more.id);
assert.equal(dailyProgress(scarce,day1,'Asia/Seoul').achieved,true);
assert.equal(completionStreak(scarce.sessions,day1,0,scarce.words,'Asia/Seoul'),1);
while(!more.endedAt){const w=scarce.words.find(w=>w.id===more.question!.wordId)!;grade(scarce,{sessionId:more.id,questionId:more.question!.id,answer:more.question!.direction==='en-ko'?w.meaning:w.english},day1);delete more.lastFeedback;nextQuestion(more,day1);}
const last=startSession(scarce,day1,'Asia/Seoul',10);assert.equal(last.target,3);assert.equal(last.studyGoal,40);
assert.equal(dailyProgress(scarce,day2,'Asia/Seoul').completed,0);
assert.equal(dailyProgress(scarce,day2,'Asia/Seoul').target,30);
console.log('PASS: growing daily goal, goal cap, extra count, unseen pool, exact rounded ratio, resume, streak and day reset');
assert.throws(()=>startSession(fresh(),day1,'Asia/Seoul'));
const mix=fresh();importWords(mix,parseImport(Array.from({length:100},(_,i)=>`pool${i} | 뜻`).join('\n')),day1);
mix.words.slice(2).forEach(w=>{w.lastStudiedAt=day1;w.nextReview='2027-01-01T00:00:00Z';});
const sampled=candidates(mix.words,mix.settings,Date.parse(day1),()=>0);
assert.equal(sampled.target,30);assert.ok(sampled.selected.some(w=>!!w.nextReview));assert.equal(new Set(sampled.selected.map(w=>w.id)).size,30);
console.log('PASS: full-pool random sampling, resume identity, 20+10 across days is not 30, remaining-first replenishment, 19-word exception, zero words, timezone/year boundary, stable daily target and streak');
