"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';

interface Video {
    id: number;
    youtube_url: string;
    title?: string;
    status: string;
    created_at: string;
    approval_status?: string;
    user_email?: string;
    first_name?: string;
    last_name?: string;
}

function extractVideoId(url: string) {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/.*v=|shorts\/)([\w-]{11})/);
    return match ? match[1] : null;
}

export default function VideoGallery({ videos, isAdmin }: { videos: Video[], isAdmin: boolean }) {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredVideos = videos.filter(video => {
        if (searchQuery.length < 2) return true;
        const title = video.title || "";
        return title.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight mb-2">
                        Submissions <span className="gradient-text">Gallery</span>
                    </h1>
                    <p className="text-muted-foreground">
                        Browse and explore extracted musical jams.
                    </p>
                </div>

                <div className="flex w-full md:w-auto items-center gap-4">
                    <div className="relative group w-full md:w-64">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search videos..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl leading-5 bg-opacity-20 text-white placeholder-gray-400 focus:outline-none focus:bg-white/10 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm transition-all duration-300"
                        />
                    </div>

                    <Link href="/" className="whitespace-nowrap px-6 py-2.5 bg-primary hover:bg-primary/90 rounded-xl transition-all shadow-lg shadow-primary/20 text-sm font-bold text-white">
                        + New
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {filteredVideos.map((video) => (
                    <div key={video.id} className="group glass-panel rounded-2xl overflow-hidden hover:scale-[1.02] transition-all duration-300 shadow-2xl hover:shadow-primary/10">
                        <div className="aspect-video bg-black/40 relative overflow-hidden">
                            <img
                                src={`https://img.youtube.com/vi/${extractVideoId(video.youtube_url)}/maxresdefault.jpg`}
                                alt="Thumbnail"
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                            />

                            {/* Status Badges */}
                            <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
                                <span className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider backdrop-blur-md border border-white/10 ${video.status === 'completed' ? 'bg-green-500/20 text-green-200' : 'bg-blue-500/20 text-blue-200'
                                    }`}>
                                    {video.status === 'completed' ? 'Ready' : (isAdmin ? 'Requested' : 'Processing')}
                                </span>

                                {(isAdmin || video.approval_status === 'pending') && (
                                    <span className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider backdrop-blur-md border border-white/10 ${video.approval_status === 'approved' ? 'bg-emerald-500/80 text-white' :
                                        video.approval_status === 'rejected' ? 'bg-red-500/80 text-white' : 'bg-yellow-500/80 text-white'
                                        }`}>
                                        {video.approval_status === 'pending' ? 'In Review' : video.approval_status}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="p-5 flex flex-col gap-3">
                            <div>
                                <h3 className="font-bold text-lg leading-tight line-clamp-2 mb-1 text-white/90 group-hover:text-primary transition-colors">
                                    {video.title || "Processing Video..."}
                                </h3>
                                <p className="text-xs text-muted-foreground font-medium">
                                    {new Date(video.created_at).toLocaleDateString(undefined, {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                            </div>

                            {isAdmin && video.user_email && (
                                <div className="text-xs p-3 rounded-lg bg-white/5 border border-white/5 space-y-1">
                                    <div className="text-muted-foreground uppercase tracking-widest text-[10px]">Submitted By</div>
                                    <div className="font-medium text-white max-w-full truncate" title={video.user_email}>
                                        {video.first_name} {video.last_name || video.user_email.split('@')[0]}
                                    </div>
                                </div>
                            )}

                            <div className="mt-auto pt-2">
                                {video.status === 'completed' ? (
                                    <Link href={`#`} className="block w-full py-3 bg-white/5 hover:bg-primary hover:text-white text-center rounded-xl transition-all duration-300 font-semibold text-sm">
                                        View Session
                                    </Link>
                                ) : isAdmin ? (
                                    video.approval_status === 'pending' ? (
                                        <Link href={`/admin/videos`} className="block w-full py-3 bg-yellow-500/20 hover:bg-yellow-500 hover:text-white text-yellow-300 text-center rounded-xl transition-all duration-300 font-semibold text-sm border border-yellow-500/30">
                                            Waiting Approval
                                        </Link>
                                    ) : (
                                        <Link href={`#`} className="block w-full py-3 bg-blue-500/20 hover:bg-blue-500 hover:text-white text-blue-300 text-center rounded-xl transition-all duration-300 font-semibold text-sm border border-blue-500/30">
                                            Start Processing
                                        </Link>
                                    )
                                ) : (
                                    video.approval_status === 'pending' ? (
                                        <div className="block w-full py-3 bg-white/5 text-muted-foreground text-center rounded-xl font-medium text-sm opacity-50 cursor-not-allowed">
                                            Waiting Approval
                                        </div>
                                    ) : (
                                        <div className="block w-full py-3 bg-white/5 text-muted-foreground text-center rounded-xl font-medium text-sm opacity-50 cursor-not-allowed">
                                            Processing...
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {filteredVideos.length === 0 && searchQuery.length > 0 && (
                    <div className="col-span-full py-20 text-center text-muted-foreground">
                        <p className="text-lg">No videos found matching "{searchQuery}"</p>
                        <button onClick={() => setSearchQuery("")} className="mt-2 text-primary hover:underline">Clear Search</button>
                    </div>
                )}

                {videos.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-32 text-center text-muted-foreground glass-panel rounded-3xl">
                        <div className="text-6xl mb-4">🎵</div>
                        <h3 className="text-2xl font-bold text-white mb-2">No Videos Yet</h3>
                        <p className="max-w-md mx-auto mb-8">Submit your favorite music video to start extracting stems and generating chords.</p>
                        <Link href="/" className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors">
                            Make a Submission
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
