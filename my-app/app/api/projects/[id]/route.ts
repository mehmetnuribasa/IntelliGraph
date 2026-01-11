import { NextResponse } from 'next/server';
import driver from '@/lib/neo4j';
import { Session } from 'neo4j-driver';

import neo4j from 'neo4j-driver';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

/**
 * @api {get} /api/projects/:id
 * @desc Gets a single project by ID
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
      `MATCH (p:Project {projectId: $projectId})
       OPTIONAL MATCH (p)<-[:IS_AUTHOR_OF]-(a:Academic)
       RETURN p, collect(a.name) as authorNames, collect(a.userId) as authorIds`,
      { projectId: id }
    );

    if (result.records.length === 0) {
      return NextResponse.json({ message: 'Project not found' }, { status: 404 });
    }

    const record = result.records[0];
    const projectProps = record.get('p').properties;
    const { embedding, budget, ...projectData } = projectProps;
    const authorNames = record.get('authorNames');
    const authorIds = record.get('authorIds');

    return NextResponse.json({
      ...projectData,
      budget: neo4j.isInt(budget) ? budget.toNumber() : budget,
      authorName: authorNames && authorNames.length > 0 ? authorNames.join(', ') : 'Unknown Author',
      authorId: authorIds && authorIds.length > 0 ? authorIds[0] : null,
      authorIds: authorIds || []
    }, { status: 200 });

  } catch (error) {
    console.error('Get project error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  } finally {
    if (session) await session.close();
  }
}

/**
 * @api {put} /api/projects/:id
 * @desc Updates a project by ID (only by the author)
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let session: Session | null = null;
  const { id } = await params;

  try {
    // Auth handled by Middleware
    const userId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role');
    const decodedUser = { userId, role };

    // INPUT VALIDATION
    const body = await req.json();
    const { title, summary, status, startDate, endDate, keywords, budget, website } = body;

    const errors: Record<string, string[]> = {};

    if (!title || typeof title !== 'string' || title.length < 3) {
      errors.title = ['Title must be at least 3 characters long.'];
    }

    if (!summary || typeof summary !== 'string' || summary.length < 10) {
      errors.summary = ['Summary must be at least 10 characters long.'];
    }

    if (keywords && !Array.isArray(keywords)) {
      errors.keywords = ['Keywords must be an array of strings.'];
    }

    let parsedBudget = null;
    if (budget) {
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

    const validStatuses = ['Planning', 'Active', 'Completed', 'Paused'];
    if (status && !validStatuses.includes(status)) {
      errors.status = [`Invalid status. Allowed: ${validStatuses.join(', ')}`];
    }

    let startIso = null;
    let endIso = null;

    if (startDate) {
      if (isNaN(Date.parse(startDate))) {
        errors.startDate = ['Invalid Start Date format.'];
      } else {
        startIso = new Date(startDate).toISOString().split('T')[0];
      }
    }

    if (endDate) {
      if (isNaN(Date.parse(endDate))) {
        errors.endDate = ['Invalid End Date format.'];
      } else {
        endIso = new Date(endDate).toISOString().split('T')[0];
      }
    }

    if (startIso && endIso && new Date(endIso) < new Date(startIso)) {
      errors.endDate = ['End Date cannot be earlier than Start Date.'];
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ message: 'Invalid input data.', errors }, { status: 400 });
    }

    // Generate new embedding for updated summary
    let embeddingVector: number[] = [];
    try {
      const result = await embeddingModel.embedContent(summary);
      embeddingVector = result.embedding.values;
    } catch (aiError) {
      console.error('Gemini Embedding Error:', aiError);
      return NextResponse.json({ message: 'AI service is unavailable.' }, { status: 502 });
    }

    session = driver.session();

    // Update Query (Only if user is author)
    const result = await session.run(
      `
      MATCH (a:Academic {userId: $userId})-[:IS_AUTHOR_OF]->(p:Project {projectId: $projectId})
      SET p.title = $title,
          p.summary = $summary,
          p.status = $status,
          p.startDate = $startDate,
          p.endDate = $endDate,
          p.keywords = $keywords,
          p.budget = $budget,
          p.website = $website,
          p.embedding = $embedding,
          p.updatedAt = datetime()
      RETURN p.projectId AS projectId, p.title AS title
      `,
      {
        userId: decodedUser.userId,
        projectId: id,
        title,
        summary,
        status: status || 'Planning',
        startDate: startIso,
        endDate: endIso,
        keywords: keywords || [],
        budget: parsedBudget !== null ? neo4j.int(parsedBudget) : null,
        website: website || null,
        embedding: embeddingVector
      }
    );

    if (result.records.length === 0) {
      return NextResponse.json(
        { message: 'Project not found or you are not authorized to edit it.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Project updated successfully',
      project: {
        id: result.records[0].get('projectId'),
        title: result.records[0].get('title')
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Update project error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  } finally {
    if (session) await session.close();
  }
}

/**
 * @api {delete} /api/projects/:id
 * @desc Deletes a project by ID (only by the author)
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let session: Session | null = null;
  const { id } = await params;

  try {
    // Auth handled by Middleware
    const userId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role');
    const decodedUser = { userId, role };

    session = driver.session();

    // Delete Query (Only if user is author)
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
