# ─── Stage 1: Build do Frontend ───────────────────────────────────────────────
FROM node:18-alpine AS frontend-builder

WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build
# Resultado em /frontend/dist

# ─── Stage 2: Build do Backend ────────────────────────────────────────────────
FROM node:18-alpine AS backend-builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY backend/package*.json ./
COPY backend/prisma ./prisma/

RUN npm ci
RUN npx prisma generate

COPY backend/src ./src
COPY backend/tsconfig.json ./

RUN npm run build
# Resultado em /app/dist

# ─── Stage 3: Imagem final de produção ────────────────────────────────────────
FROM node:18-alpine AS production

RUN apk add --no-cache openssl

WORKDIR /app

# Copiar dependências e prisma
COPY backend/package*.json ./
COPY backend/prisma ./prisma/

RUN npm ci --omit=dev
RUN npx prisma generate

# Copiar código compilado do backend
COPY --from=backend-builder /app/dist ./dist

# Copiar frontend buildado para /app/public (servido pelo Express)
COPY --from=frontend-builder /frontend/dist ./public

# Criar diretório de uploads persistente
RUN mkdir -p uploads

EXPOSE 3000

ENV NODE_ENV=production
ENV TZ=America/Sao_Paulo

CMD ["npm", "run", "start:prod"]
