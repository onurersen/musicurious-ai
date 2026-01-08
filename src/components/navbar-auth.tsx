"use client";

import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";

export function NavbarAuth() {
    const { isSignedIn, isLoaded } = useUser();

    if (!isLoaded) {
        return (
            <div className="h-9 w-20 bg-white/5 animate-pulse rounded-lg" />
        );
    }

    if (!isSignedIn) {
        return (
            <>
                <SignInButton mode="modal">
                    <button className="text-sm font-medium text-muted-foreground hover:text-white transition-colors">
                        Sign In
                    </button>
                </SignInButton>
                <SignUpButton mode="modal">
                    <button className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all">
                        Sign Up
                    </button>
                </SignUpButton>
            </>
        );
    }

    return (
        <UserButton
            afterSignOutUrl="/"
            appearance={{
                elements: {
                    avatarBox: "w-9 h-9 border-2 border-white/10"
                }
            }}
        />
    );
}
