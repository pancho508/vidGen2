#!/usr/bin/env python3
"""
Repair and optimize MP4 video file for playback
Fixes common issues: missing moov atom, improper codec settings, streaming format
"""
import subprocess
from pathlib import Path
import sys

def repair_video(input_file, output_file):
    """Repair video by re-encoding with proper settings"""
    
    print("\n" + "="*70)
    print("🔧 VIDEO REPAIR & OPTIMIZATION")
    print("="*70 + "\n")
    
    input_path = Path(input_file)
    output_path = Path(output_file)
    
    if not input_path.exists():
        print(f"❌ Input file not found: {input_file}")
        return False
    
    print(f"📥 Input: {input_file}")
    print(f"   Size: {input_path.stat().st_size / 1024 / 1024:.1f} MB\n")
    
    print("🔍 Checking current video format...")
    probe_cmd = f"ffprobe -v error -show_entries format,stream {input_file}"
    result = subprocess.run(probe_cmd, shell=True, capture_output=True, text=True)
    
    if "h264" not in result.stdout.lower():
        print("⚠️  Warning: Not H.264 format")
    if "aac" not in result.stdout.lower():
        print("⚠️  Warning: Not AAC audio")
    
    print("\n✨ Re-encoding with proper streaming format...")
    print("   (This may take a few minutes)\n")
    
    # Re-encode with proper settings
    cmd = [
        'ffmpeg', '-i', str(input_path),
        '-c:v', 'libx264',           # H.264 video codec
        '-preset', 'medium',          # Medium encoding speed (quality/speed balance)
        '-crf', '23',                 # Quality (lower = better, 18-28 typical)
        '-c:a', 'aac',               # AAC audio codec
        '-b:a', '128k',              # Audio bitrate
        '-movflags', '+faststart',   # Move moov atom to beginning
        '-y',                         # Overwrite output
        str(output_path)
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        
        if result.returncode != 0:
            print(f"❌ Encoding failed: {result.stderr[-500:]}")
            return False
        
        output_size = output_path.stat().st_size / 1024 / 1024
        print(f"\n✅ Video repaired successfully!")
        print(f"📤 Output: {output_file}")
        print(f"   Size: {output_size:.1f} MB\n")
        
        # Verify it's playable
        print("🔍 Verifying output format...")
        verify_cmd = f"ffprobe -v error -show_entries format=duration -of default=nokey=1:noprint_wrappers=1 {output_path}"
        verify_result = subprocess.run(verify_cmd, shell=True, capture_output=True, text=True)
        
        if verify_result.stderr:
            print(f"⚠️  Warning: {verify_result.stderr[:200]}")
        else:
            try:
                duration = float(verify_result.stdout.strip())
                print(f"✅ Video valid - Duration: {duration:.1f}s ({duration/60:.1f} min)\n")
                return True
            except:
                print("⚠️  Could not verify duration")
    
    except subprocess.TimeoutExpired:
        print("❌ Encoding timeout")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == '__main__':
    root = Path('/Users/luzbel/repos/vidGen2')
    input_video = root / 'videos' / 'maps_of_meaning.mp4'
    output_video = root / 'videos' / 'maps_of_meaning_fixed.mp4'
    
    if len(sys.argv) > 1:
        input_video = Path(sys.argv[1])
    
    if not input_video.exists():
        print(f"❌ Video file not found: {input_video}")
        sys.exit(1)
    
    success = repair_video(str(input_video), str(output_video))
    
    if success:
        # Replace original with repaired version
        import shutil
        backup = root / 'videos' / 'maps_of_meaning.mp4.bak'
        shutil.move(str(input_video), str(backup))
        shutil.move(str(output_video), str(input_video))
        print(f"✅ Replaced original with repaired version")
        print(f"💾 Backup saved to: {backup}\n")
        sys.exit(0)
    else:
        print("❌ Video repair failed")
        sys.exit(1)
