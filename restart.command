#!/bin/bash
cd "$(dirname "$0")"
echo "🧹 Limpiando TODO: node_modules + .next + package-lock..."
rm -rf node_modules .next package-lock.json
echo "📦 Reinstalando dependencias (puede tardar 1-2 min)..."
npm install
echo "✅ Listo!"
echo "🚀 Arrancando servidor..."
npm run dev
