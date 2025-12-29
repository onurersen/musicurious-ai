"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { Howl } from "howler";
import { Play, Pause, Loader2, Volume2, Music } from "lucide-react";

interface SessionTrack {
    name: string;
    url: string;
}

export function SessionPlayer({ tracks }: { tracks: SessionTrack[] }) {
    // Default to the first track or specifically 'no_vocals' if available?
    // Let's default to the first one for now.
    const [selectedTrack, setSelectedTrack] = useState<SessionTrack | null>(tracks.length > 0 ? tracks[0] : null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [volume, setVolume] = useState(0.8);

    const howlRef = useRef<Howl | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const progressLineRef = useRef<HTMLDivElement>(null);
    const bufferDurationRef = useRef<number>(0);
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

    useEffect(() => {
        if (!selectedTrack) return;

        // Cleanup previous
        if (howlRef.current) {
            howlRef.current.unload();
        }
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
        }

        setIsLoading(true);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);

        // Fetch Audio Buffer for Waveform
        const abortController = new AbortController();

        const loadAudio = async () => {
            try {
                const response = await fetch(selectedTrack.url, { signal: abortController.signal });
                const arrayBuffer = await response.arrayBuffer();

                // Create Blobs for Howler to avoid re-download
                const blob = new Blob([arrayBuffer], { type: 'audio/mp3' });
                const blobUrl = URL.createObjectURL(blob);

                // Draw Waveform first
                const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                // decodeAudioData detaches the buffer, so we slice it
                const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));

                // Use the decoded buffer duration as the source of truth
                const bufferDuration = audioBuffer.duration;
                setDuration(bufferDuration);
                bufferDurationRef.current = bufferDuration;

                drawWaveform(audioBuffer);

                // Initialize Howler
                const sound = new Howl({
                    src: [blobUrl],
                    format: ['mp3'],
                    html5: true,
                    volume: volume,
                    onload: () => {
                        // We strictly use the buffer duration derived from the full decode
                        // Howl's duration() might be an estimate for MP3s
                        setIsLoading(false);
                    },
                    onplay: () => {
                        setIsPlaying(true);
                    },
                    onpause: () => {
                        setIsPlaying(false);
                    },
                    onend: () => {
                        setIsPlaying(false);
                        setCurrentTime(0);
                    },
                    onseek: () => {
                        // Animation loop handles update
                    }
                });

                howlRef.current = sound;

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
            if (howlRef.current) {
                howlRef.current.unload();
            }
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, [selectedTrack]);

    // Animation Loop
    useEffect(() => {
        const animate = () => {
            if (howlRef.current && howlRef.current.playing()) {
                const seek = howlRef.current.seek();
                if (typeof seek === 'number') {
                    setCurrentTime(seek);

                    // Direct DOM update for smoothness and to fix "stuck" indicator
                    if (progressLineRef.current) {
                        // Use buffer duration if available for visual sync, fallback to Howl duration
                        const dur = bufferDurationRef.current || howlRef.current.duration();
                        if (dur > 0) {
                            progressLineRef.current.style.left = `${(seek / dur) * 100}%`;
                        }
                    }
                }
            }
            rafRef.current = requestAnimationFrame(animate);
        };

        if (isPlaying) {
            rafRef.current = requestAnimationFrame(animate);
        } else {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        }

        return () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, [isPlaying]);

    // Volume Effect
    useEffect(() => {
        if (howlRef.current) {
            howlRef.current.volume(volume);
        }
    }, [volume]);

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

        // Merge channels if stereo
        const rawDataL = buffer.getChannelData(0);
        const rawDataR = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : rawDataL;

        const step = Math.ceil(rawDataL.length / width);
        const amp = height / 2;

        ctx.fillStyle = '#A855F7'; // Purple-500
        ctx.beginPath();

        for (let i = 0; i < width; i++) {
            let min = 1.0;
            let max = -1.0;

            for (let j = 0; j < step; j++) {
                const idx = (i * step) + j;
                if (idx >= rawDataL.length) break;

                // Merge: Average or Max? Average is safer for visualization
                const valL = rawDataL[idx];
                const valR = rawDataR[idx];
                const val = (valL + valR) / 2;

                if (val < min) min = val;
                if (val > max) max = val;
            }

            ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
        }
    };

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!duration || !howlRef.current) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const progress = x / rect.width;

        const seekTime = duration * progress;
        howlRef.current.seek(seekTime);
        setCurrentTime(seekTime);
    };

    const togglePlay = () => {
        if (!howlRef.current) return;
        if (isPlaying) {
            howlRef.current.pause();
        } else {
            howlRef.current.play();
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
            <div className={`sticky top-20 z-50 relative w-full h-64 bg-black/60 backdrop-blur-xl rounded-xl overflow-hidden border border-white/10 shadow-2xl transition-all duration-500 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>

                {/* Visualizer Canvas */}
                <div ref={containerRef} className="absolute inset-0 w-full h-full flex items-center justify-center p-4">
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
                                            {/* Maybe a 'slash' icon or something to denote filter? standard music icon is fine for now but let's keep it consistent */}
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
