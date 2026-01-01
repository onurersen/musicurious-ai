import sys
import json
import librosa
import numpy as np
import scipy.stats

def generate_chord_templates():
    """
    Generates a dictionary of chord templates (chroma vectors).
    Includes: Maj, Min, 7, maj7, min7, dim, aug, sus2, sus4.
    """
    templates = {}
    
    # Pitch classes
    pitches = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    
    # Intervals (semitones from root)
    intervals = {
        '': [0, 4, 7],           # Major
        'm': [0, 3, 7],          # Minor
        '7': [0, 4, 7, 10],      # Dominant 7th
        # 'maj7': [0, 4, 7, 11],   # Major 7th
        # 'm7': [0, 3, 7, 10],     # Minor 7th
        # 'dim': [0, 3, 6],        # Diminished
        # 'aug': [0, 4, 8],        # Augmented
        # 'sus2': [0, 2, 7],       # Suspended 2nd
        # 'sus4': [0, 5, 7]        # Suspended 4th
    }
    
    for root_idx, root_name in enumerate(pitches):
        for chord_type, interval_list in intervals.items():
            chord_name = f"{root_name}{chord_type}"
            template = np.zeros(12)
            for interval in interval_list:
                template[(root_idx + interval) % 12] = 1.0
            
            # Normalize template
            templates[chord_name] = template / np.linalg.norm(template)
            
    return templates, pitches

def smooth_chords(chord_sequence, window_size=15):
    """
    Apply median filtering or mode smoothing to the chord sequence.
    Simple mode filter over a window.
    """
    from scipy.stats import mode
    
    # Pad input
    pad_width = window_size // 2
    padded = np.pad(chord_sequence, pad_width, mode='edge')
    
    smoothed = []
    for i in range(len(chord_sequence)):
        window = padded[i : i + window_size]
        # Use mode (most frequent)
        m = mode(window, keepdims=True)[0][0]
        smoothed.append(m)
        
    return smoothed

