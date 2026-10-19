# Current app update

Status: implemented locally; Android device verification pending

## User ideas

- Android Chrome에서 단순 홈페이지 바로가기가 아니라, 독립 창으로 열리는 WORLD 앱으로 설치하고 싶다.
- 단어 추가 데이터는 영단어, 뜻, 품사, 예문, 예문 해석을 모두 포함해야 한다.
- ChatGPT에서 이 형식으로 단어를 정리해 주는 재사용 가능한 "영단어 정리 스킬"이 필요하다.
- 영어 발음을 듣는 기능과 영어를 말해 답하는 기능의 제공 여부를 확인하고 싶다.

## Confirmed changes by page

### Shared area: Android PWA 설치

- 현재 상태: `manifest.webmanifest`는 `display: standalone`, 앱 이름, 192/512 아이콘을 포함한다. 긴 배포 주소 `world-flash-card-5tykhujuu-chichic.vercel.app`의 매니페스트는 Vercel 로그인으로 리디렉션된다. 정식 주소 `world-flash-card.vercel.app`은 매니페스트·서비스 워커·아이콘이 200으로 제공된다.
- 요청 변경: 정식 HTTPS 주소를 앱 설치 주소로 안내하고, Chrome의 설치 이벤트가 오지 않아도 메뉴의 `앱 설치` 경로를 제공한다.
- 수용 기준: Android Chrome의 메뉴에서 `앱 설치`를 선택하면 WORLD 아이콘이 생기고, 실행 시 주소창 없이 독립 창으로 열린다.
- 영향: `components/pwa-controls.tsx`, 설치 안내 UI 및 PWA 검증.
- 건드리지 않음: Supabase 인증, 단어 학습 로직, 디자인 테마.

### 단어장: 일괄 추가 형식

- 현재 상태: 여섯 칸 텍스트를 읽을 수 있으나, 기존 추출 파일은 원본에 품사·예문·예문 해석이 없어 두 칸만 포함했다. 또한 현재 안내는 열 순서를 충분히 명확히 설명하지 않는다.
- 요청 변경: 고정 열 순서를 `영단어 | 뜻 | 품사 | 예문 | 예문 해석 | 언어`로 명시하고, 텍스트/JSON 파일 가져오기와 안내 예시를 이 구조로 통일한다. 필수 데이터가 빠진 기존 단어 목록은 AI 정리 결과를 다시 가져와 보완한다.
- 수용 기준: 위 6열 텍스트 한 줄을 붙여넣으면 카드 뒷면에 뜻·품사·예문·예문 해석이 모두 표시된다.
- 영향: `lib/import-content.ts`, `app/page.tsx`, 가져오기 테스트.
- 건드리지 않음: 기존 학습 기록, 복습 간격, 기존 카드 판정 방식.

### ChatGPT 영단어 정리 스킬

- 현재 상태: 앱은 붙여넣기/파일 가져오기를 지원하지만, ChatGPT가 항상 같은 완전한 카드 형식으로 응답하도록 강제하는 재사용 자산은 없다.
- 요청 변경: 영어 단어/문장을 받아 여섯 열 형식으로 반환하고, 불확실한 의미는 추측하지 않으며 예문·한국어 예문 해석을 포함하는 WORLD 전용 정리 스킬을 만든다.
- 수용 기준: 대화에서 단어 목록을 보내면 그대로 WORLD의 일괄 가져오기 창에 붙여넣을 수 있는 결과가 나온다.
- 영향: 스킬의 설치 위치와 사용 환경에 따라 별도 자산이 결정된다.

### 학습 화면: 영어 발음 및 말하기

- 현재 상태: 스피커 버튼은 브라우저 `speechSynthesis`로 영어/일본어 발음을 재생한다. 음성 인식 함수는 남아 있지만 현재 플래시카드에는 마이크 버튼이 없어서 실제 사용은 불가능하다.
- 요청 변경: 카드에 마이크 버튼과 인식 결과를 표시하고, Android Chrome 권한 안내를 제공한다.
- 수용 기준: 영어 카드에서 스피커를 누르면 발음이 재생되고, 마이크 권한을 허용한 뒤 영어 단어를 말하면 인식된 문구가 카드 아래 표시된다. 외움/모름 판정은 사용자가 직접 한다.
- 영향: 안내 문구, 필요 시 음성 지원 감지 UI.
- 건드리지 않음: 점수 판정과 복습 알고리즘.

## Design decisions to explore

### 영단어 정리 스킬의 위치

- 옵션 A: Codex 로컬 재사용 스킬로 만든다. 현재 이 컴퓨터의 Codex에서만 바로 쓸 수 있다.
- 옵션 B: WORLD 앱 안에 복사 가능한 "ChatGPT 요청문" 버튼/템플릿으로 둔다. 어떤 ChatGPT 대화에서도 복사해 쓸 수 있지만 자동 등록은 아니다.
- 옵션 C: 별도 맞춤 GPT/ChatGPT 재사용 자산으로 만든다. 계정의 해당 기능 접근과 사용자 설정이 필요하다.
- 권장: 우선 A와 B를 함께 제공한다. 정리 결과의 형식을 파일로 관리하면서, 앱에서 바로 복사할 요청문도 제공할 수 있다.
- 사용자 결정: A와 B를 함께 제공한다.

## Decision register

- PWA 독립 앱 설치: approved — 정식 주소의 정적 자산 응답 확인, Android Chrome 실기기 확인은 사용자 담당.
- 6열 카드 형식: approved as requested.
- 영단어 정리 스킬 위치: approved — Codex 스킬 + 앱 복사용 요청문.
- 발음 재생/음성 답변: approved for 안내 및 기기 검증.

## Approved implementation phases

2026-10-19 사용자가 전체 계획의 즉시 구현을 승인했다. Phase 1~4를 연속 진행한다.

## Detailed implementation plan

See `IMPLEMENTATION.md` for the phase-by-phase implementation details, affected areas, acceptance criteria, and verification plan.

## User verification notes

- Android Chrome에서 설치 후 WORLD가 독립 창으로 열리는지 확인한다.
- 단어 하나를 여섯 열 형식으로 가져와 카드 뒷면을 확인한다.
- Android Chrome에서 마이크 권한을 허용하고 영어 발화 입력을 확인한다.

## Completed and deferred items

- 정식 주소의 매니페스트·서비스 워커·아이콘이 공개적으로 200 응답을 돌려주는 것을 확인했다. 배포별 미리보기 주소는 Vercel 로그인으로 이동한다.
- 설치 안내, 여섯 열 가져오기, 앱 내 복사 요청문, 플래시카드 발음 말하기 UI와 Codex `world-vocabulary` 스킬을 구현했다.
- 원본 백업의 활성 단어 184개를 원본 순서대로 품사·예문·예문 해석을 포함한 별도 로컬 파일로 정리했다. 이 내용은 공개 GitHub 저장소에 올리지 않는다.
- 타입 검사, 가져오기/API 테스트, PWA 테스트를 통과했다. Android Chrome 설치·마이크·화면 디자인 검증은 사용자가 기기에서 확인한다.
- 삭제된 계정의 동기화 데이터 복구는 별도 진행 중이다.
