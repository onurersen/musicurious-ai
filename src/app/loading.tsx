import { LoadingSpinner } from "@/components/loading-spinner";

export default function Loading() {
    return (
        <div className="w-full h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-6 animate-in fade-in duration-300">
            <LoadingSpinner size="xl" />
            <div className="flex flex-col items-center gap-2">
                <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary animate-pulse">
                    Loading...
                </h3>
                <p className="text-muted-foreground text-sm">Preparing your music experience</p>
            </div>
        </div>
    );
}
