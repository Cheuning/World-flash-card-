'use client';

import { useState } from 'react';
import { LogIn, LogOut, UserRound } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { signInWorld, signUpWorld, type WorldSession } from '@/lib/world-auth';

export function AuthPanel({ session, onSession, onSignOut }: {
  session: WorldSession | null;
  onSession: (session: WorldSession) => Promise<void>;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage('');
    try {
      let next: WorldSession | null | undefined;
      if (mode === 'signin') next = await signInWorld(email, password);
      else next = (await signUpWorld(email, password)).session;
      if (!next?.access_token) {
        setMessage('인증 메일을 보냈어요. 메일 인증을 마친 뒤 로그인해주세요.');
        return;
      }
      await onSession(next);
      setOpen(false); setPassword('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '인증을 완료하지 못했어요.');
    } finally { setBusy(false); }
  }

  if (session) return <div className="auth-status"><span title={session.user.email || undefined}><UserRound size={16}/>{session.user.email || '로그인됨'}</span><button className="text-button" onClick={onSignOut}><LogOut size={15}/>로그아웃</button></div>;
  return <>
    <button className="text-button auth-trigger" onClick={() => { setOpen(true); setMessage(''); }}><LogIn size={16}/>로그인</button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="auth-dialog">
        <DialogTitle>WORLD 계정</DialogTitle>
        <DialogDescription>로그인하면 단어장과 학습 기록을 기기마다 이어서 볼 수 있어요.</DialogDescription>
        <form className="auth-form" onSubmit={submit}>
          <label>이메일<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
          <label>비밀번호<input type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={6} required value={password} onChange={e => setPassword(e.target.value)} /></label>
          {message && <p className="auth-message" role="status">{message}</p>}
          <button className="primary wide" disabled={busy} type="submit">{busy ? '확인 중…' : mode === 'signin' ? '로그인' : '계정 만들기'}</button>
        </form>
        <button className="text-button auth-switch" type="button" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage(''); }}>
          {mode === 'signin' ? '처음이라면 계정 만들기' : '이미 계정이 있다면 로그인'}
        </button>
      </DialogContent>
    </Dialog>
  </>;
}
