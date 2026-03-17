#!/usr/bin/env python3
"""
Create full-length video from Maps of Meaning book
"""
import subprocess
import os
from pathlib import Path
import time

def run_full_pipeline():
    root = Path('/Users/luzbel/repos/vidGen2')
    
    print('\n' + '='*70)
    print('🎬 FULL MAPS OF MEANING VIDEO GENERATION')
    print('='*70 + '\n')
    
    book_path = root / 'books' / 'Jordan B. Peterson - Maps of Meaning_ The Architecture of Belief (1999, Routledge) - libgen.li.epub'
    
    if not book_path.exists():
        print(f"❌ Book not found: {book_path}")
        return False
    
    print(f"📚 Using: {book_path.name}\n")
    
    # Step 1: Build the TypeScript
    print("1️⃣  Building TypeScript modules...")
    result = subprocess.run(['npm', 'run', 'build'], 
                          cwd=root, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"   ❌ Build failed: {result.stderr}")
        return False
    print("   ✅ Build complete\n")
    
    # Step 2: Run script generation with timeout
    print("2️⃣  Generating script from full book (40-50 minutes)...")
    print("   Processing 173 chapters with Ollama llama3:8b...")
    print("   This will generate a complete YouTube script about Maps of Meaning\n")
    
    start_time = time.time()
    
    cmd = ['node', 'dist/utils/testScriptGeneration.js', str(book_path)]
    result = subprocess.run(cmd, cwd=root, capture_output=True, text=True, timeout=5400)  # 90 minute timeout
    
    if result.returncode != 0:
        print(f"   ⚠️  Script generation had issues")
        print(f"   Output: {result.stdout[:500]}")
        print(f"   Stderr: {result.stderr[:500]}\n")
    else:
        elapsed = int((time.time() - start_time) / 60)
        print(f"   ✅ Script generated ({elapsed} minutes)\n")
    
    # Find the generated script
    scripts_dir = root / 'scripts'
    script_files = list(scripts_dir.glob('*.md'))
    
    if not script_files:
        print("   ❌ No script file generated")
        return False
    
    script_file = script_files[-1]  # Get the latest
    print(f"3️⃣  Using generated script: {script_file.name}")
    script_size = script_file.stat().st_size / 1024
    print(f"   📄 Size: {script_size:.1f} KB\n")
    
    # Step 3: Generate audio from the script
    print("4️⃣  Generating voice narration...")
    audio_file = root / 'audio' / 'narration.wav'
    
    # Read script and extract text
    script_content = script_file.read_text()
    text = '\n\n'.join([line.strip() for line in script_content.split('\n') 
                        if line.strip() and not line.startswith('#')])
    
    # Generate with macOS say
    aiff_temp = '/tmp/narration_temp.aiff'
    try:
        print("   Creating AIFF from text-to-speech...")
        subprocess.run(['say', '-v', 'Daniel', text, '-o', aiff_temp], 
                      check=True, capture_output=True, timeout=120)
        
        print("   Converting to WAV format...")
        subprocess.run(['ffmpeg', '-i', aiff_temp, '-y', str(audio_file)], 
                      check=True, capture_output=True)
        
        if os.path.exists(aiff_temp):
            os.remove(aiff_temp)
        
        audio_size = audio_file.stat().st_size / 1024 / 1024
        print(f"   ✅ Audio generated: {audio_size:.1f} MB\n")
    except Exception as e:
        print(f"   ❌ Audio generation failed: {e}")
        return False
    
    # Step 4: Generate scene images
    print("5️⃣  Generating scene images...")
    try:
        subprocess.run(['python3', 'generate_images.py', str(script_file), '20'],
                      cwd=root, check=True, capture_output=True, timeout=60)
        
        images = list((root / 'images').glob('*.png'))
        total_size = sum(f.stat().st_size for f in images) / 1024
        print(f"   ✅ Generated {len(images)} images ({total_size:.0f} KB)\n")
    except Exception as e:
        print(f"   ⚠️  Image generation issue: {e}")
    
    # Step 5: Create final video
    print("6️⃣  Assembling final video...")
    try:
        video_file = root / 'videos' / 'maps_of_meaning.mp4'
        images_dir = root / 'images'
        
        # Get audio duration
        probe_cmd = ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                    '-of', 'default=noprint_wrappers=1:nokey=1:noesc=1', str(audio_file)]
        duration_result = subprocess.run(probe_cmd, capture_output=True, text=True)
        actual_audio_duration = float(duration_result.stdout.strip()) if duration_result.stdout else 0
        
        print(f"   Actual audio duration: {actual_audio_duration:.0f} seconds ({actual_audio_duration/60:.1f} minutes)")
        
        # Create video with all images
        images = sorted(images_dir.glob('scene_*.png'))
        if not images:
            print("   ❌ No images found")
            return False
        
        # Target duration for the video (use audio or default)
        target_duration = max(actual_audio_duration, 540)
        
        # Calculate display time per image based on target duration
        time_per_image = target_duration / len(images)
        print(f"   Target video duration: {target_duration:.0f} seconds ({target_duration/60:.1f} minutes)")
        print(f"   Display time per image: {time_per_image:.0f} seconds")
        print(f"   Creating MP4 with {len(images)} images...\n")
        
        # Use concat demuxer for consistent display
        concat_file = '/tmp/concat.txt'
        with open(concat_file, 'w') as f:
            for img in images:
                f.write(f"file '{img}'\n")
                f.write(f"duration {time_per_image}\n")
            # Repeat last image to fill remaining time
            f.write(f"file '{images[-1]}'\n")
            f.write(f"duration {time_per_image}\n")
        
        # If audio is shorter than target, pad it with silence
        audio_to_use = str(audio_file)
        if actual_audio_duration < target_duration:
            print(f"   ⚠️  Audio ({actual_audio_duration:.0f}s) shorter than target ({target_duration:.0f}s)")
            print(f"   Padding audio with silence...")
            
            # Create padded audio
            padded_audio = root / 'audio' / 'narration_padded.wav'
            pad_duration = target_duration - actual_audio_duration
            
            # FFmpeg pad with silence at end
            pad_cmd = [
                'ffmpeg', '-y',
                '-i', str(audio_file),
                '-af', f"apad=whole_len={int(target_duration)}:pad_dur={pad_duration}",
                str(padded_audio)
            ]
            subprocess.run(pad_cmd, check=True, capture_output=True, timeout=60)
            audio_to_use = str(padded_audio)
            print(f"   ✅ Audio padded to {target_duration:.0f}s\n")
        
        # FFmpeg command - REMOVED -shortest flag to keep full audio
        cmd = [
            'ffmpeg', '-y',
            '-f', 'concat', '-safe', '0', '-i', concat_file,
            '-i', audio_to_use,
            '-c:v', 'libx264', '-preset', 'fast',
            '-pix_fmt', 'yuv420p',
            '-c:a', 'aac',
            '-movflags', '+faststart',
            str(video_file)
        ]
        
        print("   Running FFmpeg (audio will play fully)...\n")
        subprocess.run(cmd, check=True, timeout=300)
        
        # Clean up temporary files
        if os.path.exists(concat_file):
            os.remove(concat_file)
        if 'padded_audio' in locals() and os.path.exists(padded_audio):
            os.remove(padded_audio)
        
        if video_file.exists():
            video_size = video_file.stat().st_size / 1024 / 1024
            print(f"   ✅ Video created: {video_size:.1f} MB")
            print(f"   📁 Location: {video_file}\n")
            
            return True
        else:
            print(f"   ❌ Video file not created")
            return False
            
    except Exception as e:
        print(f"   ❌ Video creation failed: {e}")
        return False

if __name__ == '__main__':
    try:
        success = run_full_pipeline()
        
        if success:
            root = Path('/Users/luzbel/repos/vidGen2')
            print('='*70)
            print('✅ FULL VIDEO GENERATION COMPLETE!')
            print('='*70)
            print(f'\n📁 Final video: /Users/luzbel/repos/vidGen2/videos/maps_of_meaning.mp4\n')
            
            # Display stats
            video_file = root / 'videos' / 'maps_of_meaning.mp4'
            if video_file.exists():
                print("📊 Video Statistics:")
                probe_cmd = ['ffprobe', '-v', 'error', 
                           '-show_entries', 'format=duration,size',
                           '-of', 'default=noprint_wrappers=1',
                           str(video_file)]
                subprocess.run(probe_cmd)
            
            print("\n🎉 Your full Maps of Meaning YouTube video is ready to upload!")
        else:
            print('\n❌ Video generation failed')
            exit(1)
            
    except KeyboardInterrupt:
        print('\n\n⏸️  Generation interrupted by user')
        exit(1)
    except Exception as e:
        print(f'\n❌ Error: {e}')
        exit(1)
