#!/bin/bash

echo "🏆 Rinha de Backend 2025 - Build Script"
echo "======================================"

# Verificar se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker não está rodando. Por favor, inicie o Docker primeiro."
    exit 1
fi

# Limpar build anterior
echo "🧹 Limpando build anterior..."
npm run clean 2>/dev/null || true

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Testar build TypeScript
echo "🔨 Testando build TypeScript..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build TypeScript concluído!"
    
    # Build Docker
    echo "🐳 Construindo imagens Docker..."
    docker compose build
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "🎉 Build completo concluído com sucesso!"
        echo ""
        echo "📋 Próximos passos:"
        echo "   1. Subir Payment Processors:"
        echo "      cd src/payment-processor && docker compose up -d"
        echo ""
        echo "   2. Subir sua aplicação:"
        echo "      docker compose up -d"
        echo ""
        echo "   3. Testar:"
        echo "      curl http://localhost:9999/health"
        echo ""
    else
        echo "❌ Erro no build Docker!"
        exit 1
    fi
else
    echo "❌ Erro no build TypeScript!"
    exit 1
fi