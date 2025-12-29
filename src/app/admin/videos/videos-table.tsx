"use client";

import { useState } from 'react';
import { Search } from 'lucide-react';
import { VideoRow } from './video-row';
import { Video } from '@/app/actions';

interface VideosTableProps {
    videos: Video[];
    isDev: boolean;
}

export function VideosTable({ videos, isDev }: VideosTableProps) {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredVideos = videos.filter(video => {
        if (searchQuery.length < 2) return true;

        const query = searchQuery.toLowerCase();
        const title = (video.title || "").toLowerCase();
        const email = (video.user_email || "").toLowerCase();
        const name = `${video.first_name || ""} ${video.last_name || ""}`.toLowerCase();

        return title.includes(query) || email.includes(query) || name.includes(query);
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="relative group w-full sm:w-80">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search submissions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl leading-5 bg-opacity-20 text-white placeholder-gray-400 focus:outline-none focus:bg-white/10 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm transition-all duration-300"
                    />
                </div>
                <div className="text-sm text-muted-foreground bg-white/5 px-4 py-2 rounded-full border border-white/10">
                    Showing {filteredVideos.length} of {videos.length} Submissions
                </div>
            </div>

            <div className="glass-panel overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-white/5 font-semibold tracking-wider backdrop-blur-sm">
                            <tr>
                                <th className="p-5 font-bold">Submitted</th>
                                <th className="p-5 font-bold">User</th>
                                <th className="p-5 font-bold">Link</th>
                                <th className="p-5 font-bold">Processing</th>
                                <th className="p-5 font-bold">Approval</th>
                                <th className="p-5 font-bold">Review</th>
                                {isDev && <th className="p-5 font-bold">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredVideos.map((video) => (
                                <VideoRow key={video.id} video={video} isDev={isDev} />
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredVideos.length === 0 && (
                    <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-2">
                        <div className="bg-white/5 p-4 rounded-full mb-2">📂</div>
                        <p>{searchQuery ? `No videos found matching "${searchQuery}"` : "No submissions found."}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
