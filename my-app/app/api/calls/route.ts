import { NextResponse } from 'next/server';
import driver from '@/lib/neo4j';
import neo4j, { Session } from 'neo4j-driver';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'access_secret';

// Initialize Gemini AI Client
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });


/**
 * @api {get} /api/calls
 * @desc Retrieves a list of research calls along with their institution details
 */
export async function GET() {
  let session: Session | null = null;
  try {
    session = driver.session();
    const result = await session.run(
      `
      MATCH (c:Call)<-[:OPENS_CALL]-(i:Institution)
      OPTIONAL MATCH (u:Academic)-[:CREATED_CALL]->(c)
      RETURN c.callId AS id, 
             c.title AS title, 
             c.description AS description, 
             c.deadline AS deadline,
             c.status AS status,
             c.budget AS budget,
             c.keywords AS keywords,
             i.name AS institutionName,
             u.name AS authorName,
             u.userId AS authorId
      ORDER BY c.createdAt DESC
      LIMIT 20
      `
    );

    const calls = result.records.map(record => {
      const budgetVal = record.get('budget');
      return {
        id: record.get('id'),
        title: record.get('title'),
        description: record.get('description'),
        deadline: record.get('deadline'),
        status: record.get('status'),
        budget: neo4j.isInt(budgetVal) ? budgetVal.toNumber() : budgetVal,
        keywords: record.get('keywords'),
        institutionName: record.get('institutionName'),
        authorName: record.get('authorName'),
        authorId: record.get('authorId')
      };
    });

    return NextResponse.json(calls, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'Server error.' }, { status: 500 });
  } finally {
    if (session) await session.close();
  }
}



/**
 * @api {post} /api/calls
 * @desc Creates a new research call (Only for FUNDING_MANAGER role)
 * @body { "title": "AI Research Grant", 
 *         "description": "Funding for innovative AI research projects.", 
 *         "deadline": "2024-12-31",
 *         "status": "Open"
 *       }
 */
export async function POST(req: Request) {
  let session: Session | null = null;

  try {
    // AUTHENTICATION (verify token)
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    let decodedUser: any;

    try {
      decodedUser = jwt.verify(token, ACCESS_TOKEN_SECRET);
    } catch (err) {
      return NextResponse.json({ message: 'Invalid token.' }, { status: 401 });
    }

    // AUTHORIZATION (check role is FUNDING_MANAGER)
    if (decodedUser.role !== 'FUNDING_MANAGER') {
       return NextResponse.json(
         { message: 'Forbidden. Only Funding Managers can create calls.' }, 
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
        errors.description = ['Description must be at least 20 characters (for AI analysis).'];
    }

    if (!deadline || isNaN(Date.parse(deadline))) {
        errors.deadline = ['Valid deadline date is required (YYYY-MM-DD).'];
    } else {
        if (new Date(deadline) < new Date()) {
            errors.deadline = ['Deadline cannot be in the past.'];
        }
    }

    if (status && !['Open', 'Closed', 'Paused'].includes(status)) {
        errors.status = ['Status must be one of: Open, Closed, Paused.'];
    }

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
        errors.keywords = ['At least one keyword is required.'];
    }

    // Budget Validation (Mandatory)
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

    // Website Validation (Optional)
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

    // AI EMBEDDING (create embedding for description)
    let embeddingVector: number[] = [];
    try {
      const result = await embeddingModel.embedContent(description);
      embeddingVector = result.embedding.values;
      
      if (embeddingVector.length !== 768) {
         console.warn(`Warning: Embedding dimension is not 768, received ${embeddingVector.length}.`);
      }
    } catch (aiError) {
      console.error('Gemini Embedding Error:', aiError);
      return NextResponse.json({ message: 'AI service unavailable.' }, { status: 502 });
    }

    // DATABASE RECORDING
    session = driver.session();
    const callId = uuidv4();
    const now = new Date().toISOString();

    const result = await session.run(
      `
      // Find the user who is opening the call
      MATCH (u:Academic {userId: $userId})
      
      // SECURITY CHECK: Find the institution the user represents
      // If the user is not assigned to any institution, this query returns empty and no action is taken.
      MATCH (u)-[:REPRESENTS]->(i:Institution)

      // Create the Call (with embedding)
      CREATE (c:Call {
         callId: $callId,
         title: $title,
         description: $description,
         deadline: $deadline,
         embedding: $embedding,
         status: $status,
         budget: $budget,
         website: $website,
         keywords: $keywords,
         createdAt: datetime($now)
      })

      // Establish Relationships
      // 1. Institution -> Opens Call
      CREATE (i)-[:OPENS_CALL]->(c)
      
      // 2. User -> Created Call (for logging purposes)
      CREATE (u)-[:CREATED_CALL]->(c)

      RETURN c.callId as callId, c.title as title, i.name as institutionName
      `,
      {
        userId: decodedUser.userId,
        callId,
        title,
        description,
        deadline,
        status: status || 'Open',
        budget: parsedBudget !== null ? neo4j.int(parsedBudget) : null,
        keywords: keywords || [],
        website: website || null,
        embedding: embeddingVector,
        now
      }
    );

    // If no records returned, user is not assigned to any institution
    if (result.records.length === 0) {
        return NextResponse.json(
            { message: 'Manager is not assigned to any institution. Contact Admin.' }, 
            { status: 400 }
        );
    }

    const record = result.records[0];

    return NextResponse.json(
        { 
            message: 'Call created successfully.', 
            call: {
                id: record.get('callId'),
                title: record.get('title'),
                institution: record.get('institutionName') // Returning the institution on whose behalf the call was opened
            }
        }, 
        { status: 201 }
    );

  } catch (error) {
        console.error('Create Call Error:', error);
        return NextResponse.json({ message: 'Server error.' }, { status: 500 });
  } finally {
        if (session) await session.close();
  }
}