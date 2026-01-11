import { NextResponse } from 'next/server';
import driver from '@/lib/neo4j';
import { Session } from 'neo4j-driver';

/**
 * @api {delete} /api/academics/account
 * @desc Deletes user account and all related data
 */
export async function DELETE(req: Request) {
  let session: Session | null = null;

  try {
    // Auth handled by Middleware
    const userId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role');
    const decodedUser = { userId, role };

    if (decodedUser.role === 'ADMIN') {
      return NextResponse.json(
        { message: 'Admin accounts cannot be deleted.' },
        { status: 403 }
      );
    }

    session = driver.session();

    // Delete user and all related data
    // This will cascade delete:
    // - User's sessions
    // - User's projects (if any)
    // - User's relationships (IS_AUTHOR_OF, REPRESENTS, CREATED_CALL, HAS_SESSION)
    const result = await session.run(
      `MATCH (a:Academic {userId: $userId})
       DETACH DELETE a
       RETURN a.userId AS deletedId`,
      { userId: decodedUser.userId }
    );

    if (result.records.length === 0) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

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

