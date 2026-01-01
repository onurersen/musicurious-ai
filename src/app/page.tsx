"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Play, AlertCircle, Lock } from "lucide-react";
import { checkVideoCategory, createVideoRecord, getUserStatus } from "./actions";
import { SignedIn, SignedOut, SignUpButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function Home() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showApprovalWarning, setShowApprovalWarning] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [showNonMusicWarning, setShowNonMusicWarning] = useState(false);
  const [pendingVideo, setPendingVideo] = useState<{ url: string; title?: string } | null>(null);
  const [userStatus, setUserStatus] = useState<'pending' | 'approved' | 'blocked' | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check status on mount
    console.log("Checking user status...");
    getUserStatus()
      .then((status: 'pending' | 'approved' | 'blocked' | null) => {
        console.log("Received status:", status);
        // If status is null (e.g. server thinks logged out) but client is SignedIn,
        // we default to 'pending' (locked) to be safe and avoid hanging.
        setUserStatus(status || 'pending');
      })
      .catch((err) => {
        console.error("Failed to check user status:", err);
        setUserStatus('pending'); // Default to locked on error
      });
  }, []);

  console.log("Current userStatus state:", userStatus);

  const validateYoutubeUrl = (url: string) => {
    const pattern = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]{11}(&.*)?$/;
    return pattern.test(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setWarning("");

    if (!validateYoutubeUrl(url)) {
      setError("Please enter a valid YouTube video URL");
      return;
    }

    if (userStatus !== 'approved') {
      setShowApprovalWarning(true);
      return;
    }

    setIsLoading(true);
    try {
      const { isMusic, title } = await checkVideoCategory(url);

      if (!isMusic) {
        setPendingVideo({ url, title });
        setShowNonMusicWarning(true);
        setIsLoading(false);
        return;
      }

      processVideo(url, title);
    } catch (err) {
      console.error(err);
      processVideo(url);
    }
  };

  const processVideo = async (videoUrl: string, title?: string) => {
    console.log("Working on video:", videoUrl, "title:", title);

    try {
      const result = await createVideoRecord(videoUrl, title);
      if (result.success) {
        console.log("Created video record:", result.video);
        router.push('/videos');
      } else {
        if (result.error === 'Duplicate submission') {
          setShowDuplicateWarning(true);
        } else {
          setError(result.error || "Failed to create session. Database might not be connected.");
        }
      }
    } catch {
      setError("An unexpected error occurred.");
    }

    setIsLoading(false);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 gap-12 relative overflow-hidden">
      {/* Header/Logo */}
      <header className="w-full max-w-7xl flex justify-between items-center absolute top-8">
        <div className="text-2xl font-bold flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary"></div>
          <span className="gradient-text">Musicurious</span>
        </div>
      </header>

      {/* Hero Content */}
      <section className="max-w-4xl text-center flex flex-col gap-6 mt-16 z-10">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight mb-4">
          Transform Your <span className="gradient-text">Music Experience</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          {/* Dynamic text based on auth state could go here, but kept generic for now */}
          Extract stems, detect chords, and start jamming with your favorite tracks.
        </p>
      </section>

      {/* Authentication & Submission Logic */}
      <div className="glass-panel w-full max-w-2xl shadow-2xl relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <SignedIn>
          <div className="p-10">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label htmlFor="youtube-url" className="text-sm font-medium text-muted-foreground ml-1">
                  YouTube Video URL
                </label>
                <input
                  id="youtube-url"
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (error) setError("");
                    if (warning) setWarning("");
                  }}
                  required
                  className={cn(
                    "w-full bg-white/5 border rounded-xl px-5 py-3 text-base text-white placeholder:text-white/20 focus:outline-none focus:ring-2 transition-all duration-300",
                    error
                      ? "border-destructive focus:ring-destructive/50 focus:border-destructive"
                      : warning
                        ? "border-yellow-500 focus:ring-yellow-500/50 focus:border-yellow-500"
                        : "border-white/10 focus:ring-primary/50 focus:border-primary"
                  )}
                />
                {error && (
                  <p className="text-destructive text-sm font-medium animate-in fade-in slide-in-from-top-1">
                    {error}
                  </p>
                )}

                {warning && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <div className="flex flex-col gap-2">
                      <p className="text-sm font-medium">{warning}</p>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={cn(
                  "w-full h-14 text-lg font-semibold rounded-xl bg-gradient-to-r from-primary to-secondary text-white shadow-lg hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2",
                  isLoading && "opacity-70 cursor-not-allowed"
                )}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Play className="w-5 h-5 fill-current" />
                )}
                {isLoading ? "Checking Video..." : "Work on Video"}
              </button>
            </form>

            {/* Approval Warning Modal */}
            {showApprovalWarning && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-zinc-950 w-full max-w-md p-8 relative animate-in zoom-in-95 duration-200 shadow-2xl border border-yellow-500/30 rounded-2xl">
                  <button
                    onClick={() => setShowApprovalWarning(false)}
                    className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                  <div className="flex flex-col items-center gap-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 mb-2">
                      <Lock size={32} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold text-white">Access Pending</h3>
                      <p className="text-muted-foreground">
                        Your account is currently under review. You will be able to submit videos once an administrator approves your registration.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowApprovalWarning(false)}
                      className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
                    >
                      Understood
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Duplicate Warning Modal */}
            {showDuplicateWarning && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-zinc-950 w-full max-w-md p-8 relative animate-in zoom-in-95 duration-200 shadow-2xl border border-yellow-500/30 rounded-2xl">
                  <button
                    onClick={() => setShowDuplicateWarning(false)}
                    className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                  <div className="flex flex-col items-center gap-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 mb-2">
                      <AlertCircle size={32} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold text-white">Video Already Exists</h3>
                      <p className="text-muted-foreground">
                        You have already submitted this video. Please check your &quot;My Videos&quot; list to view your previous jam.
                      </p>
                    </div>
                    <div className="flex flex-col gap-3 w-full">
                      <button
                        onClick={() => router.push('/videos')}
                        className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium transition-colors"
                      >
                        Go to My Videos
                      </button>
                      <button
                        onClick={() => setShowDuplicateWarning(false)}
                        className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Non-Music Confirmation Modal */}
            {showNonMusicWarning && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-zinc-950 w-full max-w-md p-8 relative animate-in zoom-in-95 duration-200 shadow-2xl border border-yellow-500/30 rounded-2xl">
                  <button
                    onClick={() => setShowNonMusicWarning(false)}
                    className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                  <div className="flex flex-col items-center gap-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 mb-2">
                      <AlertCircle size={32} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold text-white">Music Video Check</h3>
                      <p className="text-muted-foreground">
                        This video doesn&apos;t appear to be categorized as Music on YouTube. Are you sure you want to proceed?
                      </p>
                    </div>
                    <div className="flex flex-col gap-3 w-full">
                      <button
                        onClick={() => {
                          setShowNonMusicWarning(false);
                          if (pendingVideo) {
                            setIsLoading(true); // Restart loading state
                            processVideo(pendingVideo.url, pendingVideo.title);
                          }
                        }}
                        className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium transition-colors"
                      >
                        Yes, Submit Anyway
                      </button>
                      <button
                        onClick={() => setShowNonMusicWarning(false)}
                        className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </SignedIn>

        <SignedOut>
          <div className="p-12 flex flex-col items-center gap-6 text-center">
            <h2 className="text-2xl font-bold">Ready to Start Jamming?</h2>
            <p className="text-muted-foreground">
              Sign up to unlock the full power of AI music analysis. Extract stems, visualize chords, and play along instantly.
            </p>
            <SignUpButton mode="modal">
              <button className="h-14 px-8 text-lg font-semibold rounded-xl bg-gradient-to-r from-primary to-secondary text-white shadow-lg hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300">
                Get Started for Free
              </button>
            </SignUpButton>
          </div>
        </SignedOut>
      </div>

      {/* How it works */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl mt-8 z-10">
        {[
          { title: "Extract Stems", desc: "Separate vocals, drums, bass and more using AI.", icon: "🎵" },
          { title: "Detect Chords", desc: "Get real-time chord transcriptions for any song.", icon: "🎸" },
          { title: "Interactive Jam", desc: "Slow down, loop, and practice at your own pace.", icon: "✨" }
        ].map((item, i) => (
          <div key={i} className="glass-panel p-8 text-center hover:-translate-y-1 hover:bg-white/10 transition-all duration-300 cursor-default">
            <div className="text-4xl mb-4">{item.icon}</div>
            <h3 className="text-xl font-bold mb-2">{item.title}</h3>
            <p className="text-muted-foreground">{item.desc}</p>
          </div>
        ))}
      </section>

      {/* Footer Info */}
      <footer className="mt-auto p-8 text-sm text-muted-foreground/50 text-center z-10">
        Powered by AI Stem Separation & Chord Detection
      </footer>

      {/* Decorative Background Elements */}
      <div className="fixed top-[10%] right-[5%] w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full -z-10 pointer-events-none animate-pulse duration-[10000ms]"></div>
      <div className="fixed bottom-[10%] left-[5%] w-[600px] h-[600px] bg-secondary/20 blur-[150px] rounded-full -z-10 pointer-events-none animate-pulse duration-[12000ms]"></div>
    </main >
  );
}
