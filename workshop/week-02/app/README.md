# 🍱 학교 급식 정보 검색 웹앱

지역 → 학교 → 날짜를 선택하면 NEIS(나이스) Open API로 해당 학교의 급식 메뉴를 보여주는 웹 앱입니다.

## 빠른 시작

### 1. NEIS API 키 발급

[나이스 교육정보 개방 포털](https://open.neis.go.kr/portal/guide/actKeyPage.do)에서 인증키를 발급받으세요.

### 2. 환경 변수 설정

```bash
cp .env.example .env
```

`.env` 파일을 열어 `NEIS_API_KEY` 값을 실제 발급받은 키로 변경하세요:

```
NEIS_API_KEY=발급받은_키
```

> ⚠️ `.env` 파일은 Git에 커밋하지 마세요. `.gitignore`에 이미 등록되어 있습니다.

### 3. 실행

```bash
npm install
npm start
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 열기

## 보안 구조

```
브라우저 (app.js)
    │  /api/regions, /api/schools, /api/meal 만 호출
    ▼
서버 (server.js)
    │  process.env.NEIS_API_KEY 사용 (환경 변수, 클라이언트에 절대 미전달)
    ▼
NEIS Open API (open.neis.go.kr)
```

- API 키는 서버 환경 변수(`process.env.NEIS_API_KEY`)에서만 읽힙니다.
- 브라우저로 전달되는 응답에는 API 키가 포함되지 않습니다.
- 브라우저는 NEIS API를 직접 호출하지 않습니다.

## 데이터 소스

- **학교 목록**: `data/학교기본정보.xlsx` (Excel → 서버 시작 시 메모리 로드)
  - Excel에 없는 지역은 NEIS `schoolInfo` API로 자동 보완
- **급식 정보**: NEIS `mealServiceDietInfo` API (서버 프록시)

## API 엔드포인트 (서버)

| 경로 | 설명 |
|------|------|
| `GET /api/regions` | 시·도 교육청 목록 |
| `GET /api/schools?regionCode=B10` | 해당 지역 학교 목록 |
| `GET /api/meal?atptCode=D10&schoolCode=7281014&date=20240304` | 급식 정보 |
