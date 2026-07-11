## ADDED Requirements

### Requirement: Verificação do segredo compartilhado do gateway
O sistema SHALL, sempre que o header `x-auth-required` estiver presente com valor `"true"`, exigir que o header `x-gateway-secret` corresponda ao valor configurado em `GATEWAY_SECRET_AUTH`. Requisições com o header `x-auth-required: true` mas com `x-gateway-secret` ausente ou incorreto SHALL ser rejeitadas com HTTP 401 e corpo `{ "message": "Unauthorized gateway" }`, sem popular `request.auth`.

#### Scenario: Gateway secret correto libera a requisição
- **WHEN** uma requisição chega com `x-auth-required: true`, `x-gateway-secret` igual ao valor configurado, e `x-tenant-id` presente
- **THEN** a requisição prossegue e `request.auth.tenant_id` é preenchido com o valor do header

#### Scenario: Gateway secret ausente é rejeitado
- **WHEN** uma requisição chega com `x-auth-required: true` e sem o header `x-gateway-secret`
- **THEN** o servidor responde HTTP 401 com `{ "message": "Unauthorized gateway" }`

#### Scenario: Gateway secret incorreto é rejeitado
- **WHEN** uma requisição chega com `x-auth-required: true` e `x-gateway-secret` diferente do valor configurado em `GATEWAY_SECRET_AUTH`
- **THEN** o servidor responde HTTP 401 com `{ "message": "Unauthorized gateway" }`

### Requirement: Exigência de tenant_id quando o gateway é verificado
O sistema SHALL, após validar o `x-gateway-secret` com sucesso, exigir que o header `x-tenant-id` esteja presente. Requisições sem `x-tenant-id` nessas condições SHALL ser rejeitadas com HTTP 401 e corpo `{ "message": "tenant_id missing" }`.

#### Scenario: tenant_id ausente após gateway secret válido
- **WHEN** uma requisição chega com `x-auth-required: true`, `x-gateway-secret` correto, mas sem o header `x-tenant-id`
- **THEN** o servidor responde HTTP 401 com `{ "message": "tenant_id missing" }`

### Requirement: Compatibilidade quando o gateway ainda não envia x-auth-required
O sistema SHALL manter o comportamento atual (preencher `request.auth` diretamente a partir de `x-tenant-id`/`x-user-id`, sem verificação) quando o header `x-auth-required` não estiver presente ou não for `"true"`, de modo que o endurecimento seja compatível com o tráfego atual antes de o Kong ser configurado para enviar esses headers.

#### Scenario: Requisição sem x-auth-required mantém o comportamento anterior
- **WHEN** uma requisição chega sem o header `x-auth-required` (ou com valor diferente de `"true"`), mas com `x-tenant-id` presente
- **THEN** a requisição prossegue e `request.auth.tenant_id` é preenchido a partir do header, sem exigir `x-gateway-secret`

#### Scenario: Isolamento de sessão continua correto após o endurecimento
- **WHEN** uma requisição autenticada (por qualquer um dos dois caminhos acima) tenta acessar uma `Session` cujo `tenant_id` é diferente de `request.auth.tenant_id`
- **THEN** o controller responsável (ex.: `SessionController`, `MessageController`, `ContactController`) rejeita a operação, exatamente como já ocorre hoje
