import { NextResponse } from 'next/server';
import driver from '@/lib/neo4j';
import { Session } from 'neo4j-driver';
import jwt from 'jsonwebtoken';

/**
 * @api {post} /api/auth/refresh
 * @desc Validates the Refresh Token and issues a new Access Token.
 * @body { "refreshToken": "..." }
 */

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'access_secret';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'refresh_secret';

export async function POST(req: Request) {
  let session: Session | null = null;

  try {
    const body = await req.json();
    const { refreshToken } = body;

    // Check Refresh Token
    if (!refreshToken) {
      return NextResponse.json(
        { message: 'Refresh Token is required.' },
        { status: 400 }
      );
    }

    // Verification of Refresh Token
    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    } catch (err) {
      return NextResponse.json(
        { message: 'Invalid or expired Refresh Token.' },
        { status: 403 } // 403 Forbidden
      );
    }

    session = driver.session();

    // Check if Refresh Token exists in DB and is still valid
    const result = await session.run(
      `MATCH (u:Academic)-[:HAS_SESSION]->(s:Session {token: $token})
       WHERE s.expiresAt > datetime() // Check if session is still valid
       RETURN u.userId AS userId, 
              u.email AS email, 
              u.role AS role`,
      { token: refreshToken }
    );

    // If no valid session found
    if (result.records.length === 0) {
      return NextResponse.json(
        { message: 'Session not found or expired. Please login again.' },
        { status: 403 }
      );
    }

    // Get user info from the token 
    const userRecord = result.records[0];
    
    // Generate new Access Token
    const userPayload = {
        userId: userRecord.get('userId'),
        email: userRecord.get('email'),
        role: userRecord.get('role'),
    };

    const newAccessToken = jwt.sign(
      userPayload,
      ACCESS_TOKEN_SECRET,
      { expiresIn: '1m' } // TEMPORARILY (should be longer in production)
    );

    return NextResponse.json(
      {
        message: 'Access Token refreshed successfully.',
        accessToken: newAccessToken
      },
      { status: 200 }
    );

  } catch (error) {
        console.error('Refresh Token error:', error);
        return NextResponse.json(
            { message: 'Server error, token refresh failed.' },
            { status: 500 }
        );
  } finally {
        if (session) {
            await session.close();
        }
  }
}