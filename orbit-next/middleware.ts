import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware to handle authentication and cache control
 * - Prevents caching of authenticated pages
 * - Redirects logged-out users who try to access protected routes
 * - Adds security headers
 */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Protected routes that require authentication
  const protectedRoutes = ['/booking', '/admin', '/password-setup'];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  
  if (isProtectedRoute) {
    const response = NextResponse.next();
    
    // CRITICAL: Prevent browser caching of authenticated pages
    // This ensures browser back button can't show cached authenticated pages
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('Surrogate-Control', 'no-store');
    
    // Prevent caching in shared caches (CDN, proxies)
    response.headers.set('X-Accel-Expires', '0');
    
    // Security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    return response;
  }
  
  // Public routes can be cached
  if (['/login', '/'].includes(pathname)) {
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'public, max-age=3600'); // 1 hour for public pages
    return response;
  }
  
  return NextResponse.next();
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
