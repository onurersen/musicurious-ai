"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Play, Pause, Loader2, Volume2, Music, RotateCcw } from "lucide-react";
import * as Tone from "tone";
import { saveJamSettings, type UserJamSettings } from "@/app/actions";

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
}

export function SessionPlayer({ tracks, baseBpm, baseKey, baseScale, videoId, initialSettings }: SessionPlayerProps) {
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
                    } catch (e) { /* ignore stop error */ }
                    try {
                        playerRef.current.dispose();
                    } catch (e) { /* ignore dispose error */ }
                    playerRef.current = null;
                }
                if (pitchShiftEffectRef.current) {
                    try {
                        pitchShiftEffectRef.current.dispose();
                    } catch (e) { /* ignore dispose error */ }
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

                    const nextTime = prev + (delta * ratio);
                    return isNaN(nextTime) ? prev : nextTime;
                });
            }, 100);
        }
        return () => clearInterval(interval);
    }, [isPlaying, targetBpm, baseBpm, duration]);

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
            {/* Player Main Area */}
            <div className={`sticky top-20 z-50 relative w-full h-80 bg-black/60 backdrop-blur-xl rounded-xl overflow-hidden border border-white/10 shadow-2xl transition-all duration-500 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>

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
                </div>

                {/* Controls Area */}
                <div className="absolute bottom-0 left-0 right-0 h-32 p-4 bg-white/5 backdrop-blur-md flex flex-col justify-between">

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

                    {/* Bottom Row: Pitch & Metronome */}
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
                    </div>

                    {/* Key Info Badge (Absolute Center-ish or corner) */}
                    {(baseKey || baseScale) && (
                        <div className="absolute top-2 right-4 px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[10px] text-muted-foreground font-mono">
                            {baseKey} {baseScale} • {baseBpm} BPM
                        </div>
                    )}
                </div>
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
                                            {track.name.replace(/^no_/, 'No ').replace('.mp3', '').replace(/_/g, ' ')}
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
        </div>
    );
}
