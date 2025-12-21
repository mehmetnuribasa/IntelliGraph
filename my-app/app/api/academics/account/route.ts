import { NextResponse } from 'next/server';
import driver from '@/lib/neo4j';
import { Session } from 'neo4j-driver';
import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'access_secret';

/**
 * @api {delete} /api/academics/account
 * @desc Deletes user account and all related data
 */
export async function DELETE(req: Request) {
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

    // Prevent admin account deletion
    session = driver.session();
    const userCheck = await session.run(
      `MATCH (a:Academic {userId: $userId})
       RETURN a.role AS role`,
      { userId: decodedUser.userId }
    );

    if (userCheck.records.length === 0) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    const role = userCheck.records[0].get('role');
    if (role === 'ADMIN') {
      return NextResponse.json(
        { message: 'Admin accounts cannot be deleted.' },
        { status: 403 }
      );
    }

    // Delete user and all related data
    // This will cascade delete:
    // - User's sessions
    // - User's projects (if any)
    // - User's relationships (IS_AUTHOR_OF, REPRESENTS, CREATED_CALL, HAS_SESSION)
    await session.run(
      `MATCH (a:Academic {userId: $userId})
       DETACH DELETE a`,
      { userId: decodedUser.userId }
    );

    return NextResponse.json(
      { message: 'Account deleted successfully.' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json({ message: 'Server error.' }, { status: 500 });
  } finally {
    if (session) await session.close();
  }
}

