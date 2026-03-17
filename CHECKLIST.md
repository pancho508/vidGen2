# VidGen2 Installation Checklist

Use this to track your installation progress.

---

## ✅ Installation Steps

### Step 1: OLLAMA (LLM Engine)
- [ ] Run: `brew install ollama`
- [ ] Run: `ollama pull llama3:8b`
- [ ] Test: `curl http://localhost:11434/api/tags` (after starting `ollama serve`)
- **Time:** ~10 minutes

### Step 2: COMFYUI (Image Generation)
- [ ] Run: `brew install python@3.12`
- [ ] Create folder: `mkdir -p ~/AI/ComfyUI && cd ~/AI/ComfyUI`
- [ ] Clone: `git clone https://github.com/comfyorg/ComfyUI .`
- [ ] Setup: `python3.12 -m venv venv && source venv/bin/activate`
- [ ] Install: `pip install -r requirements.txt`
- [ ] Download SD model to `models/checkpoints/`
- **Time:** ~25-30 minutes (mostly waiting for downloads)

### Step 3: XTTS (Voice Generation)
- [ ] Run: `pip install TTS`
- [ ] Start: `tts --model_name=tts_models/multilingual/multi_speaker/xtts_v2 --language_idx=en --port 5000`
- **Time:** ~5 minutes (model downloads on first run)

### Step 4: WHISPER (Subtitle Generation)
- [ ] Run: `brew install whisper-cpp`
- [ ] Test: `which whisper`
- **Time:** ~2-3 minutes

### Step 5: FFMPEG (Video Assembly)
- [ ] Run: `brew install ffmpeg`
- [ ] Test: `ffmpeg -version`
- **Time:** ~2 minutes

---

## 🚀 Start All Services

After installation, start all services:

```bash
# Window 1: Ollama
ollama serve

# Window 2: ComfyUI
cd ~/AI/ComfyUI
source venv/bin/activate
python main.py

# Window 3: XTTS
tts --model_name=tts_models/multilingual/multi_speaker/xtts_v2 --language_idx=en --port 5000
```

---

## ✅ Verification Checklist

Run after all services are started:

```bash
# Should all return "successfully connected"
echo "Testing Ollama..."
curl -s http://localhost:11434/api/tags > /dev/null && echo "✅ Ollama OK" || echo "❌ Ollama FAILED"

echo "Testing ComfyUI..."
curl -s http://localhost:8188 > /dev/null && echo "✅ ComfyUI OK" || echo "❌ ComfyUI FAILED"

echo "Testing XTTS..."
curl -s http://localhost:5000 > /dev/null && echo "✅ XTTS OK" || echo "❌ XTTS FAILED"

echo "Testing Whisper..."
which whisper > /dev/null && echo "✅ Whisper OK" || echo "❌ Whisper FAILED"

echo "Testing FFmpeg..."
which ffmpeg > /dev/null && echo "✅ FFmpeg OK" || echo "❌ FFmpeg FAILED"
```

---

## 📝 Configure VidGen2

```bash
cd /Users/luzbel/repos/vidGen2

# Copy config template
cp .env.example .env

# Edit with your actual paths
nano .env

# Verify it looks right
cat .env
```

Key settings to check:
```env
OLLAMA_URL=http://localhost:11434          # ✅ Must be running
OLLAMA_MODEL=llama3:8b                      # ✅ Model you pulled
COMFYUI_URL=http://localhost:8188          # ✅ Must be running
XTTS_URL=http://localhost:5000             # ✅ Must be running
WHISPER_PATH=/usr/local/bin/whisper        # ✅ Check with: which whisper
FFMPEG_PATH=/usr/local/bin/ffmpeg          # ✅ Check with: which ffmpeg
```

---

## 🧪 Test the Pipeline

```bash
cd /Users/luzbel/repos/vidGen2

# Build the code
npm run build

# Place a test book
echo "Getting test book..."
# (You can copy any EPUB, PDF, or TXT file to books/ folder)

# Run the pipeline
npm run process ./books/test-book.epub

# Expected output:
# ✅ videos/video.mp4 (placeholder)
# ✅ audio/narration.wav (placeholder)
# ✅ subtitles/subtitles.srt
# ✅ images/scene_*.png (20 images)
# ✅ thumbnails/thumbnail.png
```

---

## 📊 Storage Used

After installation:

```bash
# Check disk usage
du -sh ~/.ollama/           # Ollama models (~5 GB for llama3)
du -sh ~/AI/ComfyUI/        # ComfyUI setup (~4 GB)
du -sh ~/.cache/tts_models/ # XTTS model (~1.5 GB)
du -sh ~/.cache/whisper/    # Whisper model (~140 MB)

# Total: ~10 GB
```

---

## ⚡ Performance Tips

### Enable GPU Acceleration
All services use Apple Silicon GPU automatically:
- ✅ Ollama: Metal GPU (no config needed)
- ✅ ComfyUI: Metal GPU (no config needed)
- ✅ XTTS: Metal GPU (no config needed)

### Monitor GPU Usage
Open **Activity Monitor** → Sort by GPU column while running:
- `python` processes should show GPU % > 0
- `ollama` process should show GPU % > 0

### Optimize for Speed
Edit `.env`:
```env
# For faster (but lower quality) results:
TARGET_SCRIPT_WORD_COUNT=1000   # Instead of 1400
TARGET_SCENE_COUNT=15           # Instead of 20
```

---

## Troubleshooting

### Issue: "Ollama connection refused"
```bash
# Make sure you're running it
ollama serve

# In different terminal, check
curl http://localhost:11434/api/tags
```

### Issue: "ComfyUI port already in use"
```bash
# Find what's using port 8188
lsof -i :8188

# Kill it
kill -9 <PID>

# Try again
cd ~/AI/ComfyUI && source venv/bin/activate && python main.py
```

### Issue: "XTTS model not found"
```bash
# First run downloads the model, make sure it completes
tts --model_name=tts_models/multilingual/multi_speaker/xtts_v2 --language_idx=en --port 5000

# Check if it's cached
ls -lh ~/.cache/tts_models/

# If missing, reinstall
pip uninstall TTS -y
pip install TTS
```

### Issue: "Not enough disk space"
Clean up:
```bash
# Remove old models
rm -rf ~/.cache/pip

# Check what's big
du -sh ~/* | sort -h | tail -10
```

---

## ✨ What to Do Next

1. **Follow this checklist** ← Do this NOW
2. **Get all services running**
3. **Verify with the curl tests**
4. **Configure .env**
5. **Place a test book** in `books/` folder
6. **Run:** `npm run process ./books/test.epub`
7. **Check output** in `videos/`, `audio/`, `subtitles/`, etc.

---

## 🎯 Expected Timeline

- Ollama only: **7 minutes** ⚡
- + ComfyUI: **+25 minutes** 
- + XTTS: **+7 minutes**
- + Whisper: **+2 minutes**
- + FFmpeg: **+1 minute**
- **Total: ~45 minutes** ⏱️

Then you can generate videos in **~5 minutes each** 🚀

---

## 💡 Tips

- **Start in new terminals** - Each service needs its own terminal tab/window
- **Keep terminals open** - Services need to stay running
- **Check logs** - If something fails, look at the terminal output
- **Don't close terminals** - This stops the services
- **First run takes longer** - Models are downloaded/cached on first use

---

Good luck! 🎬 Let me know which step you're on and I can help troubleshoot!
