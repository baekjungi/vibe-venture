# Deployment Plan — School Meal App

**Status:** Ready for Validation

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

## Files to Create
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
