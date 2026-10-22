'use client';
import { useRef, useState } from 'react';
import { Volume2, ArrowLeft, ArrowRight, Mic } from 'lucide-react';
import { wordLanguage, type Word } from '@/lib/learning';

export function Flashcard({word,reverse=false,disabled,onSpeak,onPractice,listening,transcript,speechSupported,onGrade}:{word:Word;reverse?:boolean;disabled:boolean;onSpeak:()=>void;onPractice:()=>void;listening:boolean;transcript:string;speechSupported:boolean;onGrade:(known:boolean)=>void}){
 const [back,setBack]=useState(false),[offset,setOffset]=useState(0);
 const gesture=useRef<{x:number;y:number}|null>(null),swiped=useRef(false);
 const flip=()=>{if(!disabled)setBack(v=>!v);};
 return <div className="flashcard-area">
  <div className="paper-stack">
   <div className={'paper-card '+(back?'is-back':'')} role="button" tabIndex={disabled?-1:0} aria-disabled={disabled} aria-label={back?'카드 앞면 보기':'카드 뒤집어 뜻 보기'}
    style={{transform:`translateX(${offset}px) rotate(${offset/24}deg)`}}
    onPointerDown={e=>{if(disabled||e.button!==0)return;gesture.current={x:e.clientX,y:e.clientY};swiped.current=false;e.currentTarget.setPointerCapture(e.pointerId);}}
    onPointerMove={e=>{const g=gesture.current;if(!g)return;const x=e.clientX-g.x,y=e.clientY-g.y;if(Math.abs(y)>14&&Math.abs(y)>Math.abs(x)){gesture.current=null;swiped.current=true;setOffset(0);return;}if(Math.abs(x)>8&&Math.abs(x)>Math.abs(y)*1.15){swiped.current=true;setOffset(Math.max(-150,Math.min(150,x)));}}}
    onPointerUp={e=>{const g=gesture.current;gesture.current=null;const x=g?e.clientX-g.x:0,y=g?e.clientY-g.y:0;setOffset(0);if(g&&Math.abs(x)>56&&Math.abs(x)>Math.abs(y)*1.15&&!disabled)onGrade(x>0);}}
    onPointerCancel={()=>{gesture.current=null;setOffset(0);swiped.current=true;}}
    onClick={()=>{if(swiped.current){swiped.current=false;return;}flip();}}
    onKeyDown={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();flip();}}}>
    <div className="card-copy" aria-live="polite">
     <h1 lang={back?wordLanguage(word):reverse?'ko':wordLanguage(word)} className={!back&&reverse?'card-meaning':''}>{back?word.english:reverse?word.meaning:word.english}</h1>
     {back&&<div className="card-details"><p className="card-definition">{word.meaning}</p>{word.pos&&<span className="card-pos">{word.pos}</span>}{word.reading&&<p className="card-reading">{word.reading}</p>}{(word.example||word.context)&&<section className="card-example"><p lang={wordLanguage(word)}>{word.example||word.context}</p>{word.exampleMeaning&&<p className="example-meaning">{word.exampleMeaning}</p>}</section>}</div>}
    </div>
   </div>
  </div>
  <div className="card-practice"><button type="button" onClick={onPractice} disabled={disabled||!speechSupported} aria-pressed={listening} title={!speechSupported?'음성 인식을 지원하지 않는 브라우저입니다.':undefined}><Mic size={17}/>{listening?'말하기 중지':'발음 말하기'}</button><button type="button" className="card-audio" aria-label="발음 듣기" onClick={onSpeak} disabled={disabled}><Volume2 size={21}/></button></div>
  {transcript&&<p className="card-transcript" role="status">{transcript}</p>}
  <div className="card-verdict" aria-live="polite">{Math.abs(offset)>40?(offset>0?'외움 →':'← 모름'):''}</div>
  <div className="card-actions"><button disabled={disabled} onClick={()=>onGrade(false)}><ArrowLeft size={20}/>모름</button><button className="known" disabled={disabled} onClick={()=>onGrade(true)}>외움<ArrowRight size={20}/></button></div>
 </div>;
}
