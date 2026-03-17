# VidGen2 Testing & Debugging Guide

## Quick Start - Test Each Step

### Option 1: Automated Diagnostic Test
```bash
python3 diagnostic_test.py
```
Tests all services, files, and outputs in one go.

---

### Option 2: Step-by-Step Interactive Test
```bash
python3 test_steps.py
```
Runs each pipeline step sequentially with detailed output.

---

## Manual Individual Tests

### 1️⃣ Test Book Parsing
```bash
ls -lh books/*.epub
# Should show: ~900MB "Jordan B. Peterson - Maps of Meaning..."
```

### 2️⃣ Test Services Status
```bash
# Ollama
curl http://localhost:11434/api/tags | jq '.models[] | .name'

# ComfyUI
curl http://localhost:8188 | head -c 50

# FFmpeg
ffmpeg -version | head -1

# Whisper
which whisper-cpp
```

### 3️⃣ Test TypeScript Build
```bash
npm run build
# Should complete with zero errors
```

### 4️⃣ Test Script Generation (40-50 min)
```bash
node dist/utils/testScriptGeneration.js "books/Jordan B. Peterson - Maps of Meaning_ The Architecture of Belief (1999, Routledge) - libgen.li.epub"
```

Expected output:
```
✓ Book parsed: Maps of Meaning (915,000+ words)
✓ Chapters split: 157 chapters
✓ Book summarized: [200-400 words]
✓ Script generated: [1400 words in 7 sections]
```

### 5️⃣ Test Image Generation (20 images)
```bash
python3 generate_images.py scripts/demo_script.md 20
```

Expected output:
```
✅ Generated 20 real images!
  ✓ scene_001.png
  ✓ scene_002.png
  ... (20 total)
```

Verify:
```bash
ls -1 images/scene_*.png | wc -l
# Should show: 20
```

### 6️⃣ Test Audio Generation
```bash
ls -lh audio/narration.wav
# Should show: 5+ MB WAV file
```

### 7️⃣ Test Video Assembly
```bash
# Run full pipeline
python3 create_full_video.py
```

### 8️⃣ Test Final Video
```bash
# Check video properties
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height videos/maps_of_meaning.mp4

# Expected output should show:
# - h264 video codec
# - aac audio codec
# - 1280x720 resolution
# - ~430+ seconds duration
```

### 9️⃣ Repair Video (if won't play)
```bash
python3 repair_video.py
# This re-encodes with proper streaming format
```

---

## Common Issues & Fixes

### Issue: "Video won't play"
**Cause:** Missing moov atom in MP4
**Fix:** Run `python3 repair_video.py`

### Issue: "Only 5 images generated instead of 20"
**Fix:** ✅ FIXED in `generate_images.py`
- Updated to support generating 20 images
- Added 20 diverse scene prompts
- Auto-scales generation count

### Issue: "Script generation times out"
**Cause:** Ollama llama3:8b is slow on long chapters
**Fix:** ✅ FIXED in `src/services/ollamaClient.ts`
- Increased timeout from 5 min to 15 min
- Allows longer chapter summaries
- Rebuild with: `npm run build`

### Issue: "Only 5 images shown in video"
**Cause:** Image display time too long (108s per image)
**Why:** Calculated as `total_duration / num_images`
**Fix:** Generate more images (20 instead of 5)
- More images = shorter display time per image
- 540s audio / 20 images = 27s per image (natural pacing)

---

## Video Generation Pipeline

