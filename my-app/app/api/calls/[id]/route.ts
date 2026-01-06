import { NextResponse } from 'next/server';
import driver from '@/lib/neo4j';
import { Session } from 'neo4j-driver';

/**
 * @api {delete} /api/calls/[id]
 * @desc Deletes a funding call by ID
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let session: Session | null = null;

  try {
    session = driver.session();

    // Check if the call exists
    const checkResult = await session.run(
      `MATCH (c:Call {callId: $id}) RETURN c`,
      { id }
    );

    if (checkResult.records.length === 0) {
      return NextResponse.json(
        { message: 'Funding call not found.' },
        { status: 404 }
      );
    }

    // Delete the call and its relationships
    await session.run(
      `MATCH (c:Call {callId: $id}) DETACH DELETE c`,
      { id }
    );

    return NextResponse.json(
      { message: 'Funding call deleted successfully.' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error deleting funding call:', error);
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
