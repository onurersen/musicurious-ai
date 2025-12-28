"use client";

import { updateVideoApproval, getVideoStatus } from "@/app/actions";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, X } from "lucide-react";
import { createPortal } from "react-dom";

export function VideoRow({ video }: { video: any }) {
    const [loading, setLoading] = useState(false);
    const [showRejectConfirm, setShowRejectConfirm] = useState(false);
    const [showRemoveStemsConfirm, setShowRemoveStemsConfirm] = useState(false);
    const [progress, setProgress] = useState(video.processing_progress || 0);
    const [procStatus, setProcStatus] = useState<string>(video.processing_status);
    const router = useRouter();

    // ... (useEffect hooks remain same)

    // Sync state if prop changes (e.g. after refresh)
    useEffect(() => {
        setProgress(video.processing_progress || 0);
        setProcStatus(video.processing_status);
    }, [video.processing_progress, video.processing_status]);

    // Poll status if processing
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (procStatus === 'processing' || procStatus === 'pending_processing') {
            interval = setInterval(async () => {
                const statusData = await getVideoStatus(video.id);
                if (statusData) {
                    setProgress(statusData.processing_progress);
                    setProcStatus(statusData.processing_status);

                    if (statusData.processing_status === 'completed' || statusData.processing_status === 'failed') {
                        router.refresh();
                    }
                }
            }, 2000); // Poll every 2 seconds
        }
        return () => clearInterval(interval);
    }, [procStatus, video.id, router]);


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

    const handleRemoveStems = async () => {
        setLoading(true);
        try {
            const { removeStems } = await import("@/app/actions");
            const res = await removeStems(video.id);
            if (!res.success) throw new Error(res.error);
            router.refresh();
            setShowRemoveStemsConfirm(false);
        } catch (e: any) {
            alert("Removal failed: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <tr className="group hover:bg-white/5 transition-colors">
            {/* Same columns 1-3 ... */}
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
                <div className="flex flex-col gap-2">
                    {/* Processing Status Display */}
                    {(procStatus === 'pending_processing' || (procStatus === 'processing' && progress < 100)) && (
                        <div className="flex flex-col gap-1 w-full max-w-[140px]">
                            <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                                <span>Processing</span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Controls */}
                    {(procStatus === 'completed' || (procStatus === 'processing' && progress >= 100)) ? (
                        <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 w-fit">
                                Processed
                            </span>
                            <button
                                className="text-xs text-primary hover:text-primary/80 transition-colors text-left"
                                onClick={async () => {
                                    setLoading(true);
                                    try {
                                        const fd = new FormData();
                                        fd.append('videoId', video.id.toString());
                                        const res = await fetch('/api/admin/transfer-stems', { method: 'POST', body: fd });
                                        if (!res.ok) throw new Error(await res.text());
                                        alert("Stems transferred successfully!");
                                        router.refresh();
                                    } catch (e: any) {
                                        alert("Transfer failed: " + e.message);
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                disabled={loading}
                            >
                                {loading ? "Transferring..." : "Transfer Stems"}
                            </button>
                            <button
                                className="text-xs text-red-400 hover:text-red-300 transition-colors text-left"
                                onClick={() => setShowRemoveStemsConfirm(true)}
                                disabled={loading}
                            >
                                Remove Stems
                            </button>
                        </div>
                    ) : procStatus === 'failed' ? (
                        <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300 w-fit">
                                Failed
                            </span>
                            <ProcessingUploadButton videoId={video.id} onUploadStart={() => router.refresh()} />
                        </div>
                    ) : procStatus === 'processing' ? (
                        <span className="text-xs text-muted-foreground animate-pulse">
                            Demucs Running...
                        </span>
                    ) : (
                        <ProcessingUploadButton videoId={video.id} onUploadStart={() => router.refresh()} />
                    )}
                </div>
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

                    {/* Reject Confirmation Modal */}
                    {showRejectConfirm && typeof document !== 'undefined' && createPortal(
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                            <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl max-w-sm w-full p-6 relative animate-in zoom-in-95 duration-200 text-left">
                                <div className="absolute top-4 right-4">
                                    <button
                                        onClick={() => setShowRejectConfirm(false)}
                                        className="text-muted-foreground hover:text-white transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

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

                    {/* Remove Stems Confirmation Modal */}
                    {showRemoveStemsConfirm && typeof document !== 'undefined' && createPortal(
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                            <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl max-w-sm w-full p-6 relative animate-in zoom-in-95 duration-200 text-left">
                                <div className="absolute top-4 right-4">
                                    <button
                                        onClick={() => setShowRemoveStemsConfirm(false)}
                                        className="text-muted-foreground hover:text-white transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="flex flex-col items-center text-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
                                        <AlertTriangle size={24} />
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-2">Remove Stems?</h3>
                                        <p className="text-muted-foreground text-sm">
                                            Are you sure you want to remove the separated stems AND the specific audio file uploaded for this video? This will revert the processing status to 'Pending' so you can re-upload/re-process.
                                        </p>
                                    </div>

                                    <div className="flex gap-3 w-full mt-2">
                                        <button
                                            onClick={() => setShowRemoveStemsConfirm(false)}
                                            className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors border border-white/5"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleRemoveStems}
                                            disabled={loading}
                                            className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-medium transition-colors shadow-lg shadow-orange-500/20"
                                        >
                                            {loading ? "Removing..." : "Yes, Remove"}
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

function ProcessingUploadButton({ videoId, onUploadStart }: { videoId: number, onUploadStart: () => void }) {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        // Clear value so same file can be selected again if needed
        e.target.value = '';

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('videoId', videoId.toString());

            const res = await fetch('/api/admin/process-audio', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || 'Upload failed');
            }

            // Immediately refresh to show processing state
            onUploadStart();
            // alert("Processing started!"); // Removed alert as polling will likely show it
        } catch (err: any) {
            console.error("Upload error:", err);
            alert(`Failed to start processing: ${err.message}`);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="relative">
            <input
                type="file"
                accept=".mp3,.wav,.m4a" // Restrict types
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
                disabled={uploading}
            />
            <button
                onClick={handleButtonClick}
                disabled={uploading}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 hover:text-white border border-blue-600/30 text-blue-400 text-xs font-semibold cursor-pointer transition-all ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
            >
                {uploading ? 'Uploading...' : 'Start Processing'}
            </button>
        </div>
    );
}
