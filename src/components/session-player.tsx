"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Play, Pause, Loader2, Volume2, Music, Music2, RotateCcw, Repeat, Scissors, Trash2, Pencil, Save, X } from "lucide-react";
import * as Tone from "tone";
import { saveJamSettings, type UserJamSettings, saveExtractedSection, getExtractedSections, deleteExtractedSection, renameExtractedSection, updateSectionChordAdjustments, resetSectionChordAdjustments, type ExtractedSection } from "@/app/actions";
import { ChordDisplay } from "./chord-display";
import { ConfirmationModal } from "@/components/confirmation-modal";

interface SessionTrack {
    name: string;
    url: string;
}

interface SessionPlayerProps {
    tracks: SessionTrack[];
    baseBpm: number;
    baseKey?: string;
    baseScale?: string;
    videoId: number;
    initialSettings?: UserJamSettings | null;
    timeSignature?: string;
    chordsTimeline?: { chord: string; start: number; end: number }[];
    extractedSections?: ExtractedSection[];
}

export function SessionPlayer({ tracks, baseBpm, baseKey, baseScale, videoId, initialSettings, timeSignature, chordsTimeline = [], extractedSections: propsExtractedSections = [] }: SessionPlayerProps) {
    const [selectedTrack, setSelectedTrack] = useState<SessionTrack | null>(() => {
        if (initialSettings?.active_track) {
            const found = tracks.find(t => t.name === initialSettings.active_track);
            if (found) return found;
        }
        return tracks.length > 0 ? tracks[0] : null;
    });
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [volume, setVolume] = useState(0.8);

    // Audio Control State
    const [targetBpm, setTargetBpm] = useState(initialSettings?.tempo || baseBpm);
    const [pitchShift, setPitchShift] = useState(initialSettings?.pitch || 0); // Semitones

    // Loop State
    const [loopStart, setLoopStart] = useState(0);
    const [loopEnd, setLoopEnd] = useState(0);
    const [isLoopActive, setIsLoopActive] = useState(false);
    const [warningMessage, setWarningMessage] = useState<string | null>(null);

    // Extracted Sections State

    const [extractedSections, setExtractedSections] = useState<ExtractedSection[]>(propsExtractedSections);

    // Sync if prop changes (e.g. revalidate from server)
    useEffect(() => {
        setExtractedSections(propsExtractedSections);
    }, [propsExtractedSections]);

    const [editingSectionId, setEditingSectionId] = useState<number | null>(null);
    const [deletingSectionId, setDeletingSectionId] = useState<number | null>(null);
    const [editingTitle, setEditingTitle] = useState("");

    // Chord Customization State
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [currentSectionIdForReset, setCurrentSectionIdForReset] = useState<number | null>(null);

    // Helper to find valid section matching current loop
    // Use a bit of tolerance (e.g., 0.5s) to match loop bounds to section bounds
    const activeExtractedSection = extractedSections.find(
        s => Math.abs(s.start_time - loopStart) < 0.5 && Math.abs(s.end_time - loopEnd) < 0.5
    );

    const handleChordRename = async (original: string, newName: string) => {
        if (!activeExtractedSection) return;

        const currentAdjustments = activeExtractedSection.chord_adjustments || {};
        const newAdjustments = {
            ...currentAdjustments,
            [original]: { action: 'rename', to: newName }
        } as Record<string, { action: 'rename' | 'hide', to?: string }>; // Explicit cast to satisfy TS if needed

        // Optimistic update
        const updatedSections = extractedSections.map(s =>
            s.id === activeExtractedSection.id
                ? { ...s, chord_adjustments: newAdjustments }
                : s
        );
        setExtractedSections(updatedSections);

        await updateSectionChordAdjustments(activeExtractedSection.id, newAdjustments);
    };

    const handleChordHide = async (original: string) => {
        if (!activeExtractedSection) return;

        const currentAdjustments = activeExtractedSection.chord_adjustments || {};
        const newAdjustments = {
            ...currentAdjustments,
            [original]: { action: 'hide' }
        } as Record<string, { action: 'rename' | 'hide', to?: string }>;

        // Optimistic update
        const updatedSections = extractedSections.map(s =>
            s.id === activeExtractedSection.id
                ? { ...s, chord_adjustments: newAdjustments }
                : s
        );
        setExtractedSections(updatedSections);

        await updateSectionChordAdjustments(activeExtractedSection.id, newAdjustments);
    };

    const handleResetChords = () => {
        if (activeExtractedSection) {
            setCurrentSectionIdForReset(activeExtractedSection.id);
            setIsResetModalOpen(true);
        }
    };

    const confirmResetChords = async () => {
        if (currentSectionIdForReset) {
            // Optimistic update
            const updatedSections = extractedSections.map(s =>
                s.id === currentSectionIdForReset
                    ? { ...s, chord_adjustments: {} }
                    : s
            );
            setExtractedSections(updatedSections);

            await resetSectionChordAdjustments(currentSectionIdForReset);
            setIsResetModalOpen(false);
            setCurrentSectionIdForReset(null);
        }
    };


    // Tone Refs
    const playerRef = useRef<Tone.Player | null>(null);
    const pitchShiftEffectRef = useRef<Tone.PitchShift | null>(null);
    const isReadyRef = useRef(false);

    // Canvas Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const progressLineRef = useRef<HTMLDivElement>(null);
    const rafRef = useRef<number | undefined>(undefined);

    // Group tracks
    const instrumentStems = useMemo(() => {
        return tracks
            .filter(t => !t.name.startsWith('no_'))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [tracks]);

    const filterStems = useMemo(() => {
        return tracks
            .filter(t => t.name.startsWith('no_'))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [tracks]);


    // Initialize Tone.js Context
    useEffect(() => {
        console.log("[SessionPlayer] Mounted with settings:", initialSettings);
        // Start Tone context on first user interaction if needed, but we do it on Load usually
        return () => {

            // Cleanup
            if (playerRef.current) {
                playerRef.current.dispose();
            }
            if (pitchShiftEffectRef.current) {
                pitchShiftEffectRef.current.dispose();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Load Track logic
    useEffect(() => {
        if (!selectedTrack) return;

        let isActive = true;

        const loadTrack = async () => {
            setIsLoading(true);
            setIsPlaying(false);
            setCurrentTime(0);
            isReadyRef.current = false;

            try {
                if (playerRef.current) {
                    try {
                        playerRef.current.stop();
                    } catch { /* ignore stop error */ }
                    try {
                        playerRef.current.dispose();
                    } catch { /* ignore dispose error */ }
                    playerRef.current = null;
                }
                if (pitchShiftEffectRef.current) {
                    try {
                        pitchShiftEffectRef.current.dispose();
                    } catch { /* ignore dispose error */ }
                    pitchShiftEffectRef.current = null;
                }

                // Ensure context is started
                // await Tone.start(); // Removed to prevent blocking loading on Autoplay Policy


                // Create Effect Chain
                // Player -> PitchShift -> Destination
                const pitchEffect = new Tone.PitchShift().toDestination();
                pitchShiftEffectRef.current = pitchEffect;

                if (!selectedTrack.url) throw new Error("No URL for track");

                // Load Player
                const player = new Tone.Player({
                    url: selectedTrack.url,
                    loop: false,
                    onload: () => {
                        if (!isActive) return;

                        try {
                            setDuration(player.buffer.duration);
                            drawWaveform(player.buffer.get() as AudioBuffer);
                            setIsLoading(false);
                            isReadyRef.current = true;

                            // Apply initial volume
                            player.volume.value = Tone.gainToDb(volume);

                            // Apply initial tempo/pitch logic
                            updateAudioParams(targetBpm, pitchShift, player, pitchEffect);
                        } catch (e) {
                            console.error("Error in player onload:", e);
                        }
                    }
                }).connect(pitchEffect);

                playerRef.current = player;

            } catch (err) {
                if (isActive) {
                    console.error("Failed to load audio", err);
                    setIsLoading(false);
                }
            }
        };

        loadTrack();

        return () => {
            isActive = false;
            // Cleanup handled in main useEffect or before re-run
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTrack]); // Re-load when track changes

    // Update Audio Parameters (Tempo & Pitch)
    const updateAudioParams = useCallback((bpm: number, semitones: number, player: Tone.Player | null, shifter: Tone.PitchShift | null) => {
        if (!player || !shifter || !isReadyRef.current) return;

        // Guard against NaN
        const safeBpm = isNaN(bpm) || bpm <= 0 ? 120 : bpm;
        const safeSemitones = isNaN(semitones) ? 0 : semitones;
        const safeBase = baseBpm || 120;

        // 1. Calculate Playback Rate for Tempo
        const rate = safeBpm / safeBase;

        // Apply rate
        // Ensure rate is finite and positive
        if (isFinite(rate) && rate > 0) {
            player.playbackRate = rate;
        }

        // 2. Calculate Pitch Compensation
        const pitchCorrection = -12 * Math.log2(rate);

        // Final Pitch
        let finalPitch = safeSemitones + pitchCorrection;
        if (!isFinite(finalPitch)) finalPitch = 0;

        shifter.pitch = finalPitch;

    }, [baseBpm]);

    // React to State Changes
    useEffect(() => {
        updateAudioParams(targetBpm, pitchShift, playerRef.current, pitchShiftEffectRef.current);
    }, [targetBpm, pitchShift, updateAudioParams]);

    // Loop Logic
    useEffect(() => {
        if (warningMessage) {
            const timer = setTimeout(() => setWarningMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [warningMessage]);

    useEffect(() => {
        if (videoId) {
            getExtractedSections(videoId).then(setExtractedSections);
        }
    }, [videoId]);

    const handleSetLoopStart = () => {
        // If looping is active, we reset everything to start fresh as per user request
        if (isLoopActive) {
            setIsLoopActive(false);
            setLoopStart(currentTime);
            setLoopEnd(0); // Reset end point
            return;
        }

        // Standard validation
        if (loopEnd > 0 && currentTime >= loopEnd) {
            // If invalid, we also assume they want to start fresh or just reset end
            setLoopEnd(0);
        }
        setLoopStart(currentTime);
    };

    const handleSetLoopEnd = () => {
        // If looping is active, reset to start fresh
        if (isLoopActive) {
            setIsLoopActive(false);
            setLoopEnd(currentTime);
            setLoopStart(0); // Reset start point? 
            // Actually, if we set End, usually we want a start. 
            // But "start from scratch" implies clearing old constraints.
            return;
        }

        if (currentTime <= loopStart) {
            // Instead of warning, maybe just reset start?
            setWarningMessage("End point cannot be before start point");
            return;
        }
        setLoopEnd(currentTime);
    };

    const toggleLoop = () => {
        if (loopStart === 0 && loopEnd === 0) {
            setWarningMessage("Please select start and end points");
            return;
        }
        if (loopEnd <= loopStart) {
            setWarningMessage("Invalid loop range");
            return;
        }

        const newLoopState = !isLoopActive;
        setIsLoopActive(newLoopState);

        if (newLoopState && playerRef.current) {
            // Force boundaries immediately
            playerRef.current.loopStart = loopStart;
            playerRef.current.loopEnd = loopEnd;
            playerRef.current.loop = true;

            // Check if we need to jump into the loop
            // We add a tiny buffer to loopStart to avoid edge case issues
            if (currentTime < loopStart - 0.1 || currentTime >= loopEnd) {
                playerRef.current.seek(loopStart);
                setCurrentTime(loopStart); // Force UI sync
            }
        } else if (playerRef.current) {
            playerRef.current.loop = false;
        }
    };

    const handleExtractSection = async () => {
        if (loopEnd <= loopStart) {
            setWarningMessage("Invalid loop range: End must be after Start");
            return;
        }

        // Check for duplicates
        const isDuplicate = extractedSections.some(s =>
            Math.abs(s.start_time - loopStart) < 0.1 &&
            Math.abs(s.end_time - loopEnd) < 0.1
        );

        if (isDuplicate) {
            setWarningMessage("This section is already extracted!");
            return;
        }

        const title = `Section ${extractedSections.length + 1}`;
        try {
            const res = await saveExtractedSection(videoId, loopStart, loopEnd, title);
            if (res.success && res.section) {
                setExtractedSections(prev => [res.section as ExtractedSection, ...prev]);
                setWarningMessage("Section extracted!");

                // Auto-scroll to section list
                setTimeout(() => {
                    const el = document.getElementById('extracted-sections');
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 100);
            } else {
                setWarningMessage("Failed to extract section");
            }
        } catch {
            setWarningMessage("Error extracting section");
        }
    };

    const handlePlaySection = (section: ExtractedSection) => {
        if (!playerRef.current) return;

        setIsLoopActive(true);
        setLoopStart(section.start_time);
        setLoopEnd(section.end_time);

        playerRef.current.loop = true;
        playerRef.current.loopStart = section.start_time;
        playerRef.current.loopEnd = section.end_time;

        // Force UI sync
        setCurrentTime(section.start_time);

        // Immediate playback
        if (Tone.context.state !== "running") Tone.start();

        if (playerRef.current.state !== 'started') {
            playerRef.current.start(undefined, section.start_time);
        } else {
            playerRef.current.seek(section.start_time);
        }
        setIsPlaying(true);
    };

    const handleDeleteSection = async (id: number) => {
        // Optimistic UI update or wait? Let's wait for server.
        const res = await deleteExtractedSection(id);
        if (res.success) {
            setExtractedSections(prev => prev.filter(s => s.id !== id));
            setDeletingSectionId(null);
        }
    };

    const startEditing = (section: ExtractedSection) => {
        setEditingSectionId(section.id);
        setEditingTitle(section.title);
    };

    const saveEditing = async (id: number) => {
        const res = await renameExtractedSection(id, editingTitle);
        if (res.success) {
            setExtractedSections(prev => prev.map(s => s.id === id ? { ...s, title: editingTitle } : s));
            setEditingSectionId(null);
        }
    };

    // Update Tone Player Params (Loop & Volume)
    useEffect(() => {
        if (playerRef.current) {
            // We only update properties here, but do NOT force seek to avoid stuttering during playback updates
            playerRef.current.loop = isLoopActive;
            if (isLoopActive && loopStart < loopEnd) {
                playerRef.current.loopStart = loopStart;
                playerRef.current.loopEnd = loopEnd;
            }
        }
    }, [isLoopActive, loopStart, loopEnd]);

    // Volume
    useEffect(() => {
        if (playerRef.current && isReadyRef.current) {
            playerRef.current.volume.value = Tone.gainToDb(volume);
        }
    }, [volume]);

    // Play/Pause Toggle
    const togglePlay = async () => {
        if (!isReadyRef.current || !playerRef.current) return;

        if (Tone.context.state !== "running") {
            await Tone.start();
        }

        if (isPlaying) {
            playerRef.current.stop();
        } else {
            // Safe time check
            const safeTime = isNaN(currentTime) ? 0 : currentTime;
            if (safeTime >= duration) {
                playerRef.current.start(undefined, 0); // Restart
            } else {
                playerRef.current.start(undefined, safeTime);
            }
        }
        setIsPlaying(!isPlaying);
    };

    // Animation Loop for Progress
    useEffect(() => {
        const animate = () => {
            if (!playerRef.current || !isReadyRef.current) return;

            // Sync visual state if playing
            if (playerRef.current.state === "started") {
                setIsPlaying(true);
            } else {
                if (isPlaying) setIsPlaying(false); // Auto-detected stop (end of file)
            }

            // Manual seek loop check?
            // Tone.Player `onstop` callback?

            rafRef.current = requestAnimationFrame(animate);
        };
        rafRef.current = requestAnimationFrame(animate);

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [isPlaying]); // Dependent on nothing really

    // Re-implementing Animation/Time Tracking properly
    // We will use a separate effect for precise time tracking if we can.
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPlaying) {
            interval = setInterval(() => {
                setCurrentTime(prev => {
                    if (prev >= duration) return duration;
                    const delta = 0.1; // 100ms

                    const safeTarget = isNaN(targetBpm) ? 120 : targetBpm;
                    const safeBase = baseBpm || 120;
                    const ratio = safeTarget / safeBase;

                    let nextTime = prev + (delta * ratio);
                    if (isNaN(nextTime)) nextTime = prev;

                    // Manual Loop Enforcement
                    // If Loop is Active and we've crossed the End point
                    if (isLoopActive && loopEnd > loopStart && nextTime >= loopEnd) {
                        // 1. Visually reset
                        nextTime = loopStart;
                        // 2. Audio reset (Force Seek)
                        if (playerRef.current) {
                            // We use seek to enforce the loop. 
                            // Note: seeking might cause a tiny click but guarantees loop. 
                            // Tone.Player should handle it but as a fallback this is robust.
                            playerRef.current.seek(loopStart);
                        }
                    }

                    return nextTime;
                });
            }, 100);
        }
        return () => clearInterval(interval);
    }, [isPlaying, targetBpm, baseBpm, duration, isLoopActive, loopEnd, loopStart]);

    // Save Settings Debounced
    useEffect(() => {
        const timer = setTimeout(() => {
            if (videoId) {
                saveJamSettings(videoId, {
                    pitch: pitchShift,
                    tempo: targetBpm,
                    active_track: selectedTrack?.name || null
                });
            }
        }, 2000); // 2 seconds debounce

        return () => clearTimeout(timer);
    }, [pitchShift, targetBpm, selectedTrack, videoId]);

    // Auto-scroll to Chords when Loop is activated
    useEffect(() => {
        if (isLoopActive && loopEnd > loopStart && chordsTimeline.length > 0) {
            const timer = setTimeout(() => {
                const el = document.getElementById('chords-display');
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
            return () => clearTimeout(timer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoopActive]); // Only trigger when active state changes to true



    const drawWaveform = (buffer: AudioBuffer) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const width = canvas.offsetWidth;
        const height = canvas.offsetHeight;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        ctx.clearRect(0, 0, width, height);
        const rawDataL = buffer.getChannelData(0);

        const step = Math.ceil(rawDataL.length / width);
        const amp = height / 2;

        ctx.fillStyle = '#A855F7'; // Purple-500
        ctx.beginPath();

        for (let i = 0; i < width; i++) {
            let min = 1.0;
            let max = -1.0;

            for (let j = 0; j < step; j++) {
                const datum = rawDataL[(i * step) + j];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }

            // Optimization
            if (min > max) { min = 0; max = 0; }

            ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
        }
    };

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!duration || !playerRef.current) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const progress = Math.max(0, Math.min(1, x / rect.width));
        const seekTime = duration * progress;

        // Auto-disable loop if clicking outside range
        if (isLoopActive && (seekTime < loopStart || seekTime > loopEnd)) {
            setIsLoopActive(false);
            playerRef.current.loop = false;
        }

        setCurrentTime(seekTime); // Update UI

        // If playing, we need to restart at new time
        if (isPlaying) {
            playerRef.current.stop();
            playerRef.current.start(undefined, seekTime);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (tracks.length === 0) {
        return <div className="text-white text-center py-12">No audio tracks found for this session.</div>;
    }

    return (
        <div className="flex flex-col gap-8 w-full">
            {/* Player Main Area - Increased height for extra controls */}
            <div className={`sticky top-20 z-50 relative w-full h-[22rem] bg-black/60 backdrop-blur-xl rounded-xl overflow-hidden border border-white/10 shadow-2xl transition-all duration-500 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>

                {/* Visualizer Canvas */}
                <div ref={containerRef} className="absolute inset-x-0 top-0 h-48 flex items-center justify-center border-b border-white/5">
                    <canvas
                        ref={canvasRef}
                        className="w-full h-full cursor-pointer z-10"
                        onClick={handleCanvasClick}
                    />
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center z-20">
                            <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
                            <span className="ml-3 font-medium text-white/80">Loading audio...</span>
                        </div>
                    )}
                    {/* Progress Overlay Line */}
                    {!isLoading && (
                        <div
                            ref={progressLineRef}
                            className="absolute top-0 bottom-0 w-0.5 bg-white z-10 pointer-events-none"
                            style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                        />
                    )}
                    {/* Loop Markers Overlay */}
                    {!isLoading && (
                        <>
                            {loopStart > 0 && (
                                <div
                                    className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 z-10 pointer-events-none opacity-50"
                                    style={{ left: `${duration ? (loopStart / duration) * 100 : 0}%` }}
                                />
                            )}
                            {loopEnd > 0 && (
                                <div
                                    className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 z-10 pointer-events-none opacity-50"
                                    style={{ left: `${duration ? (loopEnd / duration) * 100 : 0}%` }}
                                />
                            )}
                            {/* Loop Region */}
                            {loopStart >= 0 && loopEnd > loopStart && (
                                <div
                                    className="absolute top-0 bottom-0 bg-yellow-400/10 z-0 pointer-events-none"
                                    style={{
                                        left: `${duration ? (loopStart / duration) * 100 : 0}%`,
                                        width: `${duration ? ((loopEnd - loopStart) / duration) * 100 : 0}%`
                                    }}
                                />
                            )}
                        </>
                    )}
                </div>

                {/* Looping Warning */}
                {warningMessage && (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-3 py-1 rounded-full text-xs font-bold z-50 animate-in fade-in slide-in-from-top-2">
                        {warningMessage}
                    </div>
                )}

                {/* Controls Area - Height auto or flex grow */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/5 backdrop-blur-md flex flex-col gap-2">

                    {/* Top Row: Play/Volume/Info */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={togglePlay}
                                disabled={isLoading}
                                className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50"
                            >
                                {isPlaying ? <Pause fill="currentColor" size={18} /> : <Play fill="currentColor" size={18} className="ml-0.5" />}
                            </button>

                            <div className="flex flex-col">
                                <span className="text-white font-medium text-sm leading-tight capitalize max-w-[200px] truncate">
                                    {selectedTrack?.name.replace(/^no_/, "No ").replace('.mp3', '').replace(/_/g, ' ') || "Unknown Track"}
                                </span>
                                <span className="text-xs text-muted-foreground font-mono">
                                    {formatTime(currentTime)} / {formatTime(duration)}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Volume2 size={16} className="text-muted-foreground" />
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={volume}
                                onChange={(e) => setVolume(parseFloat(e.target.value))}
                                className="w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                            />
                        </div>
                    </div>

                    {/* Loop Controls */}
                    <div className="flex items-center gap-4 py-2 border-t border-white/5 justify-center">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleSetLoopStart}
                                className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-[10px] text-white font-mono uppercase tracking-wider"
                            >
                                Set Start
                            </button>
                            <span className="text-[10px] text-muted-foreground font-mono">{formatTime(loopStart)}</span>
                        </div>

                        <button
                            onClick={toggleLoop}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${isLoopActive ? 'bg-yellow-500 text-black' : 'bg-white/10 text-muted-foreground hover:bg-white/20 hover:text-white'}`}
                        >
                            <Repeat size={12} />
                            Loop
                        </button>

                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground font-mono">{formatTime(loopEnd)}</span>
                            <button
                                onClick={handleSetLoopEnd}
                                className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-[10px] text-white font-mono uppercase tracking-wider"
                            >
                                Set End
                            </button>
                        </div>
                    </div>

                    {/* Bottom Row: Pitch & Metronome - Integrated with Extract Button */}
                    <div className="flex items-center gap-6 pt-2 border-t border-white/5">
                        {/* Metronome / Tempo */}
                        <div className="flex flex-col gap-1 flex-1">
                            <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                                <span>Tempo (BPM)</span>
                                <div className="flex gap-2">
                                    <span className="text-white">{Math.round(targetBpm) || 0}</span>
                                    <button onClick={() => setTargetBpm(baseBpm || 120)} className="hover:text-white" title="Reset"><RotateCcw size={10} /></button>
                                </div>
                            </div>
                            <input
                                type="range"
                                min={(baseBpm || 120) - 50}
                                max={(baseBpm || 120) + 50}
                                step="1"
                                value={isNaN(targetBpm) ? (baseBpm || 120) : targetBpm}
                                onChange={(e) => setTargetBpm(parseFloat(e.target.value))}
                                disabled={isLoading}
                                className="w-full h-1 bg-blue-500/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-400"
                            />
                        </div>

                        {/* Divider */}
                        <div className="w-px h-8 bg-white/10" />

                        {/* Pitch Shifter */}
                        <div className="flex flex-col gap-1 flex-1">
                            <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                                <span>Pitch Shift</span>
                                <div className="flex gap-2">
                                    <span className="text-white">{pitchShift > 0 ? `+${pitchShift}` : pitchShift} semi</span>
                                    <button onClick={() => setPitchShift(0)} className="hover:text-white" title="Reset"><RotateCcw size={10} /></button>
                                </div>
                            </div>
                            <input
                                type="range"
                                min="-12"
                                max="12"
                                step="1"
                                value={isNaN(pitchShift) ? 0 : pitchShift}
                                onChange={(e) => setPitchShift(parseFloat(e.target.value))}
                                disabled={isLoading}
                                className="w-full h-1 bg-purple-500/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-400"
                            />
                        </div>

                        {/* Divider */}
                        <div className="w-px h-8 bg-white/10" />

                        {/* Extract Button */}
                        <button
                            onClick={handleExtractSection}
                            disabled={loopEnd <= loopStart}
                            className="flex flex-col items-center justify-center text-xs gap-1 px-4 text-muted-foreground hover:text-white disabled:opacity-50 disabled:cursor-not-allowed group"
                            title="Extract current loop as a section"
                        >
                            <Scissors size={18} className="group-hover:text-yellow-400 transition-colors" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Extract</span>
                        </button>
                    </div>

                    {/* Key Info Badge & Time Sig */}
                    <div className="absolute top-2 right-4 flex gap-2">
                        {timeSignature && (
                            <div className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[10px] text-muted-foreground font-mono">
                                {timeSignature}
                            </div>
                        )}
                        {(baseKey || baseScale) && (
                            <div className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[10px] text-muted-foreground font-mono">
                                {baseKey} {baseScale} • {baseBpm} BPM
                            </div>
                        )}
                    </div>
                </div> {/* Closing Controls Area properly */}
            </div>

            {/* Stem Switcher */}
            <div className="flex flex-col gap-8">
                {/* Instruments Section */}
                {instrumentStems.length > 0 && (
                    <div className="flex flex-col gap-3">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest pl-1">Available Stems</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {instrumentStems.map((track) => (
                                <button
                                    key={track.name}
                                    onClick={() => setSelectedTrack(track)}
                                    className={`
                                        relative group overflow-hidden rounded-xl border p-4 text-left transition-all duration-200
                                        ${selectedTrack?.name === track.name
                                            ? 'bg-purple-500/20 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                                            : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                                        }
                                    `}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <Music
                                            size={20}
                                            className={`transition-colors ${selectedTrack?.name === track.name ? 'text-purple-400' : 'text-muted-foreground group-hover:text-white'}`}
                                        />
                                        {selectedTrack?.name === track.name && (
                                            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                                        )}
                                    </div>

                                    <div className="space-y-1">
                                        <div className={`font-medium text-sm truncate capitalize ${selectedTrack?.name === track.name ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                                            {track.name.replace('.mp3', '').replace(/_/g, ' ')}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground uppercase">
                                            Instrument
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {instrumentStems.length > 0 && filterStems.length > 0 && (
                    <div className="h-px w-full bg-white/10" />
                )}

                {/* Filters Section */}
                {filterStems.length > 0 && (
                    <div className="flex flex-col gap-3">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest pl-1">Available Filters</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {filterStems.map((track) => (
                                <button
                                    key={track.name}
                                    onClick={() => setSelectedTrack(track)}
                                    className={`
                                        relative group overflow-hidden rounded-xl border p-4 text-left transition-all duration-200
                                        ${selectedTrack?.name === track.name
                                            ? 'bg-purple-500/20 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                                            : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                                        }
                                    `}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="relative">
                                            <Music
                                                size={20}
                                                className={`transition-colors ${selectedTrack?.name === track.name ? 'text-purple-400' : 'text-muted-foreground group-hover:text-white'}`}
                                            />
                                        </div>

                                        {selectedTrack?.name === track.name && (
                                            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                                        )}
                                    </div>

                                    <div className="space-y-1">
                                        <div className={`font-medium text-sm truncate capitalize ${selectedTrack?.name === track.name ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                                            {track.name
                                                .replace('no_guitar_other', 'No Guitar & Other')
                                                .replace(/^no_/, 'No ')
                                                .replace('.mp3', '')
                                                .replace(/_/g, ' ')
                                            }
                                        </div>
                                        <div className="text-[10px] text-muted-foreground uppercase">
                                            Filter
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>






            {/* Chord Display Area */}
            {chordsTimeline.length > 0 && (
                <div id="chords-display" className="w-full animate-in fade-in slide-in-from-top-4 duration-500 scroll-mt-[560px]">
                    {isLoopActive && loopEnd > loopStart ? (
                        <div className="relative">
                            {/* Reset Button moved to ChordDisplay */}

                            <ChordDisplay
                                chords={
                                    Array.from(new Set(
                                        chordsTimeline
                                            .filter(c => c.end > loopStart && c.start < loopEnd) // Within loop
                                            .filter(c => (c.end - c.start) > 2) // Filter noise
                                            .map(c => c.chord)
                                            // Apply filtering/renaming for DISPLAY list
                                            .filter(chord => {
                                                if (!activeExtractedSection?.chord_adjustments) return true;
                                                const adj = activeExtractedSection.chord_adjustments[chord];
                                                return !(adj && adj.action === 'hide');
                                            })
                                            .map(chord => {
                                                if (!activeExtractedSection?.chord_adjustments) return chord;
                                                const adj = activeExtractedSection.chord_adjustments[chord];
                                                return (adj && adj.action === 'rename' && adj.to) ? adj.to : chord;
                                            })
                                    ))
                                }
                                activeChord={
                                    (() => {
                                        const rawChord = chordsTimeline.find(c => currentTime >= c.start && currentTime < c.end)?.chord;
                                        if (!rawChord) return null;

                                        if (!activeExtractedSection?.chord_adjustments) return rawChord;

                                        const adj = activeExtractedSection.chord_adjustments[rawChord];
                                        if (adj?.action === 'hide') return null; // Hidden chord shouldn't highlight anything? Or just don't show info?
                                        if (adj?.action === 'rename' && adj.to) return adj.to;

                                        return rawChord;
                                    })()
                                }
                                isEditable={!!activeExtractedSection}
                                onRename={handleChordRename}
                                onHide={handleChordHide}
                                onReset={
                                    (activeExtractedSection?.chord_adjustments && Object.keys(activeExtractedSection.chord_adjustments).length > 0)
                                        ? handleResetChords
                                        : undefined
                                }
                            />
                        </div>
                    ) : (
                        <div className="bg-white/5 border border-white/5 rounded-xl p-8 text-center text-muted-foreground">
                            <Music2 className="mx-auto w-8 h-8 mb-3 opacity-50" />
                            <p className="text-sm font-medium">Select a loop or extract a section to view detected chords in that range.</p>
                        </div>
                    )}
                </div>
            )}

            <ConfirmationModal
                isOpen={isResetModalOpen}
                title="Reset Chord Adjustments"
                message="Are you sure you want to reset all custom chord changes for this section? This action cannot be undone."
                confirmLabel="Reset"
                isDestructive
                onConfirm={confirmResetChords}
                onCancel={() => setIsResetModalOpen(false)}
            />


            {/* Extracted Sections List */}
            {extractedSections.length > 0 && (
                <div id="extracted-sections" className="flex flex-col gap-3 scroll-mt-[480px]">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest pl-1">Extracted Sections</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {extractedSections.map((section) => (
                            <div
                                key={section.id}
                                className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center justify-between group hover:bg-white/10 transition-colors"
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <button
                                        onClick={() => handlePlaySection(section)}
                                        className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center hover:bg-purple-500 hover:text-white transition-all flex-shrink-0"
                                    >
                                        <Play size={14} fill="currentColor" />
                                    </button>

                                    {editingSectionId === section.id ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                value={editingTitle}
                                                onChange={(e) => setEditingTitle(e.target.value)}
                                                className="bg-black/50 border border-white/20 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-purple-500 w-full"
                                                autoFocus
                                            />
                                            <button onClick={() => saveEditing(section.id)} className="text-green-400 hover:text-green-300"><Save size={14} /></button>
                                            <button onClick={() => setEditingSectionId(null)} className="text-red-400 hover:text-red-300"><X size={14} /></button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="text-sm font-medium text-white truncate">{section.title}</span>
                                            <span className="text-[10px] text-muted-foreground font-mono">
                                                {formatTime(section.start_time)} - {formatTime(section.end_time)}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {!editingSectionId && (
                                        <>
                                            {deletingSectionId === section.id ? (
                                                <div className="flex items-center gap-2 bg-black/50 rounded px-1 animate-in fade-in slide-in-from-right-2">
                                                    <span className="text-[10px] text-red-400 font-bold uppercase">Sure?</span>
                                                    <button onClick={() => handleDeleteSection(section.id)} className="text-red-400 hover:text-red-300 font-bold text-xs px-2 py-0.5 bg-red-500/10 rounded">Yes</button>
                                                    <button onClick={() => setDeletingSectionId(null)} className="text-muted-foreground hover:text-white text-xs px-1">No</button>
                                                </div>
                                            ) : (
                                                <>
                                                    <button onClick={() => startEditing(section)} className="p-1.5 text-muted-foreground hover:text-white transition-colors">
                                                        <Pencil size={12} />
                                                    </button>
                                                    <button onClick={() => setDeletingSectionId(section.id)} className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors">
                                                        <Trash2 size={12} />
                                                    </button>
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
