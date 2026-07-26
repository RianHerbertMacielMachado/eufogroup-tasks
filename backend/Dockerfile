FROM node:18-alpine

# Instalar dependências de sistema necessárias para o Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# O contexto de build é a RAIZ do repositório
# Copiamos apenas os arquivos do backend
COPY backend/package*.json ./
COPY backend/prisma ./prisma/

RUN npm ci
RUN npx prisma generate

COPY backend/src ./src
COPY backend/tsconfig.json ./

RUN npm run build

# Criar diretório de uploads
RUN mkdir -p uploads

EXPOSE 3000

ENV NODE_ENV=production
ENV TZ=America/Sao_Paulo

CMD ["npm", "run", "start:prod"]
