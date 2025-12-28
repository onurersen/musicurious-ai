
import torch
import torchaudio
import os

print(f"Torchaudio version: {torchaudio.__version__}")

try:
    import soundfile
    print(f"Soundfile version: {soundfile.__version__}")
except ImportError:
    print("Soundfile not installed")

print(f"Available backends: {torchaudio.list_audio_backends()}")

try:
    print(f"Current backend: {torchaudio.get_audio_backend()}")
except Exception as e:
    print(f"Could not get current backend: {e}")

# Try to save a dummy file
dummy_wav = torch.zeros(1, 16000)
try:
    print("Attempting to save with default backend...")
    torchaudio.save("test_default.wav", dummy_wav, 16000)
    print("Success default")
except Exception as e:
    print(f"Failed default: {e}")

try:
    print("Attempting to save with soundfile backend...")
    torchaudio.save("test_soundfile.wav", dummy_wav, 16000, backend="soundfile")
    print("Success soundfile")
except Exception as e:
    print(f"Failed soundfile: {e}")

if os.path.exists("test_default.wav"): os.remove("test_default.wav")
if os.path.exists("test_soundfile.wav"): os.remove("test_soundfile.wav")
