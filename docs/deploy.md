# Deploy

Um único serviço Node serve a API (`/api/...`) **e** o build do React
(`frontend/dist`), no mesmo domínio. O banco é um PostgreSQL separado.

Funciona em qualquer host que rode Node 20+ (Render, Railway, Fly, VPS).

## Comandos (na raiz do repositório)

| Etapa   | Comando           | O que faz                                                    |
| ------- | ----------------- | ------------------------------------------------------------ |
| Build   | `npm run build`   | instala deps do backend (sem dev) e do front, gera `frontend/dist` |
| Migrate | `npm run migrate` | aplica as migrations no banco de `DATABASE_URL`              |
| Start   | `npm start`       | sobe o Express na porta `PORT`                               |

Ordem no primeiro deploy: build → migrate → start. Depois, para criar o
primeiro admin, rode o `criar-admin.js` (ou o `seed:demo` para o site de
demonstração) apontando para o banco de produção.

Health check para o provedor: `GET /api/health` → `{"status":"ok"}`.

## Variáveis de ambiente

| Variável                     | Produção                                       |
| ---------------------------- | ---------------------------------------------- |
| `DATABASE_URL`               | URL do Postgres hospedado, com `?sslmode=require` (ou `no-verify`, conforme o provedor) |
| `NODE_ENV`                   | `production`                                   |
| `JWT_SECRET`                 | valor aleatório próprio (o servidor **recusa subir** com o do `.env.example`) |
| `JWT_EXPIRES_IN`             | ex.: `12h`                                     |
| `PORT`                       | normalmente definido pelo próprio provedor     |
| `NOTIFICACAO_ATIVA`          | `true` (precisa do disco persistente, ver abaixo) |
| `WHATSAPP_AUTH_DIR`          | `/var/data/baileys_auth` (subpasta do disco persistente) |
| `NOTIFICACAO_INTERVALO_CRON` | só se a notificação estiver ativa              |
| `NOTIFICACAO_LIMITE_HORAS`   | só se a notificação estiver ativa              |
| `CORS_ORIGEM`                | deixar vazio (front e API no mesmo domínio)    |

## Publicação escolhida: Render (pago) + Neon

O `render.yaml` na raiz descreve o serviço (Blueprint). As migrations rodam
sozinhas no `preDeployCommand` a cada deploy.

1. **Neon:** projeto `guarita` (`solitary-bonus-69499066`), região
   `aws-us-east-1`, branch `production`, já vinculado ao repositório
   (`neon.ts` + `.neon`). `npx neon@latest env pull` grava as URLs em
   `.env.local` (ignorado pelo git).
2. **Render:** New → Blueprint → escolher o repositório. Ele lê o
   `render.yaml` e pede só o `DATABASE_URL`. Usar a **`DATABASE_URL_UNPOOLED`**
   do `.env.local` (conexão direta, sem `-pooler` no host: as migrations usam
   lock de sessão, que o pooler em modo transação não garante), trocando
   `sslmode=require` por **`sslmode=verify-full`**: é o que o `pg` já faz hoje,
   mas o `require` muda de significado no `pg` 9. O `JWT_SECRET` é gerado
   pelo próprio Render.
3. **Primeiro admin e dados de demonstração**, rodados da máquina local
   contra o Neon (o `dotenv` não sobrescreve variável já definida no
   terminal, então o `.env` local não é tocado):

   ```powershell
   cd backend
   $env:DATABASE_URL = "<connection string do Neon>"
   node scripts/criar-admin.js "Nome Completo" email@exemplo.com <senha>
   node scripts/seed-demo.js
   Remove-Item Env:DATABASE_URL
   ```

O banco local de desenvolvimento não é copiado: ele tem só dados de teste.

## Notificação (WhatsApp) no Render

A sessão do WhatsApp (Baileys) fica gravada em arquivos, e o disco normal do
Render é apagado a cada deploy/reinício. Por isso o serviço tem um **disco
persistente** montado em `/var/data`, e a variável `WHATSAPP_AUTH_DIR`
aponta a sessão para `/var/data/baileys_auth`.

Para parear (ou parear de novo, se a sessão cair):

1. Entre no site como admin e abra **WhatsApp** no menu.
2. No celular do chip: WhatsApp → Aparelhos conectados → Conectar um aparelho
   → escaneie o QR da tela.
3. A tela passa a mostrar "Conectado".

Se o aparelho for removido no celular, o sistema apaga a sessão velha sozinho
e a tela volta a mostrar um QR novo.

Cuidado: o pareamento do servidor é um aparelho conectado diferente do
pareamento local. Os dois podem existir ao mesmo tempo (o WhatsApp aceita até
4 aparelhos), mas cada um manda notificação para as entradas do **seu** banco.
