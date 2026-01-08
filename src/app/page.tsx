"use client";

import { useEffect } from "react";
import { SignedIn, SignedOut, SignUpButton, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      // Force a hard navigation to ensure Navbar (Server Component) updates
      window.location.href = '/videos';
    }
  }, [isLoaded, isSignedIn, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 gap-12 relative overflow-hidden">


      {/* Hero Content */}
      <section className="max-w-4xl text-center flex flex-col gap-6 mt-16 z-10">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight mb-4">
          Transform Your <span className="gradient-text">Music Experience</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Extract stems, detect chords, and start jamming with your favorite tracks.
        </p>
      </section>

      {/* Authentication & Redirect Logic */}
      <div className="w-full max-w-2xl z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <SignedIn>
          <div className="flex justify-center p-10">
            <p className="text-muted-foreground animate-pulse">Redirecting to Jams...</p>
          </div>
        </SignedIn>

        <SignedOut>
          <div className="glass-panel p-12 flex flex-col items-center gap-6 text-center shadow-2xl">
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
