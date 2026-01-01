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
const CHORD_SHAPES: Record<string, any> = {
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
};

// Helper to normalize chord names for lookup
// const normalizeChordName = (name: string) => {
//     // Replace flats 'b' with sharps '#' if needed, or handle alias
//     // Simple normalization for now
//     return name;
// }

const getChordShape = (name: string) => {
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
    currentTime?: number;
}

export function ChordDisplay({ chords }: ChordDisplayProps) {
    if (chords.length === 0) return null;

    return (
        <div className="flex flex-col gap-4 w-full p-6 bg-white/5 border border-white/5 rounded-xl">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest pl-1">
                Detected Chords in Section
            </h3>

            <div className="flex flex-wrap gap-6 justify-center sm:justify-start">
                {chords.map((chordName, idx) => {
                    const shape = getChordShape(chordName);

                    return (
                        <div key={`${chordName}-${idx}`} className="flex flex-col items-center gap-2 group relative z-0 hover:z-50">
                            {/* Chord Diagram with Hover Effect */}
                            <div className="bg-white rounded-lg p-2 shadow-sm transition-all duration-200">

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

                            {/* Chord Name Label */}
                            <div className="px-3 py-1 bg-white/10 rounded-full border border-white/10 text-white font-bold text-sm">
                                {chordName}
                            </div>
                        </div>
                    );
                })}
            </div>
            {chords.length === 0 && (
                <p className="text-muted-foreground text-sm italic">No significant chords detected in this section.</p>
            )}
        </div>
    );
}
