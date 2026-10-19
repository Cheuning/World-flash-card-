export type WorldSession = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: { id: string; email?: string | null };
};
export type WorldSignUpResult = { session?: WorldSession | null };

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function config() {
  if (!url || !key) throw new Error('WORLD 동기화 설정을 찾을 수 없어요.');
  return { url, key };
}

async function auth(path: string, body: Record<string, unknown>) {
  const current = config();
  const response = await fetch(`${current.url}/auth/v1/${path}`, {
    method: 'POST',
    headers: { apikey: current.key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload: any = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.msg || payload.message || '인증을 완료하지 못했어요.');
  return payload as WorldSession & { session?: WorldSession | null };
}

export async function signInWorld(email: string, password: string) {
  return auth('token?grant_type=password', { email, password }) as Promise<WorldSession>;
}

export async function signUpWorld(email: string, password: string) {
  return auth('signup', { email, password }) as Promise<WorldSignUpResult>;
}

export async function refreshWorldSession(refresh_token: string) {
  return auth('token?grant_type=refresh_token', { refresh_token }) as Promise<WorldSession>;
}
