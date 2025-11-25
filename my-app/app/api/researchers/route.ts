import { NextResponse } from 'next/server';
import driver from '@/lib/neo4j';
import { Session } from 'neo4j-driver';

/**
 * @api {get} /api/researchers
 * @desc Retrieves all researchers/academics with their project and publication counts
 */

export async function GET() {
  let session: Session | null = null;

  try {
    session = driver.session();

    const result = await session.run(`
      MATCH (a:Academic)
      OPTIONAL MATCH (a)-[:LEADS]->(p:Project)
      WITH a, COUNT(p) as projectCount
      RETURN a {
        .id,
        .name,
        .email,
        .institution,
        .title,
        .bio,
        .createdAt,
        projectCount: projectCount
      }
      ORDER BY projectCount DESC, a.createdAt DESC
      LIMIT 50
    `);

    const researchers = result.records.map((record) => record.get('a'));

    return NextResponse.json(researchers, { status: 200 });

  } catch (error) {
    console.error('Researchers retrieval error:', error);

    if (error instanceof Error) {
      if (error.message.includes('ServiceUnavailable') || error.message.includes('CONNECTION_FAILURE')) {
        return NextResponse.json(
          { message: 'Database connection failed. Please check if Neo4j is running.' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { message: 'Server error, could not retrieve researchers.' },
      { status: 500 }
    );
  } finally {
    if (session) {
      await session.close();
    }
  }
}