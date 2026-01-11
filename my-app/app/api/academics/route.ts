import { NextResponse } from 'next/server';
import driver from '@/lib/neo4j';
import { Session } from 'neo4j-driver';

/**
 * @api {get} /api/academics
 * @desc Retrieves a list of academics with their institution and project count
 */
export async function GET() {
  let session: Session | null = null;

  try {
    session = driver.session();

    // Get academics along with their institution and project count
    const result = await session.run(
      `
      MATCH (a:Academic)
      WHERE a.role <> 'ADMIN'
      // Find the institution the academic represents
      OPTIONAL MATCH (a)-[:REPRESENTS]->(i:Institution)
      // How many projects authored by the academic
      OPTIONAL MATCH (a)-[:IS_AUTHOR_OF]->(p:Project)
      
      RETURN a.userId AS id, 
             a.name AS name, 
             a.email AS email,
             a.title AS title, 
             a.bio AS bio,
             a.createdAt AS createdAt,
             i.name AS institution,
             count(p) AS projectCount
      ORDER BY projectCount DESC, a.name ASC
      `
    );

    const academics = result.records.map((record) => {
      return {
        id: record.get('id'),
        name: record.get('name'),
        email: record.get('email'),
        title: record.get('title'),
        bio: record.get('bio'),
        institution: record.get('institution') || 'Independent Researcher',
        projectCount: record.get('projectCount').toNumber(),
        createdAt: record.get('createdAt')
      };
    });

    return NextResponse.json(academics, { status: 200 });

  } catch (error) {
    console.error('Fetch Academics Error:', error);
    return NextResponse.json(
      { message: 'Server error fetching academics.' },
      { status: 500 }
    );
  } finally {
    if (session) {
      await session.close();
    }
  }
}