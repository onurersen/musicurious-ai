import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { SignedIn, SignedOut, SignInButton, SignUpButton } from '@clerk/nextjs';
import { currentUser } from '@clerk/nextjs/server';
import { sql } from '@vercel/postgres';
import { trackUserActivity } from '@/app/actions';

export async function Navbar() {
    const user = await currentUser();
    let userStatus = 'approved';
    let isAdmin = false;

    if (user) {
        // Track activity on every navigation
        await trackUserActivity(user.id);

        try {
            const email = user.emailAddresses[0]?.emailAddress;
            if (email === 'onurersen@gmail.com') {
                isAdmin = true;
                userStatus = 'approved';
            } else {
                const res = await sql`SELECT role, status FROM users WHERE id = ${user.id}`;
                isAdmin = res.rows[0]?.role === 'admin';
                // If status is undefined (e.g. visiting first time), default to pending unless it's the admin email fallback
                userStatus = res.rows[0]?.status || 'pending';
                if (isAdmin) userStatus = 'approved'; // Double check
            }
        } catch (e) {
            console.error("Failed to fetch user role for navbar", e);
            userStatus = 'pending'; // Fail safe
        }
    }

    // If user is logged in but pending/blocked, we show minimalistic UI
    const isApproved = !user || userStatus === 'approved';

    return (
        <nav className="fixed top-0 left-0 right-0 h-16 bg-background/60 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-6 z-50">
            <div className="flex items-center gap-8">
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary"></div>
                    <span className="font-bold text-xl gradient-text">Musicurious</span>
                </Link>

                <div className="hidden md:flex items-center gap-6">
                    {isApproved && (
                        <>
                            <SignedIn>
                                <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-white transition-colors">
                                    Submit
                                </Link>
                                <Link href="/videos" className="text-sm font-medium text-muted-foreground hover:text-white transition-colors">
                                    {isAdmin ? "Videos" : "My Videos"}
                                </Link>
                                {isAdmin && (
                                    <>
                                        <Link href="/admin/videos" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                                            Submissions
                                        </Link>
                                        <Link href="/admin/users" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                                            Users
                                        </Link>
                                    </>
                                )}
                            </SignedIn>
                        </>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-4">
                <SignedOut>
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
                </SignedOut>

                <SignedIn>
                    <UserButton
                        afterSignOutUrl="/"
                        appearance={{
                            elements: {
                                avatarBox: "w-9 h-9 border-2 border-white/10"
                            }
                        }}
                    />
                </SignedIn>
            </div>
        </nav>
    );
}
