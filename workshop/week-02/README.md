# Week 02

## 개발 환경 설정

### 개발 도구 설정

- [GitHub Copilot 구독](https://github.com/settings/billing/licensing)
- [Azure 클라우드 구독](https://portal.azure.com/@innodgvibeventure.onmicrosoft.com)

### 서비스 로그인

- GitHub CLI 로그인: `gh auth login`
- GitHub Copilot CLI 로그인: `copilot login`

- Azure 클라우드 로그인
- Azure CLI: `az login --tenant innodgvibeventure.onmicrosoft.com --use-device-code`
- Azure Developer CLI: `azd auth login --tenant-id innodgvibeventure.onmicrosoft.com`

## GitHub Copilot 활용 간단한 앱 만들어보기

- Vibe Venture 리포지토리 클론하기

  ```bash
  git clone https://github.com/innodg/vibe-venture.git
  ```

- NEIS OpenAPI 키 등록: [https://open.neis.go.kr](https://open.neis.go.kr/portal/guide/actKeyPage.do)
  - 학교 정보 조회 API: [학교기본정보](https://open.neis.go.kr/portal/data/service/selectServicePage.do?page=1&rows=10&sortColumn=&sortDirection=&infId=OPEN17020190531110010104913&infSeq=1)
  - 학교별 급식 정보 조회 API: [급식식단정보](https://open.neis.go.kr/portal/data/service/selectServicePage.do?page=1&rows=10&sortColumn=&sortDirection=&infId=OPEN17320190722180924242823&infSeq=1)

- 학교별 급식 정보 조회 앱 - 콘솔 앱

## GitHub Copilot 활용 앱 설계하기

- 학교별 급식 정보 조회 앱 - 웹 앱
- 프롬프트 입력할 내용
  - 앱 개발 목적
  - 앱 작동 시나리오
  - 앱 개발에 필요한 기본 정보
    - 기능 정의
    - 인수 조건
    - 기술 스택
  - 앱 구조
  - 앱 보안

## GitHub Copilot 활용 앱 개발하기

- VS Code 활용
- Copilot CLI 활용

## 과제: 전국 학교별 급식 정보 검색 웹 애플리케이션 만들기

- VS Code 또는 Copilot CLI 활용
- [`workshop/week-02/data`](./data/) 디렉토리 안의 엑셀 파일 활용 `openapi.json` 문서 만들기
- `openapi.json` 기반으로 Python 또는 JavaScript 기반 웹 애플리케이션 만들기
- 시도 교육청 검색 👉 학교 검색 👉 급식 정보 조회 날짜 범위
- 보안 주의사항:
  - 검색용 API 키는 화면에 노출시키면 안됨
  - 검색용 API 키는 애플리케이션 안에 저장하면 안됨

---

## 학교 급식 검색 웹 앱 (`app/`)

지역 → 학교 → 날짜를 선택하면 해당 날짜의 급식 정보를 보여주는 웹 애플리케이션입니다.  
NEIS Open API를 서버에서 프록시하여 **API 키가 브라우저에 절대 노출되지 않습니다.**

### 기술 스택

| 구분 | 사용 기술 |
|------|-----------|
| 서버 | Node.js + Express |
| 클라이언트 | 바닐라 HTML / CSS / JS |
| 급식 API | [NEIS Open API](https://open.neis.go.kr) |
| 이미지 AI | Naver 이미지 검색 + Gemini AI 관련성 평가 |
| 배포 | Render.com |

### 사전 준비

1. **NEIS API 키 발급** — [https://open.neis.go.kr](https://open.neis.go.kr/portal/guide/actKeyPage.do)  
2. **Naver 검색 API 키 발급** (선택) — [Naver Developers](https://developers.naver.com/apps/#/register)  
3. **Gemini API 키 발급** (선택) — [Google AI Studio](https://aistudio.google.com/app/apikey)

### 실행 방법

```bash
# 1. 앱 디렉토리로 이동
cd workshop/week-02/app

# 2. 의존성 설치
npm install

# 3. 환경 변수 설정
cp .env.example .env
# .env 파일을 열어 실제 API 키 입력
#   NEIS_API_KEY=발급받은_NEIS_키
#   NAVER_CLIENT_ID=네이버_클라이언트_ID        (선택)
#   NAVER_CLIENT_SECRET=네이버_클라이언트_시크릿 (선택)
#   GEMINI_API_KEY=제미나이_API_키              (선택)

# 4-A. 운영 모드로 실행
npm start
# → http://localhost:3000

# 4-B. 개발 모드로 실행 (파일 변경 시 자동 재시작)
npm run dev
# → http://localhost:3000
```

> **보안**: `.env` 파일은 절대 Git에 커밋하지 마세요. `.gitignore`에 이미 등록되어 있습니다.

### 테스트 방법

```bash
# 앱 디렉토리에서 실행
cd workshop/week-02/app

# 전체 테스트 실행 (단위 + 통합)
npm test

# 단위 테스트만
npm run test:unit

# 통합 테스트만
npm run test:integration

# 커버리지 리포트 포함
npm run test:coverage

# 파일 변경 감지 모드 (개발 중 실시간 실행)
npm run test:watch
```

#### 테스트 구조

```
app/__tests__/
├── unit/                          # 단위 테스트 — 분기 로직 · 보안 검증
│   ├── extractRows.test.js        # NEIS 응답 파싱 (정상·빈값·에러 5개 분기)
│   ├── getCategoryFallback.test.js # 카테고리 regex 우선순위 edge case
│   └── inputValidation.test.js    # 입력값 보안 검증 (정규식·길이·제어문자)
└── integration/                   # 통합 테스트 — 실제 HTTP 요청/응답
    ├── api.regions.test.js        # GET /api/regions
    ├── api.schools.test.js        # GET /api/schools (입력 검증 포함)
    ├── api.meal.test.js           # GET /api/meal (NEIS mock, 날짜 분기)
    ├── api.foodImage.test.js      # GET /api/food-image (Naver+Gemini mock, 폴백 분기)
    └── security.headers.test.js  # CSP·HSTS·Rate Limit 보안 헤더 검증
```

> 통합 테스트는 외부 API(NEIS, Naver, Gemini)를 mock으로 대체하므로 **API 키 없이 실행 가능**합니다.
