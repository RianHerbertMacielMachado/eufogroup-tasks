# 🎯 Eufogrup Tasks - Sistema de Gestão Multi-Cidade

Sistema de gestão de tasks para o grupo Eufogrup (FiveM), com arquitetura **Multi-Tenant** e isolamento total de dados por cidade.

## 🚀 Deploy no Railway

### Pré-requisitos
1. Conta no [Railway](https://railway.app)
2. Repositório GitHub conectado
3. PostgreSQL criado no Railway

### Passo a passo

1. **Criar projeto no Railway**
   - Novo projeto → Deploy from GitHub repo
   - Selecionar este repositório

2. **Adicionar PostgreSQL**
   - Add service → Database → PostgreSQL
   - Copiar `DATABASE_URL` das variáveis geradas

3. **Configurar variáveis de ambiente** (no Railway Dashboard > Variables):
   ```
   DATABASE_URL=<copiado do PostgreSQL>
   JWT_SECRET=<string aleatória 32+ chars>
   JWT_EXPIRE=15m
   REFRESH_TOKEN_SECRET=<outra string aleatória>
   REFRESH_TOKEN_EXPIRE=7d
   NODE_ENV=production
   PORT=3000
   CLIENT_URL=https://seu-app.railway.app
   TZ=America/Sao_Paulo
   ```

4. **Deploy automático**: Qualquer push na branch `main` dispara deploy automático

## 🏗️ Estrutura do Projeto

```
eufogrup-tasks/
├── backend/          # Node.js + Express + Prisma + PostgreSQL
│   ├── src/          # Código TypeScript
│   ├── prisma/       # Schema e migrations
│   ├── Dockerfile    # Para Railway
│   └── railway.json  # Config Railway
└── frontend/         # React + TypeScript + Tailwind
    └── src/          # Código React
```

## 🔧 Stack Tecnológico

| Camada | Tecnologia |
|--------|-----------|
| Backend | Node.js 18 + Express + TypeScript |
| ORM | Prisma + PostgreSQL |
| Auth | JWT (15min) + Refresh Token (7d) |
| Frontend | React 18 + TypeScript + Tailwind CSS |
| Deploy | Railway (auto-deploy via GitHub) |
| Segurança | bcrypt, CORS, Rate Limiting, Zod |

## 🔐 Credenciais Padrão (após seed)

| Usuário | Discord ID | Senha | Role |
|---------|-----------|-------|------|
| Super Admin | `superadmin#0001` | `admin123` | SUPER_ADMIN |
| Operador Alpha | `operador_alpha#1234` | `op123456` | OPERATOR |

> ⚠️ **Troque as senhas em produção!**

## 🌐 API Endpoints

### Auth
- `POST /api/auth/login` — Login
- `POST /api/auth/refresh` — Refresh token
- `GET /api/auth/me` — Usuário atual

### Cidades (Multi-Tenant)
- `GET /api/cities` — Listar cidades
- `GET /api/cities/:id/dashboard` — Dashboard isolado
- `GET /api/cities/:id/tasks` — Tasks da cidade
- `POST /api/cities/:id/tasks` — Criar task
- `GET /api/cities/:id/events` — Eventos da cidade
- `POST /api/cities/:id/events` — Registrar evento
- `GET /api/cities/:id/employees` — Equipe da cidade

### Admin
- `GET /api/admin/users` — Gerenciar usuários

## ⚡ Desenvolvimento Local

```bash
# 1. Configurar backend
cd backend
cp .env.example .env
# Editar .env com sua DATABASE_URL

# 2. Instalar e migrar
npm install
npx prisma migrate dev
npx prisma db seed

# 3. Iniciar backend
npm run dev

# 4. Instalar e iniciar frontend
cd ../frontend
npm install
npm run dev
```

## 🔒 Segurança Multi-Tenant

- Middleware `validateCityAccess` em TODAS as rotas de cidade
- JWT contém array de `cityIds` autorizados
- Queries Prisma sempre filtram por `cityId`
- Super Admin tem acesso irrestrito
- Usuários só veem dados de suas cidades

---
**Eufogrup Tasks v1.0** | Railway + GitHub | Multi-Tenant
