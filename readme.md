🧠 Primeiro: o que você NÃO entendeu ainda

Você tem 3 peças:

1. IZapAdapter (INTERFACE)
2. ZapAdapter (REGRA / ORQUESTRAÇÃO)
3. BaileysRepository (INFRAESTRUTURA)

⚠️ Regra principal (muito importante)
👉 Interface NÃO executa nada
👉 Repository NÃO define regra de negócio
👉 Adapter conecta tudo

🧩 Vamos traduzir seu código

1. IZapAdapter (o CONTRATO)
export interface IZapAdapter {
  checkHealth(): Promise<{ status: string }>;
  createSession(): Promise<{ sessionId: string; qr: string }>;
  sendText(...): Promise<{ messageId: string }>;
}

👉 Isso aqui é só:
“QUAL API meu sistema promete ter”

✔ não sabe WhatsApp
✔ não sabe Baileys
✔ não executa nada


🧠 2. BaileysRepository (INFRAESTRUTURA)
👉 fala direto com WhatsApp
👉 usa Baileys
👉 não sabe de sessão, webhook, CRM

Ele faz isso:
sock.sendMessage(...)
sock.ev.on(...)

👉 Ele é o “motor bruto”

🧠 3. ZapAdapter (O CÉREBRO)
👉 implementa IZapAdapter
👉 gerencia sessões
👉 conecta repository
👉 manda webhook
🔥 RESPOSTA DIRETA (sua dúvida)
❓ “quem implementa a interface?”


👉 ZapAdapter implementa IZapAdapter

export class ZapAdapter implements IZapAdapter
❓ “por que BaileysRepository não implementa?”

Porque ele:

❌ não sabe de sessionId
❌ não sabe de webhook
❌ não sabe de API
❌ não é sua API pública

👉 ele é só infraestrutura

🧱 Agora o mapa mental correto
IZapAdapter
    ↑
ZapAdapter (IMPLEMENTA)
    ↑
BaileysRepository (USA)
⚙️ POR QUE separar isso?
1. Trocar tecnologia sem quebrar tudo

Hoje:
Baileys

Amanhã:
API oficial WhatsApp

## Endpoints (prefixo `/whatsapp-service`)

Além das rotas de sessão/tenant/envio de mídia já existentes, o serviço expõe:

### Mensagens (`/api/v1/message`)
- `POST /send-reaction`, `POST /remove-reaction` — reagir/remover reação de uma mensagem
- `POST /star-message`, `POST /pin-message`, `POST /delete-for-me` — ações sobre uma mensagem existente
- `POST /send-recording`, `POST /subscribe-presence` — presença ligada a um chat
- `POST /archive-chat`, `POST /mute-chat`, `POST /delete-chat`, `POST /clear-chat` — gestão do chat
- `POST /send-location`, `POST /send-contact`, `POST /send-sticker`, `POST /send-poll` — conteúdo rico
- `POST /mark-as-read`, `POST /mark-chat-as-read` — marcação de leitura (corrigido para usar a chave original da mensagem, funcionando também em grupos)

### Contatos (`/api/v1/contact`)
- `POST /block`, `POST /unblock` — bloquear/desbloquear um contato
- `POST /status` — buscar o status ("recado") de um contato

### Sessão (`/api/v1/session`)
- `POST /presence` — definir presença online/offline da conta conectada
- `POST /profile-name`, `POST /profile-status`, `POST /profile-picture`, `POST /profile-picture/remove` — gerenciar o próprio perfil

### Grupos (`/api/v1/group`)
- `POST /create`, `POST /leave`
- `POST /add-participants`, `POST /remove-participants`, `POST /promote-participants`, `POST /demote-participants`
- `POST /update-subject`, `POST /update-description`, `POST /metadata`
- `POST /invite-code`, `POST /revoke-invite`, `POST /join`

Todas as rotas exigem o mesmo header de autenticação por tenant já usado nas rotas existentes, e validam que a `session_id` pertence ao tenant autenticado antes de tocar no socket do Baileys.