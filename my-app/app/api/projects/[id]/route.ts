import { NextResponse } from 'next/server';
import driver from '@/lib/neo4j';
import { Session } from 'neo4j-driver';
import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'access_secret';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let session: Session | null = null;
  const { id } = await params;

  try {
    // 1. Auth Check
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    let decodedUser: any;
    try {
      decodedUser = jwt.verify(token, ACCESS_TOKEN_SECRET);
    } catch (err) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    session = driver.session();

    // 2. Delete Query (Only if user is author)
    // We match the project by ID and the user by ID, and ensure they are connected.
    const result = await session.run(
      `
      MATCH (a:Academic {userId: $userId})-[:IS_AUTHOR_OF]->(p:Project {projectId: $projectId})
      DETACH DELETE p
      RETURN count(p) as deletedCount
      `,
      {
        userId: decodedUser.userId,
        projectId: id
      }
    );

    const deletedCount = result.records[0].get('deletedCount').toNumber();

    if (deletedCount === 0) {
      return NextResponse.json(
        { message: 'Project not found or you are not authorized to delete it.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Project deleted successfully' }, { status: 200 });

  } catch (error) {
    console.error('Delete project error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  } finally {
    if (session) await session.close();
  }
}
