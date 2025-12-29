import { getJam } from "@/app/actions";
import { SessionPlayer } from "@/components/session-player";
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

    // Map stems to tracks format
    // Since this is the session view for "playing versions", we want all stems available
    const tracks = stems.map(stem => ({
        name: stem.type, // e.g., 'vocals', 'no_drums', 'bass'
        url: stem.blob_url
    }));

    // Sort to put 'no_' tracks first if possible, or just alpha
    tracks.sort((a, b) => a.name.localeCompare(b.name));

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

                    {/* NEW SESSION PLAYER */}
                    <SessionPlayer tracks={tracks} />

                    {/* Original Source Link */}
                    {video.youtube_url && (
                        <div className="text-center mt-4">
                            <a
                                href={video.youtube_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline opacity-80 hover:opacity-100"
                            >
                                Watch Original on YouTube
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
