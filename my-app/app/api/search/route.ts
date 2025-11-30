import { NextResponse } from 'next/server';
import driver from '@/lib/neo4j';
import { Session } from 'neo4j-driver';
import { GoogleGenerativeAI } from '@google/generative-ai';

// API Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

export async function GET(req: Request) {
  let session: Session | null = null;

  try {
    // Get URL Parameter (?q=...)
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    // Empty search check
    if (!query || query.length < 2) {
      return NextResponse.json({ message: 'Search query is too short.' }, { status: 400 });
    }

    // Convert search text to vector (Gemini)
    let embeddingVector: number[] = [];
    try {
      const result = await embeddingModel.embedContent(query);
      embeddingVector = result.embedding.values;
    } catch (aiError) {
      console.error('Gemini Embedding Error:', aiError);
      return NextResponse.json({ message: 'AI Service Unavailable' }, { status: 502 });
    }

    session = driver.session();

    // Perform Combined Search Query
    // 1. Project Vector Search
    // 2. Call Vector Search
    // 3. Academic Name Search (Non-vector)
    const result = await session.run(
        `
        CALL {
            // PROJECT SEARCH (Vector Similarity)
            WITH $embeddingVector AS queryVec
            CALL db.index.vector.queryNodes('project_embeddings', 5, queryVec) // Top 5 most similar projects
            YIELD node AS p, score

            WHERE score >= 0.60 // Minimum similarity threshold

            // Find the author as well
            MATCH (p)<-[:IS_AUTHOR_OF]-(a:Academic)
            RETURN 'Project' AS type, 
                p.projectId AS id, 
                p.title AS title, 
                p.summary AS description, 
                a.name AS subtitle, // Author name
                score
                
            UNION // Combine results

            // CALLS SEARCH (Vector Similarity)
            WITH $embeddingVector AS queryVec
            CALL db.index.vector.queryNodes('call_embeddings', 5, queryVec) // Top 5 most similar calls
            YIELD node AS c, score

            WHERE score >= 0.60 // Minimum similarity threshold

            // Find the institution as well
            MATCH (c)<-[:OPENS_CALL]-(i:Institution)
            RETURN 'Call' AS type, 
                c.callId AS id, 
                c.title AS title, 
                c.description AS description, 
                i.name AS subtitle, // Institution name
                score

            UNION // Combine results

            // ACADEMICS SEARCH (Classic Name Search - Non-vector)
            WITH $queryText AS q
            MATCH (a:Academic)
            WHERE toLower(a.name) CONTAINS toLower(q) // Case-insensitive match
            RETURN 'Academic' AS type,
                a.userId AS id,
                a.name AS title,
                a.bio AS description,
                a.title AS subtitle, // Title (Prof. Dr.)
                1.0 AS score // Score 1.0 for exact match (or artificial score)
        }

        // Sort All by Score
        RETURN type, id, title, description, subtitle, score
        ORDER BY score DESC
        LIMIT 20
        `,
        
        {
            embeddingVector,
            queryText: query
        }
    );

    // Format Results
    const searchResults = result.records.map((record) => {
      return {
        type: record.get('type'),      // Project, Call, Academic
        id: record.get('id'),
        title: record.get('title'),
        description: record.get('description') ? record.get('description').substring(0, 150) + '...' : '', // Summarize
        subtitle: record.get('subtitle'), // Author, Institution, or Title
        score: record.get('score')     // Similarity score (0.0 - 1.0)
      };
    });

    return NextResponse.json({ results: searchResults }, { status: 200 });

  } catch (error) {
        console.error('Search API Error:', error);
        return NextResponse.json({ message: 'Server error during search.' }, { status: 500 });
  } finally {
        if (session) await session.close();
  }
}