# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependências (incluindo devDependencies para build)
RUN npm install

# Copiar código fonte
COPY . .

# Compilar TypeScript para JavaScript
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copiar apenas arquivos necessários para produção
COPY package*.json ./

# Instalar apenas dependências de produção
RUN npm install --only=production && npm cache clean --force

# Copiar código compilado do stage anterior
COPY --from=builder /app/dist ./dist

# Copiar arquivos de configuração necessários
COPY --from=builder /app/src/database/init.sql ./dist/database/

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && \
  adduser -S nodejs -u 1001

USER nodejs

# Expor porta
EXPOSE 3000

# Comando para executar a aplicação
CMD ["node", "dist/server/index.js"]