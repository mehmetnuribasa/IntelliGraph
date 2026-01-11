import { NextResponse } from 'next/server';
import driver from '@/lib/neo4j';
import { Session } from 'neo4j-driver';

/**
 * @api {put} /api/academics/profile
 * @desc Updates user profile (name, email)
 * @body { "name": "...", "email": "..." }
 */
export async function PUT(req: Request) {
  let session: Session | null = null;

  try {
    // Auth handled by Middleware
    const userId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role');
    const decodedUser = { userId, role };

    // Input validation
    const body = await req.json();
    const { name, email } = body;

    const errors: Record<string, string[]> = {};

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      errors.name = ['Name must be at least 2 characters long.'];
    }

    if (!email || typeof email !== 'string') {
      errors.email = ['Email is required.'];
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.email = ['Invalid email format.'];
      }
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ message: 'Invalid input data.', errors }, { status: 400 });
    }

    // Check if email is already taken by another user
    session = driver.session();
    const emailCheck = await session.run(
      `MATCH (a:Academic {email: $email})
       WHERE a.userId <> $userId
       RETURN a.userId AS userId`,
      { email: email.toLowerCase(), userId: decodedUser.userId }
    );

    if (emailCheck.records.length > 0) {
      return NextResponse.json(
        { message: 'Email is already taken by another user.' },
        { status: 400 }
      );
    }

    // Update user profile
    const result = await session.run(
      `MATCH (a:Academic {userId: $userId})
       SET a.name = $name,
           a.email = $email,
           a.updatedAt = datetime()
       RETURN a.userId AS userId, a.name AS name, a.email AS email`,
      {
        userId: decodedUser.userId,
        name: name.trim(),
        email: email.toLowerCase().trim()
      }
    );

    if (result.records.length === 0) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    const updatedUser = result.records[0];

    return NextResponse.json(
      {
        message: 'Profile updated successfully.',
        user: {
          userId: updatedUser.get('userId'),
          name: updatedUser.get('name'),
          email: updatedUser.get('email')
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ message: 'Server error.' }, { status: 500 });
  } finally {
    if (session) await session.close();
  }
}

