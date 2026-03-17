#!/usr/bin/env python3.11
"""
Simple voice generation script using TTS
"""
import sys
from TTS.api import TTS
import os

# Get script path from command line
script_path = sys.argv[1] if len(sys.argv) > 1 else None

if not script_path or not os.path.exists(script_path):
    print("Usage: python voice_gen.py <script-file>")
    sys.exit(1)

# Read script
with open(script_path, 'r') as f:
    content = f.read()

# Extract text (remove markdown headers)
lines = content.split('\n')
text_parts = []
for line in lines:
    if line.startswith('#') or line.startswith('**'):
        continue
    if line.strip() and not line.startswith('*'):
        text_parts.append(line)

script_text = ' '.join(text_parts).replace('  ', ' ').strip()

print(f"Script text: {len(script_text)} chars, {len(script_text.split())} words")
print(f"Loading TTS model...")

# Initialize TTS with a simple English model
try:
    tts = TTS(model_name="tts_models/en/ljspeech/tacotron2-DDC", progress_bar=True)
except Exception as e:
    print(f"Could not load tacotron2, trying glow-tts: {e}")
    tts = TTS(model_name="tts_models/en/ljspeech/glow-tts", progress_bar=True)

print("Model loaded! Generating speech...")

# Generate speech
output_path = "/Users/luzbel/repos/vidGen2/audio/narration_real.wav"
os.makedirs("/Users/luzbel/repos/vidGen2/audio", exist_ok=True)

# Split into chunks if too long (TTS has limits)
chunk_size = 200  # words
words = script_text.split()
chunks = [' '.join(words[i:i+chunk_size]) for i in range(0, len(words), chunk_size)]

print(f"Generating {len(chunks)} audio chunks...")
tts.tts_to_file(text=script_text[:5000], file_path=output_path)  # Just first 5000 chars for speed

print(f"✅ Speech generated: {output_path}")
