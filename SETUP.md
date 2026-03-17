# VidGen2 Local AI Setup Guide

For macOS 14+ with Apple Silicon (M1/M2/M3/M4)

---

## Quick Install (Copy & Paste)

```bash
# This installs everything in order
# Run each section one at a time

# 1. OLLAMA (LLM)
echo "Installing Ollama..."
brew install ollama

# 2. STABLE DIFFUSION via ComfyUI
echo "Installing ComfyUI dependencies..."
brew install python@3.12 git

# 3. XTTS (Voice)
echo "Installing XTTS..."
pip install tts

# 4. WHISPER (Subtitles)
echo "Installing Whisper..."
brew install whisper-cpp

# 5. FFMPEG (Video)
echo "Installing FFmpeg..."
brew install ffmpeg
```

---

## Detailed Installation (Recommended)

### 1️⃣ OLLAMA (Local LLM)

Ollama runs Llama 3, Mistral, and other models locally.

```bash
# Install Ollama
brew install ollama

# Start Ollama server (background)
ollama serve &

# In another terminal, download a model
ollama pull llama3:8b    # 4.7 GB - Recommended
# OR
ollama pull mistral:7b   # 4.0 GB - Faster but less capable
# OR
ollama pull deepseek-coder:6.7b-base  # 3.8 GB

# Verify it works
curl http://localhost:11434/api/tags

# Test a generation
curl -X POST http://localhost:11434/api/generate \
  -d '{"model":"llama3:8b","prompt":"Hello"}'
```

**Installed to:** `~/.ollama/models/`  
**RAM needed:** ~8 GB for llama3:8b  
**Port:** 11434  
**Keep running in background** ← Important!

---

### 2️⃣ STABLE DIFFUSION via ComfyUI

ComfyUI provides a UI and API for image generation.

```bash
# Install Python 3.12
brew install python@3.12

# Create working directory
mkdir -p ~/AI/ComfyUI
cd ~/AI/ComfyUI

# Clone ComfyUI
git clone https://github.com/comfyorg/ComfyUI .

# Create virtual environment
python3.12 -m venv venv
source venv/bin/activate

# Install dependencies (this takes ~5-10 minutes)
pip install -r requirements.txt

# Download Stable Diffusion model
mkdir -p models/checkpoints
cd models/checkpoints

# Download xl1.0 (2.5 GB)
wget https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0_0.9vae.safetensors

# OR use curl if wget not available
curl -L -o sd_xl_base_1.0_0.9vae.safetensors \
  https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0_0.9vae.safetensors

cd ../..

# Start ComfyUI server
python main.py

# Access at http://localhost:8188
```

**Installed to:** `~/AI/ComfyUI/`  
**Model location:** `~/AI/ComfyUI/models/checkpoints/`  
**RAM needed:** ~6-8 GB (with GPU acceleration)  
**Port:** 8188  
**Keep running in background** ← Important!

---

### 3️⃣ XTTS v2 (Voice Generation)

XTTS synthesizes natural speech from text.

```bash
# Install via pip
pip install TTS

# Download model (happens on first run, ~1.5 GB)
tts --list_models | grep xtts

# Start XTTS server
tts --model_name=tts_models/multilingual/multi_speaker/xtts_v2 \
    --language_idx=en --port 5000

# This will:
# 1. Download model (~1.5 GB)
# 2. Start server on http://localhost:5000
# 3. Show "Running on http://0.0.0.0:5000"

# Test it (in another terminal)
curl -X POST http://localhost:5000/tts_stream \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, this is a test.",
    "language": "en"
  }' --output test.wav
```

**Model location:** `~/.cache/tts_models/`  
**RAM needed:** ~2 GB  
**Port:** 5000  
**Keep running in background** ← Important!

---

### 4️⃣ WHISPER (Subtitles)

Whisper converts audio to text for subtitles.

```bash
# Install Whisper
brew install whisper-cpp

# Verify installation
which whisper

# Download model (base, ~140 MB)
whisper-cpp --model base

# OR get the binary directly
cd ~/Downloads
git clone https://github.com/ggerganov/whisper.cpp.git
cd whisper.cpp
make

# Place in PATH
sudo mv ./main /usr/local/bin/whisper

# Test it
whisper --help
```

