#!/bin/bash

# Script to set up environment variables
# This script creates .env.local with the API keys

ENV_FILE=".env.local"

if [ -f "$ENV_FILE" ]; then
    echo "⚠️  .env.local already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 1
    fi
fi

cat > "$ENV_FILE" << 'EOF'
# API Keys for Car Diagnostics MVP
# ⚠️ WARNING: This file contains sensitive keys and should NEVER be committed to git

# OpenAI API Key
OPENAI_API_KEY=sk-proj-your-openai-api-key-here

# Anthropic/Claude API Key
CLAUDE_API_KEY=sk-ant-api03-your-claude-api-key-here

# Vision API Provider (openai or claude)
VISION_API_PROVIDER=openai

# Optional: Model overrides
# OPENAI_MODEL=gpt-4o
# CLAUDE_MODEL=claude-3-5-sonnet-20241022
EOF

echo "✅ Created $ENV_FILE with API keys"
echo "⚠️  Remember: This file is in .gitignore and will NOT be committed to git"

