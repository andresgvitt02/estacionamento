# Estacionamento

Sistema web de gerenciamento de estacionamento para operações de pequeno e
médio porte. TCC / Projeto Tecnológico — Análise e Desenvolvimento de
Sistemas, ULBRA Torres.

Autor: Andres Gonçalves Vitt. Orientador: Daniel Souza Vargas.

## Stack

- **Frontend:** React
- **Backend:** Node.js + Express
- **Banco:** PostgreSQL
- **Comunicação:** API REST

## Estrutura do repositório

```
estacionamento/
├── backend/     # API e lógica de negócio
├── frontend/    # Interface do usuário
├── docs/        # Proposta e documentos do TCC
├── CLAUDE.md    # Contexto do projeto para o Claude Code
└── README.md    # Este arquivo
```

## Como rodar

### Backend

Pré-requisito: PostgreSQL rodando localmente (ou acessível via `DATABASE_URL`).

```bash
cd backend
npm install
cp .env.example .env      # ajuste DATABASE_URL se necessário
createdb estacionamento   # ou crie o banco manualmente
npm run migrate:up        # aplica as migrations em backend/migrations/
npm run dev                # sobe a API com reload automático
```

Ver [`docs/modelagem-banco.md`](docs/modelagem-banco.md) para o desenho das
tabelas e o porquê de cada decisão de modelagem.

### Frontend

Pré-requisito: backend rodando em `localhost:3000` (o Vite já faz proxy de
`/api` pra lá em dev, ver `frontend/vite.config.js`).

```bash
cd frontend
npm install
npm run dev
```

## Documentação

A proposta e os demais documentos do TCC estão em [`docs/`](docs/).
