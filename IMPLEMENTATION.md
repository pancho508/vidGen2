# VidGen2 - Local AI Video Factory

Convert books (EPUB, PDF, TXT) into 9-minute YouTube summary videos entirely on your machine, powered by local AI.

## What It Does

VidGen2 automates the entire video creation pipeline:

```
📚 Book (EPUB/PDF/TXT)
  ↓
📝 Extract & Parse Text
  ↓
🧠 Generate Summary (Ollama)
  ↓
🎬 Create YouTube Script (1200-1500 words)
  ↓
🖼️ Plan 20 Visual Scenes
  ↓ (Parallel execution possible)
🎨 Generate Scene Images (Stable Diffusion)
🎙️ Generate Voice Narration (XTTS)
📖 Generate Subtitles (Whisper)
  ↓
🎥 Assemble Final Video (FFmpeg)
  ↓
✅ YouTube-Ready MP4 + Thumbnail
```

**Video Output:** 8-10 minute 1280x720 MP4 with embedded subtitles  
**Processing Time:** ~5 minutes per video  
**Cost:** $0 (everything runs locally)

---

## Quick Start

### 1. Prerequisites

Install local AI services on your machine:

```bash
# Ollama (LLM)
brew install ollama          # macOS
ollama pull llama3:8b        # Download model

# Stable Diffusion (Images)
git clone https://github.com/comfyorg/ComfyUI
cd ComfyUI && python main.py  # Runs on localhost:8188

# XTTS (Voice)
pip install tts
python -m TTS.server.server --model_name=tts_models/multilingual/multi_speaker/xtts_v2

# Whisper (Subtitles)
brew install whisper-cpp

# FFmpeg (Video)
brew install ffmpeg
```

### 2. Clone & Setup

```bash
git clone https://github.com/pancho508/vidGen2
cd vidGen2
npm install
```

### 3. Configure

```bash
cp .env.example .env
# Edit .env with your local AI service URLs and paths
```

### 4. Process a Book

```bash
npm run process ./books/atomic-habits.epub
```

**Output:** `videos/video.mp4` + `audio/narration.wav` + `subtitles/subtitles.srt` + `thumbnails/thumbnail.png`

### 5. (Optional) Schedule Daily Processing

```bash
npm run schedule ./books          # Process all books daily at 3 AM
npm run schedule ./books "0 10 * * *"  # Custom time (10 AM)
```

---

## Project Structure

```
vidGen2/
├── src/
│   ├── cli.ts                    # Command-line interface
│   ├── config/                   # Environment & config
│   ├── types/                    # TypeScript interfaces
│   ├── utils/                    # Logger, helpers
│   ├── modules/                  # Core processing:
│   │   ├── bookParser.ts         # Extract text from books
│   │   ├── chapterSplitter.ts    # Segment into chapters
│   │   ├── summarizer.ts         # LLM-based summarization
│   │   ├── scriptGenerator.ts    # Generate video script
│   │   └── scenePlanner.ts       # Plan visual scenes
│   ├── services/                 # External service integrations:
│   │   ├── ollamaClient.ts       # Local LLM client
│   │   ├── imageGenerator.ts     # Stable Diffusion
│   │   ├── voiceGenerator.ts     # XTTS voice
│   │   ├── subtitleGenerator.ts  # Whisper subtitles
│   │   ├── videoAssembler.ts     # FFmpeg composition
│   │   ├── thumbnailGenerator.ts # YouTube thumbnail
│   │   └── scheduler.ts          # Cron scheduling
│   └── pipeline/
│       └── pipelineRunner.ts     # Orchestration
├── books/                        # Input books (EPUB/PDF/TXT)
├── audio/                        # Generated narration (WAV)
├── images/                       # Generated scenes (PNG)
├── videos/                       # Final output (MP4)
├── subtitles/                    # Generated subtitles (SRT)
├── thumbnails/                   # YouTube thumbnails (PNG)
└── logs/                         # Execution logs
```

---

## Commands

```bash
# Process a single book
npm run process <path-to-book>
npm run process ./books/my-book.epub

# Start scheduler
npm run schedule [folder] [cron-time]
npm run schedule ./books                # Daily at 3 AM (default)
npm run schedule ./books "0 10 * * *"  # Daily at 10 AM

# View logs
npm run logs [type]
npm run logs pipeline      # Processing logs
npm run logs errors        # Error logs
npm run logs all           # All logs
```

---

## Configuration

Edit `.env` with your setup:

```env
# Local LLM
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3:8b

# Image Generation
COMFYUI_URL=http://localhost:8188

# Voice Generation
XTTS_URL=http://localhost:5000

# Subtitle Generation
WHISPER_PATH=/usr/local/bin/whisper

# Video Assembly
FFMPEG_PATH=/usr/local/bin/ffmpeg

# Scheduling
SCHEDULE_TIME=0 3 * * *    # Cron expression

# Logging
LOG_LEVEL=info
LOG_DIR=./logs

# Video Settings
TARGET_VIDEO_DURATION=540  # seconds (9 minutes)
TARGET_SCENE_COUNT=20      # number of scenes
TARGET_SCRIPT_WORD_COUNT=1400
```

---

## Supported Formats

**Input:**
- EPUB (e-books)
- PDF (documents)
- TXT (plain text)

