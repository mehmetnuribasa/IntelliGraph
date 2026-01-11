import { NextResponse } from 'next/server';
import driver from '@/lib/neo4j';
import { Session } from 'neo4j-driver';
import { compare, hash } from 'bcryptjs';

/**
 * @api {put} /api/academics/password
 * @desc Changes user password
 * @body { "currentPassword": "...", "newPassword": "..." }
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
    const { currentPassword, newPassword } = body;

    const errors: Record<string, string[]> = {};

    if (!currentPassword || typeof currentPassword !== 'string') {
      errors.currentPassword = ['Current password is required.'];
    }

    if (!newPassword || typeof newPassword !== 'string') {
      errors.newPassword = ['New password is required.'];
    } else {
      if (currentPassword === newPassword) {
         errors.newPassword = ['New password cannot be the same as the current password.'];
      }

      if (newPassword.length < 8) {
        if (!errors.newPassword) errors.newPassword = [];
        errors.newPassword.push('Password must be at least 8 characters long.');
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

