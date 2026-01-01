"use client";

import { useEffect, useRef, useState } from 'react';
import { Howl } from 'howler';
import { Play, Pause, SkipBack, SkipForward, Loader2 } from 'lucide-react';
import { Stem } from '@/app/actions';

interface JamPlayerProps {
    stems: Stem[];
    title: string;
    youtubeUrl?: string;
}

export default function JamPlayer({ stems, title, youtubeUrl }: JamPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [activeMix, setActiveMix] = useState<'original' | 'no-vocals' | 'no-drums' | 'no-bass' | 'no-guitar' | 'no-piano'>('original');

    // Refs to hold Howl instances
    const howlRefs = useRef<{ [key: string]: Howl }>({});
    const requestRef = useRef<number>(0);

    // Filter stems: We only want raw components for the interactive player.
    // The "no_*" stems are for download/export only.
    const rawStemTypes = ['vocals', 'drums', 'bass', 'guitar', 'piano', 'other'];
    const playbackStems = stems.filter(s => rawStemTypes.includes(s.type));
    const mixStems = stems.filter(s => s.type.startsWith('no_'));

    // Identify available raw stems (for buttons)
    const availableStems = playbackStems.map(s => s.type);
    const hasVocals = availableStems.includes('vocals');
    const hasDrums = availableStems.includes('drums');
    const hasBass = availableStems.includes('bass');
    const hasGuitar = availableStems.includes('guitar');
    const hasPiano = availableStems.includes('piano');

    useEffect(() => {
        // Initialize Howls
        let loadedCount = 0;
        const totalStems = playbackStems.length;

        if (totalStems === 0) {
            setIsLoading(false);
            return;
        }

        playbackStems.forEach(stem => {
            if (howlRefs.current[stem.type]) return; // Already initialized

            const sound = new Howl({
                src: [stem.blob_url],
                html5: true, // Use HTML5 Audio for large files
                preload: true,
                onload: () => {
                    loadedCount++;
                    if (loadedCount === totalStems) {
                        setIsLoading(false);
                        setDuration(sound.duration());
                    }
                },
                onend: () => {
                    // When one ends, they all should end roughly together
                    // We only drive state from one "master" or just check playing
                    if (stem.type === 'other' || stem.type === playbackStems[0].type) {
                        setIsPlaying(false);
                        setProgress(0);
                    }
                }
            });
            howlRefs.current[stem.type] = sound;
        });

        const refs = howlRefs.current;
        return () => {
            // Cleanup on unmount
            Object.values(refs).forEach(h => h.unload());
        };
    }, [playbackStems]);

    // Handle Mix Switching
    useEffect(() => {
        const howls = howlRefs.current;

        // Mute/Unmute logic based on activeMix
        Object.keys(howls).forEach(type => {
            const h = howls[type];
            let shouldMute = false;

            if (activeMix === 'no-vocals' && type === 'vocals') shouldMute = true;
            if (activeMix === 'no-drums' && type === 'drums') shouldMute = true;
            if (activeMix === 'no-bass' && type === 'bass') shouldMute = true;
            if (activeMix === 'no-guitar' && type === 'guitar') shouldMute = true;
            if (activeMix === 'no-piano' && type === 'piano') shouldMute = true;

            h.mute(shouldMute);
        });

    }, [activeMix]);

    const togglePlay = () => {
        const howls = Object.values(howlRefs.current);
        if (isPlaying) {
            howls.forEach(h => h.pause());
        } else {
            // Sync play
            // Ensure they are all at the same time?
            // Usually play() handles resume nicely.
            // For strict sync, we might need to seek them all to the same time before play.
            const cursor = howls[0]?.seek() || 0;
            howls.forEach(h => {
                h.seek(cursor);
                h.play();
            });
        }
        setIsPlaying(!isPlaying);
    };

    // Animation Loop for Progress
    useEffect(() => {
        const animate = () => {
            if (isPlaying) {
                // Use the first available stem as timekeeper
                const firstType = playbackStems[0]?.type;
                if (firstType && howlRefs.current[firstType]) {
                    const seek = howlRefs.current[firstType].seek();
                    if (typeof seek === 'number') {
                        setProgress(seek);
                    }
                }
                requestRef.current = requestAnimationFrame(animate);
            }
        };

        if (isPlaying) {
            requestRef.current = requestAnimationFrame(animate);
        } else {
            cancelAnimationFrame(requestRef.current);
        }

        return () => cancelAnimationFrame(requestRef.current);
    }, [isPlaying, playbackStems]);


    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTime = parseFloat(e.target.value);
        setProgress(newTime);
        Object.values(howlRefs.current).forEach(h => h.seek(newTime));
    };

    const formatTime = (secs: number) => {
        const minutes = Math.floor(secs / 60);
        const seconds = Math.floor(secs % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    return (
        <div className="w-full glass-panel p-6 rounded-2xl shadow-xl border border-white/10">
            <h2 className="text-2xl font-bold mb-1">{title}</h2>
            {youtubeUrl && (
                <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline mb-4 block">
                    Watch on YouTube
                </a>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="flex items-center justify-center p-10">
                    <Loader2 className="animate-spin text-primary h-8 w-8" />
                    <span className="ml-3 text-muted-foreground">Loading stems...</span>
                </div>
            )}

            {!isLoading && (
                <>
                    {/* Visualizer / Waveform Placeholder */}
                    <div className="h-32 bg-black/40 rounded-xl mb-6 flex items-center justify-center border border-white/5">
                        <span className="text-xs text-muted-foreground uppercase tracking-widest">Audio Visualizer Placeholder</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1 font-mono">
                            <span>{formatTime(progress)}</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max={duration || 100}
                            value={progress}
                            onChange={handleSeek}
                            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary hover:accent-primary/80 transition-all"
                        />
                    </div>

                    {/* Controls */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        {/* Playback Controls */}
                        <div className="flex items-center gap-4">
                            <button className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white">
                                <SkipBack className="h-6 w-6" />
                            </button>
                            <button
                                onClick={togglePlay}
                                className="p-4 bg-primary hover:bg-primary/90 text-white rounded-full transition-all shadow-lg hover:shadow-primary/25 hover:scale-105 active:scale-95"
                            >
                                {isPlaying ? <Pause className="h-8 w-8 fill-current" /> : <Play className="h-8 w-8 fill-current ml-1" />}
                            </button>
                            <button className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white">
                                <SkipForward className="h-6 w-6" />
                            </button>
                        </div>

                        {/* Mix Controls */}
                        <div className="flex flex-wrap gap-2 justify-center">
                            <button
                                onClick={() => setActiveMix('original')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border ${activeMix === 'original' ? 'bg-white text-black border-white' : 'bg-transparent text-white/70 border-white/10 hover:bg-white/5'}`}
                            >
                                Original
                            </button>
                            {hasVocals && (
                                <button
                                    onClick={() => setActiveMix('no-vocals')}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border ${activeMix === 'no-vocals' ? 'bg-primary text-white border-primary' : 'bg-transparent text-white/70 border-white/10 hover:bg-white/5'}`}
                                >
                                    No Vocals
                                </button>
                            )}
                            {hasDrums && (
                                <button
                                    onClick={() => setActiveMix('no-drums')}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border ${activeMix === 'no-drums' ? 'bg-primary text-white border-primary' : 'bg-transparent text-white/70 border-white/10 hover:bg-white/5'}`}
                                >
                                    No Drums
                                </button>
                            )}
                            {hasBass && (
                                <button
                                    onClick={() => setActiveMix('no-bass')}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border ${activeMix === 'no-bass' ? 'bg-primary text-white border-primary' : 'bg-transparent text-white/70 border-white/10 hover:bg-white/5'}`}
                                >
                                    No Bass
                                </button>
                            )}
                            {hasGuitar && (
                                <button
                                    onClick={() => setActiveMix('no-guitar')}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border ${activeMix === 'no-guitar' ? 'bg-primary text-white border-primary' : 'bg-transparent text-white/70 border-white/10 hover:bg-white/5'}`}
                                >
                                    No Guitar
                                </button>
                            )}
                            {hasPiano && (
                                <button
                                    onClick={() => setActiveMix('no-piano')}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border ${activeMix === 'no-piano' ? 'bg-primary text-white border-primary' : 'bg-transparent text-white/70 border-white/10 hover:bg-white/5'}`}
                                >
                                    No Keys
                                </button>
                            )}
                        </div>
                    </div>
                    {/* Downloads Section */}
                    {mixStems.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-white/10">
                            <h3 className="text-sm font-bold text-white/50 uppercase tracking-widest mb-4">Downloads</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {mixStems.map(stem => (
                                    <a
                                        key={stem.id}
                                        href={stem.blob_url}
                                        download
                                        className="flex items-center justify-center px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition-colors border border-white/5 hover:border-white/20"
                                    >
                                        <span className="capitalize">{stem.type.replace('no_', 'No ')}</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
