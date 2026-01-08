"use client";

import Link from "next/link";

interface NavbarActionsProps {
    isAdmin: boolean;
    isApproved: boolean;
}

export function NavbarActions({ isAdmin, isApproved }: NavbarActionsProps) {
    if (!isApproved) return null;

    return (
        <>
            <Link href="/videos" className="text-sm font-medium text-muted-foreground hover:text-white transition-colors">
                {isAdmin ? "Jams" : "My Jams"}
            </Link>

            {isAdmin && (
                <>
                    <Link href="/admin/videos" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                        Jam Management
                    </Link>
                    <Link href="/admin/users" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                        Users
                    </Link>
                </>
            )}
        </>
    );
}
