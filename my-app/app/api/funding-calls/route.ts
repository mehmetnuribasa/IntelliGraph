import { NextResponse } from 'next/server';
import driver from '@/lib/neo4j';
import { Session } from 'neo4j-driver';
import { v4 as uuidv4 } from 'uuid';

/**
 * @api {post} /api/funding-calls
 * @desc Creates a new funding call by institutions
 * @body {
 * "title": "TÜBİTAK 1001 - Scientific and Technological Research Projects",
 * "description": "Supporting basic and applied research projects...",
 * "fundingAmount": "50,000 - 500,000 TL per project",
 * "applicationDeadline": "2025-12-31",
 * "eligibility": "Academic institutions and researchers...",
 * "categories": ["Basic Research", "Applied Research"],
 * "requirements": "Project proposal, budget, team details...",
 * "contactInfo": "contact@tubitak.gov.tr",
 * "website": "https://www.tubitak.gov.tr/",
 * "sdgFocus": ["Quality Education", "Industry Innovation"],
 * "applicationProcess": "Submit through online portal...",
 * "evaluationCriteria": "Scientific merit, feasibility, impact...",
 * "institutionId": "uuid-of-institution"
 * }
 */

export async function POST(req: Request) {
  let session: Session | null = null;

  try {
    const body = await req.json();
    const {
      title,
      description,
      fundingAmount,
      applicationDeadline,
      eligibility,
      categories = [],
      requirements,
      contactInfo,
      website,
      sdgFocus = [],
      applicationProcess,
      evaluationCriteria,
      institutionId
    } = body;

    // Input Validation
    const errors: Record<string, string[]> = {};

    if (!title || typeof title !== 'string' || title.length < 5) {
      errors.title = ['Call title must be at least 5 characters long.'];
    }

    if (!description || typeof description !== 'string' || description.length < 20) {
      errors.description = ['Description must be at least 20 characters long.'];
    }

    if (!fundingAmount || typeof fundingAmount !== 'string') {
      errors.fundingAmount = ['Funding amount is required.'];
    }

    if (!applicationDeadline || typeof applicationDeadline !== 'string') {
      errors.applicationDeadline = ['Application deadline is required.'];
    } else {
      const deadline = new Date(applicationDeadline);
      if (deadline <= new Date()) {
        errors.applicationDeadline = ['Application deadline must be in the future.'];
      }
    }

    if (!eligibility || typeof eligibility !== 'string' || eligibility.length < 10) {
      errors.eligibility = ['Eligibility criteria must be at least 10 characters long.'];
    }

    if (!institutionId || typeof institutionId !== 'string') {
      errors.institutionId = ['Institution ID is required.'];
    }

    // If the 'errors' object is not empty, return an error response
    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { message: 'Invalid input data.', errors },
        { status: 400 }
      );
    }

    session = driver.session();

    // Verify institution exists
    const institutionResult = await session.run(
      'MATCH (i:Institution {id: $institutionId}) RETURN i',
      { institutionId }
    );

    if (institutionResult.records.length === 0) {
      return NextResponse.json(
        { message: 'Institution not found.' },
        { status: 404 }
      );
    }

    // Create funding call
    const callId = uuidv4();
    const createdAt = new Date().toISOString();

    const result = await session.run(
      `
      MATCH (i:Institution {id: $institutionId})
      CREATE (fc:FundingCall {
        id: $callId,
        title: $title,
        description: $description,
        fundingAmount: $fundingAmount,
        applicationDeadline: $applicationDeadline,
        eligibility: $eligibility,
        categories: $categories,
        requirements: $requirements,
        contactInfo: $contactInfo,
        website: $website,
        sdgFocus: $sdgFocus,
        applicationProcess: $applicationProcess,
        evaluationCriteria: $evaluationCriteria,
        createdAt: $createdAt,
        status: 'active'
      })
      CREATE (i)-[:POSTED]->(fc)
      RETURN fc
      `,
      {
        institutionId,
        callId,
        title,
        description,
        fundingAmount,
        applicationDeadline,
        eligibility,
        categories,
        requirements: requirements || '',
        contactInfo: contactInfo || '',
        website: website || '',
        sdgFocus,
        applicationProcess: applicationProcess || '',
        evaluationCriteria: evaluationCriteria || '',
        createdAt
      }
    );

    const newCall = result.records[0].get('fc').properties;

    return NextResponse.json(newCall, { status: 201 });

  } catch (error) {
    console.error('Funding call creation error:', error);

    if (error instanceof Error) {
      if (error.message.includes('ServiceUnavailable') || error.message.includes('CONNECTION_FAILURE')) {
        return NextResponse.json(
          { message: 'Database connection failed. Please check if Neo4j is running.' },
          { status: 503 }
        );
      }
      if (error.message.includes('AuthenticationError')) {
        return NextResponse.json(
          { message: 'Database authentication failed. Please check Neo4j credentials.' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { message: 'Server error, funding call creation failed.', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    if (session) {
      await session.close();
    }
  }
}

/**
 * @api {get} /api/funding-calls
 * @desc Retrieves all active funding calls
 */
export async function GET() {
  let session: Session | null = null;

  try {
    session = driver.session();

    const result = await session.run(`
      MATCH (fc:FundingCall)
      OPTIONAL MATCH (i:Institution)-[:POSTED]->(fc)
      RETURN fc, i.name AS institutionName
      ORDER BY fc.createdAt DESC
      LIMIT 50
    `);

    const fundingCalls = result.records.map((record) => ({
      ...record.get('fc').properties,
      institutionName: record.get('institutionName')
    }));

    return NextResponse.json(fundingCalls, { status: 200 });

  } catch (error) {
    console.error('Funding calls retrieval error:', error);

    return NextResponse.json(
      { message: 'Server error, could not retrieve funding calls.' },
      { status: 500 }
    );
  } finally {
    if (session) {
      await session.close();
    }
  }
}
