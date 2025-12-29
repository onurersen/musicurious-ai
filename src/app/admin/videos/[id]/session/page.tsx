import { getJam, getSessionFiles } from "@/app/actions";
import { SessionPlayer } from "@/components/session-player";
import { notFound } from "next/navigation";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const videoId = parseInt(id);
    if (isNaN(videoId)) return notFound();

    const data = await getJam(videoId);
    if (!data) return notFound();

    const { video } = data;
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
                    <SessionPlayer tracks={tracks} />
                </div>
            </div>
        </div>
    );
}
