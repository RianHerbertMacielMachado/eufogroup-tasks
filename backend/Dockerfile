FROM node:18-alpine

WORKDIR /app

# Instalar dependências de sistema necessárias para o Prisma
RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci
RUN npx prisma generate

COPY src ./src
COPY tsconfig.json ./

RUN npm run build

# Criar diretório de uploads
RUN mkdir -p uploads

EXPOSE 3000

ENV NODE_ENV=production
ENV TZ=America/Sao_Paulo

CMD ["npm", "run", "start:prod"]
