import { NextResponse } from 'next/server';
import driver from '@/lib/neo4j';
import { Session } from 'neo4j-driver';
import { v4 as uuidv4 } from 'uuid';

/**
 * @api {post} /api/projects
 * @desc Creates a new research project by academics
 */
export async function POST(req: Request) {
  let session: Session | null = null;

  try {
    const body = await req.json();
    const {
      title,
      description,
      keywords,
      fieldOfStudy,
      startDate,
      endDate,
      budget,
      collaborators,
      publications,
      sdgGoals = [],
      status = 'ongoing',
      academicId
    } = body;

    // Input Validation
    const errors: Record<string, string[]> = {};

    if (!title || typeof title !== 'string' || title.length < 5) {
      errors.title = ['Project title must be at least 5 characters long.'];
    }

    if (!description || typeof description !== 'string' || description.length < 20) {
      errors.description = ['Description must be at least 20 characters long.'];
    }

    if (!fieldOfStudy || typeof fieldOfStudy !== 'string') {
      errors.fieldOfStudy = ['Field of study is required.'];
    }

    if (!academicId || typeof academicId !== 'string') {
      errors.academicId = ['Academic ID is required.'];
    }

    // Debug logging
    console.log('Project upload request:', {
      title,
      academicId,
      hasTitle: !!title,
      hasAcademicId: !!academicId
    });

    // If the 'errors' object is not empty, return an error response
    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { message: 'Invalid input data.', errors },
        { status: 400 }
      );
    }

    session = driver.session();

    // Verify academic exists (check both id and userId for backward compatibility)
    const academicResult = await session.run(
      'MATCH (a:Academic) WHERE a.id = $academicId OR a.userId = $academicId RETURN a',
      { academicId }
    );

    if (academicResult.records.length === 0) {
      return NextResponse.json(
        { message: 'Academic not found. Please logout and login again.' },
        { status: 404 }
      );
    }

    // Create project
    const projectId = uuidv4();
    const createdAt = new Date().toISOString();

    const result = await session.run(
      `
      MATCH (a:Academic) WHERE a.id = $academicId OR a.userId = $academicId
      CREATE (p:Project {
        id: $projectId,
        title: $title,
        description: $description,
        keywords: $keywords,
        fieldOfStudy: $fieldOfStudy,
        startDate: $startDate,
        endDate: $endDate,
        budget: $budget,
        collaborators: $collaborators,
        publications: $publications,
        sdgGoals: $sdgGoals,
        status: $status,
        createdAt: $createdAt
      })
      CREATE (a)-[:LEADS]->(p)
      RETURN p, a.name AS academicName, a.email AS academicEmail, a.institution AS institution
      `,
      {
        academicId,
        projectId,
        title,
        description,
        keywords: keywords || '',
        fieldOfStudy,
        startDate: startDate || '',
        endDate: endDate || '',
        budget: budget || '',
        collaborators: collaborators || '',
        publications: publications || '',
        sdgGoals,
        status,
        createdAt
      }
    );

    const projectRecord = result.records[0];
    const newProject = {
      ...projectRecord.get('p').properties,
      academicName: projectRecord.get('academicName'),
      academicEmail: projectRecord.get('academicEmail'),
      institution: projectRecord.get('institution')
    };

    return NextResponse.json(newProject, { status: 201 });

  } catch (error) {
    console.error('Project creation error:', error);

    if (error instanceof Error) {
      if (error.message.includes('ServiceUnavailable') || error.message.includes('CONNECTION_FAILURE')) {
        return NextResponse.json(
          { message: 'Database connection failed. Please check if Neo4j is running.' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { message: 'Server error, project creation failed.', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    if (session) {
      await session.close();
    }
  }
}

/**
 * @api {get} /api/projects
 * @desc Retrieves all research projects with academic information
 */
export async function GET() {
  let session: Session | null = null;

  try {
    session = driver.session();

    const result = await session.run(`
      MATCH (p:Project)
      OPTIONAL MATCH (a:Academic)-[:LEADS]->(p)
      RETURN p, a.name AS academicName, a.email AS academicEmail, a.institution AS institution
      ORDER BY p.createdAt DESC
      LIMIT 50
    `);

    const projects = result.records.map((record) => ({
      ...record.get('p').properties,
      academicName: record.get('academicName'),
      academicEmail: record.get('academicEmail'),
      institution: record.get('institution')
    }));

    return NextResponse.json(projects, { status: 200 });

  } catch (error) {
    console.error('Projects retrieval error:', error);

    if (error instanceof Error) {
      if (error.message.includes('ServiceUnavailable') || error.message.includes('CONNECTION_FAILURE')) {
        return NextResponse.json(
          { message: 'Database connection failed. Please check if Neo4j is running.' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { message: 'Server error, could not retrieve projects.' },
      { status: 500 }
    );
  } finally {
    if (session) {
      await session.close();
    }
  }
}