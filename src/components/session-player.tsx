"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Play, Pause, Loader2, Volume2, Music } from "lucide-react";

interface SessionTrack {
    name: string;
    url: string;
}

export function SessionPlayer({ tracks }: { tracks: SessionTrack[] }) {
    const [selectedTrack, setSelectedTrack] = useState<SessionTrack | null>(tracks.length > 0 ? tracks[0] : null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [volume, setVolume] = useState(0.8);

    // Web Audio Refs
    const audioCtxRef = useRef<AudioContext | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
    const audioBufferRef = useRef<AudioBuffer | null>(null);

    // Timing Refs
    const startTimeRef = useRef<number>(0);
    const pauseOffsetRef = useRef<number>(0);

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

    // Initialize Audio Context Once
    useEffect(() => {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        const gain = ctx.createGain();
        gain.connect(ctx.destination);

        audioCtxRef.current = ctx;
        gainNodeRef.current = gain;

        return () => {
            if (ctx.state !== 'closed') {
                ctx.close();
            }
        }
    }, []);

    // Helper to stop audio safely
    const stopAudioSource = useCallback(() => {
        if (sourceNodeRef.current) {
            try {
                sourceNodeRef.current.stop();
            } catch (e) {
                // Ignore errors if already stopped
            }
            sourceNodeRef.current.disconnect();
            sourceNodeRef.current = null;
        }
    }, []);

    // Play Audio
    const playAudio = useCallback(() => {
        if (!audioCtxRef.current || !audioBufferRef.current || !gainNodeRef.current) return;

        if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }

        stopAudioSource(); // Ensure clean slate

        const source = audioCtxRef.current.createBufferSource();
        source.buffer = audioBufferRef.current;
        source.connect(gainNodeRef.current);

        const offset = pauseOffsetRef.current;
        // Clamp offset to duration to avoid errors
        const safeOffset = Math.min(offset, audioBufferRef.current.duration);

        source.start(0, safeOffset);

        sourceNodeRef.current = source;
        // Capture exact context time adjusted by offset
        startTimeRef.current = audioCtxRef.current.currentTime - safeOffset;

        setIsPlaying(true);
    }, [stopAudioSource]);

    // Pause Audio
    const pauseAudio = useCallback(() => {
        if (audioCtxRef.current) {
            stopAudioSource();

            // Calculate where we stopped
            const elapsed = audioCtxRef.current.currentTime - startTimeRef.current;
            pauseOffsetRef.current = elapsed;

            setIsPlaying(false);
        }
    }, [stopAudioSource]);

    // Load Track
    useEffect(() => {
        if (!selectedTrack || !audioCtxRef.current) return;

        // Reset state
        stopAudioSource();
        setIsPlaying(false);
        setIsLoading(true);
        setDuration(0);
        setCurrentTime(0);
        pauseOffsetRef.current = 0;
        audioBufferRef.current = null;

        // Clear canvas context
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }

        const abortController = new AbortController();
        const loadAudio = async () => {
            try {
                const response = await fetch(selectedTrack.url, { signal: abortController.signal });
                const arrayBuffer = await response.arrayBuffer();

                // Decode
                const decodedBuffer = await audioCtxRef.current!.decodeAudioData(arrayBuffer);

                if (abortController.signal.aborted) return;

                audioBufferRef.current = decodedBuffer;
                setDuration(decodedBuffer.duration);
                drawWaveform(decodedBuffer);
                setIsLoading(false);

            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    console.error("Error loading audio:", err);
                    setIsLoading(false);
                }
            }
        };

        loadAudio();

        return () => {
            abortController.abort();
            stopAudioSource();
        };
    }, [selectedTrack, stopAudioSource]);

    // Volume Effect
    useEffect(() => {
        if (gainNodeRef.current) {
            gainNodeRef.current.gain.value = volume;
        }
    }, [volume]);

    // Animation Loop
    useEffect(() => {
        const animate = () => {
            if (isPlaying && audioCtxRef.current) {
                const now = audioCtxRef.current.currentTime;
                // Calculate current track time
                let current = now - startTimeRef.current;

                // Check for end of track
                if (duration > 0 && current >= duration) {
                    stopAudioSource();
                    pauseOffsetRef.current = 0;
                    current = 0;
                    setIsPlaying(false);
                }

                setCurrentTime(current);

                if (progressLineRef.current) {
                    const dur = duration || 1;
                    progressLineRef.current.style.left = `${Math.min((current / dur) * 100, 100)}%`;
                }
            }
            rafRef.current = requestAnimationFrame(animate);
        };

        if (isPlaying) {
            rafRef.current = requestAnimationFrame(animate);
        } else {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            // Even when paused, we might want to ensure the visual indicator stays at the pause position
            // But state currentTime usually handles this.
        }

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [isPlaying, duration, stopAudioSource]);


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
        const rawDataR = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : rawDataL;

        // Use float step for precise alignment over long durations
        const step = rawDataL.length / width;
        const amp = height / 2;

        ctx.fillStyle = '#A855F7'; // Purple-500
        ctx.beginPath();

        for (let i = 0; i < width; i++) {
            let min = 1.0;
            let max = -1.0;

            const startIdx = Math.floor(i * step);
            const endIdx = Math.floor((i + 1) * step);

            // Prevent infinite loop if step is < 1 (zoomed in extremely, though here width < samples usually)
            // But usually samples >> width.

            for (let j = startIdx; j < endIdx && j < rawDataL.length; j++) {
                const valL = rawDataL[j];
                const valR = rawDataR[j];

                // Check extrema independently to avoid phase cancellation (L + -L = 0)
                if (valL < min) min = valL;
                if (valL > max) max = valL;
                if (valR < min) min = valR;
                if (valR > max) max = valR;
            }

            // If no samples in bucket (shouldn't happen with step >= 1), draw flat
            if (min > max) { min = 0; max = 0; }

            ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
        }
    };

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!duration) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const progress = Math.max(0, Math.min(1, x / rect.width));
        const seekTime = duration * progress;

        // Apply seek
        const wasPlaying = isPlaying;
        if (isPlaying) {
            stopAudioSource();
        }

        pauseOffsetRef.current = seekTime;
        setCurrentTime(seekTime);

        // Update visual immediately
        if (progressLineRef.current) {
            progressLineRef.current.style.left = `${progress * 100}%`;
        }

        if (wasPlaying) {
            playAudio();
        }
    };

    const togglePlay = () => {
        if (isPlaying) pauseAudio();
        else playAudio();
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
            <div className={`sticky top-20 z-50 relative w-full h-64 bg-black/60 backdrop-blur-xl rounded-xl overflow-hidden border border-white/10 shadow-2xl transition-all duration-500 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>

                {/* Visualizer Canvas */}
                <div ref={containerRef} className="absolute inset-0 w-full h-full flex items-center justify-center">
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
                </div>

                {/* Progress Overlay Line */}
                {!isLoading && (
                    <div
                        ref={progressLineRef}
                        className="absolute top-0 bottom-0 w-0.5 bg-white z-10 pointer-events-none"
                        style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                    />
                )}

                {/* Controls Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent z-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={togglePlay}
                            disabled={isLoading}
                            className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50"
                        >
                            {isPlaying ? <Pause fill="currentColor" /> : <Play fill="currentColor" className="ml-1" />}
                        </button>

                        <div className="flex flex-col">
                            <span className="text-white font-medium text-lg leading-tight capitalize">
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
                            className="w-24 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                        />
                    </div>
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
