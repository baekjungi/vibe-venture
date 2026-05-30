targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('Name of the environment (e.g. dev, prod)')
param environmentName string

@minLength(1)
@description('Azure region for all resources')
param location string

var resourceSuffix = take(uniqueString(subscription().id, environmentName, location), 6)
var tags = { 'azd-env-name': environmentName }

// ── Resource Group ────────────────────────────────────────────────────────────
resource rg 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: 'rg-${environmentName}'
  location: location
  tags: tags
}

// ── Phase 1: ACR + Log Analytics + Container Apps Env + Container App ─────────
module resources './modules/resources.bicep' = {
  name: 'resources'
  scope: rg
  params: {
    environmentName: environmentName
    location: location
    resourceSuffix: resourceSuffix
    tags: tags
    neisApiKey: neisApiKey
    naverClientId: naverClientId
    naverClientSecret: naverClientSecret
    geminiApiKey: geminiApiKey
  }
}

// ── Phase 2: AcrPull role (separate module — no circular dependency) ──────────
module acrPullRole './modules/acr-pull-role.bicep' = {
  name: 'acrPullRole'
  scope: rg
  params: {
    acrName: resources.outputs.acrName
    principalId: resources.outputs.containerAppPrincipalId
  }
}

// ── API Keys (injected via azd env set — never hard-coded) ───────────────────
@secure()
@description('NEIS Open API key (required)')
param neisApiKey string = ''

@secure()
@description('Naver API Client ID (optional)')
param naverClientId string = ''

@secure()
@description('Naver API Client Secret (optional)')
param naverClientSecret string = ''

@secure()
@description('Google Gemini API key (optional)')
param geminiApiKey string = ''

// ── Outputs (azd reads UPPERCASE outputs as environment variables) ────────────
output AZURE_RESOURCE_GROUP string = rg.name
output AZURE_CONTAINER_REGISTRY_ENDPOINT string = resources.outputs.acrLoginServer
output AZURE_CONTAINER_REGISTRY_NAME string = resources.outputs.acrName
output SERVICE_APP_URI string = resources.outputs.containerAppUri
