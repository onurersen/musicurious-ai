"use client";

import { useEffect, useState } from "react";
import { getUserLibrary, LibraryJam } from "@/app/actions";
import { encodeId } from "@/lib/id-obfuscation";
import Link from "next/link";
import { X, Play, Loader2, Calendar } from "lucide-react";

interface UserLibraryViewProps {
    userId: string;
    userName: string;
    onClose: () => void;
}

export function UserLibraryView({ userId, userName, onClose }: UserLibraryViewProps) {
    const [jams, setJams] = useState<LibraryJam[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        getUserLibrary(userId)
            .then((data) => {
                if (mounted) {
                    setJams(data);
                    setLoading(false);
                }
            })
            .catch((err) => {
                console.error(err);
                if (mounted) setLoading(false);
            });

        return () => { mounted = false; };
    }, [userId]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl relative overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
                    <h2 className="text-xl font-bold text-white">
                        {userName}&apos;s Library using Jam
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-muted-foreground hover:text-white"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 min-h-[300px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p>Loading library...</p>
                        </div>
                    ) : jams.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <p>No jams found in this user&apos;s library.</p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {jams.map((jam) => (
                                <div
                                    key={jam.id}
                                    className="group flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all duration-300"
                                >
                                    {/* Thumbnail / Icon */}
                                    <div className="h-12 w-12 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
                                        <Play className="h-5 w-5 text-indigo-400 group-hover:text-indigo-300 fill-current" />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-white truncate pr-4">
                                            {jam.title || "Untitled Jam"}
                                        </h3>
                                        <div className="flex items-center text-xs text-muted-foreground gap-3 mt-1">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                Added {new Date(jam.saved_at).toLocaleDateString()}
                                            </span>
                                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] uppercase font-medium border ${jam.approval_status === 'approved'
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                }`}>
                                                {jam.approval_status}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action */}
                                    <Link
                                        href={`/session/${encodeId(jam.id)}?viewAs=${userId}`}
                                        className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium transition-colors whitespace-nowrap"
                                    >
                                        View Session
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
