import { getVideos, isAdmin } from "@/app/actions";
import { redirect } from "next/navigation";
import { VideosTable } from "./videos-table";

export default async function AdminVideosPage() {
    const admin = await isAdmin();
    if (!admin) redirect('/');

    const videos = await getVideos();

    const isDev = process.env.NODE_ENV === 'development';

    return (
        <div className="container mx-auto px-6 py-12">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Submission Console</h1>
            </div>

            <VideosTable videos={videos} isDev={isDev} />
        </div>
    );
}
