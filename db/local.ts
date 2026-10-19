// Development-only copy of the original D1 records. Never serves production data.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
let connection:DatabaseSync|undefined;
class Statement {
 constructor(public sql:string,public values:any[]=[]){ }
 bind(...values:any[]){return new Statement(this.sql,values);}
 run(){const r=db().prepare(this.sql).run(...this.values);return {meta:{changes:Number(r.changes)}};}
 all(){return {results:db().prepare(this.sql).all(...this.values)};}
}
function db(){
 if(process.env.NODE_ENV==='production')throw Error('운영 계정 저장소를 먼저 연결해주세요.');
 if(!connection){mkdirSync(join(process.cwd(),'work'),{recursive:true});connection=new DatabaseSync(join(process.cwd(),'work','preview.sqlite'));connection.exec('CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY,kind TEXT NOT NULL,data TEXT NOT NULL,created_at TEXT NOT NULL);CREATE TABLE IF NOT EXISTS revisions(id INTEGER PRIMARY KEY,version INTEGER NOT NULL);');}
 return connection;
}
export function database(){return {prepare:(sql:string)=>new Statement(sql),batch:async(statements:Statement[])=>{const c=db();c.exec('BEGIN IMMEDIATE');try{const results=statements.map(s=>/^\s*SELECT/i.test(s.sql)?{...s.all(),meta:{changes:0}}:{...s.run(),results:[]});c.exec('COMMIT');return results;}catch(e){c.exec('ROLLBACK');throw e;}}};}
