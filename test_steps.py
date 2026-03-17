#!/usr/bin/env python3
"""
Step-by-step pipeline tester
Test and debug each stage individually
"""
import subprocess
import os
from pathlib import Path
import time
import sys

def run_cmd(cmd, description, timeout=60, shell=True):
    """Run command with nice output"""
    print(f"\n{'='*70}")
    print(f"🔄 {description}")
    print(f"{'='*70}")
    print(f"Command: {cmd if isinstance(cmd, str) else ' '.join(cmd)}\n")
    
    try:
        if isinstance(cmd, str):
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
        else:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        
        # Print output
        if result.stdout:
            print(f"Output:\n{result.stdout[:1000]}")
        if result.stderr and result.returncode != 0:
            print(f"Errors:\n{result.stderr[:1000]}")
        
        status = "✅ PASS" if result.returncode == 0 else "❌ FAIL"
        print(f"\n{status} (exit code: {result.returncode})")
        
        return result.returncode == 0
    
    except subprocess.TimeoutExpired:
        print(f"❌ TIMEOUT after {timeout}s")
        return False
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def main():
    root = Path('/Users/luzbel/repos/vidGen2')
    os.chdir(root)
    
    print("\n╔" + "="*68 + "╗")
    print("║" + "📋 STEP-BY-STEP PIPELINE TEST".center(68) + "║")
    print("╚" + "="*68 + "╝\n")
    
    steps = []
    
    # Step 1: Build
    steps.append((
        "npm run build",
        "Build TypeScript Modules",
        60
    ))
    
    # Step 2: Check services
    steps.append((
        "curl -s http://localhost:11434/api/tags | head -1",
        "Check Ollama Service",
        5
    ))
    
    steps.append((
        "curl -s http://localhost:8188 | head -c 50",
        "Check ComfyUI Service",
        5
    ))
    
    # Step 3: Generate script
    book_path = root / "books" / "Jordan B. Peterson - Maps of Meaning_ The Architecture of Belief (1999, Routledge) - libgen.li.epub"
    if book_path.exists():
        steps.append((
            f"node dist/utils/testScriptGeneration.js '{book_path}'",
            "Generate Script from Book (this may take 40+ minutes)",
            3600  # 1 hour timeout
        ))
    
    # Step 4: Check script
    steps.append((
        "ls -lh scripts/*.md | tail -1",
        "Verify Script Generated",
        5
    ))
    
    # Step 5: Generate images
    steps.append((
        "python3 generate_images.py scripts/demo_script.md 20",
        "Generate 20 Scene Images",
        120
    ))
    
    # Step 6: Check images
    steps.append((
        "ls -1 images/scene_*.png | wc -l",
        "Count Generated Images",
        5
    ))
    
    # Step 7: Check audio
    steps.append((
        "ls -lh audio/narration.wav",
        "Verify Audio File",
        5
    ))
    
    # Step 8: Check video
    steps.append((
        "test -f videos/maps_of_meaning.mp4 && ffprobe -v error -show_entries format=duration,size -of default=nokey=1:noprint_wrappers=1 videos/maps_of_meaning.mp4",
        "Verify Final Video",
        10
    ))
    
    # Run tests
    results = []
    skipped = []
    
    for i, (cmd, desc, timeout) in enumerate(steps, 1):
        print(f"\n[{i}/{len(steps)}]", end=" ")
        
        try:
            success = run_cmd(cmd, desc, timeout)
            results.append((desc, success))
            
            if not success:
                response = input(f"\n⚠️  Step {i} failed. Continue? (y/n): ").lower()
                if response != 'y':
                    print("Stopping tests.")
                    break
        except KeyboardInterrupt:
            print("\n⏸️  Tests interrupted by user")
            break
    
    # Summary
    print("\n" + "="*70)
    print("📊 TEST SUMMARY")
    print("="*70 + "\n")
    
    for desc, success in results:
        status = "✅" if success else "❌"
        print(f"{status} {desc}")
    
    passed = sum(1 for _, s in results if s)
    total = len(results)
    
    print(f"\n{'='*70}")
    print(f"Results: {passed}/{total} passed")
    print(f"{'='*70}\n")
    
    return 0 if passed == total else 1

if __name__ == '__main__':
    sys.exit(main())
