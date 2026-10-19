# WORLD · 개인 언어 플래시카드

영어·일본어 단어와 문장을 카드로 복습하는 개인용 PWA입니다. 이메일/비밀번호 로그인과 Supabase의 계정별 저장소를 사용해 기기 간 학습 기록을 동기화합니다.

## Product
- Add/edit/soft-delete words; batch text, TSV or JSON imports; normalized English duplicate merging.
- Daily distinct-word target, new/due mix, overdue priority; resume persistent sessions across devices.
- EN→KO / KO→EN / configurable random mix; typing and Web Speech Recognition where supported.
- One correct response passes a word for that session. Incorrect responses return after N other attempts, shortened only if no eligible words remain.
- Configurable spaced intervals and reset/demotion, plus device English speech synthesis.
- Immutable original attempts and separate correction events. Settings snapshots per session/attempt and change history.
- Date-filtered JSON and individual CSV downloads (CSV formula injection escaped).

## Structure
`lib/learning.ts`: isolated scheduling, grading and word import engine.
`app/api/data/route.ts`: server mutations and exports. Prepared D1 statements, atomic revision-checked batches. Conflicting writes fail without partial mutation.
`db/schema.ts`, `drizzle/`: persisted schema and migrations. Records are individually stored; attempts are excluded from normal state loads. No automatic record retention cutoff.
`app/page.tsx`: Korean working UI with built-in semantic primitives.
`lib/export.ts`: CSV/download utilities.

The ChatGPT conversation ingestion adapter is deferred. Current import accepts `english - meaning` or `english | meaning | pos | context` per line, TSV, or JSON arrays / `{words:[...]}`. An outer text/JSON code fence is accepted. Hyphens inside words such as well-being are preserved; only spaced separators split an entry. Fields: english, meaning, pos, context, firstAskedAt. Semicolon-separated meanings are accepted aliases. Matching uses Unicode normalization, case folding, punctuation and whitespace normalization; it is not semantic AI grading. Users may correct a verdict, preserving the original record.

Speech recognition depends on browser/OS support and microphone permission; no audio recording is stored. English speech synthesis uses the device's installed English voices. Both require a real-device check. Data operations require network access; failures remain visible and input is retained.

## Data interpretation
Dates are UTC ISO 8601; UI and chosen export date boundaries use device local time. `activeMs` sums visible answer time and excludes pauses and hidden-tab time; `startedAt`/`endedAt` permit wall-clock duration calculation. `issuedAt` is server question issuance, `presentedAt` is most recent client presentation. Original attempt correctness is immutable: join `corrections` on attemptId for effective correctness. Session and word counts reflect corrected verdicts. Exported words are a full current snapshot including deleted records; exported sessions are complete sessions with attempts/start within the requested window. Settings history includes the preceding boundary record.

## Checks
`node --experimental-strip-types tests/learning.test.ts`
`node node_modules/typescript/bin/tsc --noEmit`
Build via the Sites build helper. Local D1 migrations use the generated dist/server/wrangler.json and `.wrangler/state`; production migrations are applied by Sites.

Core tests cover delayed retry, target completion, due-only selection, next-day scheduling, duplicate imports, review reset, preserved corrections, invalid settings and backlog prioritization.
