# Rinha de Backend 2025 - Node.js

## 🏆 Descrição

Backend desenvolvido para a **Rinha de Backend 2025** que intermediária solicitações de pagamentos para Payment Processors, implementando lógica de fallback, retry automático e alta performance.

## 🚀 Tecnologias Utilizadas

- **Node.js** com TypeScript
- **Fastify** - Framework web de alta performance
- **PostgreSQL** - Banco de dados para armazenar pagamentos processados
- **Redis** - Sistema de filas (BullMQ) para processamento assíncrono
- **Nginx** - Load balancer para distribuição de carga
- **Docker** - Containerização completa da aplicação

## 📋 Endpoints Implementados

### `POST /payments`

Recebe solicitações de pagamento para processamento.

```json
{
  "correlationId": "4a7901b8-7d26-4d9d-aa19-4dc1c7cf60b3",
  "amount": 19.9
}
```

### `GET /payments-summary`

Retorna resumo dos pagamentos processados com filtros opcionais de data.

```json
{
  "default": {
    "totalRequests": 43236,
    "totalAmount": 415542345.98
  },
  "fallback": {
    "totalRequests": 423545,
    "totalAmount": 329347.34
  }
}
```

## 🏗️ Arquitetura

### Sistema de Fallback Inteligente

1. **Default Processor** (taxa 5%) - Primeira opção
2. **Fallback Processor** (taxa 15%) - Backup automático
3. **Retry Automático** - Até 3 tentativas com backoff exponencial
4. **Health Check** - Verificação periódica dos processors

### Componentes

- **2 Instâncias de API** - Para alta disponibilidade
- **Nginx Load Balancer** - Distribuição inteligente de carga
- **PostgreSQL** - Persistência de dados de pagamentos
- **Redis + BullMQ** - Fila para processamento assíncrono
- **Worker** - Processamento em background com retry

## 📊 Performance e Otimizações

### Configurações de Performance

- **Pool de conexões PostgreSQL** (máx: 20)
- **Nginx com least_conn** para distribuição eficiente
- **Timeout otimizado** (5s para processors)
- **Memory limits** configurados conforme especificação

### Limites de Recursos

- **Total CPU**: 1.5 unidades
- **Total Memory**: 350MB
- **Distribuição otimizada** entre serviços

## 🔧 Como Executar

### 1. Pré-requisitos

```bash
# Subir Payment Processors primeiro
cd src/payment-processor
docker compose up -d
cd ../..
```

### 2. Build e Execução do Backend

#### Opção 1: Script Automatizado (Recomendado)

```bash
# Executa build completo automaticamente
./build.sh
```

#### Opção 2: Passo a Passo

```bash
# Instalar dependências
npm install

# Build da aplicação (compilar TypeScript)
npm run build

# Build das imagens Docker
docker compose build

# Executar com Docker Compose
docker compose up -d
```

#### Opção 3: Desenvolvimento

```bash
# Executar em modo desenvolvimento (sem Docker)
npm run dev
```

### 3. Testar Endpoints

```bash
# Verificar se está funcionando
curl http://localhost:9999/health

# Enviar pagamento
curl -X POST http://localhost:9999/payments \
  -H "Content-Type: application/json" \
  -d '{
    "correlationId": "550e8400-e29b-41d4-a716-446655440001",
    "amount": 100.50
  }'

# Verificar resumo
curl http://localhost:9999/payments-summary
```

### 4. Troubleshooting

#### Build Errors

```bash
# Se houver erro de dependências
rm -rf node_modules package-lock.json
npm install

# Se houver erro no TypeScript
npm run clean
npm run build
```

#### Docker Errors

```bash
# Limpar caches Docker
docker system prune -f

# Rebuild forçado
docker compose build --no-cache

# Verificar logs
docker compose logs api-1
docker compose logs api-2
```

#### Verificações

```bash
# Verificar se Payment Processors estão rodando
curl http://localhost:8001/payments/service-health
curl http://localhost:8002/payments/service-health

# Verificar se Redis está funcionando
docker compose exec redis redis-cli ping

# Verificar se PostgreSQL está funcionando
docker compose exec postgres pg_isready -U postgres
```

## 📈 Estratégias de Otimização

### 1. Maximização de Lucro

- **Priorização do Default** (menor taxa)
- **Fallback automático** quando necessário
- **Retry inteligente** para maximizar sucesso

### 2. Performance (p99)

- **Timeouts agressivos** para requests rápidos
- **Connection pooling** otimizado
- **Load balancing eficiente**
- **Nginx otimizado** para baixa latência

### 3. Consistência

- **Transações atômicas** no banco
- **Retry com idempotência**
- **Logs detalhados** para auditoria

## 🛡️ Confiabilidade

### Sistema de Retry

- **Máximo 3 tentativas** por pagamento
- **Backoff exponencial**: 2s → 4s → 8s
- **Persistência no banco** após sucesso
- **Logs detalhados** de cada tentativa

### Tolerância a Falhas

- **Graceful degradation** quando processors indisponíveis
- **Health checks** periódicos
- **Worker resiliente** com reconexão automática

## 📁 Estrutura do Projeto

```
├── src/
│   ├── server/index.ts          # Servidor Fastify com endpoints
│   ├── worker.ts                # Worker para processamento assíncrono
│   ├── queue.ts                 # Configuração BullMQ
│   ├── database/
│   │   ├── connection.ts        # Pool PostgreSQL
│   │   └── init.sql            # Schema do banco
│   └── utils/
│       ├── constants.ts         # Configurações gerais
│       ├── payment-config.ts    # URLs dos processors
│       └── retry-config.ts      # Configurações de retry
├── docker-compose.yml           # Orquestração completa
├── nginx.conf                   # Configuração load balancer
└── README.md                    # Documentação
```

## 🔧 Variáveis de Ambiente

```bash
# Servidor
PORT=9999

# Banco de Dados
DB_HOST=postgres
DB_PORT=5432
DB_NAME=rinha_backend
DB_USER=postgres
DB_PASSWORD=postgres

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Payment Processors
DEFAULT_PROCESSOR_URL=http://payment-processor-default:8080
FALLBACK_PROCESSOR_URL=http://payment-processor-fallback:8080
PROCESSOR_TOKEN=123

# Retry Configuration
MAX_RETRY_ATTEMPTS=3
INITIAL_RETRY_DELAY=2000
RETRY_BACKOFF_TYPE=exponential
```

## 🏅 Diferenciais Competitivos

1. **🚀 Alta Performance** - Arquitetura otimizada para baixa latência
2. **💰 Maximização de Lucro** - Priorização inteligente de processors
3. **🛡️ Alta Confiabilidade** - Sistema de retry robusto
4. **📊 Observabilidade** - Logs detalhados e métricas
5. **⚡ Processamento Assíncrono** - Filas para não bloquear requests
6. **🔄 Auto-recuperação** - Resiliente a falhas temporárias

---

**Desenvolvido para a Rinha de Backend 2025** 🏆
