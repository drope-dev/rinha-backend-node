#!/bin/bash

echo "🚀 Iniciando build da Rinha Backend Node.js"

# Limpar build anterior
echo "🧹 Limpando build anterior..."
rm -rf dist/

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Build TypeScript
echo "🔨 Compilando TypeScript..."
npm run build

# Verificar se build foi bem-sucedido
if [ -d "dist" ] && [ -f "dist/server/index.js" ]; then
    echo "✅ Build concluído com sucesso!"
    echo "📁 Arquivos gerados em dist/"
    ls -la dist/
else
    echo "❌ Erro no build - arquivos não encontrados em dist/"
    exit 1
fi

echo "🎯 Build pronto para produção!"