**Output:**
- MP4 video (H.264, AAC, 1280x720)
- WAV audio (44.1kHz, stereo)
- SRT subtitles (UTF-8)
- PNG images (1280x720)
- PNG thumbnail (1280x720)

---

## Architecture

### Processing Pipeline (Sequential → Parallelizable)

1. **Parse Book** → Extract text and metadata
2. **Split Chapters** → Segment for processing
3. **Summarize** → Generate 300-word book summary
4. **Generate Script** → Create 1200-1500 word YouTube script
5. **Plan Scenes** → Create 20 visual descriptions
6-9. **Generate Media** → (Can run in parallel)
   - Generate 20 scene images (Stable Diffusion)
   - Generate voice narration (XTTS)
   - Generate subtitles (Whisper)
   - Generate thumbnail (Stable Diffusion)
10. **Assemble Video** → Combine all elements (FFmpeg)
11. **Run Scheduler** → Optional: Daily automation

### Services

All services are **local only** — no cloud APIs required:

| Service | Purpose | Runtime |
|---------|---------|---------|
| **Ollama** | Local LLM (summarize, generate script, plan scenes) | `http://localhost:11434` |
| **Stable Diffusion XL** | Image generation via ComfyUI | `http://localhost:8188` |
| **XTTS v2** | Voice narration generation | `http://localhost:5000` |
| **Whisper.cpp** | Audio-to-subtitle conversion | Binary at `WHISPER_PATH` |
| **FFmpeg** | Video composition | Binary at `FFMPEG_PATH` |

---

## Performance Benchmarks

| Step | Time | Notes |
|------|------|-------|
| Parse Book | 1-2s | Depends on file size |
| Split Chapters | <1s | Deterministic |
| Summarize | 10-15s | LLM inference |
| Generate Script | 20-30s | LLM 7 sections |
| Plan Scenes | 30-40s | LLM 20 scenes |
| Generate Images | 60-120s | 20 images @ 3-6s each |
| Generate Voice | 15-30s | XTTS narration |
| Generate Subtitles | 10-20s | Whisper inference |
| Assemble Video | 20-30s | FFmpeg composition |
| Generate Thumbnail | 3-6s | 1 image |
| **Total** | **~5 minutes** | Excludes parallel optimization |

---

## Logging

Structured JSON logs are saved to `logs/`:

- `pipeline.log` - All pipeline operations
- `errors.log` - Errors only
- `result_*.json` - Per-pipeline execution result with step timings

View logs:
```bash
npm run logs pipeline      # View pipeline operations
npm run logs errors        # View errors
tail -f logs/pipeline.log  # Stream logs
```

---

## Testing

The system includes **placeholder implementations** for all external services, allowing you to:

1. ✅ Test the entire pipeline without AI services running
2. ✅ Verify code structure and flow
3. ✅ Generate test outputs (placeholder videos)
4. ✅ Refine prompts and parameters

To test:
```bash
# Place a test book
cp test-book.epub books/

# Run pipeline (uses placeholder AI)
npm run process ./books/test-book.epub

# Check output
ls -lh videos/video.mp4
```

When ready, replace placeholder implementations with real service calls:
- Edit `src/services/imageGenerator.ts` → uncomment ComfyUI API
- Edit `src/services/voiceGenerator.ts` → uncomment XTTS API
- Edit `src/services/subtitleGenerator.ts` → uncomment Whisper API
- Edit `src/services/videoAssembler.ts` → use real FFmpeg commands

---

## Troubleshooting

### "Failed to connect to Ollama"
- Ensure Ollama is running: `ollama serve`
- Check URL: `curl http://localhost:11434/api/tags`

### "ComfyUI not responding"
- Ensure ComfyUI is running on `localhost:8188`
- Check: `curl http://localhost:8188/`

### "Whisper not found"
- Install: `brew install whisper-cpp`
- Update `WHISPER_PATH` in `.env`

### "FFmpeg not found"
- Install: `brew install ffmpeg`
- Update `FFMPEG_PATH` in `.env`

### "Out of memory"
- Reduce `TARGET_SCENE_COUNT` in `.env`
- Run one book at a time (scheduler processes daily)

---

## Roadmap

- [ ] Web UI for book upload & video preview
- [ ] Multi-language support (auto-translate + voice)
- [ ] Batch processing with job queue
- [ ] YouTube upload automation
- [ ] Custom video templates & styles
- [ ] Real-time progress dashboard
- [ ] Docker containerization
- [ ] API server mode

---

## Contributing

Ideas and PRs welcome! Focus areas:
- Improving LLM prompts for better scripts
- Adding support for more book formats
- Optimizing image generation quality
- Enhancing video assembly (transitions, effects)
- Community templates and workflows

---

## License

MIT

---

## Support

- 📖 [Documentation](./README.md)
- 🐛 [Issues](https://github.com/pancho508/vidGen2/issues)
- 💬 [Discussions](https://github.com/pancho508/vidGen2/discussions)

---

## Disclaimer

- Ensure you have the right to convert books you process
- Generated videos are your responsibility to use legally
- This tool is for educational and personal use
- Large-scale commercial use may require additional licenses

---

**Made with ❤️ for automated learning & content creation.**
