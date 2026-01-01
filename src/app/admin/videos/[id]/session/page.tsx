import { getJam, getSessionFiles } from "@/app/actions";
import { SessionPlayer } from "@/components/session-player";
import { MusicalFlowCanvas } from "@/components/musical-flow-canvas";
import { notFound } from "next/navigation";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const videoId = parseInt(id);
    if (isNaN(videoId)) return notFound();

    const data = await getJam(videoId);
    if (!data) return notFound();

    const { video, userSettings } = data;
    const files = await getSessionFiles(videoId);

    // Map files to match SessionPlayer 'tracks' prop
    // files: { name, url } -> tracks: { name, url } (Same shape, just explicit prop name change if needed)
    // Actually getSessionFiles returns { name, url } so it matches directly.
    const tracks = files;

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <div className="max-w-5xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                        {video.title || "Untitled Session"}
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Session Review • {tracks.length} Stems Available
                    </p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                    <SessionPlayer
                        tracks={tracks}
                        baseBpm={Number(video.bpm) || 120}
                        baseKey={video.key_tonic}
                        baseScale={video.key_scale}
                        videoId={videoId}
                        initialSettings={userSettings}
                        timeSignature={video.time_signature}
                        chordsTimeline={video.chords}
                    />
                </div>

                <div className="mt-8 mb-4">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Musical Flow Canvas</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60 font-medium">BETA</span>
                    </h2>
                    <MusicalFlowCanvas videoId={videoId} />
                </div>
            </div>
        </div>
    );
}
