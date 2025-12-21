import { NextResponse } from 'next/server';
import driver from '@/lib/neo4j';
import { Session } from 'neo4j-driver';
import { compare, hash } from 'bcryptjs';
import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'access_secret';

/**
 * @api {put} /api/academics/password
 * @desc Changes user password
 * @body { "currentPassword": "...", "newPassword": "..." }
 */
export async function PUT(req: Request) {
  let session: Session | null = null;

  try {
    // Authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized. Token required.' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    let decodedUser: any;

    try {
      decodedUser = jwt.verify(token, ACCESS_TOKEN_SECRET);
    } catch (err) {
      return NextResponse.json({ message: 'Invalid or expired token.' }, { status: 401 });
    }

    // Input validation
    const body = await req.json();
    const { currentPassword, newPassword } = body;

    const errors: Record<string, string[]> = {};

    if (!currentPassword || typeof currentPassword !== 'string') {
      errors.currentPassword = ['Current password is required.'];
    }

    if (!newPassword || typeof newPassword !== 'string') {
      errors.newPassword = ['New password is required.'];
    } else {
      if (newPassword.length < 8) {
        errors.newPassword = ['Password must be at least 8 characters long.'];
      }

      const complexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).+$/;
      if (!complexityRegex.test(newPassword)) {
        if (!errors.newPassword) errors.newPassword = [];
        errors.newPassword.push(
          'Password must contain at least one uppercase letter, one lowercase letter, and one special character.'
        );
      }
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ message: 'Invalid input data.', errors }, { status: 400 });
    }

    // Verify current password
    session = driver.session();
    const userResult = await session.run(
      `MATCH (a:Academic {userId: $userId})
       RETURN a.passwordHash AS passwordHash`,
      { userId: decodedUser.userId }
    );

    if (userResult.records.length === 0) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    const storedHash = userResult.records[0].get('passwordHash');
    const passwordMatch = await compare(currentPassword, storedHash);

    if (!passwordMatch) {
      return NextResponse.json(
        { message: 'Current password is incorrect.' },
        { status: 401 }
      );
    }

    // Hash new password
    const newPasswordHash = await hash(newPassword, 10);

    // Update password
    await session.run(
      `MATCH (a:Academic {userId: $userId})
       SET a.passwordHash = $newPasswordHash,
           a.updatedAt = datetime()`,
      {
        userId: decodedUser.userId,
        newPasswordHash
      }
    );

    return NextResponse.json(
      { message: 'Password changed successfully.' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json({ message: 'Server error.' }, { status: 500 });
  } finally {
    if (session) await session.close();
  }
}

