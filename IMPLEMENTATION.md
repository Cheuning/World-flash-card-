# WORLD update implementation plan

Status: implemented locally — full scope approved 2026-10-19; Android verification pending

## Phase 1 — PWA 설치 경로 점검 및 안내

### Behavior

- 정식 주소 `https://world-flash-card.vercel.app/`에서 매니페스트, 서비스 워커, 앱 아이콘 응답을 확인한다. 사용자가 보내준 배포별 주소는 Vercel 로그인으로 이동하므로 설치 경로로 사용하지 않는다.
- Chrome이 설치 프롬프트를 제공한 경우 `WORLD 설치` 버튼으로 설치를 연다.
- 프롬프트가 아직 없거나 이미 닫힌 경우에는 Android Chrome 점 3개 메뉴의 `앱 설치` 경로를 보여 준다.
- 설치된 경우 설치 안내를 숨긴다.

### Files

- `components/pwa-controls.tsx`
- 필요한 범위의 `app/redesign.css`
- `public/manifest.webmanifest`은 점검 후 필요한 경우에만 수정

### Acceptance criteria

- HTTPS 배포 주소에서 Chrome DevTools/Application 또는 Android Chrome 메뉴가 앱 설치 가능 상태를 보여 준다.
- 설치한 WORLD는 주소 표시줄 없이 독립 창으로 시작한다.

### Verification

- 실제 Android Chrome 설치는 사용자가 직접 확인한다.
- 코드 변경 시 PWA 관련 테스트와 필요한 범위의 정적 확인만 실행한다.

## Phase 2 — 완전한 플래시카드 입력 형식

### Behavior

- 텍스트 열 순서를 정확히 `영단어 | 뜻 | 품사 | 예문 | 예문 해석 | 언어(en/ja)`로 고정한다.
- JSON 형식도 같은 필드를 받는다: `english`, `meaning`, `pos`, `example`, `exampleMeaning`, `language`, 선택적으로 `itemType`, `reading`.
- 가져오기 도움말, placeholder, 오류 문구를 동일한 구조로 바꾼다.
- 각 열은 단어 카드의 앞면/뒷면 필드로 손실 없이 저장된다.

### Files

- `lib/import-content.ts`
- `app/page.tsx`
- `tests`의 가져오기 관련 테스트 파일

### Acceptance criteria

- 영어 단어 한 줄을 6열로 가져오면 뜻, 품사, 예문, 예문 해석, 언어가 카드 데이터에 모두 저장된다.
- 일본어와 문장 카드의 자동 언어·유형 판정은 유지된다.
- 기존 2열 형식도 기존 단어 데이터 복구를 위해 계속 지원한다.

### Verification

- 기존 import parser tests에 여섯 열 회귀 사례를 추가한다.
- 사용자에게 카드 뒷면 확인을 요청한다.

## Phase 3 — WORLD 영단어 정리 스킬

### Behavior

- 사용자가 보낸 단어/문장을 중복 없이 정리한다.
- 항목마다 뜻, 가장 알맞은 품사, 자연스러운 예문, 한국어 예문 해석을 만든다.
- 결과는 Phase 2와 같은 필드를 가진 JSON 배열 코드 블록 하나로 출력한다.
- 불확실한 철자·의미는 임의로 확정하지 않고 확인을 요청하거나 표시한다.

### Deliverable by selected location

- A: Codex skill `WORLD 영단어 정리`의 `SKILL.md`와 예시.
- B: 앱 내 복사용 프롬프트 템플릿.
- C: 사용자가 접근 가능한 맞춤 GPT/ChatGPT 설정 절차와 정확한 시스템 지침.

### Acceptance criteria

- 정리 결과를 그대로 일괄 가져오기 창에 붙여넣을 수 있다.

## Phase 4 — 발음/말하기 안내

### Behavior

- 현재 스피커(TTS)와 마이크(STT) 지원 여부를 학습 화면에서 알기 쉽게 설명한다.
- Android Chrome에서 마이크 권한 거부·미지원 상태에 맞는 회복 안내를 제공한다.

### Files

- `app/page.tsx`, `components/flashcard.tsx`
- 필요한 범위의 `app/redesign.css`

### Acceptance criteria

- 스피커는 영어 음성을 재생한다.
- 플래시카드의 마이크는 말한 영어/일본어를 인식해 화면에 표시한다. 권한을 거부하면 해결 방법을 표시한다. 외움/모름은 사용자 판정으로 유지한다.

## Dependency order

1. PWA 설치 확인
2. 입력 형식과 카드 데이터 검증
3. 영단어 정리 스킬 제공
4. 음성 안내 및 Android 실제 기기 확인

## Excluded

- Supabase 데이터 구조·RLS 변경
- 학습/복습 알고리즘 변경
- 새로운 외부 라이브러리 추가
- APK 생성
