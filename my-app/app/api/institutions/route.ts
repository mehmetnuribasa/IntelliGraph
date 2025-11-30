import { NextResponse } from 'next/server';
import driver from '@/lib/neo4j';
import { Session } from 'neo4j-driver';

/**
 * @api {get} /api/institutions
 * @desc Retrieves a list of institutions
 */
export async function GET() {
  let session: Session | null = null;

  try {
    session = driver.session();

    const result = await session.run(
      `MATCH (i:Institution) 
       RETURN i.name AS name, i.institutionId AS id, i.city AS city, i.type AS type, i.website AS website
       ORDER BY i.name ASC`
    );

    const institutions = result.records.map(record => record.toObject());

    return NextResponse.json(institutions, { status: 200 });

  } catch (error) {
        console.error('Get Institutions Error:', error);
        return NextResponse.json({ message: 'Server error.' }, { status: 500 });
  } finally {
        if (session) await session.close();
  }
}