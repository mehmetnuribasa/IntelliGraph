import { NextResponse } from 'next/server';
import driver from '@/lib/neo4j';
import { Session } from 'neo4j-driver';

/**
 * @api {get} /api/academics/[id]
 * @desc Retrieves a specific academic's profile by ID
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let session: Session | null = null;

  try {
    session = driver.session();

    const result = await session.run(
      `
      MATCH (a:Academic {userId: $id})
      OPTIONAL MATCH (a)-[:REPRESENTS]->(i:Institution)
      OPTIONAL MATCH (a)-[:IS_AUTHOR_OF]->(p:Project)
      
      RETURN a.userId AS id, 
             a.name AS name, 
             a.email AS email,
             a.title AS title, 
             a.bio AS bio,
             a.role AS role,
             a.createdAt AS createdAt,
             i.name AS institution,
             count(p) AS projectCount
      `,
      { id }
    );

    if (result.records.length === 0) {
      return NextResponse.json(
        { message: 'Academic not found' },
        { status: 404 }
      );
    }

    const record = result.records[0];
    const academic = {
      id: record.get('id'),
      name: record.get('name'),
      email: record.get('email'),
      title: record.get('title'),
      bio: record.get('bio'),
      role: record.get('role'),
      institution: record.get('institution') || 'Independent Researcher',
      projectCount: record.get('projectCount').toNumber(),
      createdAt: record.get('createdAt')
    };

    return NextResponse.json(academic, { status: 200 });

  } catch (error) {
    console.error('Error fetching academic profile:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  } finally {
    if (session) {
      await session.close();
    }
  }
}
