import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import driver from '@/lib/neo4j';
import { Session } from 'neo4j-driver';

/**
 * @api {post} /api/auth/logout
 * @desc Logs out the user by clearing the refresh token cookie and removing the session from DB.
 */

export async function POST(req: Request) {
  let session: Session | null = null;

  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refreshToken')?.value;

    if (refreshToken) {
      session = driver.session();
      
      // Remove session from database
      await session.run(
        `MATCH (s:Session {token: $token})
         DETACH DELETE s`,
        { token: refreshToken }
      );
    }

    // Create response
    const response = NextResponse.json(
      { message: 'Logout successful.' },
      { status: 200 }
    );

    // Clear the cookie
    response.cookies.set({
      name: 'refreshToken',
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0 // Expire immediately
    });

    return response;

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { message: 'Logout failed.' },
      { status: 500 }
    );
  } finally {
    if (session) {
      await session.close();
    }
  }
}
