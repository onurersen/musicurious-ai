import { getVideos, isAdmin } from "@/app/actions";
import VideoGallery from "./video-gallery";
import JamSearch from "./jam-search";

export default async function VideosPage() {
    const admin = await isAdmin();
    const videos = await getVideos(admin ? 'all' : 'personal');

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="mb-12"><JamSearch /></div>
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold tracking-tight">My Jams</h1>
            </div>
            <VideoGallery videos={videos} isAdmin={admin} />
        </div>
    );
}
