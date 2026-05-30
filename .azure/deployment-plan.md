# Deployment Plan — School Meal App

**Status:** Validated

## App Summary
- **Name:** school-meal-app
- **Language:** Node.js (Express)
- **Source:** `workshop/week-02/app/`
- **Dockerfile:** `workshop/week-02/app/Dockerfile` (multi-stage, node:22-alpine, port 3000)
- **External DB:** None
- **Env vars needed:** NEIS_API_KEY, NAVER_CLIENT_ID, NAVER_CLIENT_SECRET, GEMINI_API_KEY

## Target Architecture
| Component | Azure Service |
|-----------|--------------|
| Container registry | Azure Container Registry (ACR) |
| App hosting | Azure Container Apps |
| Monitoring | Log Analytics Workspace |
| Secrets | Azure Container Apps secrets (env vars) |

## Recipe
- **IaC:** Bicep (azd default)
- **Deployment tool:** `azd`
- **Environment:** `school-meal-m9p2`
- **Subscription:** 왕선중 백준기 (`e76a2d60-1461-4a8b-9577-7c298f4dbe0d`)
- **Location:** `koreacentral`

## Files Created
| File | Purpose |
|------|---------|
| `azure.yaml` | azd project config |
| `infra/main.bicep` | subscription-scope entry point |
| `infra/main.parameters.json` | parameter defaults |
| `infra/modules/resources.bicep` | ACR + Container Apps env + Container App |
| `infra/modules/acr-pull-role.bicep` | Phase 2 role assignment (no circular dep) |

## Steps
- [x] Plan skeleton created
- [x] Azure context confirmed (subscription: 왕선중 백준기, location: koreacentral)
- [x] Bicep files generated
- [x] azure.yaml generated
- [x] Security hardened (Managed Identity, secrets via Container Apps secrets, no adminUser)
- [x] Plan status → Ready for Validation

## Section 7: Validation Proof

| Check | Command | Result |
|-------|---------|--------|
| azd installed | `azd version` | v1.25.1 ✅ |
| Auth check | `azd auth login --check-status` | Logged in as beakjg2013@innodgvibeventure.onmicrosoft.com ✅ |
| azure.yaml schema | `azd validate_azure_yaml` | Valid ✅ |
| Environment setup | `azd env new school-meal-m9p2` | Created ✅ |
| Bicep build | `az bicep build --file infra/main.bicep` | Success (warning only: BCP334 static analysis, no runtime impact) ✅ |
| Provision preview | `azd provision --preview --no-prompt` | 5 resources previewed: rg, ACR, Log Analytics, ContainerApps Env, Container App ✅ |
| Package build | `azd package --no-prompt` | Docker image `school-meal-app/app-school-meal-m9p2:azd-deploy-*` built ✅ |
