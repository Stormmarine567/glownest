import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// First line of defence only. Every page, server action and API route ALSO re-checks
// the user's role on the server (lib/auth.ts) and RLS enforces it again in the database.
export async function middleware(request: NextRequest) {
  // Expose the pathname to server components (used for maintenance-mode gating).
  request.headers.set('x-pathname', request.nextUrl.pathname);
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return NextResponse.next({ request });
  const { response, user } = await updateSession(request);
  const path = request.nextUrl.pathname;
  const protectedArea = path.startsWith('/dashboard') || path.startsWith('/admin') || path === '/checkout';
  if (protectedArea && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images/|api/webhooks|api/cron).*)'],
};
