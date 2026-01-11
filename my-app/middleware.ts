import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = process.env.JWT_SECRET || 'access_secret';
const key = new TextEncoder().encode(SECRET_KEY);

export async function middleware(req: NextRequest) {
  // 1. Define Public Routes (No Auth Required)
  const publicPaths = [
    '/api/academics/login',
    '/api/academics/register',
    '/api/auth/refresh',
    '/api/research-assistant', // Chat/Search is public
    '/api/graph/data',
  ];

  // Regex specifically for public GET routes (Projects, Calls, Academics)
  // We allow GET but block POST/DELETE/ETC unless authenticated
  const isPublicGetRoute = (pathname: string, method: string) => {
    if (method !== 'GET') return false;
    
    // Allow listing endpoints
    if (pathname === '/api/projects' || pathname === '/api/calls' || pathname === '/api/academics') return true;
    
    // Allow specific resource fetching like /api/projects/123
    // Regex matches /api/projects/ANYTHING, /api/calls/ANYTHING
    const publicResourceRegex = /^\/api\/(projects|calls|academics)\/[^\/]+$/;
    return publicResourceRegex.test(pathname);
  };

  const { pathname } = req.nextUrl;

  // 2. Check if the request is public
  if (publicPaths.includes(pathname) || isPublicGetRoute(pathname, req.method)) {
    return NextResponse.next();
  }

  // 3. For protected routes, check Authorization Header
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { message: 'Authentication required. Please log in.' },
      { status: 401 }
    );
  }

  const token = authHeader.split(' ')[1];

  try {
    // 4. Verify Token (using 'jose' library which works in Edge Runtime)
    const { payload } = await jwtVerify(token, key);
    
    // 5. Success! Clone the request and add user info to headers
    // This allows the API route to just read the headers instead of verifying again.
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-user-id', payload.userId as string);
    requestHeaders.set('x-user-role', payload.role as string);
    requestHeaders.set('x-user-email', payload.email as string);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

  } catch (error) {
    console.error('Middleware Auth Error:', error);
    return NextResponse.json(
      { message: 'Invalid or expired token.' },
      { status: 401 }
    );
  }
}

// Apply middleware only to API routes
export const config = {
  matcher: '/api/:path*',
};
