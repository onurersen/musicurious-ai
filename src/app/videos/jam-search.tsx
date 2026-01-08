"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Plus, Check, ArrowRight } from "lucide-react";
import { searchJams, saveJam } from "@/app/actions";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { RequestJamModal } from "@/components/request-jam-modal";

interface Video {
    id: number;
    title?: string;
    first_name?: string;
    last_name?: string;
    created_at: string;
    is_saved?: boolean;
    youtube_url?: string;
}

export default function JamSearch() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Video[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const router = useRouter();
    const containerRef = useRef<HTMLDivElement>(null);

    // Click Outside Listener
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                // Don't close if we are clicking inside the modal (handled by modal overlay)
                // Actually modal is usually portal or separate layer.
                setIsExpanded(false);
            }
        }

        if (isExpanded) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isExpanded]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsSearching(true);
        try {
            const res = await searchJams(query);
            // Cast or ensure youtube_url exists. In actions.ts it does select v.*
            setResults(res as unknown as Video[]);
            setIsExpanded(true);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSave = async (videoId: number) => {
        try {
            await saveJam(videoId);
            setResults(prev => prev.map(v =>
                v.id === videoId ? { ...v, is_saved: true } : v
            ));
            router.refresh();
        } catch (error) {
            console.error(error);
        }
    };

    // Helper to get thumbnail
    const getThumbnailUrl = (url?: string) => {
        if (!url) return null;
        try {
            const pattern = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
            const match = url.match(pattern);
            return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null;
        } catch {
            return null;
        }
    };

    return (
        <div ref={containerRef} className="w-full max-w-2xl mx-auto mb-8 relative z-30">
            <form onSubmit={handleSearch} className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search for jams..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-purple-500 transition-colors pl-11"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <button
                    type="submit"
                    disabled={isSearching || !query.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-purple-600 hover:bg-purple-500 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                >
                    {isSearching ? "Searching..." : "Find Jams"}
                </button>
            </form>

            <RequestJamModal isOpen={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} />

            {isExpanded && (
                <div className="mt-4 bg-black/90 border border-white/10 rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-2 backdrop-blur-md">
                    <div className="p-3 border-b border-white/5 flex justify-between items-center bg-white/5">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            {results.length > 0 ? "Search Results" : "No Results Found"}
                        </span>
                        <button onClick={() => setIsExpanded(false)} className="text-xs text-muted-foreground hover:text-white">Close</button>
                    </div>

                    {results.length > 0 ? (
                        <>
                            <div className="max-h-[300px] overflow-y-auto">
                                {results.map((video) => {
                                    const thumb = getThumbnailUrl(video.youtube_url);
                                    return (
                                        <div key={video.id} className="flex items-center gap-4 p-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 group">
                                            {thumb ? (
                                                <div className="relative w-24 h-14 rounded bg-black/50 overflow-hidden flex-shrink-0 border border-white/10">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={thumb} alt="thumb" className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className="w-24 h-14 rounded bg-white/5 flex items-center justify-center flex-shrink-0">
                                                    <div className="w-8 h-8 rounded-full bg-white/10" />
                                                </div>
                                            )}

                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-medium text-white truncate text-sm group-hover:text-purple-400 transition-colors">{video.title || "Untitled Jam"}</h4>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span>by {video.first_name} {video.last_name}</span>
                                                    <span>•</span>
                                                    <span>{formatDistanceToNow(new Date(video.created_at))} ago</span>
                                                </div>
                                            </div>

                                            {video.is_saved ? (
                                                <button disabled className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-xs font-bold cursor-default">
                                                    <Check size={14} />
                                                    Saved
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleSave(video.id)}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-colors"
                                                >
                                                    <Plus size={14} />
                                                    Add
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="p-3 bg-white/5 text-center border-t border-white/10">
                                <button
                                    onClick={() => { setIsRequestModalOpen(true); setIsExpanded(false); }}
                                    className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center justify-center gap-1 mx-auto transition-colors"
                                >
                                    Don&apos;t see what you&apos;re looking for? Request a new Jam <ArrowRight size={12} />
                                </button>
                            </div>
                        </>
                    ) : (
                        !isSearching && (
                            <div className="p-8 text-center flex flex-col items-center gap-3">
                                <p className="text-sm text-muted-foreground">
                                    We couldn&apos;t find any jams matching &quot;{query}&quot;.
                                </p>
                                <button
                                    onClick={() => { setIsRequestModalOpen(true); setIsExpanded(false); }}
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                                >
                                    <Plus size={16} />
                                    Request This Jam
                                </button>
                            </div>
                        )
                    )}
                </div>
            )}
        </div>
    );
}
