"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Play, AlertCircle } from "lucide-react";
import { checkVideoCategory, createVideoRecord } from "./actions";

export default function Home() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

    setIsLoading(true);
    try {
      const { isMusic } = await checkVideoCategory(url);

      if (!isMusic) {
        setWarning("This video doesn't appear to be a music video.");
        setIsLoading(false);
        return;
      }

      processVideo(url);
    } catch (err) {
      console.error(err);
      processVideo(url);
    }
  };

  const processVideo = async (videoUrl: string) => {
    console.log("Working on video:", videoUrl);

    try {
      const result = await createVideoRecord(videoUrl);
      if (result.success) {
        console.log("Created video record:", result.video);
        // TODO: Redirect to jam page
      } else {
        setError("Failed to create session. Database might not be connected.");
      }
    } catch (err) {
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
          Paste a YouTube link below to extract stems, detect chords, and start jamming with your favorite tracks.
        </p>
      </section>

      {/* Submission Form */}
      <div className="glass-panel w-full max-w-2xl p-10 shadow-2xl relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
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
    </main>
  );
}
