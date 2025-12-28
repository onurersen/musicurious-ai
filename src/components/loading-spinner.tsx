
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
    className?: string;
    size?: "sm" | "md" | "lg" | "xl";
}

export function LoadingSpinner({ className, size = "md" }: LoadingSpinnerProps) {
    const sizeClasses = {
        sm: "w-8 h-8",
        md: "w-12 h-12",
        lg: "w-16 h-16",
        xl: "w-24 h-24",
    };

    return (
        <div className={cn("relative flex items-center justify-center", sizeClasses[size], className)}>
            <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
            <div className="absolute inset-2 rounded-full border-4 border-secondary/20"></div>
            <div className="absolute inset-2 rounded-full border-4 border-secondary border-b-transparent animate-[spin_1.5s_linear_infinite_reverse]"></div>

            {/* Center dot/pulse */}
            <div className="absolute w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
        </div>
    );
}
