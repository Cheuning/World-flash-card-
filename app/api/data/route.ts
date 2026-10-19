import { database } from '@/db/local';
import { defaults, syncDailyGoal, learningDayKey, startSession, grade, nextQuestion, correctJudgment, validateSettings, importWords, normalize, uuid, wordLanguage, type Language, type State } from '@/lib/learning';
import { parseContent } from '@/lib/import-content';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type StoredRecord = { id: string; kind: string; data: any; created_at: string };
type RemoteContext = { userId: string; token: string };

function response(data: any, status = 200) { return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } }); }
function worldConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('WORLD 동기화 설정을 찾을 수 없어요.');
  return { url, key };
}
async function remoteContext(req: Request): Promise<RemoteContext | null> {
  const authorization = req.headers.get('authorization'); if (!authorization?.startsWith('Bearer ')) return null;
  const { url, key } = worldConfig(), token = authorization.slice(7);
  const check = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, authorization } });
  const user: any = await check.json().catch(() => null);
  if (!check.ok || !user?.id) throw new Error('로그인 상태가 만료됐어요. 다시 로그인해주세요.');
  return { userId: user.id, token };
}
async function localSource() {
  const db = database(); await db.prepare('INSERT OR IGNORE INTO revisions (id,version) VALUES (1,0)').run();
  const result = await db.batch([db.prepare('SELECT id,kind,data,created_at FROM records'), db.prepare('SELECT version FROM revisions WHERE id=1')]);
  return { records: (result[0].results as any[]).map(row => ({ ...row, data: JSON.parse(row.data) })) as StoredRecord[], version: Number((result[1].results[0] as any).version) };
}
async function remoteSource(context: RemoteContext) {
  const { url, key } = worldConfig(), headers = { apikey: key, authorization: `Bearer ${context.token}` };
  const [recordResponse, revisionResponse] = await Promise.all([fetch(`${url}/rest/v1/world_records?select=id,kind,data,created_at&order=created_at.asc`, { headers }), fetch(`${url}/rest/v1/world_revisions?select=version`, { headers })]);
  const records: any = await recordResponse.json().catch(() => null), revisions: any = await revisionResponse.json().catch(() => null);
  if (!recordResponse.ok || !revisionResponse.ok) throw new Error('동기화 데이터를 불러오지 못했어요.');
  return { records: records as StoredRecord[], version: Number(revisions?.[0]?.version || 0) };
}
async function sourceFor(context: RemoteContext | null) {
  if (context) return remoteSource(context);
  // Vercel has no durable local SQLite volume. Before login, show a clean
  // WORLD account instead of attempting to read the development preview DB.
  if (process.env.NODE_ENV === 'production') return { records: [], version: 0 };
  return localSource();
}
function stateFrom(source: { records: StoredRecord[]; version: number }, language?: Language) {
  const settingsId = language === 'ja' ? 'settings:ja' : 'settings', records = source.records, settings = records.find(record => record.kind === 'settings' && record.id === settingsId);
  const state: State = { version: source.version, words: records.filter(record => record.kind === 'word').map(record => record.data), sessions: records.filter(record => record.kind === 'session').map(record => record.data).sort((a, b) => b.startedAt.localeCompare(a.startedAt)), settings: { ...structuredClone(defaults), ...(settings?.data || {}) }, history: records.filter(record => record.kind === 'history').map(record => record.data).sort((a, b) => a.changedAt.localeCompare(b.changedAt)) };
  if (language) { state.words = state.words.filter(word => wordLanguage(word) === language); state.sessions = state.sessions.filter(session => (session.language || 'en') === language); state.history = state.history.filter(history => (history.language || 'en') === language); }
  if (!state.history.length) state.history = [{ id: language === 'ja' ? 'initial:ja' : 'initial', language: language || 'en', changedAt: new Date().toISOString(), before: null, after: structuredClone(defaults) }];
  return state;
}
async function applyRemoteChanges(context: RemoteContext, expectedVersion: number, records: StoredRecord[]) {
  const { url, key } = worldConfig();
  const request = await fetch(`${url}/rest/v1/rpc/world_apply_changes`, { method: 'POST', headers: { apikey: key, authorization: `Bearer ${context.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_expected_version: expectedVersion, p_records: records }) });
  const payload: any = await request.json().catch(() => ({}));
  if (!request.ok) { if (payload.code === 'P0001' || String(payload.message || '').includes('WORLD_VERSION_CONFLICT')) throw new Error('다른 기기에서 내용이 변경되었습니다. 새로고침 후 다시 시도해주세요.'); throw new Error(payload.message || '동기화 저장에 실패했어요.'); }
}
async function applyLocalChanges(expectedVersion: number, records: StoredRecord[], now: string) {
  const db = database(); const statements = records.map(record => db.prepare('INSERT INTO records (id,kind,data,created_at) SELECT ?,?,?,? WHERE (SELECT version FROM revisions WHERE id=1)=? ON CONFLICT(id) DO UPDATE SET data=excluded.data').bind(record.id, record.kind, JSON.stringify(record.data), record.created_at || now, expectedVersion));
  statements.push(db.prepare('UPDATE revisions SET version=version+1 WHERE id=1 AND version=?').bind(expectedVersion)); const written = await db.batch(statements);
  if (!written.at(-1)?.meta.changes) throw new Error('다른 창에서 내용이 변경되었습니다. 새로고침 후 다시 시도해주세요.');
}
function recordTime(data: any, fallback: string) { return data.addedAt || data.startedAt || data.answeredAt || data.changedAt || data.at || fallback; }
function validBootstrapRecords(value: unknown, fallback: string): StoredRecord[] {
  if (!Array.isArray(value) || !value.length || value.length > 2500) throw new Error('이전할 데이터를 확인하지 못했어요.');
  const allowed = new Set(['word', 'session', 'attempt', 'correction', 'settings', 'history']), ids = new Set<string>();
  return value.map((record: any) => { if (!record || typeof record.id !== 'string' || !record.id || !allowed.has(record.kind) || !record.data || ids.has(record.id)) throw new Error('이전 데이터 형식이 올바르지 않아요.'); ids.add(record.id); return { id: record.id, kind: record.kind, data: record.data, created_at: typeof record.created_at === 'string' ? record.created_at : recordTime(record.data, fallback) }; });
}

export async function GET(req: Request) {
  try {
    const context = await remoteContext(req), url = new URL(req.url), language: Language = url.searchParams.get('language') === 'ja' ? 'ja' : 'en', source = await sourceFor(context), scoped = stateFrom(source, language), wordIds = new Set(scoped.words.map(word => word.id));
    if (url.searchParams.has('history')) {
      const corrected = new Set(source.records.filter(record => record.kind === 'correction').map(record => record.data).filter(correction => correction.correctedCorrect).map(correction => correction.attemptId));
      const attempts = source.records.filter(record => record.kind === 'attempt').map(record => record.data).filter(attempt => wordIds.has(attempt.wordId)).map(attempt => ({ id: attempt.id, sessionId: attempt.sessionId, wordId: attempt.wordId, answeredAt: attempt.answeredAt, correct: attempt.correct || corrected.has(attempt.id), responseMs: attempt.responseMs, kind: attempt.kind }));
      return response({ attempts });
    }
    if (url.searchParams.has('export')) {
      const from = url.searchParams.get('from') || '', to = url.searchParams.get('to') || '9999', inRange = (time: string) => time >= from && time <= to;
      const attempts = source.records.filter(record => record.kind === 'attempt').map(record => record.data).filter(attempt => wordIds.has(attempt.wordId) && inRange(attempt.answeredAt)), ids = new Set(attempts.map(attempt => attempt.id)), sessionIds = new Set(attempts.map(attempt => attempt.sessionId));
      const corrections = source.records.filter(record => record.kind === 'correction').map(record => record.data).filter(correction => ids.has(correction.attemptId)), history = scoped.history.filter(history => inRange(history.changedAt)), preceding = scoped.history.filter(history => history.changedAt < from).at(-1); if (preceding) history.unshift(preceding);
      return response({ schemaVersion: 1, exportedAt: new Date().toISOString(), timezone: 'UTC (ISO 8601); 화면은 기기 현지 시간', range: { from: from || null, to: to === '9999' ? null : to }, notes: { attempts: '원본 판정은 불변입니다. 유효 정답은 corrections의 correctedCorrect를 우선 적용하세요.', words: '삭제 표시를 포함한 현재 단어 전체 스냅샷입니다.', sessions: '기간 중 시도가 있거나 기간 중 시작한 세션 전체입니다.', activeMs: '답변에 소요된 시간 합계; 숨겨진 탭 및 중단 시간 제외', settingsHistory: '기간 직전 설정 1개 및 기간 내 변경 포함' }, attempts, corrections, sessions: scoped.sessions.filter(session => sessionIds.has(session.id) || inRange(session.startedAt)).map(session => ({ ...session, wallDurationMs: Date.parse(session.endedAt || new Date().toISOString()) - Date.parse(session.startedAt), newCount: session.entries.filter(entry => entry.kind === 'new').length, reviewCount: session.entries.filter(entry => entry.kind === 'review').length, passedCount: session.entries.filter(entry => entry.passed).length })), words: scoped.words, settings: scoped.settings, settings_history: history });
    }
    return response(scoped);
  } catch (error) { console.error(error); return response({ error: error instanceof Error ? error.message : '데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.' }, 503); }
}

export async function POST(req: Request) {
  try {
    const origin = req.headers.get('origin'); if (origin && origin !== new URL(req.url).origin) return response({ error: '잘못된 요청입니다.' }, 403);
    if (Number(req.headers.get('content-length') || 0) > 1500000) return response({ error: '입력 내용이 너무 큽니다.' }, 413);
    const context = await remoteContext(req), body: any = await req.json(), language: Language = body.language === 'ja' ? 'ja' : 'en', now = new Date().toISOString();
    if (!context && process.env.NODE_ENV === 'production') return response({ error: '운영 환경에서는 로그인 후 저장할 수 있어요.' }, 401);
    if (body.action === 'bootstrap') {
      if (!context) return response({ error: '로그인이 필요해요.' }, 401);
      const source = await remoteSource(context); if (source.records.length) return response({ error: '이미 동기화된 데이터가 있어요.' }, 409);
      const records = validBootstrapRecords(body.records, now); await applyRemoteChanges(context, source.version, records);
      return response({ state: stateFrom(await remoteSource(context), language), result: { imported: records.length } });
    }
    const source = await sourceFor(context), state = stateFrom(source, language), settingsId = language === 'ja' ? 'settings:ja' : 'settings';
    if (body.version !== state.version) return response({ error: '다른 창에서 내용이 변경되었습니다. 새로고침 후 다시 시도해주세요.' }, 409);
    const previous = new Map<string, string>(); for (const record of [...state.words, ...state.sessions, ...state.history]) previous.set(record.id, JSON.stringify(record)); previous.set(settingsId, JSON.stringify(state.settings)); previous.delete('initial');
    const extra: { id: string; kind: string; data: any }[] = []; let result: any = {}; const studyAction = ['start', 'answer', 'card', 'correct', 'next'].includes(body.action), timeZone = typeof body.timeZone === 'string' ? body.timeZone : 'Asia/Seoul';
    if (studyAction) learningDayKey(now, state.settings.dayStartHour, timeZone); syncDailyGoal(state, now, timeZone);
    const active = state.sessions.find(session => !session.endedAt), dayChanged = studyAction && active && (active.dayKey || learningDayKey(active.startedAt, state.settings.dayStartHour, timeZone)) !== learningDayKey(now, state.settings.dayStartHour, timeZone);
    if (studyAction && active && !dayChanged) startSession(state, now, timeZone);
    if (dayChanged) result = { sessionId: startSession(state, now, timeZone).id, dayChanged: true };
    else switch (body.action) {
      case 'import': { const rows = parseContent(String(body.text || '')); if (rows.length > 500) throw new Error('한 번에 500개까지 가져올 수 있습니다.'); const all = stateFrom(source); state.words = all.words; const activeIds = new Set(all.sessions.filter(session => !session.endedAt).flatMap(session => session.entries.map(entry => entry.wordId))); if (rows.some(row => state.words.some(word => wordLanguage(word) === row.language && normalize(word.english) === normalize(row.english) && activeIds.has(word.id)))) throw new Error('진행 중인 학습에 포함된 단어가 있어요. 학습을 마친 뒤 가져와주세요.'); result = importWords(state, rows, now); break; }
      case 'edit': { const word = state.words.find(word => word.id === body.word.id); if (!word) throw new Error('단어를 찾을 수 없습니다.'); if (state.sessions.some(session => !session.endedAt && session.entries.some(entry => entry.wordId === word.id))) throw new Error('진행 중인 학습을 마친 뒤 이 단어를 수정해주세요.'); const next = parseContent(JSON.stringify([body.word]))[0]; if (next.language !== wordLanguage(word) && word.lastStudiedAt) throw new Error('학습 기록이 있는 항목은 언어를 바꿀 수 없어요. 새 항목으로 추가해주세요.'); const all = stateFrom(source); if (all.words.some(item => item.id !== word.id && wordLanguage(item) === next.language && normalize(item.english) === normalize(next.english))) throw new Error('이미 같은 단어가 있습니다. 일괄 가져오기를 사용하면 연결됩니다.'); Object.assign(word, { ...next, firstAskedAt: next.firstAskedAt || word.firstAskedAt }); break; }
      case 'delete': { const word = state.words.find(word => word.id === body.id); if (!word) throw new Error('단어를 찾을 수 없습니다.'); if (state.sessions.some(session => !session.endedAt && session.entries.some(entry => entry.wordId === word.id))) throw new Error('진행 중인 학습을 마친 뒤 삭제해주세요.'); word.deletedAt = now; break; }
      case 'settings': { const next = validateSettings(body.settings); if (JSON.stringify(next) !== JSON.stringify(state.settings)) { state.history.push({ language, id: uuid(), changedAt: now, before: structuredClone(state.settings), after: next }); state.settings = next; } break; }
      case 'start': result = { sessionId: startSession(state, now, timeZone, body.additionalCount).id }; break;
      case 'answer': { const attempt = grade(state, body, now); extra.push({ id: attempt.id, kind: 'attempt', data: attempt }); break; }
      case 'card': { const attempt = grade(state, { ...body, inputMethod: 'flashcard' }, now); extra.push({ id: attempt.id, kind: 'attempt', data: attempt }); const session = state.sessions.find(item => item.id === body.sessionId)!; delete session.lastFeedback; nextQuestion(session, now); break; }
      case 'correct': { const correction = correctJudgment(state, body.sessionId, now); extra.push({ id: correction.id, kind: 'correction', data: correction }); break; }
      case 'next': { const session = state.sessions.find(item => item.id === body.sessionId); if (!session || !session.lastFeedback) throw new Error('현재 학습을 확인해주세요.'); delete session.lastFeedback; nextQuestion(session, now); break; }
      default: throw new Error('지원하지 않는 요청입니다.');
    }
    const changedWords = state.words; state.words = state.words.filter(word => wordLanguage(word) === language); syncDailyGoal(state, now, timeZone);
    const records = [...changedWords.map(data => ({ id: data.id, kind: 'word', data })), ...state.sessions.map(data => ({ id: data.id, kind: 'session', data: { ...data, language } })), ...state.history.map(data => ({ id: data.id, kind: 'history', data })), { id: settingsId, kind: 'settings', data: state.settings }, ...extra].filter(record => previous.get(record.id) !== JSON.stringify(record.data)).map(record => ({ ...record, created_at: recordTime(record.data, now) }));
    if (context) await applyRemoteChanges(context, state.version, records); else await applyLocalChanges(state.version, records, now);
    return response({ state: stateFrom(await sourceFor(context), language), result });
  } catch (error) { console.error(error); return response({ error: error instanceof Error ? error.message : '저장하지 못했습니다. 다시 시도해주세요.' }, 400); }
}
