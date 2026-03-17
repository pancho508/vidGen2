#!/bin/bash

# VidGen2 Service Startup Script
# Run this script and follow the instructions to start all services

set -e

echo "=========================================="
echo "VidGen2 Service Stack Startup"
echo "=========================================="
echo ""
echo "This script will show you how to start all required services."
echo "You need to open 3 terminal windows/tabs for this."
echo ""
echo "Press ENTER to continue..."
read

echo ""
echo "========== WINDOW 1: OLLAMA (LLM Engine) =========="
echo ""
echo "Copy and paste this command in a NEW terminal window:"
echo ""
echo "OLLAMA_FLASH_ATTENTION=1 OLLAMA_KV_CACHE_TYPE=q8_0 /opt/homebrew/opt/ollama/bin/ollama serve"
echo ""
echo "Then pull the model with (in a DIFFERENT terminal):"
echo "/opt/homebrew/opt/ollama/bin/ollama pull llama3:8b"
echo ""
echo "Expected output:"
echo "  ✅ Ollama running on http://localhost:11434"
echo "  ✅ llama3:8b model downloaded (~4.7 GB)"
echo ""
echo "Press ENTER when Ollama is running..."
read

echo ""
echo "========== WINDOW 2: COMFYUI (Image Generation) =========="
echo ""
echo "Copy and paste this command in a NEW terminal window:"
echo ""
echo "cd ~/AI/ComfyUI && source venv/bin/activate && python main.py"
echo ""
echo "Expected output:"
echo "  ✅ ComfyUI running on http://localhost:8188"
echo "  ✅ Models loaded and ready"
echo ""
echo "Press ENTER when ComfyUI is running..."
read

echo ""
echo "========== WINDOW 3: XTTS (Voice Generation) =========="
echo ""
echo "Copy and paste this command in a NEW terminal window:"
echo ""
echo "tts --model_name=tts_models/multilingual/multi_speaker/xtts_v2 --language_idx=en --port 5000"
echo ""
echo "Expected output:"
echo "  ✅ XTTS running on http://localhost:5000"
echo "  ✅ Model cached"
echo ""
echo "Press ENTER when XTTS is running..."
read

echo ""
echo "========== VERIFICATION =========="
echo ""
echo "Now, verifying all services..."
echo ""

# Verify Ollama
echo "🔍 Testing Ollama..."
if timeout 5 curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "✅ Ollama OK (http://localhost:11434)"
else
    echo "❌ Ollama NOT responding - make sure Window 1 is running"
fi

# Verify ComfyUI
echo "🔍 Testing ComfyUI..."
if timeout 5 curl -s http://localhost:8188 > /dev/null 2>&1; then
    echo "✅ ComfyUI OK (http://localhost:8188)"
else
    echo "❌ ComfyUI NOT responding - make sure Window 2 is running"
fi

# Verify XTTS
echo "🔍 Testing XTTS..."
if timeout 5 curl -s http://localhost:5000 > /dev/null 2>&1; then
    echo "✅ XTTS OK (http://localhost:5000)"
else
    echo "❌ XTTS NOT responding - make sure Window 3 is running"
fi

# Verify Whisper
echo "🔍 Testing Whisper..."
if which whisper > /dev/null 2>&1; then
    echo "✅ Whisper OK"
else
    echo "❌ Whisper NOT found - run: brew install whisper-cpp"
fi

# Verify FFmpeg
echo "🔍 Testing FFmpeg..."
if which ffmpeg > /dev/null 2>&1; then
    echo "✅ FFmpeg OK"
else
    echo "❌ FFmpeg NOT found - run: brew install ffmpeg"
fi

echo ""
echo "=========================================="
echo "✨ Next Steps:"
echo "=========================================="
echo ""
echo "1. Keep all terminal windows open (services must stay running)"
echo "2. Edit .env with service URLs:"
echo "   nano .env"
echo ""
echo "3. Verify .env has correct values:"
echo "   OLLAMA_URL=http://localhost:11434"
echo "   COMFYUI_URL=http://localhost:8188"
echo "   XTTS_URL=http://localhost:5000"
echo ""
echo "4. Build the project:"
echo "   npm run build"
echo ""
echo "5. Run with a test book:"
echo "   npm run process ./books/test-book.epub"
echo ""
echo "=========================================="
echo "Good luck! 🚀"
echo "=========================================="
