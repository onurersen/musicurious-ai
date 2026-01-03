"use client";

import React from 'react';
import Chord from '@techies23/react-chords';

const guitar = {
    strings: 6,
    fretsOnChord: 4,
    name: 'Guitar',
    keys: [],
    tunings: {
        standard: ['E', 'A', 'D', 'G', 'B', 'E']
    }
};

// Simplified dictionary for standard chords
// In a real app, use a dedicated library like 'tonal' or a larger JSON database
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CHORD_SHAPES: Record<string, any> = {
    // Majors
    "C": { frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
    "D": { frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
    "E": { frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0] },
    "F": { frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1], baseFret: 1, barres: [1] },
    "G": { frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3] },
    "A": { frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0] },
    "B": { frets: [-1, 2, 4, 4, 4, 2], fingers: [0, 1, 2, 3, 4, 1], baseFret: 2, barres: [2] },

    // Minors
    "Cm": { frets: [-1, 3, 5, 5, 4, 3], fingers: [0, 1, 3, 4, 2, 1], baseFret: 3, barres: [3] },
    "Dm": { frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1] },
    "Em": { frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0] },
    "Fm": { frets: [1, 3, 3, 1, 1, 1], fingers: [1, 3, 4, 1, 1, 1], baseFret: 1, barres: [1] },
    "Gm": { frets: [3, 5, 5, 3, 3, 3], fingers: [1, 3, 4, 1, 1, 1], baseFret: 3, barres: [3] },
    "Am": { frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0] },
    "Bm": { frets: [-1, 2, 4, 4, 3, 2], fingers: [0, 1, 3, 4, 2, 1], baseFret: 2, barres: [2] },

    // Major Sharps (Barre chords mostly)
    "C#": { frets: [-1, 4, 6, 6, 6, 4], fingers: [0, 1, 2, 3, 4, 1], baseFret: 4, barres: [4] },
    "D#": { frets: [-1, 6, 8, 8, 8, 6], fingers: [0, 1, 2, 3, 4, 1], baseFret: 6, barres: [6] },
    "F#": { frets: [2, 4, 4, 3, 2, 2], fingers: [1, 3, 4, 2, 1, 1], baseFret: 2, barres: [2] },
    "G#": { frets: [4, 6, 6, 5, 4, 4], fingers: [1, 3, 4, 2, 1, 1], baseFret: 4, barres: [4] },
    "A#": { frets: [-1, 1, 3, 3, 3, 1], fingers: [0, 1, 2, 3, 4, 1], baseFret: 1, barres: [1] },

    // Minor Sharps
    "C#m": { frets: [-1, 4, 6, 6, 5, 4], fingers: [0, 1, 3, 4, 2, 1], baseFret: 4, barres: [4] },
    "D#m": { frets: [-1, 6, 8, 8, 7, 6], fingers: [0, 1, 3, 4, 2, 1], baseFret: 6, barres: [6] },
    "F#m": { frets: [2, 4, 4, 2, 2, 2], fingers: [1, 3, 4, 1, 1, 1], baseFret: 2, barres: [2] },
    "G#m": { frets: [4, 6, 6, 4, 4, 4], fingers: [1, 3, 4, 1, 1, 1], baseFret: 4, barres: [4] },
    "A#m": { frets: [-1, 1, 3, 3, 2, 1], fingers: [0, 1, 3, 4, 2, 1], baseFret: 1, barres: [1] },

    // 7ths (Dominant)
    "C7": { frets: [-1, 3, 2, 3, 1, 0], fingers: [0, 3, 2, 4, 1, 0] },
    "G7": { frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1] },
    "D7": { frets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3] },
    "A7": { frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 0, 2, 0, 3, 0] },
    "E7": { frets: [0, 2, 0, 1, 0, 0], fingers: [0, 2, 0, 1, 0, 0] },
    "B7": { frets: [-1, 2, 1, 2, 0, 2], fingers: [0, 2, 1, 3, 0, 4] },
    "F7": { frets: [1, 3, 1, 2, 1, 1], fingers: [1, 3, 1, 2, 1, 1], baseFret: 1, barres: [1] },

    // Major 7ths
    "Cmaj7": { frets: [-1, 3, 2, 0, 0, 0], fingers: [0, 3, 2, 0, 0, 0] },
    "Fmaj7": { frets: [-1, 3, 3, 2, 1, 0], fingers: [0, 3, 4, 2, 1, 0] },
    "Gmaj7": { frets: [3, 2, 0, 0, 0, 2], fingers: [2, 1, 0, 0, 0, 3] },
    "Dmaj7": { frets: [-1, -1, 0, 2, 2, 2], fingers: [0, 0, 0, 1, 2, 3] },
    "Emaj7": { frets: [0, 2, 1, 1, 0, 0], fingers: [0, 2, 1, 1, 0, 0] },
    "Amaj7": { frets: [-1, 0, 2, 1, 2, 0], fingers: [0, 0, 2, 1, 3, 0] },
    "Bmaj7": { frets: [-1, 2, 4, 3, 4, 2], fingers: [0, 1, 3, 2, 4, 1], baseFret: 2, barres: [2] },

    // Minor 7ths
    "Am7": { frets: [-1, 0, 2, 0, 1, 0], fingers: [0, 0, 2, 0, 1, 0] },
    "Dm7": { frets: [-1, -1, 0, 2, 1, 1], fingers: [0, 0, 0, 2, 1, 1] },
    "Em7": { frets: [0, 2, 2, 0, 3, 0], fingers: [0, 2, 2, 0, 3, 0] },
    "Bm7": { frets: [-1, 2, 4, 2, 3, 2], fingers: [0, 1, 3, 1, 2, 1], baseFret: 2, barres: [2] },
    "Cm7": { frets: [-1, 3, 5, 3, 4, 3], fingers: [0, 1, 3, 1, 2, 1], baseFret: 3, barres: [3] },
    "Fm7": { frets: [1, 3, 1, 1, 1, 1], fingers: [1, 3, 1, 1, 1, 1], baseFret: 1, barres: [1] },
    "Gm7": { frets: [3, 5, 3, 3, 3, 3], fingers: [1, 3, 1, 1, 1, 1], baseFret: 3, barres: [3] },

    // Diminished
    "Bdim": { frets: [-1, 2, 3, 4, 3, -1], fingers: [0, 1, 2, 4, 3, 0] },
    "Adim": { frets: [-1, 0, 1, 2, 1, -1], fingers: [0, 0, 1, 3, 2, 0] },
    "Edim": { frets: [0, 1, 2, 0, -1, -1], fingers: [0, 1, 2, 0, 0, 0] }, // E-Bb-E-G
    "Fdim": { frets: [1, 2, 3, 1, -1, -1], fingers: [1, 2, 4, 1, 0, 0] },
    "Gdim": { frets: [3, 4, 5, 3, -1, -1], fingers: [1, 2, 4, 1, 0, 0] },
    "Cdim": { frets: [-1, 3, 4, 5, 4, -1], fingers: [0, 1, 2, 4, 3, 0] },
    "Ddim": { frets: [-1, -1, 0, 1, 3, 1], fingers: [0, 0, 0, 1, 4, 2] },

    // Augmented
    "Caug": { frets: [-1, 3, 2, 1, 1, -1], fingers: [0, 3, 2, 1, 1, 0] },
    "Gaug": { frets: [3, 2, 1, 0, 0, 3], fingers: [3, 2, 1, 0, 0, 4] },
    "Daug": { frets: [-1, -1, 0, 3, 3, 2], fingers: [0, 0, 0, 2, 3, 1] },
    "Eaug": { frets: [0, 3, 2, 1, 1, 0], fingers: [0, 3, 2, 1, 1, 0] },
    "Faug": { frets: [1, 0, 3, 2, 2, 1], fingers: [1, 0, 4, 2, 3, 1] },
    "Aaug": { frets: [-1, 0, 3, 2, 2, 1], fingers: [0, 0, 3, 2, 1, 0] },
    "Baug": { frets: [-1, 2, 1, 0, 0, 3], fingers: [0, 2, 1, 0, 0, 4] },

    // Sus4
    "Dsus4": { frets: [-1, -1, 0, 2, 3, 3], fingers: [0, 0, 0, 1, 3, 4] },
    "Gsus4": { frets: [3, 3, 0, 0, 1, 3], fingers: [3, 4, 0, 0, 1, 2] },
    "Asus4": { frets: [-1, 0, 2, 2, 3, 0], fingers: [0, 0, 1, 2, 3, 0] },
    "Esus4": { frets: [0, 2, 2, 2, 0, 0], fingers: [0, 2, 3, 4, 0, 0] },
    "F#sus4": { frets: [2, 4, 4, 4, 2, 2], fingers: [1, 3, 3, 3, 1, 1], baseFret: 2, barres: [2] },
    "G#sus4": { frets: [4, 6, 6, 6, 4, 4], fingers: [1, 3, 3, 3, 1, 1], baseFret: 4, barres: [4] },
    "A#sus4": { frets: [-1, 1, 3, 3, 4, 1], fingers: [0, 1, 3, 4, 1, 1], baseFret: 1, barres: [1] },
    "Bsus4": { frets: [-1, 2, 4, 4, 5, 2], fingers: [0, 1, 3, 4, 0, 1], baseFret: 2, barres: [2] },
    "C#sus4": { frets: [-1, 4, 6, 6, 7, 4], fingers: [0, 1, 3, 4, 0, 1], baseFret: 4, barres: [4] },
    "D#sus4": { frets: [-1, 6, 8, 8, 9, 6], fingers: [0, 1, 3, 4, 0, 1], baseFret: 6, barres: [6] },
    "Csus4": { frets: [-1, 3, 3, 0, 1, 1], fingers: [0, 3, 4, 0, 1, 1] },


    // Sus2
    "Dsus2": { frets: [-1, -1, 0, 2, 3, 0], fingers: [0, 0, 0, 1, 3, 0] },
    "Asus2": { frets: [-1, 0, 2, 2, 0, 0], fingers: [0, 0, 1, 2, 0, 0] },
    "Esus2": { frets: [0, 2, 4, 4, 0, 0], fingers: [0, 1, 3, 4, 0, 0] },
    "Gsus2": { frets: [3, 0, 0, 0, 3, 3], fingers: [2, 0, 0, 0, 3, 4] },
    "Bsus2": { frets: [-1, 2, 4, 4, 2, 2], fingers: [0, 1, 3, 4, 1, 1], baseFret: 2, barres: [2] },
    "Csus2": { frets: [-1, 3, 0, 0, 1, 3], fingers: [0, 3, 0, 0, 1, 4] },
    "F#sus2": { frets: [2, 4, 4, 1, 2, 2], fingers: [2, 3, 4, 1, 1, 1], baseFret: 1, barres: [1] },
    "G#sus2": { frets: [4, 6, 6, 3, 4, 4], fingers: [2, 3, 4, 1, 1, 1], baseFret: 3, barres: [3] }, // Difficult shape, finding alt? 468844 (Barre 4)
    "A#sus2": { frets: [-1, 1, 3, 3, 1, 1], fingers: [0, 1, 3, 4, 1, 1], baseFret: 1, barres: [1] },
    "C#sus2": { frets: [-1, 4, 6, 6, 4, 4], fingers: [0, 1, 3, 4, 1, 1], baseFret: 4, barres: [4] },
    "D#sus2": { frets: [-1, 6, 8, 8, 6, 6], fingers: [0, 1, 3, 4, 1, 1], baseFret: 6, barres: [6] },


    // Major 7ths (Sharp/Flat keys)
    "C#maj7": { frets: [-1, 4, 6, 5, 6, 4], fingers: [0, 1, 3, 2, 4, 1], baseFret: 4, barres: [4] },
    "D#maj7": { frets: [-1, 6, 8, 7, 8, 6], fingers: [0, 1, 3, 2, 4, 1], baseFret: 6, barres: [6] },
    "F#maj7": { frets: [2, 4, 3, 3, 2, 2], fingers: [1, 3, 2, 2, 1, 1], baseFret: 2, barres: [2] },
    "G#maj7": { frets: [4, 6, 5, 5, 4, 4], fingers: [1, 3, 2, 2, 1, 1], baseFret: 4, barres: [4] },
    "A#maj7": { frets: [-1, 1, 3, 2, 3, 1], fingers: [0, 1, 3, 2, 4, 1], baseFret: 1, barres: [1] },

    // Minor 7ths (Sharp/Flat keys)
    "C#m7": { frets: [-1, 4, 6, 4, 5, 4], fingers: [0, 1, 3, 1, 2, 1], baseFret: 4, barres: [4] },
    "D#m7": { frets: [-1, 6, 8, 6, 7, 6], fingers: [0, 1, 3, 1, 2, 1], baseFret: 6, barres: [6] },
    "F#m7": { frets: [2, 4, 2, 2, 2, 2], fingers: [1, 3, 1, 1, 1, 1], baseFret: 2, barres: [2] },
    "G#m7": { frets: [4, 6, 4, 4, 4, 4], fingers: [1, 3, 1, 1, 1, 1], baseFret: 4, barres: [4] },
    "A#m7": { frets: [6, 8, 6, 6, 6, 6], fingers: [1, 3, 1, 1, 1, 1], baseFret: 6, barres: [6] },

    // Dominant 7ths (Sharp/Flat keys)
    "C#7": { frets: [-1, 4, 6, 4, 6, 4], fingers: [0, 1, 3, 1, 4, 1], baseFret: 4, barres: [4] },
    "D#7": { frets: [-1, 6, 8, 6, 8, 6], fingers: [0, 1, 3, 1, 4, 1], baseFret: 6, barres: [6] },
    "F#7": { frets: [2, 4, 2, 3, 2, 2], fingers: [1, 3, 1, 2, 1, 1], baseFret: 2, barres: [2] },
    "G#7": { frets: [4, 6, 4, 5, 4, 4], fingers: [1, 3, 1, 2, 1, 1], baseFret: 4, barres: [4] },
    "A#7": { frets: [6, 8, 6, 7, 6, 6], fingers: [1, 3, 1, 2, 1, 1], baseFret: 6, barres: [6] },

    // Diminished
    "C#dim": { frets: [-1, 4, 5, 6, 5, -1], fingers: [0, 1, 2, 4, 3, 0] },
    "D#dim": { frets: [-1, 1, 2, 3, 2, -1], fingers: [0, 1, 2, 4, 3, 0] },
    "F#dim": { frets: [2, 3, 4, 2, -1, -1], fingers: [1, 2, 4, 1, 0, 0] },
    "G#dim": { frets: [4, 5, 6, 4, -1, -1], fingers: [1, 2, 4, 1, 0, 0] },
    "A#dim": { frets: [-1, 1, 2, 3, 2, -1], fingers: [0, 1, 2, 4, 3, 0] },

    // 6th Chords
    "C6": { frets: [-1, 3, 2, 2, 1, 0], fingers: [0, 3, 2, 2, 1, 0] },
    "D6": { frets: [-1, -1, 0, 2, 0, 2], fingers: [0, 0, 0, 1, 0, 2] },
    "E6": { frets: [0, 2, 2, 1, 2, 0], fingers: [0, 2, 3, 1, 4, 0] },
    "F6": { frets: [-1, -1, 3, 2, 3, 1], fingers: [0, 0, 3, 2, 4, 1] },
    "G6": { frets: [3, 2, 0, 0, 0, 0], fingers: [3, 2, 0, 0, 0, 0] },
    "A6": { frets: [-1, 0, 2, 2, 2, 2], fingers: [0, 0, 1, 1, 1, 1], barres: [2] },
    "B6": { frets: [-1, 2, 4, 4, 4, 4], fingers: [0, 1, 3, 3, 3, 3], baseFret: 2, barres: [2, 4] },

    // Minor 6th
    "Cm6": { frets: [-1, 3, 1, 2, 1, 3], fingers: [0, 3, 1, 2, 1, 4] }, // C Eb A C/G
    "Dm6": { frets: [-1, -1, 0, 2, 0, 1], fingers: [0, 0, 0, 2, 0, 1] },
    "Em6": { frets: [0, 2, 2, 0, 2, 0], fingers: [0, 1, 2, 0, 3, 0] },
    "Fm6": { frets: [1, -1, 0, 1, 1, 1], fingers: [1, 0, 0, 2, 3, 4] },
    "Gm6": { frets: [3, -1, 2, 3, 3, 3], fingers: [2, 0, 1, 3, 3, 3], barres: [3] },
    "Am6": { frets: [-1, 0, 2, 2, 1, 2], fingers: [0, 0, 2, 3, 1, 4] },
    "Bm6": { frets: [-1, 2, 0, 1, 0, 2], fingers: [0, 2, 0, 1, 0, 3] },

    // Major 7 b5 (Lydian) - e.g. Cmaj7b5
    "Cmaj7b5": { frets: [-1, 3, 4, 4, 5, -1], fingers: [0, 1, 2, 3, 4, 0] },
    "Dmaj7b5": { frets: [-1, 5, 6, 6, 7, -1], fingers: [0, 1, 2, 3, 4, 0], baseFret: 5 },
    "Emaj7b5": { frets: [0, 1, 1, 1, 0, 0], fingers: [0, 1, 2, 3, 0, 0] }, // E G# A# D# -> 021100?? No. 0 11 8 9 0 0? 0 (E) 7 (E) 6 (A#) 8 (D#) 9 (G#) 7 (B -> no, want A#).
    // Let's use simple shapes. Emaj7b5: 0 7 8 8 9 X (E A# D# G#). Or simpler: X 7 8 8 9 X
    "Fmaj7b5": { frets: [1, 2, 2, 2, 0, 0], fingers: [1, 2, 3, 4, 0, 0] }, // F A B E. 132200 (F C F A B E - #11, valid).
    "Gmaj7b5": { frets: [3, 4, 4, 0, 0, 0], fingers: [1, 2, 3, 0, 0, 0] }, // G B C# G B E.
    "Amaj7b5": { frets: [-1, 0, 1, 1, 2, 0], fingers: [0, 0, 1, 2, 3, 0] }, // A D# G# C# E
    "Bmaj7b5": { frets: [-1, 2, 3, 3, 4, -1], fingers: [0, 1, 2, 3, 4, 0] },

    // Aliases for Mb5 -> maj7b5
    "CMb5": { frets: [-1, 3, 4, 4, 5, -1], fingers: [0, 1, 2, 3, 4, 0] },
    "DMb5": { frets: [-1, 5, 6, 6, 7, -1], fingers: [0, 1, 2, 3, 4, 0], baseFret: 5 },
    // "EMb5": { frets: [0, 1, 1, 1, 0, 0], fingers: [0, 1, 2, 3, 0, 0] }, 
    "FMb5": { frets: [1, 2, 2, 2, 0, 0], fingers: [1, 2, 3, 4, 0, 0] },
    "GMb5": { frets: [3, -1, 4, 4, 2, -1], fingers: [2, 0, 3, 4, 1, 0] }, // Precise: G C# F# B. 3 x 4 4 0 x (G F# B ... no). 
    // Gmaj7b5: 3 x 4 4 2 x (G F# B C#). This is excellent.
    "AMb5": { frets: [-1, 0, 1, 1, 2, 0], fingers: [0, 0, 1, 2, 3, 0] },
    "BMb5": { frets: [-1, 2, 3, 3, 4, -1], fingers: [0, 1, 2, 3, 4, 0] },



    // Add9 Chords
    "Cadd9": { frets: [-1, 3, 2, 0, 3, 3], fingers: [0, 2, 1, 0, 3, 4] },
    "Dadd9": { frets: [-1, 5, 4, 2, 5, 5], fingers: [0, 3, 2, 1, 4, 4], baseFret: 2, barres: [5] }, // C shape shifted
    // or Dadd9 open: x02425 ?? No. Let's use the one derived from C or A. A shape at 5: x57655? No that's Dmaj. x57755 is A shape. 9 is B (4th). x57975? 
    // Simplified Dadd9: x04230 (D F# A D E). 4=F#, 2=A, 3=D, 0=E. 
    "Eadd9": { frets: [0, 2, 2, 1, 0, 2], fingers: [0, 2, 3, 1, 0, 4] },
    "Fadd9": { frets: [1, 0, 3, 2, 1, 3], fingers: [1, 0, 4, 2, 1, 3] }, // Difficult thumb? 
    // Alternative Fadd9: xx3213. 
    "Gadd9": { frets: [3, 2, 0, 2, 0, 3], fingers: [2, 1, 0, 3, 0, 4] },
    "Aadd9": { frets: [-1, 0, 2, 2, 0, 0], fingers: [0, 0, 1, 2, 0, 0] }, // Often treated as Asus2. 
    // Real Aadd9: x02420 (A E B C# E).
    // Let's use the nice one:
    // "Aadd9": { frets: [-1, 0, 2, 4, 2, 0], fingers: [0, 0, 1, 3, 2, 0] },
    "Badd9": { frets: [-1, 2, 4, 6, 4, 2], fingers: [0, 1, 2, 4, 3, 1], baseFret: 2, barres: [2] },

    // Extended Chords (7b5, 9, m9, maj9, dim7)

    // 7b5 (Alerted Dominant)
    "C7b5": { frets: [-1, 3, 4, 3, 5, -1], fingers: [0, 1, 2, 1, 3, 0] },
    "D7b5": { frets: [-1, 5, 6, 5, 7, -1], fingers: [0, 1, 2, 1, 3, 0], baseFret: 5 },
    "E7b5": { frets: [0, 1, 2, 1, 3, 0], fingers: [0, 1, 2, 1, 3, 0] },
    "F7b5": { frets: [1, -1, 1, 2, 0, -1], fingers: [1, 0, 2, 3, 0, 0] },
    "G7b5": { frets: [3, -1, 3, 4, 2, -1], fingers: [2, 0, 3, 4, 1, 0] },
    "A7b5": { frets: [5, -1, 5, 6, 4, -1], fingers: [2, 0, 3, 4, 1, 0], baseFret: 4 },
    "B7b5": { frets: [-1, 2, 3, 2, 4, -1], fingers: [0, 1, 2, 1, 3, 0] },
    "C#7b5": { frets: [-1, 4, 5, 4, 6, -1], fingers: [0, 1, 2, 1, 3, 0], baseFret: 4 },
    "F#7b5": { frets: [2, -1, 2, 3, 1, -1], fingers: [2, 0, 3, 4, 1, 0] },

    // 9th Chords (Dominant 9)
    "C9": { frets: [-1, 3, 2, 3, 3, 3], fingers: [0, 2, 1, 3, 3, 3], barres: [3] },
    "D9": { frets: [-1, 5, 4, 5, 5, 5], fingers: [0, 2, 1, 3, 3, 3], baseFret: 4, barres: [5] },
    "E9": { frets: [0, 2, 0, 1, 0, 2], fingers: [0, 2, 0, 1, 0, 3] },
    "F9": { frets: [1, 3, 1, 2, 1, 3], fingers: [1, 3, 1, 2, 1, 4], baseFret: 1, barres: [1] },
    "G9": { frets: [3, 2, 3, 2, 0, -1], fingers: [2, 1, 3, 4, 0, 0] },
    "A9": { frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 0, 1, 0, 2, 0] }, // C# G B E
    "B9": { frets: [-1, 2, 1, 2, 2, 2], fingers: [0, 2, 1, 3, 3, 3], barres: [2] },

    // Minor 9th
    "Cm9": { frets: [-1, 3, 1, 3, 3, -1], fingers: [0, 2, 1, 3, 4, 0] },
    "Dm9": { frets: [-1, 5, 3, 5, 5, -1], fingers: [0, 2, 1, 3, 4, 0], baseFret: 3 },
    "Em9": { frets: [0, 2, 0, 0, 0, 2], fingers: [0, 1, 0, 0, 0, 2] },
    "Fm9": { frets: [1, 3, 1, 1, 1, 3], fingers: [1, 3, 1, 1, 1, 4], baseFret: 1, barres: [1] },
    "Gm9": { frets: [3, 5, 3, 3, 3, 5], fingers: [1, 3, 1, 1, 1, 4], baseFret: 3, barres: [3] },
    "Am9": { frets: [5, 7, 5, 5, 5, 7], fingers: [1, 3, 1, 1, 1, 4], baseFret: 5, barres: [5] },
    "Bm9": { frets: [-1, 2, 0, 2, 2, 2], fingers: [0, 1, 0, 2, 3, 4] },

    // Major 9th
    "Cmaj9": { frets: [-1, 3, 2, 4, 3, -1], fingers: [0, 2, 1, 4, 3, 0] },
    "Dmaj9": { frets: [-1, 5, 4, 6, 5, -1], fingers: [0, 2, 1, 4, 3, 0], baseFret: 4 },
    "Emaj9": { frets: [0, 2, 1, 1, 0, 2], fingers: [0, 2, 1, 1, 0, 3] },
    "Fmaj9": { frets: [1, 3, 2, 2, 1, 3], fingers: [1, 3, 2, 2, 1, 4], baseFret: 1, barres: [1] }, // Hard
    "Gmaj9": { frets: [3, -1, 4, 4, 3, -1], fingers: [1, 0, 3, 4, 2, 0] },
    "Amaj9": { frets: [-1, 0, 2, 1, 2, 0], fingers: [0, 0, 2, 1, 3, 0] }, // like Amaj7 actually includes B open string? Amaj7 is x02120 (A E G# C# E). B is 9. x02100 (A E G# B E) -> Amaj9
    "Bmaj9": { frets: [-1, 2, 1, 3, 2, -1], fingers: [0, 2, 1, 4, 3, 0] },

    // Diminished 7th (Full Dim)
    "Cdim7": { frets: [-1, 3, 4, 2, 4, -1], fingers: [0, 2, 3, 1, 4, 0] },
    "Ddim7": { frets: [-1, -1, 0, 1, 0, 1], fingers: [0, 0, 0, 1, 0, 2] },
    "Edim7": { frets: [0, 1, 2, 0, 2, 0], fingers: [0, 1, 2, 0, 3, 0] },
    "Fdim7": { frets: [1, -1, 0, 1, 0, -1], fingers: [1, 0, 0, 2, 0, 0] },
    "Gdim7": { frets: [3, 4, 2, 3, 2, 3], fingers: [2, 3, 1, 2, 1, 2], baseFret: 2, barres: [2] }, // High Gdim7
    "Adim7": { frets: [-1, 0, 1, 2, 1, 2], fingers: [0, 0, 1, 2, 1, 3] },
    "Bdim7": { frets: [-1, 2, 3, 1, 3, -1], fingers: [0, 2, 3, 1, 4, 0] },
};

