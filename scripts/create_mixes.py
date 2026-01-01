import os
import sys
import soundfile
import numpy as np
import shutil
import subprocess

def create_mixes(input_dir):
    """
    Reads 4-stem MP3/WAV files from input_dir, creates "minus one" mixes, and saves them as MP3.
    Assumes htdemucs output: vocals, drums, bass, other
    """
    stems = ['vocals', 'drums', 'bass', 'other']
    loaded_audio = {}
    sample_rate = None
    
    print(f"Loading stems from {input_dir}...")
    
    # load all stems
    for stem in stems:
        # Try mp3 first, then wav
        mp3_path = os.path.join(input_dir, f"{stem}.mp3")
        wav_path = os.path.join(input_dir, f"{stem}.wav")
        
        load_path = None
        if os.path.exists(mp3_path):
            load_path = mp3_path
        elif os.path.exists(wav_path):
            load_path = wav_path
            
        if load_path:
            data, sr = soundfile.read(load_path)
            loaded_audio[stem] = data
            if sample_rate is None:
                sample_rate = sr
        else:
            print(f"Warning: Stem {stem} not found in {input_dir}")

    if not loaded_audio:
        print("No stems loaded.")
        return

    # Create mixes
    # Formula: No X = Sum(All) - X
    # Or cleaner: Sum(All except X)
    
    min_len = min(len(a) for a in loaded_audio.values())
    
    # Create Full Mix (optional reference)
    full_mix = np.zeros_like(list(loaded_audio.values())[0][:min_len])
    for s, data in loaded_audio.items():
        full_mix += data[:min_len]

    mixes_to_create = {
        'no_vocals': ['drums', 'bass', 'other'],
        'no_drums': ['vocals', 'bass', 'other'],
        'no_bass': ['vocals', 'drums', 'other'],
        'no_guitar_other': ['vocals', 'drums', 'bass'], # User requested name
    }

    print("Generating mixes...")
    for mix_name, sources in mixes_to_create.items():
        print(f"Creating {mix_name}...")
        mix_data = np.zeros_like(full_mix)
        count = 0
        for src in sources:
            if src in loaded_audio:
                mix_data += loaded_audio[src][:min_len]
                count += 1
        
        # Save as WAV first
        wav_out = os.path.join(input_dir, f"{mix_name}.wav")
        soundfile.write(wav_out, mix_data, sample_rate)
        
        # Convert to MP3
        mp3_out = os.path.join(input_dir, f"{mix_name}.mp3")
        subprocess.run([
            'ffmpeg', '-y', '-i', wav_out, 
            '-b:a', '320k', 
            mp3_out
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        # Cleanup WAV
        if os.path.exists(wav_out):
            os.remove(wav_out)

    # NEW: Convert original stems to MP3 (since Demucs output WAV now)
    print("Converting original stems to MP3...")
    for stem in stems:
        wav_path = os.path.join(input_dir, f"{stem}.wav")
        mp3_path = os.path.join(input_dir, f"{stem}.mp3")
        
        if os.path.exists(wav_path):
            print(f"Converting {stem}...")
            # Convert
            subprocess.run([
                'ffmpeg', '-y', '-i', wav_path, 
                '-b:a', '320k', 
                mp3_path
            ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            
            # Remove WAV
            os.remove(wav_path)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python create_mixes.py <path_to_stems_dir>")
        sys.exit(1)
        
    target_dir = sys.argv[1]
    create_mixes(target_dir)
