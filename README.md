# 채팅 구조대 MVP

중학생이 일곱 가지 관계 상황에서 가상 인물과 자유롭게 대화하며 미션을
해결하는 일회성 교육용 웹서비스입니다.

## 포함된 채팅방

1. 친구 사진을 생성형 AI에 올리려는 상황
2. 출처 없는 AI 답변을 소문처럼 공유하려는 상황
3. 친구 얼굴을 합성한 이미지를 장난으로 공유한 상황
4. 사람보다 AI에게만 고민을 말하려는 상황
5. 학업·이성 친구 고민을 털어놓는 친구를 공감하며 돕는 상황
6. 따돌림과 불쾌한 장난에 욕설 없이 감정과 요구를 표현하는 상황
7. 세 명의 단체방에서 괴롭힘을 멈추고 피해 친구와 교사를 연결하는 상황

각 채팅방에는 기본 미션 3개가 있습니다. GPT 모드에서는 단어 포함 여부가 아니라
최근 대화와 가상 인물의 응답을 함께 살펴 `대기`, `미흡`, `완료`로 판정합니다.
API 키가 없으면 규칙 기반 데모 판정으로 전체 UI를 시험할 수 있습니다.

미션은 순서대로 진행되며 한 번의 학생 발화에서는 최대 한 개만 새로 완료됩니다.
학생이 직접 이유와 구체적인 요청을 표현해야 하고, 약속·사과·도움 연결 미션은
학생의 적절한 발화와 가상 인물의 명시적 응답이 모두 있어야 완료됩니다. 욕설,
단순 주장, 미션 문구 복사, "체크해줘"와 같은 시스템 조작 표현은 `미흡` 처리됩니다.

## 실행

별도 패키지 설치가 필요하지 않습니다. Node.js 20 이상을 권장합니다.

```bash
cd inhabot.github.io
npm run dev
```

