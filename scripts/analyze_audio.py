import sys
import json
import librosa
import numpy as np

def analyze_audio(file_path):
    try:
        # Load audio (mono for analysis is fine)
        y, sr = librosa.load(file_path, sr=None)

        # 1. BPM Detection
        onset_env = librosa.onset.onset_strength(y=y, sr=sr)
        tempo, _ = librosa.beat.beat_track(onset_envelope=onset_env, sr=sr)
        
        # tempo is usually a scalar, but can be an array in older versions
        bpm = float(tempo) if np.isscalar(tempo) else float(tempo[0])

        # 2. Key Detection
        # Calculate Chroma Energy Normalized (CENS)
        chroma = librosa.feature.chroma_cens(y=y, sr=sr)
        
        # Sum chroma over time to get global pitch class distribution
        chroma_sum = np.sum(chroma, axis=1)
        
        # Krumhansl-Schmuckler Key Finding Algorithm Profiles
        # Major profile
        major_profile = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
        # Minor profile
        minor_profile = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
        
        # Normalize profiles
        major_profile /= np.linalg.norm(major_profile)
        minor_profile /= np.linalg.norm(minor_profile)
        
        # Pitch classes
        pitches = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        
        max_cor = -1
        best_key = None
        best_scale = None
        
        # Normalize chroma sum
        chroma_norm = chroma_sum / np.linalg.norm(chroma_sum)
        
        for i in range(12):
            # Rotate chroma to match profile starting at pitch i
            rotated_chroma = np.roll(chroma_norm, -i)
            
            # Correlate with Major
            cor_major = np.dot(rotated_chroma, major_profile)
            if cor_major > max_cor:
                max_cor = cor_major
                best_key = pitches[i]
                best_scale = "Major"
                
            # Correlate with Minor
            cor_minor = np.dot(rotated_chroma, minor_profile)
            if cor_minor > max_cor:
                max_cor = cor_minor
                best_key = pitches[i]
                best_scale = "Minor"

        result = {
            "bpm": round(bpm, 1),
            "key": best_key,
            "scale": best_scale
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file provided"}))
        sys.exit(1)
        
    analyze_audio(sys.argv[1])