// Helper to normalize chord names for lookup
// const normalizeChordName = (name: string) => {
//     // Replace flats 'b' with sharps '#' if needed, or handle alias
//     // Simple normalization for now
//     return name;
// }

export const getChordShape = (name: string) => {
    // 1. Direct match
    if (CHORD_SHAPES[name]) return CHORD_SHAPES[name];

    // 2. Try replacing "b" with "#" equivalent or # with b for lookup
    // Bidirectional map for common roots
    const enharmonicRoots: Record<string, string> = {
        "Db": "C#", "C#": "Db",
        "Eb": "D#", "D#": "Eb",
        "Gb": "F#", "F#": "Gb",
        "Ab": "G#", "G#": "Ab",
        "Bb": "A#", "A#": "Bb",
        "Cb": "B",
        "Fb": "E", "E#": "F", "B#": "C"
    };

    // Regex to capture Root (e.g. "C", "C#", "Bb") and the rest
    const match = name.match(/^([A-G][#b]?)(.*)$/);
    if (match) {
        const root = match[1];
        const ext = match[2];
        const altRoot = enharmonicRoots[root];
        if (altRoot) {
            const altName = altRoot + ext;
            if (CHORD_SHAPES[altName]) return CHORD_SHAPES[altName];
        }
    }

    return null;
};


interface ChordDisplayProps {
    chords: string[];
    activeChord?: string | null;
    nextChord?: string | null;
    isEditable?: boolean;
    onRename?: (original: string, newName: string) => void;
    onHide?: (original: string) => void;
    onReset?: () => void;
    onAdd?: (chord: string) => void;
}

export function ChordDisplay({ chords, activeChord, nextChord, isEditable = false, onRename, onHide, onReset, onAdd }: ChordDisplayProps) {
    const [isAdding, setIsAdding] = React.useState(false);
    const [newChordName, setNewChordName] = React.useState("");


    if (chords.length === 0 && !isEditable) return null;

    const handleAddSubmit = () => {
        if (newChordName.trim()) {
            onAdd?.(newChordName.trim());
            setNewChordName("");
            setIsAdding(false);
        } else {
            setIsAdding(false);
        }
    };

    return (
        <div className="flex flex-col gap-4 w-full p-6 bg-white/5 border border-white/5 rounded-xl">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest pl-1 flex justify-between items-center min-h-[28px]">
                <span>Detected Chords in Section</span>
                <div className="flex items-center gap-2">
                    {onReset && (
                        <button
                            onClick={onReset}
                            className="text-[10px] bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-2 py-1 rounded transition-colors"
                        >
                            Reset
                        </button>
                    )}
                    {isEditable && <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded border border-purple-500/20">EDIT MODE</span>}
                </div>
            </h3>

            <div className="flex flex-wrap gap-6 justify-center sm:justify-start">
                {chords.map((chordName, idx) => {
                    const shape = getChordShape(chordName);
                    const isActive = chordName === activeChord;
                    const isNext = chordName === nextChord && !isActive; // Active takes precedence

                    return (
                        <div key={`${chordName}-${idx}`} className={`flex flex-col items-center gap-2 group relative z-0 hover:z-50 transition-transform duration-300 ${isActive ? 'scale-110' : ''}`}>
                            {/* Chord Diagram with Hover Effect */}
                            <div className={`
                                bg-white rounded-lg p-2 shadow-sm transition-all duration-300 relative 
                                ${isActive ? 'ring-4 ring-green-500 shadow-[0_0_20px_rgba(34,197,94,0.6)]' : ''}
                                ${isNext ? 'ring-4 ring-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]' : ''}
                            `}>

                                {isEditable && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onHide?.(chordName);
                                        }}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-[60] shadow-md hover:scale-110"
                                        title="Hide Chord"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </button>
                                )}

                                {/* Normal Size */}
                                <div className="w-[80px]">
                                    {shape ? (
                                        <Chord
                                            chord={shape}
                                            instrument={guitar}
                                            lite={false}
                                        />
                                    ) : (
                                        <div className="w-[80px] h-[96px] flex items-center justify-center bg-gray-100 text-gray-400 text-[10px] text-center p-2 rounded">
                                            No Diagram<br />Available
                                        </div>
                                    )}
                                </div>

                                {/* Hover Zoom - Absolute Positioned */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[200px] bg-white p-4 rounded-xl shadow-2xl opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition-all duration-200 origin-bottom z-[100] border border-gray-100">
                                    {shape ? (
                                        <Chord
                                            chord={shape}
                                            instrument={guitar}
                                            lite={false}
                                        />
                                    ) : (
                                        <div className="w-full h-[240px] flex items-center justify-center bg-gray-100 text-gray-400 text-sm text-center p-4 rounded">
                                            No Diagram<br />Available
                                        </div>
                                    )}
                                    <div className="text-center font-bold text-black mt-2 text-lg">{chordName}</div>
                                </div>

                            </div>

                            {/* Chord Name Label / Input */}
                            {isEditable ? (
                                <input
                                    className={`px-2 py-1 w-20 text-center rounded-full border text-sm font-bold bg-black/50 border-white/20 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all`}
                                    defaultValue={chordName}
                                    onBlur={(e) => {
                                        const newVal = e.target.value.trim();
                                        if (newVal && newVal !== chordName) {
                                            onRename?.(chordName, newVal);
                                        } else {
                                            e.target.value = chordName; // Reset if empty
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.currentTarget.blur();
                                        }
                                    }}
                                />
                            ) : (
                                <div className={`
                                    px-3 py-1 rounded-full border text-sm font-bold transition-colors
                                    ${isActive
                                        ? 'bg-green-500 border-green-500 text-white'
                                        : isNext
                                            ? 'bg-yellow-400 border-yellow-400 text-black'
                                            : 'bg-white/10 border-white/10 text-white'
                                    }
                                `}>
                                    {chordName}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Add Chord Button */}
                {isEditable && onAdd && (
                    <div className="flex flex-col items-center gap-2 justify-end pb-[26px]">
                        {isAdding ? (
                            <div className="w-[80px] h-[96px] flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-lg p-2 gap-2 animate-in fade-in zoom-in-95 duration-200">
                                <input
                                    autoFocus
                                    className="w-full px-1 py-1 text-center bg-black/50 border border-white/20 rounded text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500"
                                    placeholder="Name"
                                    value={newChordName}
                                    onChange={e => setNewChordName(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') handleAddSubmit();
                                        if (e.key === 'Escape') setIsAdding(false);
                                    }}
                                    onBlur={handleAddSubmit}
                                />
                                <span className="text-[10px] text-white/40">Enter</span>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsAdding(true)}
                                className="w-[80px] h-[96px] flex flex-col items-center justify-center bg-white/5 border border-dashed border-white/20 hover:border-purple-500/50 hover:bg-purple-500/10 rounded-lg transition-all group"
                                title="Add Chord"
                            >
                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                </div>
                                <span className="text-[10px] font-bold text-white/40 mt-2 group-hover:text-purple-400">Add</span>
                            </button>
                        )}
                        <div className="h-[28px]"></div>{/* Spacer to match label height of other chords roughly */}
                    </div>
                )}
            </div>
            {chords.length === 0 && !isEditable && (
                <p className="text-muted-foreground text-sm italic">No significant chords detected in this section.</p>
            )}
        </div>
    );
}

