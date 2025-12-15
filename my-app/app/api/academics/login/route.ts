import { NextResponse } from 'next/server';
import driver from '@/lib/neo4j';
import { Session } from 'neo4j-driver';
import { compare } from 'bcryptjs';
import jwt from 'jsonwebtoken';

/**
 * @api {post} /api/academics/login
 * @desc Authenticates user & returns token
 * @body { "email": "...", "password": "..." }
 */

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'access_secret';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'refresh_secret';

export async function POST(req: Request) {
  let session: Session | null = null;

  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required.' },
        { status: 400 }
      );
    }

    session = driver.session();

    // Find User in Database
    const result = await session.run(
      `MATCH (a:Academic {email: $email}) 
       RETURN a.userId AS userId, 
              a.name AS name, 
              a.email AS email, 
              a.role AS role,
              a.passwordHash AS passwordHash`,
      { email: email.toLowerCase() }
    );

    // If no user found
    if (result.records.length === 0) {
      return NextResponse.json(
        { message: 'Invalid email or password.' },
        { status: 401 } // 401 Unauthorized
      );
    }

    const userRecord = result.records[0];
    const storedHash = userRecord.get('passwordHash');

    // Password Verification
    const passwordMatch = await compare(password, storedHash);

    if (!passwordMatch) {
      return NextResponse.json(
        { message: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // Get user payload for token
    const userPayload = {
        userId: userRecord.get('userId'),
        email: userRecord.get('email'),
        name: userRecord.get('name'),
        role: userRecord.get('role') || 'ACADEMIC',
    };

    // Access Token
    const accessToken = jwt.sign(
      userPayload,
      ACCESS_TOKEN_SECRET,
      { expiresIn: '1m' } 
    );

    // Refresh Token
    const refreshToken = jwt.sign(
      userPayload,
      REFRESH_TOKEN_SECRET,
      { expiresIn: '3m' }  // TEMPORARILY (should 7 days)
    );

    // Store Refresh Token in Database
    // Assuming a relationship between Academic and Session nodes
    await session.run(
        `MATCH (u:Academic {userId: $userId})

        // Firstly, remove old expired sessions
        WITH u
        OPTIONAL MATCH (u)-[:HAS_SESSION]->(oldS:Session)
        WHERE oldS.expiresAt < datetime()
        DETACH DELETE oldS

        // Then, create new session. Merge to avoid duplicates
        WITH u
        MERGE (s:Session {token: $refreshToken})
        ON CREATE SET 
            s.createdAt = datetime(),
            s.expiresAt = datetime() + duration('PT3M'), // TEMPORARILY (should be PT168H for 7 days)
            s.userAgent = $userAgent
        
        // Link session to user
        MERGE (u)-[:HAS_SESSION]->(s)
        `,
         {
             userId: userPayload.userId,
             refreshToken: refreshToken,
             userAgent: req.headers.get('user-agent') || 'Unknown'
         }
    );

    // Successful Response
    const response = NextResponse.json(
      {
        message: 'Login successful.',
        accessToken,  // Frontend will keep this in memory (variable)
        // refreshToken is now sent via HttpOnly Cookie
        user: {
          userId: userRecord.get('userId'),
          name: userRecord.get('name'),
          email: userRecord.get('email'),
          role: userRecord.get('role'),
        },
      },
      { status: 200 }
    );

    // Set Refresh Token as HttpOnly Cookie
    response.cookies.set({
      name: 'refreshToken',
      value: refreshToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 // 7 days in seconds
    });

    return response;

  } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { message: 'Server error, login failed.' },
            { status: 500 }
        );
  } finally {
        if (session) {
            await session.close();
        }
  }
}
