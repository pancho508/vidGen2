# Audio Cutoff Fix - Summary

## Issue
Audio was cutting out halfway through the video, leaving the second half silent.

## Root Cause
The FFmpeg command used the `-shortest` flag, which stops playback when the shortest stream ends. Since audio generated from the script is shorter than the intended video duration (540 seconds), the `-shortest` flag was causing FFmpeg to end audio playback when the audio track ended, even though visual content continued.

**Timeline:**
- Audio from macOS `say`: ~100-200 seconds (depending on script length)
- Video duration from images: 540 seconds (20 images × 27 seconds)
- FFmpeg behavior with `-shortest`: Stops when audio ends = audio plays ~100-200s, then silence for remaining 300+ seconds

## Solution
Three-part fix in `create_full_video.py`:

### 1. Removed `-shortest` Flag
```python
# BEFORE: Used -shortest
cmd = [..., '-shortest', ...]

# AFTER: Don't truncate based on stream length
cmd = [..., '-movflags', '+faststart', str(video_file)]
```

### 2. Added Audio Duration Detection
```python
actual_audio_duration = float(duration_result.stdout.strip())
target_duration = max(actual_audio_duration, 540)
```

Measures real audio length and uses it to both:
- Calculate image display time: `time_per_image = target_duration / num_images`
- Determine if padding is needed

### 3. Auto-Pad Short Audio with Silence
```python
if actual_audio_duration < target_duration:
    pad_duration = target_duration - actual_audio_duration
    pad_cmd = ['ffmpeg', '-af', f"apad=whole_len={int(target_duration)}:pad_dur={pad_duration}"]
    subprocess.run(pad_cmd)
```

Uses FFmpeg's `apad` filter to add silence at the end of audio file, matching video duration.

## Files Modified
- `create_full_video.py` - Updated video assembly pipeline

## Testing
```bash
# Rebuild
npm run build

# Test the fix
python3 create_full_video.py

# Verify audio syncs with entire video
ffprobe -v error -show_entries format=duration videos/maps_of_meaning.mp4
```

Expected result: Audio plays continuously throughout entire video duration.

## Audio Duration Reference
- Short script (2 KB): ~100-150 seconds narration
- Full book script (~1400 words): ~540 seconds narration

If using short script with padding:
- Audio plays normally for ~150 seconds
- Silent padding fills remaining ~390 seconds
- User sees images throughout with continuous but partially silent audio

## Alternative Solutions (Future)
1. Use XTTS or other voice service instead of macOS `say` for longer, more controllable narration
2. Generate multiple script variations to fill the full duration
3. Add background music or ambient sound to fill silence
4. Use text-to-speech with variable speed to stretch audio naturally
