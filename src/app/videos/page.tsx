import { getVideos, isAdmin } from "@/app/actions";
import VideoGallery from "./video-gallery";

export default async function VideosPage() {
    const videos = await getVideos();
    const admin = await isAdmin();

    return (
        <div className="container mx-auto px-4 py-12">
            <VideoGallery videos={videos} isAdmin={admin} />
        </div>
    );
}
