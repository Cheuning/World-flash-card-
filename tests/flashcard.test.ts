import assert from 'node:assert/strict';
// @ts-ignore direct Node regression runner
import { defaults,importWords,startSession,grade,nextQuestion,wordLanguage,type State } from '../lib/learning.ts';
// @ts-ignore direct Node regression runner
import { parseContent } from '../lib/import-content.ts';
const rows=parseContent('apple | 사과 | 명사 | I eat an apple. | 나는 사과를 먹는다. | en\n猫 | 고양이 | 명사 | 猫がいます。 | 고양이가 있어요. | ja');
assert.deepEqual(rows.map(w=>w.language),['en','ja']);assert.equal(rows[1].exampleMeaning,'고양이가 있어요.');
const sentence=parseContent('[{"text":"今日はいい天気ですね。","meaning":"오늘은 날씨가 좋네요.","type":"sentence"}]')[0];
assert.equal(sentence.language,'ja');assert.equal(sentence.itemType,'sentence');
assert.equal(parseContent('deficient - 부족한')[0].language,'en');
assert.equal(parseContent('```json\n[{"english":"本","meaning":"책"}]\n```')[0].language,'ja');
assert.throws(()=>parseContent(''));assert.throws(()=>parseContent('[{"english":"a","meaning":"a","language":"fr"}]'));
const state:State={version:0,words:[],sessions:[],settings:structuredClone(defaults),history:[]};
importWords(state,rows,'2026-10-16T01:00:00Z');importWords(state,parseContent('[{"english":"apple","meaning":"사과","example":"A red apple.","exampleMeaning":"빨간 사과."}]'),'2026-10-16T01:00:00Z');
assert.equal(state.words.length,2);assert.equal(state.words[0].exampleMeaning,'빨간 사과.');
const english={...state,words:state.words.filter(w=>wordLanguage(w)==='en'),sessions:[]};
const s=startSession(english,'2026-10-16T01:00:00Z','Asia/Seoul');assert.equal(s.target,1);
let a=grade(english,{sessionId:s.id,questionId:s.question!.id,inputMethod:'flashcard',known:false,responseMs:800},'2026-10-16T01:00:01Z');
assert.equal(a.judging,'self-assessed');assert.equal(a.correct,false);assert.equal(s.entries[0].passed,false);
delete s.lastFeedback;nextQuestion(s,'2026-10-16T01:00:02Z');
a=grade(english,{sessionId:s.id,questionId:s.question!.id,inputMethod:'flashcard',known:true,responseMs:800},'2026-10-16T01:00:03Z');
assert.equal(a.correct,true);assert.equal(s.entries[0].passed,true);assert.equal(english.words[0].level,1);
delete s.lastFeedback;nextQuestion(s,'2026-10-16T01:00:04Z');assert.ok(s.endedAt);
assert.equal(state.words[1].correct,0);assert.equal(state.words[1].lastStudiedAt,null);
console.log('PASS: legacy import, example translation, auto language, sentence cards, merged content, self assessment, retry/completion, isolated Japanese word');
