
"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Plus, Check } from "lucide-react";
import { searchJams, saveJam } from "@/app/actions";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

interface Video {
    id: number;
    title?: string;
    first_name?: string;
    last_name?: string;
    created_at: string;
    is_saved?: boolean;
}

export default function JamSearch() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Video[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const router = useRouter();
    const containerRef = useRef<HTMLDivElement>(null);

    // Click Outside Listener
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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
            setResults(res);
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

    return (
        <div ref={containerRef} className="w-full max-w-2xl mx-auto mb-8">
            <form onSubmit={handleSearch} className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search for jams by title or user..."
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

            {isExpanded && results.length > 0 && (
                <div className="mt-4 bg-black/40 border border-white/10 rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="p-3 border-b border-white/5 flex justify-between items-center">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Search Results</span>
                        <button onClick={() => setIsExpanded(false)} className="text-xs text-muted-foreground hover:text-white">Close</button>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                        {results.map((video) => (
                            <div key={video.id} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                                <div className="flex flex-col gap-1">
                                    <span className="font-medium text-white">{video.title || "Untitled Jam"}</span>
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
                                        Add to Library
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {isExpanded && results.length === 0 && !isSearching && (
                <div className="mt-2 text-center text-sm text-muted-foreground py-4">
                    No approved jams found matching &quot;{query}&quot;
                </div>
            )}
        </div>
    );
}
