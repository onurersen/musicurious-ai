import { getJam } from "@/app/actions";
import JamPlayer from "@/components/jam-player";
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const jamId = parseInt(id, 10);

    if (isNaN(jamId)) {
        return <div className="p-12 text-center">Invalid Jam ID</div>;
    }

    const data = await getJam(jamId);

    if (!data) {
        return (
            <div className="container mx-auto px-4 py-20 text-center">
                <h1 className="text-3xl font-bold mb-4">Jam Not Found</h1>
                <p className="text-muted-foreground mb-8">The requested jam could not be found or does not exist.</p>
                <Link href="/videos" className="text-primary hover:underline">
                    Back to Gallery
                </Link>
            </div>
        );
    }

    const { video, stems } = data;

    return (
        <div className="container mx-auto px-4 py-8">
            <Link href="/videos" className="inline-flex items-center text-muted-foreground hover:text-white mb-8 transition-colors">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Gallery
            </Link>

            <div className="max-w-4xl mx-auto">
                <div className="flex flex-col gap-8">
                    {/* Video Header */}
                    <div>
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
                            {video.title || "Untitled Jam"}
                        </h1>
                        <p className="text-muted-foreground">
                            Processed {new Date(video.created_at).toLocaleDateString()}
                        </p>
                    </div>

                    {/* JAM PLAYER */}
                    <JamPlayer
                        stems={stems}
                        title={video.title || "Jam Session"}
                        youtubeUrl={video.youtube_url}
                    />

                    {/* Stems list (Debug/Info) */}
                    <div className="glass-panel p-6 rounded-2xl border border-white/5 opacity-50 hover:opacity-100 transition-opacity">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Available Stems</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {stems.map((stem) => (
                                <div key={stem.id} className="bg-white/5 p-3 rounded-lg border border-white/5 text-xs">
                                    <div className="font-bold capitalize text-white mb-1">{stem.type}</div>
                                    <div className="truncate text-white/30">{stem.blob_url.split('/').pop()}</div>
                                </div>
                            ))}
                            {stems.length === 0 && (
                                <div className="col-span-full text-center py-4 text-muted-foreground text-sm">
                                    No stems found for this jam.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
