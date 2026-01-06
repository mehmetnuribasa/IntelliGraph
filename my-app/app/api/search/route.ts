import { NextResponse } from 'next/server';
import driver from '@/lib/neo4j';
import { Session } from 'neo4j-driver';
import { GoogleGenerativeAI } from '@google/generative-ai';

// API Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
const chatModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function POST(req: Request) {
  let session: Session | null = null;

  try {
    // Get Body Parameter
    const { query } = await req.json();

    // Empty search check
    if (!query || query.length < 2) {
      return NextResponse.json({ message: 'Search query is too short.' }, { status: 400 });
    }

    // QUERY REFINEMENT
    let refinedQuery = query;

    if (query.length > 50 || query.split(' ').length > 10) { // If longer than 50 characters or more than 10 words, summarize it
        const refinementPrompt = `
        TASK: Analyze the following user input and convert it into the most appropriate, concise "search query" for a database search.
        
        USER INPUT: "${query}"
        
        RULES:
        1. Remove conversational phrases, greetings.
        2. Capture the user's core intent (Project topic, Academic field, Funding needs).
        3. Output ONLY the new query sentence, write nothing else.
        `;
        
        try {
          const refinementRes = await chatModel.generateContent(refinementPrompt);
          refinedQuery = refinementRes.response.text().trim();
          console.log(`Original: ${query}`);
          console.log(`Refined: ${refinedQuery}`);
        } catch (refineError) {
          console.error('Query Refinement Error:', refineError);
        }
    }

    // Convert search text to vector (We are using 'refinedQuery' here instead of 'query'!)
    let embeddingVector: number[] = [];
    try {
      const result = await embeddingModel.embedContent(refinedQuery);
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

            WHERE score >= 0.70 // Minimum similarity threshold

            // Find the author as well
            MATCH (p)<-[:IS_AUTHOR_OF]-(a:Academic)
            RETURN 'Project' AS type, 
                p.projectId AS id, 
                p.title AS title, 
                p.summary AS description, 
                a.name AS subtitle, // Author name
                p.status AS status,
                score
                
            UNION // Combine results

            // CALLS SEARCH (Vector Similarity)
            WITH $embeddingVector AS queryVec
            CALL db.index.vector.queryNodes('call_embeddings', 5, queryVec) // Top 5 most similar calls
            YIELD node AS c, score

            WHERE score >= 0.70 // Minimum similarity threshold

            // Find the institution as well
            MATCH (c)<-[:OPENS_CALL]-(i:Institution)
            RETURN 'Call' AS type, 
                c.callId AS id, 
                c.title AS title, 
                c.description AS description, 
                i.name AS subtitle, // Institution name
                c.status AS status,
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
                null AS status,
                a.title AS subtitle, // Title (Prof. Dr.)
                1.0 AS score // Score 1.0 for exact match (or artificial score)
        }

        // Sort All by Score
        RETURN type, id, title, description, subtitle, status, score
        ORDER BY score DESC
        LIMIT 20
        `,
        
        {
            embeddingVector,
            queryText: refinedQuery
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
        status: record.get('status'),
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