브라우저에서 [http://127.0.0.1:4175](http://127.0.0.1:4175)을 엽니다.

## API 키 입력

빈 파일을 미리 만들어 두었습니다.

```text
.env.local
```

`OPENAI_API_KEY=`의 등호 뒤에 실제 키를 입력하고 서버를 완전히 재시작합니다.

```dotenv
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.5
HOST=127.0.0.1
PORT=4175
```

`.env.local`은 `.gitignore`에 포함되어 Git으로 올라가지 않으며, 서버만 읽습니다.
브라우저는 `/api/chat`만 호출하고 OpenAI API 키를 받지 않습니다.

커밋 전에 아래 검사를 실행하면 공개 파일에 OpenAI 키나 GitHub 토큰 형태의 값이
들어갔는지 한 번 더 확인할 수 있습니다.

```bash
npm run check:secrets
git check-ignore -v .env.local
```

이미 Git에 추적된 비밀 파일은 `.gitignore`만 추가해도 사라지지 않습니다.
`.env.local`이 추적되지 않는지 검증한 뒤 커밋하고, `git add -f .env.local`은
절대 사용하지 마세요.

중요: `.env.local` 자체가 암호화되는 것은 아닙니다. 로컬 MVP에서는 파일 권한과
Git 제외로 보호하고, 실제 배포에서는 호스팅 서비스의 Secret Manager 또는
Key Management Service에 `OPENAI_API_KEY`를 저장해야 합니다. 키를 암호화하더라도
복호화 키를 같은 파일에 넣으면 보호 효과가 없습니다.

## 저장 정책

- 로그인·회원가입 없음
- 데이터베이스 없음
- 쿠키, `localStorage`, `sessionStorage` 없음
- 현재 대화와 미션 상태는 브라우저 메모리에만 존재
- 새로고침 또는 채팅 초기화 시 삭제
- 서버는 대화 원문을 파일이나 DB에 기록하지 않음
- 대화록 다운로드는 학생이 버튼을 누를 때만 기기에 텍스트 파일로 생성

OpenAI API 요청 자체에는 최근 대화가 전송됩니다. 따라서 실제 이름, 학교, 학급,
연락처, 계정, 사진 정보는 입력하지 않도록 수업 전에 안내해야 합니다.

## 안전장치

- 전화번호, 이메일, 계정, 학급 정보로 보이는 입력을 API 호출 전에 차단
- 위기 표현은 역할극을 중단하고 책임 있는 성인에게 연결
- OpenAI Moderation API 입력 검사
- 요청 본문 크기, 발화 길이, 요청 횟수 제한
- `store: false`로 Responses API 호출
- 세션 ID를 해시한 `safety_identifier` 사용
- 동일 출처 요청만 허용
- 선택한 GitHub Pages 주소만 허용하는 `ALLOWED_ORIGIN` 교차 출처 설정
- CSP, iframe, 카메라·마이크·위치 권한 차단

## 시나리오 확장

채팅방과 미션은 [`lib/scenarios.mjs`](./lib/scenarios.mjs)에서 수정합니다.

- 학생에게 보이는 항목: `title`, `context`, `initialMessages`, `missions`
- GPT 판정 기준: 각 미션의 `rubric`
- 키가 없을 때의 기본 응답: `demo.replies`

## 테스트

```bash
npm test
```

## GitHub Pages + GPT 자동 배포

`inhabot.github.io`는 정적 호스팅이므로 OpenAI API 키를 브라우저에 넣지 않습니다.
대신 같은 저장소의 GitHub Actions가 다음 작업을 한 번에 수행합니다.

1. 테스트와 비밀값 노출 검사를 실행
2. Cloudflare Worker에 `/api/health`, `/api/scenarios`, `/api/chat` 배포
3. Worker의 실제 배포 주소를 `public/config.js`에 자동 기록
4. `public` 폴더를 `https://inhabot.github.io` 루트에 배포

따라서 배포가 완료된 뒤 방문자는 별도 입력이나 설정 없이 바로 GPT 모드를
사용합니다. OpenAI API 키는 GitHub Actions Secret에서 Cloudflare Worker Secret으로
전달되며 정적 파일이나 브라우저에는 포함되지 않습니다.

### 최초 1회 저장소 설정

Cloudflare에서 Workers 배포용 API 토큰과 Account ID를 준비한 뒤, GitHub 저장소의
`Settings > Secrets and variables > Actions > Repository secrets`에 아래 세 값을
등록합니다.

```text
OPENAI_API_KEY
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
```

Cloudflare 토큰에는 배포할 계정의 `Workers Scripts: Edit` 권한만 부여하세요.
값을 등록한 다음 `master` 브랜치에 푸시하면
[`.github/workflows/pages.yml`](./.github/workflows/pages.yml)이 API와 Pages를 함께
배포합니다. 저장소의 Pages Source는 `GitHub Actions`를 사용합니다.

세 비밀값 중 하나라도 없으면 워크플로가 데모 사이트를 잘못 배포하지 않고,
누락된 이름을 표시하며 중단됩니다.

로컬에서 Pages 결과물을 준비하려면 다음 명령을 실행합니다.

```bash
npm run check:secrets
npm run build:pages
```

이 로컬 빌드는 API 주소 없이 공개 데모 모드로 만들어집니다. 실제 배포 빌드는
GitHub Actions가 방금 배포한 Worker 주소를 자동으로 넣기 때문에
`API_BASE_URL` 변수를 수동으로 관리하지 않습니다.

Worker의 허용 출처, 모델, 요청 제한은 [`wrangler.jsonc`](./wrangler.jsonc)에서
관리합니다. 현재 허용 출처는 `https://inhabot.github.io`이고, 세션당 분당 8회,
IP당 분당 60회로 제한됩니다.

## 공식 참고자료

- [OpenAI API 키 안전 수칙](https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety)
- [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Safety best practices](https://developers.openai.com/api/docs/guides/safety-best-practices)
- [Under 18 API Guidance](https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance)
