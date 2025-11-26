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
        .userId,
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

    const researchers = result.records.map((record) => {
      const researcher = record.get('a');
      // Ensure we have an id field, fallback to userId or email as unique identifier
      if (!researcher.id && researcher.userId) {
        researcher.id = researcher.userId;
      } else if (!researcher.id && !researcher.userId) {
        researcher.id = researcher.email; // Use email as fallback unique identifier
      }
      // Convert Neo4j integer to JavaScript number
      if (researcher.projectCount && typeof researcher.projectCount === 'object') {
        researcher.projectCount = researcher.projectCount.toNumber ? researcher.projectCount.toNumber() : (researcher.projectCount.low || 0);
      }
      return researcher;
    });

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