**Model location:** `~/.cache/whisper/`  
**RAM needed:** ~500 MB  
**No background service needed** - runs on demand

---

### 5️⃣ FFMPEG (Video Assembly)

FFmpeg is the standard for video composition.

```bash
# Install FFmpeg
brew install ffmpeg

# Verify installation
ffmpeg -version

# Test it works
ffmpeg -f lavfi -i testsrc=duration=1:size=1280x720:rate=1 \
       -pix_fmt yuv420p test.mp4
```

**RAM needed:** ~100 MB  
**No background service needed** - runs on demand

---

## Getting Everything Running

Create a script to start all services:

```bash
#!/bin/bash
# save as ~/start-vidgen2.sh
# then chmod +x ~/start-vidgen2.sh

echo "Starting VidGen2 services..."

# Start Ollama
echo "🤖 Starting Ollama..."
ollama serve > ~/.logs/ollama.log 2>&1 &
OLLAMA_PID=$!
echo "   Ollama PID: $OLLAMA_PID"

# Wait for Ollama to be ready
sleep 5
until curl -s http://localhost:11434/api/tags > /dev/null; do
  echo "   Waiting for Ollama..."
  sleep 2
done
echo "   ✅ Ollama ready"

# Start ComfyUI
echo "🎨 Starting ComfyUI..."
cd ~/AI/ComfyUI
source venv/bin/activate
python main.py > ~/.logs/comfyui.log 2>&1 &
COMFYUI_PID=$!
echo "   ComfyUI PID: $COMFYUI_PID"
sleep 5

# Start XTTS
echo "🎤 Starting XTTS..."
tts --model_name=tts_models/multilingual/multi_speaker/xtts_v2 \
    --language_idx=en --port 5000 > ~/.logs/xtts.log 2>&1 &
XTTS_PID=$!
echo "   XTTS PID: $XTTS_PID"
sleep 10

# Verify all services
echo ""
echo "Checking services..."
curl -s http://localhost:11434/api/tags > /dev/null && echo "✅ Ollama: http://localhost:11434"
curl -s http://localhost:8188 > /dev/null && echo "✅ ComfyUI: http://localhost:8188"
curl -s http://localhost:5000 > /dev/null && echo "✅ XTTS: http://localhost:5000"

echo ""
echo "All services started!"
echo ""
echo "To stop all services:"
echo "  kill $OLLAMA_PID $COMFYUI_PID $XTTS_PID"
echo ""
echo "Logs:"
echo "  tail -f ~/.logs/ollama.log"
echo "  tail -f ~/.logs/comfyui.log"
echo "  tail -f ~/.logs/xtts.log"
```

Run it:
```bash
mkdir -p ~/.logs
chmod +x ~/start-vidgen2.sh
~/start-vidgen2.sh
```

---

## Verify Everything Works

```bash
#!/bin/bash
# Verify all services

echo "Checking VidGen2 services..."
echo ""

# Check Ollama
echo -n "Ollama: "
if curl -s http://localhost:11434/api/tags > /dev/null; then
  echo "✅ http://localhost:11434"
else
  echo "❌ Not responding"
fi

# Check ComfyUI
echo -n "ComfyUI: "
if curl -s http://localhost:8188 > /dev/null; then
  echo "✅ http://localhost:8188"
else
  echo "❌ Not responding"
fi

# Check XTTS
echo -n "XTTS: "
if curl -s http://localhost:5000 > /dev/null; then
  echo "✅ http://localhost:5000"
else
  echo "❌ Not responding"
fi

# Check Whisper
echo -n "Whisper: "
if which whisper > /dev/null; then
  echo "✅ $(which whisper)"
else
  echo "❌ Not installed"
fi

# Check FFmpeg
echo -n "FFmpeg: "
if which ffmpeg > /dev/null; then
  echo "✅ $(which ffmpeg)"
else
  echo "❌ Not installed"
fi
```

---

## Configure VidGen2

After all services are running, configure VidGen2:

```bash
cd /Users/luzbel/repos/vidGen2

# Copy example config
cp .env.example .env

# Edit .env with your paths
nano .env

# Verify paths (example values)
cat .env
```

