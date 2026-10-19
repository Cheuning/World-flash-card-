'use client';
import { useEffect, useRef, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';

type InstallEvent=Event & { prompt:()=>Promise<void>; userChoice:Promise<{outcome:'accepted'|'dismissed'}> };

export function PwaControls(){
 const [install,setInstall]=useState<InstallEvent|null>(null),[installed,setInstalled]=useState(false),[working,setWorking]=useState(false),[waiting,setWaiting]=useState<ServiceWorker|null>(null),[error,setError]=useState('');
 const [onProduction,setOnProduction]=useState(true);
 const updating=useRef(false);
 useEffect(()=>{
  setOnProduction(window.location.origin==='https://world-flash-card.vercel.app');
  const display=window.matchMedia('(display-mode: standalone)');
  const updateDisplay=()=>setInstalled(display.matches);
  updateDisplay();display.addEventListener('change',updateDisplay);
  const beforeInstall=(event:Event)=>{event.preventDefault();setInstall(event as InstallEvent);};
  const didInstall=()=>{setInstalled(true);setInstall(null);};
  window.addEventListener('beforeinstallprompt',beforeInstall);window.addEventListener('appinstalled',didInstall);
  let disposed=false;
  const changeController=()=>{if(updating.current)window.location.reload();};
  let registration:ServiceWorkerRegistration|undefined;
  const checkWaiting=()=>{if(!disposed&&registration?.waiting&&navigator.serviceWorker.controller)setWaiting(registration.waiting);};
  const found=()=>{const worker=registration?.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed')checkWaiting();});};
  if('serviceWorker' in navigator&&window.isSecureContext){
   navigator.serviceWorker.addEventListener('controllerchange',changeController);
   navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).then(value=>{
    if(disposed)return;registration=value;checkWaiting();registration.addEventListener('updatefound',found);
   }).catch(()=>{if(!disposed)setError('앱 준비를 마치지 못했어요. 페이지를 새로고침해주세요.');});
  }
  return()=>{disposed=true;display.removeEventListener('change',updateDisplay);window.removeEventListener('beforeinstallprompt',beforeInstall);window.removeEventListener('appinstalled',didInstall);registration?.removeEventListener('updatefound',found);navigator.serviceWorker?.removeEventListener('controllerchange',changeController);};
 },[]);
 async function promptInstall(){if(!install||working)return;setWorking(true);setError('');try{await install.prompt();await install.userChoice;setInstall(null);}catch{setError('브라우저 메뉴에서 WORLD 앱 설치를 선택해주세요.');}finally{setWorking(false);}}
 return <div className="pwa-controls">
  {!installed&&install&&<button className="pwa-button" onClick={promptInstall} disabled={working}><Download size={16}/>{working?'설치 준비 중':'WORLD 설치'}</button>}
  {!installed&&!install&&(onProduction?<span className="pwa-help">Chrome 메뉴 ⋮ → 앱 설치</span>:<a className="pwa-button" href="https://world-flash-card.vercel.app/">정식 주소에서 앱 설치</a>)}
  {waiting&&<button className="pwa-button" disabled={working} onClick={()=>{setWorking(true);updating.current=true;waiting.postMessage({type:'SKIP_WAITING'});}}><RefreshCw size={16}/>업데이트</button>}
  {error&&<span className="pwa-error" role="status">{error}</span>}
 </div>;
}
