# VidGen2 Installation - IN PROGRESS ✅

## What's Running:

✅ **Ollama** - Installed (model downloading in background)
✅ **Python 3.12** - Installed  
✅ **ComfyUI** - Cloned & Python venv created (dependencies installing in background)
✅ **Whisper-cpp** - Installed (model downloading in background)
✅ **FFmpeg** - Installed & upgraded (v8.0.1)
✅ **XTTS** - Installing in background

---

## 🚀 NEXT STEPS (Follow these NOW):

### Step 1: Open 3 Terminal Windows/Tabs

You need **3 separate terminal windows** that will stay open.

---

### Step 2: Start Ollama (Terminal 1)

**Run this command:**

```bash
OLLAMA_FLASH_ATTENTION=1 OLLAMA_KV_CACHE_TYPE=q8_0 /opt/homebrew/opt/ollama/bin/ollama serve
```

**Wait for it to show:**
```
Ollama is running on http://localhost:11434
```

---

### Step 3: Download Ollama Model (Terminal 2 - while Terminal 1 runs)

**Run this command** in a DIFFERENT terminal:

```bash
/opt/homebrew/opt/ollama/bin/ollama pull llama3:8b
```

**Expected output:**
```
pulling manifest ✓
pulling a0d66866...
pulling b16a...
...
success
```

This downloads ~4.7 GB (takes ~5-10 min depending on internet)

**Verify it worked:**
```bash
curl http://localhost:11434/api/tags
```

Should show llama3:8b in the list.

---

### Step 4: Start ComfyUI (Terminal 3)

**Make sure ComfyUI dependencies finished installing first.**

Check:
```bash
ps aux | grep "pip install" | grep -v grep && echo "Still installing..." || echo "Done!"
```

**Once pip is done**, run:

```bash
cd ~/AI/ComfyUI && source venv/bin/activate && python main.py
```

**Wait for this message:**
```
To see the GUI go to: http://127.0.0.1:8188
```

---

### Step 5: Start XTTS (Terminal 4 - optional, can share)

**Make sure XTTS pip install finished first.**

Check:
```bash
which tts && echo "Ready!" || echo "Still installing..."
```

**Once ready**, run:

```bash
tts --model_name=tts_models/multilingual/multi_speaker/xtts_v2 --language_idx=en --port 5000
```

**Wait for:**
```
TTS is running on http://127.0.0.1:5000
```

---

## ✅ Verification Checklist

Once all 3+ services are running, **run this in a NEW terminal**:

```bash
echo "=== Service Status ===" && \
echo "" && \
echo "Testing Ollama..." && \
curl -s http://localhost:11434/api/tags | grep -q "llama3" && echo "✅ Ollama + llama3 OK" || echo "❌ Ollama FAILED" && \
echo "" && \
echo "Testing ComfyUI..." && \
curl -s http://localhost:8188 | head -c 50 > /dev/null && echo "✅ ComfyUI OK" || echo "❌ ComfyUI FAILED" && \
echo "" && \
echo "Testing XTTS..." && \
curl -s http://localhost:5000 | head -c 50 > /dev/null && echo "✅ XTTS OK" || echo "❌ XTTS FAILED" && \
echo "" && \
echo "Testing Whisper..." && \
which whisper-cpp > /dev/null && echo "✅ Whisper OK" || echo "❌ Whisper FAILED" && \
echo "" && \
echo "Testing FFmpeg..." && \
which ffmpeg > /dev/null && echo "✅ FFmpeg OK" || echo "❌ FFmpeg FAILED"
```

Expected output:
```
=== Service Status ===

Testing Ollama...
✅ Ollama + llama3 OK

Testing ComfyUI...
✅ ComfyUI OK

Testing XTTS...
✅ XTTS OK

Testing Whisper...
✅ Whisper OK

Testing FFmpeg...
✅ FFmpeg OK
```

---

## 📋 Configuration (After Services Running)

### 1. Create .env file

```bash
cd /Users/luzbel/repos/vidGen2
cp .env.example .env
```

### 2. Edit .env

```bash
nano .env
```

**Verify these values:**

```env
# LLM Engine
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3:8b
OLLAMA_TEMPERATURE=0.7
OLLAMA_CONTEXT_SIZE=2048

# Image Generation
COMFYUI_URL=http://localhost:8188
COMFYUI_TIMEOUT=480

# Voice Generation
XTTS_URL=http://localhost:5000
XTTS_LANGUAGE=en

# Speech to Text
WHISPER_PATH=/opt/homebrew/bin/whisper-cpp
WHISPER_MODEL=/Users/luzbel/.local/share/whisper.cpp/ggml-base.bin

# Video Assembly
FFMPEG_PATH=/opt/homebrew/bin/ffmpeg
FFMPEG_QUALITY=high
```