Your `.env` should look like:
```env
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3:8b

COMFYUI_URL=http://localhost:8188

XTTS_URL=http://localhost:5000

WHISPER_PATH=/usr/local/bin/whisper
FFMPEG_PATH=/usr/local/bin/ffmpeg

SCHEDULE_TIME=0 3 * * *
LOG_LEVEL=info
LOG_DIR=./logs

TARGET_VIDEO_DURATION=540
TARGET_SCENE_COUNT=20
TARGET_SCRIPT_WORD_COUNT=1400
```

---

## Test Everything

```bash
cd /Users/luzbel/repos/vidGen2

# Ensure all services are running
# (use ~/start-vidgen2.sh from above)

# Copy a test book
cp ~/Downloads/test-book.epub books/

# Run the pipeline
npm run process ./books/test-book.epub
```

**This will:**
1. Parse the book
2. Call Ollama for summarization
3. Generate scene prompts
4. Create placeholder images/audio/subtitles
5. Assemble a test video
6. Output to `videos/video.mp4`

---

## Troubleshooting

### Ollama Issues

```bash
# Check if running
curl http://localhost:11434/api/tags

# Restart
brew services stop ollama
brew services start ollama

# Check logs
tail -f ~/.logs/ollama.log
```

### ComfyUI Issues

```bash
# Make sure you're in the virtual environment
cd ~/AI/ComfyUI
source venv/bin/activate

# Try reinstalling dependencies
pip install -r requirements.txt

# Check if model is downloaded
ls -lh models/checkpoints/ | grep sd_xl
```

### XTTS Issues

```bash
# Check if model is cached
ls -lh ~/.cache/tts_models/

# Reinstall
pip uninstall TTS -y
pip install TTS

# Start with debug
tts --model_name=tts_models/multilingual/multi_speaker/xtts_v2 \
    --language_idx=en --port 5000 --debug
```

### Whisper Issues

```bash
# Verify installation
which whisper

# Test on a file
whisper test-audio.wav --language en --output_format srt
```

### FFmpeg Issues

```bash
# Check version
ffmpeg -version

# Reinstall if needed
brew reinstall ffmpeg
```

---

## Storage Requirements

| Service | Storage | RAM | GPU Optional |
|---------|---------|-----|--------------|
| Ollama (llama3:8b) | 4.7 GB | 8 GB | Yes |
| ComfyUI + SDXL | 2.5 GB | 6-8 GB | Yes (recommended) |
| XTTS | 1.5 GB | 2 GB | No |
| Whisper | 140 MB | 500 MB | No |
| **Total** | **~9 GB** | **~16 GB** | **Highly recommended** |

---

## Apple Silicon Acceleration

All services support native Apple Silicon with GPU acceleration:

```bash
# XTTS automatically uses Metal GPU
# ComfyUI automatically uses Metal GPU
# Ollama automatically uses GPU

# Verify GPU usage (Activity Monitor → GPU column should show activity)
```

---

## Keep Services Running

### Option 1: Manual (Development)
```bash
# Terminal 1
ollama serve

# Terminal 2
cd ~/AI/ComfyUI && source venv/bin/activate && python main.py

# Terminal 3
tts --model_name=tts_models/multilingual/multi_speaker/xtts_v2 --port 5000
```

### Option 2: Background (Using script above)
```bash
~/start-vidgen2.sh    # Starts all in background
```

### Option 3: System Services (Permanent)
```bash
# Create launchd plist files for automatic startup
# (more advanced - ask if needed)
```

---

## Next Steps

1. **Run installations one by one** (takes ~30 minutes total)
2. **Start all services** (use `~/start-vidgen2.sh`)
3. **Verify they work** (use verify script above)
4. **Configure VidGen2's `.env`**
5. **Test with sample book** (`npm run process`)
6. **Check logs** if anything fails

---

## Estimated Time

- Ollama: 2 min install + 5 min first model download = **7 min**
- ComfyUI: 5 min install + 20 min dependencies + SDXL download = **25 min**
- XTTS: 2 min install + 5 min first run = **7 min**
- Whisper: 2 min install = **2 min**
- FFmpeg: 1 min = **1 min**
- **Total: ~45 minutes**

---

**Run this and let me know if you hit any errors!** 🚀
