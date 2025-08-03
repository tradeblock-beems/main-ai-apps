
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  console.log('\n--- [Auth Middleware Start] ---');
  const { pathname } = req.nextUrl;
  console.log(`[Auth] Pathname: ${pathname}`);

  const AUTH_ROUTES = ['/email-hub', '/push-blaster'];

  if (AUTH_ROUTES.some(route => pathname.startsWith(route))) {
    console.log('[Auth] Protected route detected. Checking credentials...');
    const basicAuth = req.headers.get('authorization');

    if (basicAuth) {
      console.log('[Auth] Authorization header found.');
      try {
        const authValue = basicAuth.split(' ')[1];
        const decodedAuth = atob(authValue);
        const [user, pwd] = decodedAuth.split(':');
        
        console.log(`[Auth] Decoded User: "${user}"`);
        console.log(`[Auth] Decoded Pass: "${pwd}"`);
        console.log(`[Auth] Env Var Pass: "${process.env.DEV_HUB_PASSWORD}"`);

        if (user === 'admin' && pwd === process.env.DEV_HUB_PASSWORD) {
          console.log('[Auth] Credentials match. Granting access.');
          console.log('--- [Auth Middleware End] ---\n');
          return NextResponse.next();
        } else {
          console.log('[Auth] Credentials do not match.');
        }
      } catch (e) {
        console.error('[Auth] Error decoding Basic Auth token:', e);
      }
    } else {
      console.log('[Auth] Authorization header not found.');
    }

    console.log('[Auth] Auth failed. Sending 401 response.');
    console.log('--- [Auth Middleware End] ---\n');
    return new Response('Auth required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Secure Area"',
      },
    });
  }

  console.log('[Auth] Non-protected route. Bypassing auth.');
  console.log('--- [Auth Middleware End] ---\n');
  return NextResponse.next();
}

export const config = {
  matcher: ['/email-hub/:path*', '/push-blaster/:path*'],
}; 