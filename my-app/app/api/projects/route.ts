import { NextResponse } from 'next/server';
import driver from '@/lib/neo4j';
import neo4j, { Session } from 'neo4j-driver';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';

/**
 * @api {get} /api/projects
 * @desc Retrieves a list of projects with author names
 */
export async function GET() {
  let session: Session | null = null;

  try {
    session = driver.session();

    const result = await session.run(
      `MATCH (p:Project)
       OPTIONAL MATCH (p)<-[:IS_AUTHOR_OF]-(a:Academic) 
       RETURN p, collect(a.name) as authorNames, collect(a.userId) as authorIds
       ORDER BY p.createdAt DESC 
       LIMIT 20`
    );

    const projects = result.records.map((record) => {
      const projectProps = record.get('p').properties;
      const { embedding, budget, ...projectData } = projectProps; // Exclude embedding from response
      const authorNames = record.get('authorNames');
      const authorIds = record.get('authorIds');
      
      return {
          ...projectData,
          budget: neo4j.isInt(budget) ? budget.toNumber() : budget,
          website: projectProps.website || null,
          authorName: authorNames && authorNames.length > 0 ? authorNames.join(', ') : 'Unknown Author',
          authorId: authorIds && authorIds.length > 0 ? authorIds[0] : null,
          authorIds: authorIds || [] // Include all author IDs for filtering
      };
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



/**
 * @api {post} /api/projects
 * @desc Creates a new project with AI Embeddings
 * @body { "title": "Artificial Intelligence Research", 
 *         "summary": "Exploring the latest advancements in AI technologies.", 
 *         "status": "Active",
 *         "startDate": "2024-01-01",
 *         "endDate": "2024-12-31"
 *       }
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'access_secret';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" }); // Selecting embedding model. We choose text-embedding-004 for best performance.

export async function POST(req: Request) {
  let session: Session | null = null;

  try {
    // Verifying the Access Token from Authorization Header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized access. Token required.' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    let decodedUser: any;

    try {
      decodedUser = jwt.verify(token, ACCESS_TOKEN_SECRET);
    } catch (err) {
      return NextResponse.json({ message: 'Invalid or expired token.' }, { status: 401 });
    }


    // INPUT VALIDATION
    const body = await req.json();
    const { title, summary, status, startDate, endDate, keywords, budget, website } = body;

    const errors: Record<string, string[]> = {};

    // Title Check
    if (!title || typeof title !== 'string' || title.length < 3) {
        errors.title = ['Title must be at least 3 characters long.'];
    }

    // Summary Check (Important for AI)
    if (!summary || typeof summary !== 'string' || summary.length < 10) {
        errors.summary = ['Summary must be at least 10 characters long to generate embeddings.'];
    }

    // Keywords Check (Optional but must be array if present)
    if (keywords && !Array.isArray(keywords)) {
        errors.keywords = ['Keywords must be an array of strings.'];
    }

    // Budget Check (Optional)
    let parsedBudget = null;
    if (budget) {
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

    // Status Check (Optional whitelist)
    const validStatuses = ['Planning', 'Active', 'Completed', 'Paused'];
    if (status && !validStatuses.includes(status)) {
        errors.status = [`Invalid status. Allowed: ${validStatuses.join(', ')}`];
    }

    // Date Validations
    let startIso = null;
    let endIso = null;

    if (startDate) {
        if (isNaN(Date.parse(startDate))) {
            errors.startDate = ['Invalid Start Date format.'];
        } else {
            startIso = new Date(startDate).toISOString().split('T')[0]; // YYYY-MM-DD
        }
    }

    if (endDate) {
        if (isNaN(Date.parse(endDate))) {
            errors.endDate = ['Invalid End Date format.'];
        } else {
            endIso = new Date(endDate).toISOString().split('T')[0];
        }
    }

    // Logic: End Date cannot be before Start Date
    if (startIso && endIso && new Date(endIso) < new Date(startIso)) {
        errors.endDate = ['End Date cannot be earlier than Start Date.'];
    }

    // Return errors if any
    if (Object.keys(errors).length > 0) {
        return NextResponse.json({ message: 'Invalid input data.', errors }, { status: 400 });
    }


    // AI EMBEDDING CREATION (The Magic Part)
    // Converting project summary to vector.
    let embeddingVector: number[] = [];
    try {
      const result = await embeddingModel.embedContent(summary);
      embeddingVector = result.embedding.values;
      
      // Check embedding dimension
      // (Neo4j index expects 768, if different it will throw an error)
      if (embeddingVector.length !== 768) {
         console.warn(`Warning: Embedding dimension is not 768, received ${embeddingVector.length}.`);
      }

    } catch (aiError) {
      console.error('Gemini Embedding Error:', aiError);
      return NextResponse.json({ message: 'AI service is unavailable.' }, { status: 502 });
    }

    // DATABASE RECORDING (Neo4j)
    session = driver.session();
    const projectId = uuidv4();
    const now = new Date().toISOString();

    const result = await session.run(
      `
      // Find the Academic by userId
      MATCH (a:Academic {userId: $userId})

      // Create the New Project (with vector)
      CREATE (p:Project {
        projectId: $projectId,
        title: $title,
        summary: $summary,
        status: $status,
        startDate: $startDate,
        endDate: $endDate,
        keywords: $keywords,
        budget: $budget,
        website: $website,
        isScraped: false,
        embedding: $embedding, // <-- Saving the vector here
        createdAt: datetime($now)
      })

      // Establish the Relationship: Academic -> IS_AUTHOR_OF -> Project
      CREATE (a)-[:IS_AUTHOR_OF {role: 'Lead'}]->(p)

      RETURN p.projectId AS projectId, p.title AS title
      `,
      {
        userId: decodedUser.userId, // User ID from token (Verified)
        projectId,
        title,
        summary,
        status: status || 'Planning',
        startDate: startDate || null,
        endDate: endDate || null,
        keywords: keywords || [],
        website: website || null,
        budget: parsedBudget !== null ? neo4j.int(parsedBudget) : null,
        embedding: embeddingVector,
        now
      }
    );

    if (result.records.length === 0) {
        return NextResponse.json({ message: 'User not found, project creation failed.' }, { status: 404 });
    }

    return NextResponse.json(
      { 
        message: 'Project created successfully.', 
        project: {
            id: result.records[0].get('projectId'),
            title: result.records[0].get('title')
        }
      }, 
      { status: 201 }
    );

  } catch (error) {
      console.error('Project creation error:', error);
      return NextResponse.json({ message: 'Server error.' }, { status: 500 });
  } finally {
      if (session) await session.close();
  }
}