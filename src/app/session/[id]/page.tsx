import { getJam, getExtractedSections } from "@/app/actions";
import { SessionPlayer } from "@/components/session-player";
import { MusicalFlowCanvas } from "@/components/musical-flow-canvas";
import { QuickNav } from "@/components/quick-nav";
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { decodeId, encodeId } from "@/lib/id-obfuscation";
import { permanentRedirect } from "next/navigation";

export default async function SessionPage({
    params,
    searchParams
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ viewAs?: string }>;
}) {
    const { id } = await params;
    const { viewAs } = await searchParams;

    // 1. Check for legacy integer ID and redirect
    if (/^\d+$/.test(id)) {
        const numericId = parseInt(id, 10);
        const encodedId = encodeId(numericId);
        permanentRedirect(`/session/${encodedId}`);
    }

    // 2. Decode the ID
    const jamId = decodeId(id);

    if (jamId === null) {
        return (
            <div className="container mx-auto px-4 py-20 text-center">
                <h1 className="text-3xl font-bold mb-4">Jam Not Found</h1>
                <p className="text-muted-foreground mb-8">The requested jam ID is invalid.</p>
                <Link href="/videos" className="text-primary hover:underline">
                    Back to Gallery
                </Link>
            </div>
        );
    }

    const data = await getJam(jamId, viewAs);
    const extractedSections = await getExtractedSections(jamId);

    if (!data) {
        return (
            <div className="container mx-auto px-4 py-20 text-center">
                <h1 className="text-3xl font-bold mb-4">Jam Not Found</h1>
                <p className="text-muted-foreground mb-8">
                    {viewAs
                        ? "The requested jam could not be found or the user does not have access to it."
                        : "The requested jam could not be found or does not exist."}
                </p>
                <Link href="/videos" className="text-primary hover:underline">
                    Back to Gallery
                </Link>
            </div>
        );
    }

    const { video, stems, userSettings, impersonatingUser } = data;

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
            {/* Impersonation Banner */}
            {impersonatingUser && (
                <div className="fixed top-0 left-0 right-0 z-[150] bg-amber-500/90 text-black px-4 py-2 text-center font-medium backdrop-blur-sm shadow-lg">
                    <span>
                        Viewing session as <span className="font-bold">{impersonatingUser.first_name} {impersonatingUser.last_name}</span>
                    </span>
                    <Link
                        href="/admin/users"
                        className="ml-4 underline hover:no-underline opacity-80 hover:opacity-100"
                    >
                        Exit
                    </Link>
                </div>
            )}

            {/* Sticky Nav */}
            <div className="sticky top-4 z-[100] mb-6 flex justify-center">
                <QuickNav youtubeUrl={video.youtube_url} />
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
                        extractedSections={extractedSections}
                        impersonatedUserId={impersonatingUser ? viewAs : undefined}
                    />
                </div>

                <div id="musical-flow-canvas" className="mt-16 mb-4 scroll-mt-24">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Musical Flow Canvas</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60 font-medium">BETA</span>
                    </h2>
                    <MusicalFlowCanvas
                        videoId={jamId}
                        extractedSections={extractedSections}
                        jamTitle={video.title || "Untitled Jam"}
                        chordsTimeline={video.chords || []}
                        impersonatedUserId={impersonatingUser ? viewAs : undefined}
                    />
                </div>

                <div className="flex flex-col gap-8">
                    {/* Original Source Link Removed (moved to Quick Nav) */}
                </div>
            </div>
        </div>
    );
}
