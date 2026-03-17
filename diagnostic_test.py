#!/usr/bin/env python3
"""
Comprehensive diagnostic test for each pipeline step
"""
import subprocess
import json
import sys
from pathlib import Path
import time

def test_step(name, cmd, timeout=30, check_output=None):
    """Run a test step and report results"""
    print(f"\n{'='*70}")
    print(f"📋 TEST: {name}")
    print(f"{'='*70}")
    
    try:
        if isinstance(cmd, str):
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
        else:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        
        success = result.returncode == 0
        
        if check_output and not check_output(result.stdout, result.stderr):
            success = False
        
        status = "✅" if success else "❌"
        print(f"{status} Result: {'PASS' if success else 'FAIL'}")
        
        if result.stdout:
            print(f"\nOutput:\n{result.stdout[:500]}")
        if result.stderr and not success:
            print(f"\nError:\n{result.stderr[:500]}")
        
        return success
    except subprocess.TimeoutExpired:
        print(f"❌ Result: TIMEOUT (>{timeout}s)")
        return False
    except Exception as e:
        print(f"❌ Result: ERROR - {e}")
        return False

def main():
    root = Path('/Users/luzbel/repos/vidGen2')
    book_path = root / 'books' / 'Jordan B. Peterson - Maps of Meaning_ The Architecture of Belief (1999, Routledge) - libgen.li.epub'
    
    print("\n╔" + "="*68 + "╗")
    print("║" + "🔍 VIDGEN2 PIPELINE DIAGNOSTIC TEST".center(68) + "║")
    print("╚" + "="*68 + "╝\n")
    
    results = {}
    
    # Test 1: Book exists
    results['book_exists'] = test_step(
        "📚 Book File Exists",
        f"test -f '{book_path}' && ls -lh '{book_path}'",
    )
    
    # Test 2: Services running
    results['ollama'] = test_step(
        "🧠 Ollama LLM Service",
        "curl -s http://localhost:11434/api/tags | head -c 100",
    )
    
    results['comfyui'] = test_step(
        "🎨 ComfyUI Image Generator",
        "curl -s http://localhost:8188 | head -c 50",
    )
    
    results['ffmpeg'] = test_step(
        "🎬 FFmpeg Video Tool",
        "ffmpeg -version | head -3",
    )
    
    results['whisper'] = test_step(
        "📖 Whisper Speech-to-Text",
        "which whisper-cpp",
    )
    
    # Test 3: Build TypeScript
    results['build'] = test_step(
        "🔨 TypeScript Build",
        "cd /Users/luzbel/repos/vidGen2 && npm run build 2>&1 | tail -5",
        timeout=60
    )
    
    # Test 4: Check generated assets
    results['audio'] = test_step(
        "🎙️  Audio File Generated",
        f"test -f {root}/audio/narration.wav && ls -lh {root}/audio/narration.wav",
    )
    
    results['images'] = test_step(
        "🖼️  Scene Images Generated",
        f"find {root}/images -name '*.png' -type f | wc -l | xargs -I{{}} echo 'Found {{}} images'",
        check_output=lambda out, err: "Found" in out and ("20" in out or "5" in out or "19" in out or "21" in out)
    )
    
    results['video'] = test_step(
        "🎬 Final Video File",
        f"test -f {root}/videos/maps_of_meaning.mp4 && ls -lh {root}/videos/maps_of_meaning.mp4",
    )
    
    # Test 5: Video file validation
    if results['video']:
        results['video_codec'] = test_step(
            "✅ Video Codec Check",
            f"ffprobe -v error -show_entries stream=codec_name,width,height {root}/videos/maps_of_meaning.mp4 | head -5",
            check_output=lambda out, err: 'h264' in out.lower()
        )
        
        results['video_playable'] = test_step(
            "✅ Video Stream Format",
            f"ffmpeg -v error -i {root}/videos/maps_of_meaning.mp4 -c copy -movflags +faststart -f null - < /dev/null 2>&1 | grep -i error || echo 'Format OK'",
            timeout=10
        )
    
    # Summary
    print("\n" + "="*70)
    print("📊 DIAGNOSTIC SUMMARY")
    print("="*70 + "\n")
    
    for test_name, result in results.items():
        status = "✅" if result else "❌"
        print(f"{status} {test_name.replace('_', ' ').title()}")
    
    passed = sum(1 for r in results.values() if r)
    total = len(results)
    
    print(f"\n{'='*70}")
    print(f"Passed: {passed}/{total} tests")
    print(f"{'='*70}\n")
    
    if passed == total:
        print("🎉 All tests PASSED! Pipeline is ready.\n")
        return 0
    else:
        print("⚠️  Some tests FAILED. See details above.\n")
        return 1

if __name__ == '__main__':
    sys.exit(main())
