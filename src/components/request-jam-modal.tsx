"use client";

import { useState, useEffect } from "react";
import { Play, AlertCircle, X, Loader2 } from "lucide-react";
import { checkVideoCategory, createVideoRecord, getUserStatus } from "@/app/actions";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface RequestJamModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function RequestJamModal({ isOpen, onClose }: RequestJamModalProps) {
    const [url, setUrl] = useState("");
    const [title, setTitle] = useState("");
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [warning, setWarning] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isChecking, setIsChecking] = useState(false);

    // Warning States
    const [showNonMusicWarning, setShowNonMusicWarning] = useState(false);
    const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
    const [userStatus, setUserStatus] = useState<'pending' | 'approved' | 'blocked' | null>(null);

    const router = useRouter();

    useEffect(() => {
        if (isOpen) {
            // Reset state when opening
            setUrl("");
            setTitle("");
            setThumbnailUrl(null);
            setError("");
            setWarning("");
            setShowNonMusicWarning(false);
            setShowDuplicateWarning(false);

            // Check user status
            getUserStatus().then(setUserStatus);
        }
    }, [isOpen]);

    const validateYoutubeUrl = (url: string) => {
        const pattern = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]{11}(&.*)?$/;
        return pattern.test(url);
    };

    // Debounce or Atomic Fetch
    useEffect(() => {
        const fetchVideoDetails = async () => {
            if (!url || !validateYoutubeUrl(url)) {
                setTitle("");
                setThumbnailUrl(null);
                return;
            }

            setIsChecking(true);
            try {
                // We use checkVideoCategory to get details but we don't block submit yet
                // However, the tool said "atomically fetch the title and also little thumbnail"
                // This implies getting it before submit.
                const { title, thumbnailUrl, isMusic } = await checkVideoCategory(url);
                setTitle(title || "");
                setThumbnailUrl(thumbnailUrl || null);

                if (!isMusic) {
                    // We could warn here, but maybe wait for submit for the full warning flow
                    setWarning("This doesn't verify as a music video, but you can still try.");
                } else {
                    setWarning("");
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsChecking(false);
            }
        };

        const timer = setTimeout(() => {
            if (url) fetchVideoDetails();
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [url]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!validateYoutubeUrl(url)) {
            setError("Please enter a valid YouTube video URL");
            return;
        }

        if (userStatus !== 'approved') {
            setError("Your account is pending approval.");
            return;
        }

        setIsLoading(true);
        try {
            const { isMusic, title: fetchedTitle } = await checkVideoCategory(url);

            if (!isMusic && !showNonMusicWarning) {
                setShowNonMusicWarning(true);
                setIsLoading(false);
                return;
            }

            const result = await createVideoRecord(url, fetchedTitle || title);
            if (result.success) {
                onClose();
                router.push('/videos');
                router.refresh();
            } else {
                if (result.error === 'Duplicate submission') {
                    setShowDuplicateWarning(true);
                } else {
                    setError(result.error || "Failed to create request.");
                }
            }
        } catch (err) {
            console.error(err);
            setError("An unexpected error occurred.");
        }
        setIsLoading(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-zinc-950 w-full max-w-lg p-6 rounded-2xl border border-white/10 shadow-2xl relative animate-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <h2 className="text-2xl font-bold mb-6 gradient-text">Request New Jam</h2>

                {showDuplicateWarning ? (
                    <div className="flex flex-col gap-4 text-center py-4">
                        <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 mx-auto">
                            <AlertCircle size={24} />
                        </div>
                        <h3 className="text-xl font-bold">Already Exists</h3>
                        <p className="text-muted-foreground">This video is already in our library.</p>
                        <div className="flex gap-2 mt-2">
                            <button onClick={() => { onClose(); router.push('/videos'); }} className="flex-1 bg-primary text-white py-2 rounded-xl">Go to Jams</button>
                            <button onClick={() => setShowDuplicateWarning(false)} className="flex-1 bg-white/10 text-white py-2 rounded-xl">Back</button>
                        </div>
                    </div>
                ) : showNonMusicWarning ? (
                    <div className="flex flex-col gap-4 text-center py-4">
                        <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 mx-auto">
                            <AlertCircle size={24} />
                        </div>
                        <h3 className="text-xl font-bold">Start Request?</h3>
                        <p className="text-muted-foreground">This doesn't look like a music video. Continue anyway?</p>
                        <div className="flex gap-2 mt-2">
                            <button onClick={handleSubmit} className="flex-1 bg-primary text-white py-2 rounded-xl">Yes, Request</button>
                            <button onClick={() => setShowNonMusicWarning(false)} className="flex-1 bg-white/10 text-white py-2 rounded-xl">Cancel</button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                        <div className="space-y-2">
                            <label htmlFor="url" className="text-sm font-medium text-muted-foreground">YouTube URL</label>
                            <div className="relative">
                                <input
                                    id="url"
                                    type="text"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="https://youtube.com/watch?v=..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:border-primary transition-colors"
                                    autoFocus
                                />
                                {isChecking && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Preview */}
                        {(title || thumbnailUrl) && (
                            <div className="flex items-center gap-4 p-3 bg-white/5 rounded-xl border border-white/10">
                                {thumbnailUrl && (
                                    <div className="relative w-24 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-black">
                                        <img src={thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-sm truncate">{title}</h4>
                                    <p className="text-xs text-muted-foreground">Ready to request</p>
                                </div>
                            </div>
                        )}

                        {error && <p className="text-red-400 text-sm">{error}</p>}
                        {warning && <p className="text-yellow-500 text-sm">{warning}</p>}

                        <button
                            type="submit"
                            disabled={isLoading || !url || !title || isChecking}
                            className={cn(
                                "w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-primary to-secondary text-white shadow-lg hover:shadow-primary/25 transition-all text-sm flex items-center justify-center gap-2",
                                (isLoading || !url || !title || isChecking) && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                            Submit Request
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
