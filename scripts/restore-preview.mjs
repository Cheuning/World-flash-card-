import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
const file=process.argv[2];if(!file)throw Error('백업 JSON 경로를 지정해주세요.');
const data=JSON.parse(readFileSync(resolve(file),'utf8'));
for(const k of ['words','sessions','attempts','corrections','settings_history'])if(!Array.isArray(data[k]))throw Error(`누락된 백업 항목: ${k}`);
mkdirSync('work',{recursive:true});const db=new DatabaseSync('work/preview.sqlite');
db.exec('CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY,kind TEXT NOT NULL,data TEXT NOT NULL,created_at TEXT NOT NULL);CREATE TABLE IF NOT EXISTS revisions(id INTEGER PRIMARY KEY,version INTEGER NOT NULL);');
if(db.prepare('SELECT COUNT(*) AS n FROM records').get().n)throw Error('로컬 저장소가 비어 있지 않습니다. 기존 내용을 덮어쓰지 않았습니다.');
const rows=[];
for(const [key,kind] of [['words','word'],['sessions','session'],['attempts','attempt'],['corrections','correction'],['settings_history','history']])for(const record of data[key])rows.push({id:record.id,kind,data:record});
rows.push({id:'settings',kind:'settings',data:data.settings});
db.exec('BEGIN IMMEDIATE');try{const insert=db.prepare('INSERT INTO records(id,kind,data,created_at) VALUES(?,?,?,?)');for(const row of rows)insert.run(row.id,row.kind,JSON.stringify(row.data),row.data.addedAt||row.data.startedAt||row.data.answeredAt||row.data.changedAt||row.data.at||data.exportedAt);db.prepare('INSERT OR REPLACE INTO revisions VALUES(1,1)').run();db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}finally{db.close();}
console.log(JSON.stringify({records:rows.length,words:data.words.length,liveWords:data.words.filter(w=>!w.deletedAt).length,sessions:data.sessions.length,attempts:data.attempts.length,corrections:data.corrections.length,settingsHistory:data.settings_history.length}));
