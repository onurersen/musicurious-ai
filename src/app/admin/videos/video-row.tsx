"use client";

import { updateVideoApproval } from "@/app/actions";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, X } from "lucide-react";
import { createPortal } from "react-dom";

export function VideoRow({ video }: { video: any }) {
    const [loading, setLoading] = useState(false);
    const [showRejectConfirm, setShowRejectConfirm] = useState(false);
    const router = useRouter();

    const handleUpdate = async (status: 'approved' | 'rejected') => {
        setLoading(true);
        try {
            await updateVideoApproval(video.id, status);
            router.refresh();
            setShowRejectConfirm(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <tr className="group hover:bg-white/5 transition-colors">
            <td className="p-4 text-muted-foreground whitespace-nowrap">
                <div className="flex flex-col gap-0.5">
                    <span suppressHydrationWarning className="text-white font-medium text-sm">{new Date(video.created_at).toLocaleDateString()}</span>
                    <span suppressHydrationWarning className="text-xs text-muted-foreground/70">{new Date(video.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            </td>
            <td className="p-4">
                <div className="flex flex-col">
                    <span className="font-medium text-white">{video.first_name} {video.last_name}</span>
                    <span className="text-xs text-muted-foreground">{video.user_email}</span>
                </div>
            </td>
            <td className="p-4 max-w-xs">
                <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-white truncate" title={video.title || "Untitled"}>
                        {video.title || "Untitled Jam"}
                    </span>
                    <a href={video.youtube_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate block opacity-80 hover:opacity-100" title={video.youtube_url}>
                        {video.youtube_url}
                    </a>
                </div>
            </td>
            <td className="p-4">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${video.status === 'completed' ? 'bg-blue-500/20 text-blue-300' : 'bg-white/10 text-muted-foreground'
                    }`}>
                    {video.status}
                </span>
            </td>
            <td className="p-4">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${video.approval_status === 'approved' ? 'bg-green-500/20 text-green-400' :
                    video.approval_status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                    }`}>
                    {video.approval_status}
                </span>
            </td>
            <td className="p-4">
                <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => handleUpdate('approved')}
                        disabled={loading || video.approval_status === 'approved'}
                        className="px-3 py-1.5 rounded-lg bg-green-600/20 hover:bg-green-600 hover:text-white border border-green-600/30 text-green-400 text-xs font-semibold disabled:opacity-30 disabled:pointer-events-none transition-all"
                    >
                        Approve
                    </button>
                    <button
                        onClick={() => setShowRejectConfirm(true)}
                        disabled={loading || video.approval_status === 'rejected'}
                        className="px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600 hover:text-white border border-red-600/30 text-red-400 text-xs font-semibold disabled:opacity-30 disabled:pointer-events-none transition-all"
                    >
                        Reject
                    </button>

                    {showRejectConfirm && typeof document !== 'undefined' && createPortal(
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                            <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl max-w-sm w-full p-6 relative animate-in zoom-in-95 duration-200 text-left">
                                <button
                                    onClick={() => setShowRejectConfirm(false)}
                                    className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>

                                <div className="flex flex-col items-center text-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                                        <AlertTriangle size={24} />
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-2">Reject Submission?</h3>
                                        <p className="text-muted-foreground text-sm">
                                            Are you sure you want to reject this video? This action cannot be undone and will remove the video permanently.
                                        </p>
                                    </div>

                                    <div className="flex gap-3 w-full mt-2">
                                        <button
                                            onClick={() => setShowRejectConfirm(false)}
                                            className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors border border-white/5"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => handleUpdate('rejected')}
                                            disabled={loading}
                                            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium transition-colors shadow-lg shadow-red-500/20"
                                        >
                                            {loading ? "Rejecting..." : "Yes, Reject"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>,
                        document.body
                    )}
                </div>
            </td>
        </tr>
    );
}