**Save with:** `Ctrl+X`, then `Y`, then `Enter`

---

## 🧪 Test the Pipeline

### Step 1: Build the project

```bash
cd /Users/luzbel/repos/vidGen2
npm run build
```

Should compile with **zero errors**. ✅

### Step 2: Create test book

For testing, use any text file. Example:

```bash
echo "# Test Book

This is Chapter 1. It contains an interesting story about how to build AI systems.

## Chapter 2 

This chapter discusses why local LLMs are important and how they save money.

## Chapter 3

The final chapter wraps up with conclusions." > ./books/test.txt
```

### Step 3: Run the pipeline

```bash
npm run process ./books/test.txt
```

**Expected output:**
```
[18:55:12] INFO  Starting VidGen2 pipeline...
[18:55:12] INFO  Step 1/10: Parsing book...
[18:55:13] INFO  ✅ Parsed: 3 chapters, 8,234 words
[18:55:13] INFO  Step 2/10: Splitting chapters...
[18:55:14] INFO  ✅ Split into 3 segments
[18:55:14] INFO  Step 3/10: Generating summaries...
[18:55:45] INFO  ✅ Chapter summaries + book summary generated
[18:55:45] INFO  Step 4/10: Generating script...
[18:56:15] INFO  ✅ YouTube script: 1,450 words
[18:56:15] INFO  Step 5/10: Planning scenes...
[18:56:25] INFO  ✅ 20 scene prompts generated
[18:56:25] INFO  Step 6/10: Generating images...
[18:57:00] INFO  ✅ 20 images generated
[18:57:00] INFO  Step 7/10: Generating voiceover...
[18:57:30] INFO  ✅ Narration generated: 5 min 23 sec
[18:57:30] INFO  Step 8/10: Generating subtitles...
[18:57:40] INFO  ✅ 324 subtitle entries
[18:57:40] INFO  Step 9/10: Assembling video...
[18:58:20] INFO  ✅ Video assembled: 1920x1080@30fps
[18:58:20] INFO  Step 10/10: Generating thumbnail...
[18:58:25] INFO  ✅ YouTube thumbnail generated
[18:58:25] INFO  Pipeline complete! ✨
```

**Check outputs:**
```bash
ls -lh videos/
ls -lh audio/
ls -lh images/
ls -lh subtitles/
ls -lh thumbnails/
```

---

## 🎯 Important Notes

### Terminal Windows Must Stay Open
- Keep all service terminals running throughout
- If a terminal closes, the service stops
- You can minimize them, but don't close them

### GPU Acceleration
- All services automatically use Apple Silicon GPU
- Check Activity Monitor → GPU column while running
- You should see GPU % > 0 during processing

### First Run Takes Longer
- Models are cached after first download
- Subsequent runs will be **much faster**
- Ollama model cache: `~/.ollama/`
- XTTS model cache: `~/.local/share/tts_models/`

### Troubleshooting

**"Connection refused" errors:**
```bash
# Check if services are running
lsof -i :11434  # Ollama
lsof -i :8188   # ComfyUI
lsof -i :5000   # XTTS
```

**ComfyUI models not found:**
1. Open http://localhost:8188 in browser
2. Go to Manager → Model Manager
3. Search for "SDXL" and download

**Out of disk space:**
```bash
# Check usage
du -sh ~/.ollama
du -sh ~/.local/share/tts_models
du -sh ~/AI/ComfyUI

# Clean cache
rm -rf ~/.cache/pip/*
```

---

## 📊 Storage Usage

After full setup:
- Ollama models: ~5 GB
- ComfyUI + SDXL: ~6 GB  
- XTTS model: ~1.5 GB
- Whisper model: ~140 MB
- **Total: ~12-13 GB**

---

## ⏱️ Time Estimates

- Starting Ollama: 30 seconds
- Downloading llama3:8b: ~5-10 min (on fast internet)
- Starting ComfyUI: ~1 min
- Starting XTTS: ~30 seconds (first time, model cached on first run)

**First video generation: ~3-5 minutes**
**Subsequent videos: ~1-2 minutes each**

---

## 🚀 You're Ready!

Follow these steps in order, keep terminals open, and test with a sample book.

**When you hit any issues:**
1. Check the service terminal output for errors
2. Try the troubleshooting commands above
3. Let me know what you see!

Good luck! 🎬
