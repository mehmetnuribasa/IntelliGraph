import { NextResponse } from 'next/server';
import driver from '@/lib/neo4j';
import { Session } from 'neo4j-driver';

import neo4j from 'neo4j-driver';
import jwt from 'jsonwebtoken';
import { GoogleGenerativeAI } from '@google/generative-ai';

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'access_secret';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

/**
 * @api {get} /api/calls/:id
 * @desc Gets a single funding call by ID
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let session: Session | null = null;
  const { id } = await params;

  try {
    session = driver.session();

    const result = await session.run(
      `MATCH (c:Call {callId: $callId})
       OPTIONAL MATCH (c)<-[:OPENS_CALL]-(i:Institution)
       OPTIONAL MATCH (u:Academic)-[:CREATED_CALL]->(c)
       RETURN c, i.name AS institutionName, u.name AS authorName, u.userId AS authorId`,
      { callId: id }
    );

    if (result.records.length === 0) {
      return NextResponse.json({ message: 'Funding call not found' }, { status: 404 });
    }

    const record = result.records[0];
    const callProps = record.get('c').properties;
    const { embedding, budget, ...callData } = callProps;

    return NextResponse.json({
      id: callData.callId,
      ...callData,
      budget: neo4j.isInt(budget) ? budget.toNumber() : budget,
      institutionName: record.get('institutionName'),
      authorName: record.get('authorName'),
      authorId: record.get('authorId')
    }, { status: 200 });

  } catch (error) {
    console.error('Get call error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  } finally {
    if (session) await session.close();
  }
}

/**
 * @api {put} /api/calls/:id
 * @desc Updates a funding call by ID (only by the creator)
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let session: Session | null = null;
  const { id } = await params;

  try {
    // Auth Check
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

    // Authorization check
    if (decodedUser.role !== 'FUNDING_MANAGER') {
      return NextResponse.json(
        { message: 'Forbidden. Only Funding Managers can edit calls.' },
        { status: 403 }
      );
    }

    // INPUT VALIDATION
    const body = await req.json();
    const { title, description, deadline, status, budget, website, keywords } = body;

    const errors: Record<string, string[]> = {};

    if (!title || typeof title !== 'string' || title.length < 5) {
      errors.title = ['Title must be at least 5 characters.'];
    }

    if (!description || typeof description !== 'string' || description.length < 20) {
      errors.description = ['Description must be at least 20 characters.'];
    }

    if (!deadline || isNaN(Date.parse(deadline))) {
      errors.deadline = ['Valid deadline date is required (YYYY-MM-DD).'];
    }

    if (status && !['Open', 'Closed', 'Paused'].includes(status)) {
      errors.status = ['Status must be one of: Open, Closed, Paused.'];
    }

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      errors.keywords = ['At least one keyword is required.'];
    }

    let parsedBudget = null;
    if (budget === undefined || budget === null || budget === '') {
      errors.budget = ['Budget is required.'];
    } else {
      const numBudget = Number(budget);
      if (isNaN(numBudget) || numBudget < 0) {
        errors.budget = ['Budget must be a valid positive number.'];
      } else {
        parsedBudget = numBudget;
      }
    }

    if (website && typeof website === 'string') {
      try {
        new URL(website);
      } catch (_) {
        errors.website = ['Website must be a valid URL.'];
      }
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ message: 'Invalid input.', errors }, { status: 400 });
    }

    // Generate new embedding for updated description
    let embeddingVector: number[] = [];
    try {
      const result = await embeddingModel.embedContent(description);
      embeddingVector = result.embedding.values;
    } catch (aiError) {
      console.error('Gemini Embedding Error:', aiError);
      return NextResponse.json({ message: 'AI service unavailable.' }, { status: 502 });
    }

    session = driver.session();

    // Update Query (Only if user created the call)
    const result = await session.run(
      `
      MATCH (u:Academic {userId: $userId})-[:CREATED_CALL]->(c:Call {callId: $callId})
      SET c.title = $title,
          c.description = $description,
          c.deadline = $deadline,
          c.status = $status,
          c.budget = $budget,
          c.website = $website,
          c.keywords = $keywords,
          c.embedding = $embedding,
          c.updatedAt = datetime()
      RETURN c.callId AS callId, c.title AS title
      `,
      {
        userId: decodedUser.userId,
        callId: id,
        title,
        description,
        deadline,
        status: status || 'Open',
        budget: parsedBudget !== null ? neo4j.int(parsedBudget) : null,
        website: website || null,
        keywords: keywords || [],
        embedding: embeddingVector
      }
    );

    if (result.records.length === 0) {
      return NextResponse.json(
        { message: 'Funding call not found or you are not authorized to edit it.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Funding call updated successfully',
      call: {
        id: result.records[0].get('callId'),
        title: result.records[0].get('title')
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Update call error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  } finally {
    if (session) await session.close();
  }
}

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