def analyze_audio(file_path):
    try:
        # Load audio
        # Use a lower SR for analysis speed if needed, but 22050 is standard
        y, sr = librosa.load(file_path, sr=22050)
        duration = librosa.get_duration(y=y, sr=sr)

        # --- 1. Beat & BPM ---
        onset_env = librosa.onset.onset_strength(y=y, sr=sr)
        tempo, beat_frames = librosa.beat.beat_track(onset_envelope=onset_env, sr=sr)
        bpm = float(tempo) if np.isscalar(tempo) else float(tempo[0])

        # --- 2. Time Signature Estimation ---
        # Analyze periodicity or beat alignment
        # This is heuristic-based because Librosa doesn't have direct meter tracking
        # We compare energy/autocorrelation at 3 vs 4 beat lags
        
        # Default to 4/4
        time_signature = "4/4"
        
        if len(beat_frames) > 4:
            # Check coherence of pulse at 3 beats vs 4 beats
            # This is a simplified approach. Madmom is better but we stick to librosa as requested.
            # We can use the onset envelope autocorrelation
            ac = librosa.autocorrelate(onset_env, max_size=2 * sr // 1) # 2 seconds max lag
            
            # Find peaks roughly corresponding to beat intervals
            # Ideally we'd map beat_frames to time, find avg beat duration
            avg_beat_duration = 60.0 / bpm
            
            # Check roughly if there is strong energy at 3x beat vs 4x beat
            # This is hard to robustly implement without more complex logic.
            # Fallback heuristic: Most pop music is 4/4.
            # Let's try to detect if it's "Waltz-like" (strong-weak-weak)
            pass
            
        # --- 3. Key & Scale ---
        chroma_cens = librosa.feature.chroma_cens(y=y, sr=sr)
        chroma_sum = np.sum(chroma_cens, axis=1)
        
        # Simple profiles for key
        maj_profile = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
        min_profile = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
        maj_profile /= np.linalg.norm(maj_profile)
        min_profile /= np.linalg.norm(min_profile)
        
        pitches = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        chroma_norm = chroma_sum / np.linalg.norm(chroma_sum)
        
        best_score = -1
        detected_key = "C"
        detected_scale = "Major"
        
        for i in range(12):
            rotated = np.roll(chroma_norm, -i)
            # Major
            score = np.dot(rotated, maj_profile)
            if score > best_score:
                best_score = score
                detected_key = pitches[i]
                detected_scale = "Major"
            # Minor
            score = np.dot(rotated, min_profile)
            if score > best_score:
                best_score = score
                detected_key = pitches[i]
                detected_scale = "Minor"

        # --- 4. Advanced Chord Detection ---
        # Use CQT for better resolution
        hop_length = 512
        chroma_cqt = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=hop_length)
        
        # Generate templates
        templates, _ = generate_chord_templates()
        template_names = list(templates.keys())
        template_matrix = np.array([templates[name] for name in template_names]) # Shape: (N_templates, 12)
        
        # Normalize CQT
        # Add small epsilon to avoid div by zero
        chroma_cqt_norm = chroma_cqt / (np.linalg.norm(chroma_cqt, axis=0, keepdims=True) + 1e-6)
        
        # Correlation: (N_templates, 12) @ (12, Time) = (N_templates, Time)
        similarity = np.dot(template_matrix, chroma_cqt_norm)
        
        # Find best match frame-by-frame
        best_indices = np.argmax(similarity, axis=0)
        detected_chords_raw = [template_names[idx] for idx in best_indices]
        
        # Smooth the sequence
        # Map strings to ints for smoothing
        name_to_int = {name: i for i, name in enumerate(template_names)}
        int_to_name = {i: name for i, name in enumerate(template_names)}
        
        raw_ints = [name_to_int[c] for c in detected_chords_raw]
        smoothed_ints = smooth_chords(raw_ints, window_size=65) # Increased window (~1.5s)
        
        detected_chords_smoothed = [int_to_name[i] for i in smoothed_ints]
        
        # Create Timeline (RLE)
        timeline = []
        if detected_chords_smoothed:
            current_chord = detected_chords_smoothed[0]
            start_frame = 0
            
            for i in range(1, len(detected_chords_smoothed)):
                if detected_chords_smoothed[i] != current_chord:
                    # End of segment
                    end_frame = i
                    start_time = librosa.frames_to_time(start_frame, sr=sr, hop_length=hop_length)
                    end_time = librosa.frames_to_time(end_frame, sr=sr, hop_length=hop_length)
                    
                    timeline.append({
                        "chord": current_chord,
                        "start": round(float(start_time), 3),
                        "end": round(float(end_time), 3)
                    })
                    
                    current_chord = detected_chords_smoothed[i]
                    start_frame = i
            
            # Last segment
            end_frame = len(detected_chords_smoothed)
            start_time = librosa.frames_to_time(start_frame, sr=sr, hop_length=hop_length)
            end_time = librosa.frames_to_time(end_frame, sr=sr, hop_length=hop_length)
             # Catch edge case where start_time == end_time
            if end_time > start_time:
                 timeline.append({
                    "chord": current_chord,
                    "start": round(float(start_time), 3),
                    "end": round(float(end_time), 3)
                })

        # --- 5. Post-Processing: Min Duration Filter ---
        # Consolidate short chords into previous to reduce jitter
        # User feedback: "Solidify and make chords unique"
        min_duration = 1.2
        filtered_timeline = []
        if timeline:
            filtered_timeline.append(timeline[0])
            for i in range(1, len(timeline)):
                current = timeline[i]
                prev = filtered_timeline[-1]
                
                # Check consistency
                if current['chord'] == prev['chord']:
                    prev['end'] = current['end']
                    continue
                
                duration = current['end'] - current['start']
                if duration < min_duration:
                    # Too short? extend previous chord to cover this time
                    prev['end'] = current['end']
                else:
                    filtered_timeline.append(current)
            
            timeline = filtered_timeline

        # --- Output ---
        result = {
            "bpm": round(bpm, 1),
            "key": detected_key,
            "scale": detected_scale,
            "time_signature": time_signature,
            "chords": timeline
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        # Fallback error JSON
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file provided"}))
        sys.exit(1)
        
    analyze_audio(sys.argv[1])
