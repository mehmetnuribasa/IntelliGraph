import { NextResponse } from 'next/server';
import driver from '@/lib/neo4j';
import { Session } from 'neo4j-driver';

// GET /api/projects
export async function GET() {
  let session: Session | null = null;

  try {
    session = driver.session();

    const result = await session.run(
      'MATCH (p:PLAYER) RETURN p LIMIT 10'
    );

    const projects = result.records.map((record) => {
      return record.get('p').properties;
    });

    return NextResponse.json(projects, { status: 200 });

  } catch (error) {
    console.error('Neo4j query error:', error);
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