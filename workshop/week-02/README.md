# Week 02

## 개발 환경 설정

### 개발 도구 설정

- [GitHub Copilot 구독](https://github.com/settings/billing/licensing)
- [Azure 클라우드 구독](https://portal.azure.com/@innodgvibeventure.onmicrosoft.com)

### 서비스 로그인

- GitHub CLI 로그인: `gh auth login`
- GitHub Copilot CLI 로그인: `copilot login`

TBD

<!--
  - Azure 클라우드 로그인
  - Azure CLI: `az login --tenant innodgvibeventure.onmicrosoft.com --use-device-code`
  - Azure Developer CLI: `azd auth login --tenant-id innodgvibeventure.onmicrosoft.com`

## GitHub Copilot 활용 간단한 앱 만들어보기

- Vibe Venture 리포지토리 클론하기

  ```bash
  git clone https://github.com/innodg/vibe-venture.git
  ```

- GitHub Copilot 사용 준비:

  ```bash
  cd vibe-venture/workshop/week-02
  ```

  ```bash
  azd up
  ```

- VS Code GitHub Copilot 수동 등록

  ```bash
  echo "id: $(azd env get-value AZURE_OPENAI_GPT_DEPLOYMENT_NAME)"
  echo "name: Azure GPT 5.3 Codex"
  echo "url: $(azd env get-value AZURE_OPENAI_ENDPOINT)openai/responses?api-version=2025-04-01-preview"
  echo "apiKey: $(az cognitiveservices account keys list -g "rg-$(azd env get-value AZURE_ENV_NAME)" -n $(azd env get-value AZURE_OPENAI_NAME) --query key1 -o tsv)"
  ```

- GitHub Copilot CLI 수동 등록

  ```bash
  # Windows
  $env:COPILOT_PROVIDER_BASE_URL = "$(azd env get-value AZURE_OPENAI_ENDPOINT)deployments/$(azd env get-value AZURE_OPENAI_GPT_DEPLOYMENT_NAME)"
  $env:COPILOT_PROVIDER_TYPE = "azure"
  $env:COPILOT_PROVIDER_WIRE_API = "responses"
  $env:COPILOT_PROVIDER_API_KEY = "$(az cognitiveservices account keys list -g "rg-$(azd env get-value AZURE_ENV_NAME)" -n $(azd env get-value AZURE_OPENAI_NAME) --query key1 -o tsv)"
  $env:COPILOT_MODEL = "$(azd env get-value AZURE_OPENAI_GPT_DEPLOYMENT_NAME)"

  # MacOS
  export COPILOT_PROVIDER_BASE_URL="$(azd env get-value AZURE_OPENAI_ENDPOINT)deployments/$(azd env get-value AZURE_OPENAI_GPT_DEPLOYMENT_NAME)"
  export COPILOT_PROVIDER_TYPE="azure"
  export COPILOT_PROVIDER_WIRE_API="responses"
  export COPILOT_PROVIDER_API_KEY="$(az cognitiveservices account keys list -g "rg-$(azd env get-value AZURE_ENV_NAME)" -n $(azd env get-value AZURE_OPENAI_NAME) --query key1 -o tsv)"
  export COPILOT_MODEL="$(azd env get-value AZURE_OPENAI_GPT_DEPLOYMENT_NAME)"
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
-->
