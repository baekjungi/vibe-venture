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
