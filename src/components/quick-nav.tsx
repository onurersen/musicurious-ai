"use client";

import { useEffect, useState } from "react";
import { Music2, Scissors, Network, Disc, ExternalLink } from "lucide-react";

export function QuickNav({ youtubeUrl, initialSectionCount = 0, initialChordsCount = 0 }: { youtubeUrl?: string | null, initialSectionCount?: number, initialChordsCount?: number }) {
    const [activeSection, setActiveSection] = useState<string>('track-section');
    const [sectionCount, setSectionCount] = useState(initialSectionCount);
    const [chordsCount, setChordsCount] = useState(initialChordsCount);

    useEffect(() => {
        const handleSectionsUpdate = (e: CustomEvent) => {
            if (e.detail && typeof e.detail.count === 'number') {
                setSectionCount(e.detail.count);
            }
        };

        const handleChordsUpdate = (e: CustomEvent) => {
            if (e.detail && typeof e.detail.count === 'number') {
                setChordsCount(e.detail.count);
            }
        };

        window.addEventListener('musicurious:sections-update', handleSectionsUpdate as EventListener);
        window.addEventListener('musicurious:chords-update', handleChordsUpdate as EventListener);
        return () => {
            window.removeEventListener('musicurious:sections-update', handleSectionsUpdate as EventListener);
            window.removeEventListener('musicurious:chords-update', handleChordsUpdate as EventListener);
        };
    }, []);

    const scrollTo = (id: string) => {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setActiveSection(id); // Immediate visual feedback
        }
    };

    // Highlight active section on scroll
    useEffect(() => {
        const handleScroll = () => {
            const sections = ['musical-flow-canvas', 'extracted-sections', 'chords-display', 'track-section'];

            // Logic: Find the first section (from bottom up) that has its top edge *fully visible* or above a threshold
            // Or simpler: Find the section that is closest to the top of the viewport

            for (const id of sections) {
                const el = document.getElementById(id);
                if (el) {
                    const rect = el.getBoundingClientRect();
                    // If the top of the section is within the top half of the screen
                    // OR if the bottom of the section is substantially in view

                    // Specific logic: 
                    // As we scroll down, 'track-section' goes negative top. 
                    // 'chords-display' approaches 0 top.

                    // We check from Bottom to Top.
                    // If an element's top is less than (window.innerHeight / 2), it's likely the one we are focusing on,
                    // provided we iterate bottom-up.

                    // Example: 
                    // Canvas (bottom) is at top=600 (below). Ignore.
                    // Sections is at top=400. Ignore? from bottom logic:

                    // Let's use standard spy: 
                    // Active is the one with (rect.top <= offset) with the largest rect.top

                    const offset = window.innerHeight * 0.4; // 40% down the screen

                    if (rect.top < offset) {
                        setActiveSection(id);
                        return; // Break because we found the "lowest" element that has crossed our threshold
                    }
                }
            }

            // If nothing matched (everything is below offset), default to track-section
            setActiveSection('track-section');
        };

        window.addEventListener('scroll', handleScroll);
        // Initial check
        handleScroll();

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const buttonClass = (id: string) => `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${activeSection === id ? 'bg-purple-500 text-white shadow-md' : 'text-muted-foreground hover:text-white hover:bg-white/10'
        }`;

    return (
        <div className="flex items-center justify-center gap-2 py-2 sticky top-4 z-[60] pointer-events-none">
            <div className="flex items-center gap-1 p-1.5 rounded-full bg-[#121212]/80 backdrop-blur-md border border-white/10 pointer-events-auto shadow-2xl ring-1 ring-white/5">
                <button
                    onClick={() => scrollTo('track-section')}
                    className={buttonClass('track-section')}
                >
                    <Disc size={12} />
                    Track
                </button>
                <div className="w-px h-3 bg-white/10 mx-1" />
                <button
                    onClick={() => chordsCount > 0 && scrollTo('chords-display')}
                    disabled={chordsCount === 0}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${activeSection === 'chords-display'
                            ? 'bg-purple-500 text-white shadow-md'
                            : chordsCount === 0
                                ? 'text-muted-foreground/30 cursor-not-allowed'
                                : 'text-muted-foreground hover:text-white hover:bg-white/10'
                        }`}
                >
                    <Music2 size={12} />
                    Chords
                </button>
                <div className="w-px h-3 bg-white/10 mx-1" />
                <button
                    onClick={() => sectionCount > 0 && scrollTo('extracted-sections')}
                    disabled={sectionCount === 0}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${activeSection === 'extracted-sections'
                        ? 'bg-purple-500 text-white shadow-md'
                        : sectionCount === 0
                            ? 'text-muted-foreground/30 cursor-not-allowed'
                            : 'text-muted-foreground hover:text-white hover:bg-white/10'
                        }`}
                >
                    <Scissors size={12} />
                    Sections
                </button>
                <div className="w-px h-3 bg-white/10 mx-1" />
                <button
                    onClick={() => scrollTo('musical-flow-canvas')}
                    className={buttonClass('musical-flow-canvas')}
                >
                    <Network size={12} />
                    Musical Flow
                </button>

                {youtubeUrl && (
                    <>
                        <div className="w-px h-3 bg-white/10 mx-1" />
                        <a
                            href={youtubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => typeof window !== 'undefined' && window.dispatchEvent(new CustomEvent('musicurious:pause-playback'))}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all text-red-400 hover:text-red-300 hover:bg-white/10"
                        >
                            <ExternalLink size={12} />
                            Watch on Youtube
                        </a>
                    </>
                )}
            </div>
        </div>
    );
}
