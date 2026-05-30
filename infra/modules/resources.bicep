targetScope = 'resourceGroup'

param environmentName string
param location string = resourceGroup().location
param resourceSuffix string
param tags object = {}

// API keys — passed as secure params, stored as Container Apps secrets
@secure()
param neisApiKey string = ''
@secure()
param naverClientId string = ''
@secure()
param naverClientSecret string = ''
@secure()
param geminiApiKey string = ''

// ── Azure Container Registry ──────────────────────────────────────────────────
// ACR names: alphanumeric only, 5-50 chars
var acrName = replace('cr${environmentName}${resourceSuffix}', '-', '')

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: take(acrName, 50)
  location: location
  tags: tags
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: false  // Managed Identity를 사용하므로 admin 비활성화
  }
}

// ── Log Analytics Workspace ───────────────────────────────────────────────────
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: 'log-${environmentName}-${resourceSuffix}'
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// ── Container Apps Environment ────────────────────────────────────────────────
resource containerAppsEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: 'cae-${environmentName}-${resourceSuffix}'
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// ── Container App ─────────────────────────────────────────────────────────────
// Phase 1: placeholder image — azd deploy가 ACR 이미지로 교체
resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-${environmentName}-${resourceSuffix}'
  location: location
  tags: union(tags, { 'azd-service-name': 'app' })
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    environmentId: containerAppsEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
        allowInsecure: false
      }
      secrets: [
        { name: 'neis-api-key',        value: neisApiKey }
        { name: 'naver-client-id',     value: naverClientId }
        { name: 'naver-client-secret', value: naverClientSecret }
        { name: 'gemini-api-key',      value: geminiApiKey }
      ]
    }
    template: {
      containers: [
        {
          name: 'app'
          image: 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            { name: 'NODE_ENV',              value: 'production' }
            { name: 'PORT',                  value: '3000' }
            { name: 'NEIS_API_KEY',          secretRef: 'neis-api-key' }
            { name: 'NAVER_CLIENT_ID',       secretRef: 'naver-client-id' }
            { name: 'NAVER_CLIENT_SECRET',   secretRef: 'naver-client-secret' }
            { name: 'GEMINI_API_KEY',        secretRef: 'gemini-api-key' }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/api/regions'
                port: 3000
                scheme: 'HTTP'
              }
              initialDelaySeconds: 15
              periodSeconds: 30
              failureThreshold: 3
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/api/regions'
                port: 3000
                scheme: 'HTTP'
              }
              initialDelaySeconds: 5
              periodSeconds: 10
              failureThreshold: 3
            }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 3
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '20'
              }
            }
          }
        ]
      }
    }
  }
}

// ── Outputs ───────────────────────────────────────────────────────────────────
output acrName string = acr.name
output acrLoginServer string = acr.properties.loginServer
output containerAppUri string = 'https://${containerApp.properties.configuration.ingress.fqdn}'
output containerAppPrincipalId string = containerApp.identity.principalId
