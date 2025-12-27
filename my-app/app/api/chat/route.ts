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
    const { query } = await req.json(); // User's long text

    if (!query) {
      return NextResponse.json({ message: 'Query is required.' }, { status: 400 });
    }

    // QUERY REFINEMENT
    // If the user's text is very short (e.g., "AI"), skip this step and search directly.
    // But if it's long, extract the "intent".
    
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
        
        const refinementRes = await chatModel.generateContent(refinementPrompt);
        refinedQuery = refinementRes.response.text().trim();
        
        // Log to console to see the difference (Great for debugging)
        console.log(`Original: ${query}`);
        console.log(`Refined: ${refinedQuery}`);
    }

    // 1. EMBEDDING (Using the refined query)
    let vector: number[] = [];
    try {
      const result = await embeddingModel.embedContent(refinedQuery);
      vector = result.embedding.values;
    } catch (aiError) {
      return NextResponse.json({ message: 'AI Embedding service error.' }, { status: 502 });
    }

    session = driver.session();

    // 2. BALANCED DATA RETRIEVAL
    // Sending refinedQuery as queryText here
    const result = await session.run(
      `
      CALL {
        // --- PROJECTS ---
        WITH $vector AS queryVec
        CALL db.index.vector.queryNodes('project_embeddings', 5, queryVec)
        YIELD node AS p, score
        WHERE score >= 0.70 
        MATCH (p)<-[:IS_AUTHOR_OF]-(a:Academic)
        RETURN 'PROJECT' AS type, p.title AS title, p.summary AS content, a.name AS source, p.status AS status, score
        LIMIT 3

        UNION

        // --- FUNDING CALLS ---
        WITH $vector AS queryVec
        CALL db.index.vector.queryNodes('call_embeddings', 5, queryVec)
        YIELD node AS c, score
        WHERE score >= 0.70
        MATCH (c)<-[:OPENS_CALL]-(i:Institution)
        RETURN 'FUNDING CALL' AS type, c.title AS title, c.description AS content, i.name AS source, c.status AS status, score
        LIMIT 3

        UNION

        // --- RESEARCHERS (Text Based) ---
        WITH $refinedQuery AS q
        MATCH (a:Academic)
        // Using the refined query here as well
        WHERE toLower(a.name) CONTAINS toLower(q) OR toLower(a.bio) CONTAINS toLower(q)
        RETURN 'RESEARCHER' AS type, a.name AS title, a.bio AS content, a.institution AS source, null AS status, 0.8 AS score
        LIMIT 3
      }
      RETURN type, title, content, source, status, score
      `,
      { 
        vector,
        refinedQuery
      }
    );

    // 3. CONTEXT CREATION
    const contextData = result.records.map(record => {
      return `
      [TYPE: ${record.get('type')}]
      Title: ${record.get('title')}
      Status: ${record.get('status') || 'N/A'}
      Related Person/Institution: ${record.get('source')}
      Detail: ${record.get('content')}
      `;
    }).join('\n---\n');

    if (!contextData || result.records.length === 0) {
       const prompt = `The user searched for: "${refinedQuery}". No records matching over 70% were found in the database. Politely ask the user to try different terms.`;
       const fallbackRes = await chatModel.generateContent(prompt);
       return NextResponse.json({ answer: fallbackRes.response.text() });
    }

    // 4. LLM RESPONSE GENERATION
    // Here we provide both the original question and the context to the prompt.
    const systemNote = query !== refinedQuery 
      ? `(System note: The user is actually looking for the topic "${refinedQuery}")` 
      : '';

    const prompt = `
      You are the assistant for the 'IntelliGraph' platform.
      
      USER QUESTION: "${query}" 
      ${systemNote}

      Answer the user using the database records (Context) below.

      DATABASE CONTEXT:
      ${contextData}

      RULES:
      1. Use ONLY the data above.
      2. Answer the user's question directly.
      3. If there is a match between Projects and Funds, mention it.
    `;

    const chatResult = await chatModel.generateContent(prompt);
    const aiResponse = chatResult.response.text();

    return NextResponse.json({ answer: aiResponse });

  } catch (error) {
    console.error('RAG Error:', error);
    return NextResponse.json({ message: 'Server error.' }, { status: 500 });
  } finally {
    if (session) await session.close();
  }
}