import Link from 'next/link';
import { currentUser } from '@clerk/nextjs/server';
import { syncUser } from '@/app/actions';
import { NavbarActions } from './navbar-actions';
import { NavbarAuth } from './navbar-auth';

export async function Navbar() {
    const user = await currentUser();
    let userStatus = 'approved';
    let isAdmin = false;

    if (user) {
        // Sync user (upsert) and fetch roles
        // This ensures the user exists in DB as soon as they visit any page
        const userData = await syncUser();

        if (userData) {
            isAdmin = userData.role === 'admin';
            userStatus = userData.status || 'pending';
        } else {
            // Fallback if sync failed but user is valid (shouldnt happen)
            userStatus = 'pending';
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
                    {user && (
                        <NavbarActions isAdmin={isAdmin} isApproved={isApproved} />
                    )}
                </div>
            </div>

            <div className="flex items-center gap-4">
                <NavbarAuth />
            </div>
        </nav>
    );
}
