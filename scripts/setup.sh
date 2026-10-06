#!/bin/bash

echo "=============================================="
echo "🚀 Bootstrapping AVENQRA Development Workspace"
echo "=============================================="

# 1. Create local .env files if missing
if [ ! -f backend/.env ]; then
    echo "📄 Creating backend/.env from template..."
    cp backend/.env.example backend/.env
fi

if [ ! -f ai-service/.env ]; then
    echo "📄 Creating ai-service/.env from template..."
    cp ai-service/.env.example ai-service/.env
fi

# 2. Install Backend Dependencies
echo "📦 Installing Backend npm packages..."
cd backend && npm install && cd ..

# 3. Install Web Dashboard Dependencies
echo "📦 Installing Web React npm packages..."
cd web && npm install && cd ..

echo "✅ AVENQRA Setup complete! Run 'docker-compose up --build' to start services."
