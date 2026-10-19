'use client';
import { useRef, useState } from 'react';
import { Volume2, RotateCw, ArrowLeft, ArrowRight } from 'lucide-react';
import { wordLanguage, type Word } from '@/lib/learning';

export function Flashcard({word,reverse=false,disabled,onSpeak,onGrade}:{word:Word;reverse?:boolean;disabled:boolean;onSpeak:()=>void;onGrade:(known:boolean)=>void}){
 const [back,setBack]=useState(false),[offset,setOffset]=useState(0);
 const gesture=useRef<{x:number;y:number}|null>(null),swiped=useRef(false);
 const flip=()=>{if(!disabled)setBack(v=>!v);};
 return <div className="flashcard-area">
  <div className="paper-stack">
   <button className="card-audio" aria-label="발음 듣기" onClick={onSpeak} disabled={disabled}><Volume2 size={22}/></button>
   <div className={'paper-card '+(back?'is-back':'')} role="button" tabIndex={disabled?-1:0} aria-disabled={disabled} aria-label={back?'카드 앞면 보기':'카드 뒤집어 뜻 보기'}
    style={{transform:`translateX(${offset}px) rotate(${offset/24}deg)`}}
    onPointerDown={e=>{if(disabled||e.button!==0)return;gesture.current={x:e.clientX,y:e.clientY};swiped.current=false;}}
    onPointerMove={e=>{const g=gesture.current;if(!g)return;const x=e.clientX-g.x,y=e.clientY-g.y;if(Math.abs(y)>18&&Math.abs(y)>Math.abs(x)){gesture.current=null;setOffset(0);return;}if(Math.abs(x)>12&&Math.abs(x)>Math.abs(y)*1.4){swiped.current=true;e.currentTarget.setPointerCapture(e.pointerId);setOffset(Math.max(-130,Math.min(130,x)));}}}
    onPointerUp={e=>{const g=gesture.current;gesture.current=null;setOffset(0);if(g&&swiped.current&&Math.abs(e.clientX-g.x)>80&&!disabled)onGrade(e.clientX>g.x);}}
    onPointerCancel={()=>{gesture.current=null;setOffset(0);swiped.current=true;}}
    onClick={()=>{if(swiped.current){swiped.current=false;return;}flip();}}
    onKeyDown={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();flip();}}}>
    <div className="card-kicker">{wordLanguage(word)==='ja'?'日本語':'ENGLISH'} · {word.itemType==='sentence'?'문장':'단어'}<span>{back?'BACK':'FRONT'}</span></div>
    <div className="card-copy" aria-live="polite">
     <h1 lang={back?reverse?wordLanguage(word):'ko':reverse?'ko':wordLanguage(word)} className={(back?!reverse:reverse)?'card-meaning':''}>{back?(reverse?word.english:word.meaning):(reverse?word.meaning:word.english)}</h1>
     {back&&<div className="card-details">{word.pos&&<span className="card-pos">{word.pos}</span>}{word.reading&&<p className="card-reading">{word.reading}</p>}{(word.example||word.context)&&<section className="card-example"><span>예문</span><p lang={wordLanguage(word)}>{word.example||word.context}</p>{word.exampleMeaning&&<p className="example-meaning">{word.exampleMeaning}</p>}</section>}</div>}
    </div>
    <div className="card-footer"><RotateCw size={14}/>{back?'탭하면 앞면으로':'탭해서 뒤집기'}<span>LEVEL {word.level}</span></div>
   </div>
  </div>
  <div className="card-verdict" aria-live="polite">{Math.abs(offset)>40?(offset>0?'외움 →':'← 모름'):'카드를 넘기며 기억을 확인하세요'}</div>
  <div className="card-actions"><button disabled={disabled} onClick={()=>onGrade(false)}><ArrowLeft size={20}/>모름</button><button className="known" disabled={disabled} onClick={()=>onGrade(true)}>외움<ArrowRight size={20}/></button></div>
 </div>;
}
