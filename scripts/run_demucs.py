import os
import sys
import torch
import torchaudio
import soundfile
import demucs.separate
import shutil
import ssl

# Bypass SSL verification for model download
ssl._create_default_https_context = ssl._create_unverified_context

def custom_save(filepath, src, sample_rate, **kwargs):
    """
    Monkeypatch replacement for torchaudio.save that uses soundfile directly.
    Handles the (Channels, Time) -> (Time, Channels) transpose.
    """
    # torchaudio tensors are (C, T), soundfile expects (T, C)
    if src.dim() == 2:
        src = src.t()
    
    # Extract common kwargs if present
    # demucs passes: encoding, bits_per_sample
    # soundfile usually infers from extension, but we can try to map if needed.
    # For now, we'll trust soundfile to handle the format based on file extension.
    
    # Ensure tensor is on CPU
    if src.is_cuda:
        src = src.cpu()
        
    # Convert to numpy
    data = src.numpy()
    
    # Determine subtype if needed (optional)
    subtype = None
    if 'bits_per_sample' in kwargs:
        bps = kwargs['bits_per_sample']
        if bps == 16:
            subtype = 'PCM_16'
        elif bps == 24:
            subtype = 'PCM_24'
        elif bps == 32:
            subtype = 'PCM_32'
            
    try:
        # If output is mp3, write as wav first then convert with ffmpeg
        if filepath.endswith('.mp3'):
            wav_path = filepath.replace('.mp3', '.wav')
            soundfile.write(wav_path, data, sample_rate, subtype=subtype)
            
            # Convert to mp3 using ffmpeg
            import subprocess
            subprocess.run([
                'ffmpeg', '-y', '-i', wav_path, 
                '-b:a', '320k', 
                filepath
            ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            
            # Remove wav
            os.remove(wav_path)
        else:
            soundfile.write(filepath, data, sample_rate, subtype=subtype)
            
    except Exception as e:
        print(f"Error saving {filepath} with soundfile/ffmpeg: {e}", file=sys.stderr)
        raise e

# Apply monkeypatch
print("Applying torchaudio.save monkeypatch...", file=sys.stderr)
torchaudio.save = custom_save

if __name__ == "__main__":
    print(f"Running Demucs with args: {sys.argv[1:]}", file=sys.stderr)
    demucs.separate.main()
