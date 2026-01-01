import { getJam, getExtractedSections } from "@/app/actions";
import { SessionPlayer } from "@/components/session-player";
import { MusicalFlowCanvas } from "@/components/musical-flow-canvas";
import { QuickNav } from "@/components/quick-nav";
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const jamId = parseInt(id, 10);

    if (isNaN(jamId)) {
        return <div className="p-12 text-center">Invalid Jam ID</div>;
    }

    const data = await getJam(jamId);
    const extractedSections = await getExtractedSections(jamId);

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

    const { video, stems, userSettings } = data;

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
            {/* Sticky Nav */}
            <div className="sticky top-4 z-[100] mb-6 flex justify-center">
                <QuickNav />
            </div>

            <Link href="/videos" className="inline-flex items-center text-muted-foreground hover:text-white mb-8 transition-colors">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Gallery
            </Link>

            <div className="max-w-4xl mx-auto">
                <div className="flex flex-col gap-8">
                    {/* Video Header */}
                    <div id="track-section" className="scroll-mt-32">
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
                            {video.title || "Untitled Jam"}
                        </h1>
                        <p className="text-muted-foreground">
                            Processed {new Date(video.created_at).toLocaleDateString()}
                        </p>
                    </div>

                    {/* NEW SESSION PLAYER */}
                    <SessionPlayer
                        tracks={tracks}
                        baseBpm={Number(video.bpm) || 120}
                        baseKey={video.key_tonic}
                        baseScale={video.key_scale}
                        videoId={jamId}
                        initialSettings={userSettings}
                        timeSignature={video.time_signature}
                        chordsTimeline={video.chords}
                    />

                    <div id="musical-flow-canvas" className="mt-8 mb-4 scroll-mt-[480px]">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Musical Flow Canvas</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60 font-medium">BETA</span>
                        </h2>
                        <MusicalFlowCanvas videoId={jamId} extractedSections={extractedSections} />
                    </div>

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
