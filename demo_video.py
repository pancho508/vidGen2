#!/usr/bin/env python3
"""
Generate sample video from hardcoded script
"""
import os
import json
import subprocess
from pathlib import Path

def create_demo_video():
    root = Path('/Users/luzbel/repos/vidGen2')
    
    # Ensure directories exist
    for d in ['scripts', 'audio', 'images', 'videos']:
        (root / d).mkdir(exist_ok=True)
    
    # Create sample script
    script_file = root / 'scripts' / 'demo_script.md'
    script_content = """# Maps of Meaning - YouTube Script

**Generated:** 2026-03-16
**Total Words:** 1400
**Est Duration:** 540 seconds (9 minutes)
**Sections:** 7

## Hook

The human mind is a meaning-making machine. We don't perceive reality directly—we construct narratives. In 'Maps of Meaning', Jordan Peterson explores how our brains use myths, symbols, and archetypal stories to make sense of chaos and order.

## Introduction  

At the deepest level, our consciousness operates through storytelling. Every culture has myths. Every religion has parables. These aren't primitive superstitions—they're sophisticated psychological technologies refined over millennia.

## Main Idea 1: The Hero's Journey

The hero's journey appears everywhere: mythology, literature, film. Why? Because it maps onto human psychology. We all face the unknown. We all must integrate the shadow. The hero's journey is the template for personal transformation.

## Main Idea 2: Chaos and Order

Life exists between chaos and order. Too much order becomes tyranny—rigid, lifeless. Too much chaos becomes annihilation—meaningless suffering. The balanced individual oscillates between these poles, neither dominated by one.

## Main Idea 3: The Archetypal Feminine

The great mother appears in mythology as both nurturing and devouring. This duality reflects our deepest psychological reality: creation contains destruction. Order contains chaos. Meaning-making requires integrating this paradox.

## Lessons

1. Your personal story matters. Your psychological development follows archetypal patterns.
2. Myths aren't false—they're patterns of truth too deep for literal language.
3. Integration of shadow material is essential for psychological maturity.
4. Chaos and order must be balanced—neither transcended, both integrated.
5. Meaning emerges when we align with deep patterns in consciousness.

## Conclusion

The maps of meaning aren't arbitrary. They're written into human neurobiology, culture, and history. Understanding them means understanding yourself—and perhaps understanding your path forward.
"""
    
    script_file.write_text(script_content)
    print(f"✅ Script created: {script_file}")
    
    # Generate voice with macOS say
    audio_file = root / 'audio' / 'narration.wav'
    print(f"🔊 Generating voice narration (this takes a few seconds)...")
    
    # Extract text from markdown
    text = '\n\n'.join([line.strip() for line in script_content.split('\n') 
                        if line.strip() and not line.startswith('#')])
    
    # Create AIFF then convert to WAV
    aiff_temp = '/tmp/narration_temp.aiff'
    try:
        subprocess.run(['say', '-v', 'Daniel', text, '-o', aiff_temp], check=True, capture_output=True)
        subprocess.run(['ffmpeg', '-i', aiff_temp, '-y', str(audio_file)], 
                      check=True, capture_output=True)
        os.remove(aiff_temp)
        audio_size = audio_file.stat().st_size / 1024 / 1024
        print(f"   ✅ Audio generated: {audio_size:.1f} MB")
    except Exception as e:
        print(f"   ⚠️  Error generating audio: {e}")
        return False
    
    # Generate sample images
    print(f"🎨 Generating scene images...")
    try:
        subprocess.run(['python3', 'generate_images.py', str(script_file), '5'], 
                      cwd=root, check=True, capture_output=True)
        image_count = len(list((root / 'images').glob('*.png')))
        print(f"   ✅ Generated {image_count} images")
    except Exception as e:
        print(f"   ⚠️  Error generating images: {e}")
    
    # Create video from images and audio
    print(f"🎬 Assembling final video...")
    images_dir = root / 'images'
    video_file = root / 'videos' / 'final_video.mp4'
    
    try:
        # Create concat list
        image_files = sorted(list(images_dir.glob('scene_*.png')))
        if not image_files:
            print("   ❌ No images found")
            return False
        
        # FFmpeg command to create video
        # Display each image for 90 seconds (540 seconds / 6 images)
        duration_per_image = 90
        
        filter_complex = '+'.join([f'[{i}]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2[img{i}]' 
                                   for i in range(len(image_files))])
        filter_complex += f';{"+".join([f"[img{i}]" for i in range(len(image_files))])}concat=n={len(image_files)}:v=1[v]'
        
        cmd = [
            'ffmpeg', '-y',
            '-i', str(audio_file),
            '-framerate', '1',
            '-pattern_type', 'glob',
            '-i', str(images_dir / 'scene_*.png'),
            '-r', '24',
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-c:a', 'aac',
            '-shortest',
            str(video_file)
        ]
        
        subprocess.run(cmd, check=True, capture_output=True)
        video_size = video_file.stat().st_size / 1024 / 1024
        print(f"   ✅ Video created: {video_size:.1f} MB")
        print(f"   📁 Saved to: {video_file}\n")
        return True
        
    except Exception as e:
        print(f"   ❌ Error creating video: {e}")
        return False

if __name__ == '__main__':
    print("\n╔═══════════════════════════════════════════════════════════╗")
    print("║           🎬 DEMO VIDEO GENERATION PIPELINE 🎬           ║")
    print("╚═══════════════════════════════════════════════════════════╝\n")
    
    success = create_demo_video()
    
    if success:
        root = Path('/Users/luzbel/repos/vidGen2')
        print("╔═══════════════════════════════════════════════════════════╗")
        print("║                ✅ VIDEO CREATED SUCCESSFULLY ✅          ║")
        print("╚═══════════════════════════════════════════════════════════╝\n")
        print(f"📁 Final video: {root / 'videos' / 'final_video.mp4'}\n")
    else:
        print("❌ Video creation failed")
        exit(1)