```
Input: Books/Maps of Meaning.epub (925 MB)
        
1. Parse Book (2s)
   - Extract 157 chapters, metadata
   
2. Split Chapters (1s)
   - Intelligent text segmentation
   
3. Summarize (40-50 min)
   - Ollama llama3:8b generates summaries
   - Timeout: 15 min per chapter (was 5 min)
   
4. Generate Script (varies)
   - Creates YouTube script (7 sections, ~1400 words)
   - Based on book summary
   
5. Generate Images (2-5 min for 20 images)
   - Creates 1280x720 PNG scenes
   - Each with styled backgrounds + text overlays
   
6. Generate Audio (1-2 min)
   - macOS `say` converts text → AIFF
   - FFmpeg converts AIFF → WAV (5.3 MB)
   
7. Assemble Video (5-10 sec)
   - FFmpeg concat demuxer combines:
     * 20 images (27s each)
     * Audio track (540s)
   - Outputs: MP4 with H.264 + AAC
   - Includes `-movflags +faststart` for streaming
   
Output: videos/maps_of_meaning.mp4
        audio/narration.wav
        images/scene_001-020.png
        subtitles/subtitles.srt (optional)
```

---

## Performance Benchmarks

| Step | Time | Notes |
|------|------|-------|
| Parse book | 1-2s | EPUB extraction |
| Split chapters | 1s | Text segmentation |
| Summarize book | 40-50 min | Ollama llama3:8b bottleneck |
| Generate script | 5-10 min | Depends on summarization |
| Generate 20 images | 2-5 min | PIL image creation |
| Generate audio | 1-2 min | macOS say + FFmpeg convert |
| Assemble video | 5-10 sec | FFmpeg encoding |
| Re-encode (repair) | 5-10 min | Full H.264 re-encode |
| **Total** | **~60 min** | ~50 min dominated by script generation |

---

## Environment Variables

Edit `.env`:
```bash
cp .env.example .env
nano .env
```

Key settings:
```env
# Ollama (LLM)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3:8b
OLLAMA_TEMPERATURE=0.7
OLLAMA_CONTEXT_SIZE=2048

# Video generation
TARGET_VIDEO_DURATION=540        # 9 minutes
TARGET_SCENE_COUNT=20            # Number of images
TARGET_SCRIPT_WORD_COUNT=1400    # YouTube script length

# Logging
LOG_LEVEL=info
```

---

## File Locations

| File | Purpose | Size |
|------|---------|------|
| `books/Maps of Meaning.epub` | Input book | 925 MB |
| `scripts/demo_script.md` | Generated script | ~2 KB |
| `audio/narration.wav` | Generated narration | 5-6 MB |
| `images/scene_001-020.png` | Generated scenes | 1-2 MB total |
| `videos/maps_of_meaning.mp4` | Final video | 1-2 MB |
| `videos/maps_of_meaning.mp4.bak` | Backup (after repair) | -- |

---

## Logs & Debugging

View logs:
```bash
tail -100 logs/pipeline.log
tail -50 logs/errors.log
```

Increase logging:
```env
LOG_LEVEL=debug    # More verbose output
```

---

## Troubleshooting Checklist

- [ ] All services running (Ollama, ComfyUI, FFmpeg)
- [ ] Book file present and readable
- [ ] TypeScript builds without errors
- [ ] Script generates successfully (check `scripts/demo_script.md`)
- [ ] Images generated (check `images/` folder count)
- [ ] Audio file created (check `audio/narration.wav`)
- [ ] Video file created (check `videos/maps_of_meaning.mp4`)
- [ ] Video plays in media player
- [ ] Video codec is H.264 (not other format)
- [ ] Audio codec is AAC (not other format)

---

## Quick Reference Commands

```bash
# Full pipeline
python3 create_full_video.py

# Just tests
python3 test_steps.py
python3 diagnostic_test.py

# Check output
ls -lh audio/ images/ videos/
du -sh audio/ images/ videos/

# Verify video quality
ffprobe -v error -show_entries stream=codec_name,width,height,duration videos/maps_of_meaning.mp4

# Play video
ffplay videos/maps_of_meaning.mp4

# Repair video
python3 repair_video.py
```

---

## Success Criteria

✅ All tests pass
✅ Video file exists (1-2 MB)
✅ Video codec is H.264
✅ Audio codec is AAC
✅ Duration is 7+ minutes
✅ Resolution is 1280x720
✅ Video plays in any media player
✅ Audio is synchronized with visuals
