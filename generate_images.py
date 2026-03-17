#!/usr/bin/env python3
"""
Generate real images for video scenes using PIL
Creates styled images based on scene prompts
"""

import json
import sys
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import random
import colorsys

def generate_styled_image(prompt, scene_number, output_path, width=1280, height=720):
    """Generate a styled image from a text prompt"""
    
    # Create base image with gradient background
    img = Image.new('RGB', (width, height), color='white')
    draw = ImageDraw.Draw(img, 'RGBA')
    
    # Extract key words from prompt to determine style
    prompt_lower = prompt.lower()
    
    # Color palette based on prompt mood
    if any(word in prompt_lower for word in ['ancient', 'golden', 'library', 'warm']):
        base_color = (184, 140, 60)  # Golden
        accent_color = (139, 69, 19)  # Brown
    elif any(word in prompt_lower for word in ['hero', 'dragon', 'battle', 'epic']):
        base_color = (70, 130, 180)  # Steel blue
        accent_color = (220, 20, 60)  # Crimson
    elif any(word in prompt_lower for word in ['chaos', 'swirl', 'abstract']):
        base_color = (75, 0, 130)  # Indigo
        accent_color = (138, 43, 226)  # Blue violet
    elif any(word in prompt_lower for word in ['dawn', 'enlighten', 'serenity']):
        base_color = (255, 165, 0)  # Orange
        accent_color = (255, 218, 185)  # Peach
    else:
        base_color = (100, 100, 150)  # Default blue
        accent_color = (200, 200, 255)  # Light blue
    
    # Create gradient background
    for y in range(height):
        ratio = y / height
        r = int(base_color[0] * (1 - ratio) + accent_color[0] * ratio)
        g = int(base_color[1] * (1 - ratio) + accent_color[1] * ratio)
        b = int(base_color[2] * (1 - ratio) + accent_color[2] * ratio)
        draw.line([(0, y), (width, y)], fill=(r, g, b))
    
    # Add geometric shapes/patterns
    num_shapes = random.randint(3, 8)
    for i in range(num_shapes):
        x = random.randint(0, width)
        y = random.randint(0, height)
        size = random.randint(50, 300)
        
        shape_color = (
            random.randint(100, 255),
            random.randint(100, 255),
            random.randint(100, 255),
            80  # Alpha
        )
        
        shape_type = random.choice(['circle', 'rectangle', 'line'])
        
        if shape_type == 'circle':
            draw.ellipse([x, y, x + size, y + size], fill=shape_color, outline=None)
        elif shape_type == 'rectangle':
            draw.rectangle([x, y, x + size, y + size], fill=shape_color, outline=None)
        else:
            draw.line([(x, y), (x + size, y + size)], fill=shape_color, width=3)
    
    # Add text overlay
    try:
        # Try to use a nice font
        font_size = 48
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
    except:
        font = ImageFont.load_default()
    
    # Add scene number in corner
    scene_text = f"Scene {scene_number}"
    draw.text((20, 20), scene_text, fill=(255, 255, 255, 200), font=font)
    
    # Add prompt excerpt in center
    lines = []
    words = prompt.split()
    line = ""
    for word in words[:20]:  # First 20 words
        if len(line) + len(word) > 40:
            lines.append(line)
            line = word
        else:
            line += (" " if line else "") + word
    if line:
        lines.append(line)
    
    # Center text
    line_height = 40
    start_y = height // 2 - (len(lines) * line_height) // 2
    
    for i, line in enumerate(lines):
        y_pos = start_y + (i * line_height)
        # Add text with semi-transparent background
        bbox = draw.textbbox((0, 0), line, font=font)
        text_width = bbox[2] - bbox[0]
        text_x = (width - text_width) // 2
        
        # Background rectangle
        draw.rectangle(
            [text_x - 10, y_pos - 5, text_x + text_width + 10, y_pos + line_height],
            fill=(0, 0, 0, 150)
        )
        # Text
        draw.text((text_x, y_pos), line, fill=(255, 255, 255), font=font)
    
    # Add blur effect for depth
    img = img.filter(ImageFilter.GaussianBlur(radius=1))
    
    # Save image
    img.save(output_path)
    return output_path

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 generate_images.py <script_file> [num_images]")
        sys.exit(1)
    
    script_file = sys.argv[1]
    num_images = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    
    if not os.path.exists(script_file):
        print(f"Error: Script file not found: {script_file}")
        sys.exit(1)
    
    # Read script
    with open(script_file, 'r') as f:
        script_content = f.read()
    
    # Generate diverse prompts for visual scenes
    base_prompts = [
        "Ancient library with golden light, philosophical books, intricate architecture",
        "A hero figure standing at a crossroads in misty mountains, dramatic lighting",
        "Swirling chaos and order in balance, dark and light intertwining, abstract cosmic",
        "A warrior battling a mythical dragon above stormy clouds, epic cinematic",
        "A serene dawn over mountains with a figure of enlightenment, warm golden hour",
        "Labyrinth of interconnected ideas, light pathways through darkness, Renaissance art",
        "The tree of knowledge with roots and branches reaching infinitely, ethereal",
        "A library of human consciousness, symbols and archetypes floating in space",
        "Journey through mythological landscapes, ancient ruins and modern cities intertwined",
        "The hero's transformation, chrysalis moment between old and new self",
        "Symbolic representation of psychological growth and integration, Jung inspired",
        "Hidden depths of the psyche revealed, cavern filled with symbols and light",
        "Maps of meaning connecting all things, web of understanding,fractal patterns",
        "The call to adventure echoing through canyons and valleys, epic landscape",
        "Descent into the underworld with light breaking through darkness, mythic",
        "Integration of shadow and light, yin yang cosmic dance, balance",
        "The resurrection of the hero, rising from transformative fire, rebirth",
        "Meeting with the mentor, wisdom passed through ages, ancient knowledge",
        "The crossing of thresholds, doorways to new understanding, dimensional",
        "Return home transformed, spiral of development, evolution of consciousness"
    ]
    
    # Use base prompts and repeat/vary them to match requested count
    prompts = []
    for i in range(num_images):
        if i < len(base_prompts):
            prompts.append(base_prompts[i])
        else:
            # Repeat with slight variation for extras
            idx = i % len(base_prompts)
            prompts.append(base_prompts[idx] + f" (variation {i // len(base_prompts)})")
    
    # Create images directory
    images_dir = Path(script_file).parent.parent / "images"
    images_dir.mkdir(exist_ok=True)
    
    print("\n" + "="*70)
    print(f"🎨 GENERATING {num_images} REAL IMAGES FOR VIDEO")
    print("="*70 + "\n")
    
    generated = []
    for i in range(num_images):
        scene_num = i + 1
        prompt = prompts[i]
        output_file = images_dir / f"scene_{scene_num:03d}.png"
        
        print(f"Generating Scene {scene_num:2d}/{num_images}...", end=" ", flush=True)
        generate_styled_image(prompt, scene_num, str(output_file))
        file_size = output_file.stat().st_size / 1024
        print(f"✓ ({file_size:.1f} KB)")
        generated.append(str(output_file))
    
    print("\n" + "="*70)
    print(f"✅ Generated {len(generated)} real images!")
    print("="*70 + "\n")
    
    for img_path in generated:
        print(f"  ✓ {Path(img_path).name}")
    
    print(f"\n📁 Images saved to: {images_dir}")
    print(f"🎉 Ready for video assembly!\n")
    
    return generated

if __name__ == "__main__":
    main()
