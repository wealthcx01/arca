#!/bin/bash
# ARCA — Development Setup
# Run this script to set up the project from scratch.

set -e

echo "🃏 Setting up ARCA..."

# Install dependencies
echo "📦 Installing backend dependencies..."
bun install

echo "📦 Installing frontend dependencies..."
cd client && bun install && cd ..

# Create .env if needed
if [ ! -f .env ]; then
  cp .env.example .env
  echo "📝 Created .env from .env.example"
fi

# Push database schema
echo "🗄️ Creating database tables..."
bun run db:push

# Seed card database
echo "🌱 Seeding card database..."
bun run db:seed

# Start dev servers
echo "🚀 Starting development servers..."
echo "   Backend: http://localhost:3001"
echo "   Frontend: http://localhost:5173"
bun run dev
