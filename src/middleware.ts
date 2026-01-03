import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/' // Landing page
])

export default clerkMiddleware(async (auth, request) => {
    if (request.nextUrl.pathname.includes('/api/admin/process-audio')) {
        return;
    }
    if (!isPublicRoute(request)) {
        await auth.protect()
    }
})

// Config matcher explained:
// 1. Matches everything that is NOT:
//    - _next (Next.js internals)
//    - /api/admin/process-audio (Our upload route - MUST BE EXCLUDED to prevent body consumption)
//    - static files (images, css, fonts, etc.)
// 2. This effectively matches all page routes and all OTHER API routes.

export const config = {
    matcher: [
        '/((?!_next|api/admin/process-audio|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    ],
}
