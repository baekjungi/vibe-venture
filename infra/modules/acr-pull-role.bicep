targetScope = 'resourceGroup'

param acrName string
param principalId string

resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: acrName
}

// AcrPull 역할: Container App의 Managed Identity가 ACR에서 이미지를 pull할 수 있도록 허용
resource acrPullRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(containerRegistry.id, principalId, 'acrpull')
  scope: containerRegistry
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      '7f951dda-4ed3-4680-a7ca-43fe172d538d'  // AcrPull built-in role
    )
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
}
