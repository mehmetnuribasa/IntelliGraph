import { NextResponse } from 'next/server';
import driver from '@/lib/neo4j';
import neo4j, { Session } from 'neo4j-driver';
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

    // 2. DATA RETRIEVAL (Search Logic)
    // We fetch a larger set of mixed results (Projects, Calls, Academics)
    // This will be used for BOTH the "Search Results List" and the "AI Context".
    const result = await session.run(
      `
      CALL {
        // --- PROJECTS ---
        WITH $vector AS queryVec
        CALL db.index.vector.queryNodes('project_embeddings', 5, queryVec)
        YIELD node AS p, score
        WHERE score >= 0.70 
        MATCH (p)<-[:IS_AUTHOR_OF]-(a:Academic)
        WITH p, score, collect(a.name) AS authorNames
        RETURN 'PROJECT' AS type, 
               p.projectId AS id, 
               p.title AS title, 
               p.summary AS content, 
               reduce(s = "", x IN authorNames | s + (CASE WHEN s = "" THEN "" ELSE ", " END) + x) AS source, 
               p.status AS status,
               p.budget AS budget,
               p.website AS website,
               p.keywords AS keywords,
               null AS deadline,
               score

        UNION

        // --- FUNDING CALLS ---
        WITH $vector AS queryVec
        CALL db.index.vector.queryNodes('call_embeddings', 5, queryVec)
        YIELD node AS c, score
        WHERE score >= 0.70
        MATCH (c)<-[:OPENS_CALL]-(i:Institution)
        WITH c, score, collect(i.name) AS instNames
        RETURN 'FUNDING CALL' AS type, 
               c.callId AS id, 
               c.title AS title, 
               c.description AS content, 
               reduce(s = "", x IN instNames | s + (CASE WHEN s = "" THEN "" ELSE ", " END) + x) AS source,
               c.status AS status,
               c.budget AS budget,
               c.website AS website,
               c.keywords AS keywords,
               c.deadline AS deadline,
               score

        UNION

        // --- RESEARCHERS (Text Based) ---
        WITH $refinedQuery AS q
        MATCH (a:Academic)
        WHERE toLower(a.name) CONTAINS toLower(q) OR toLower(a.bio) CONTAINS toLower(q)
        RETURN 'RESEARCHER' AS type, 
               a.userId AS id, 
               a.name AS title, 
               a.bio AS content, 
               a.institution AS source, 
               null AS status, 
               null AS budget,
               null AS website,
               null AS keywords,
               null AS deadline,
               0.8 AS score
      }
      RETURN type, id, title, content, source, status, budget, website, keywords, deadline, score
      ORDER BY score DESC
      LIMIT 20
      `,
      { 
        vector,
        refinedQuery
      }
    );
    
    // Format records for frontend (Search Results)
    const searchResults = result.records.map((record) => {
        const budgetVal = record.get('budget');
        return {
          type: record.get('type'),
          id: record.get('id'),
          title: record.get('title'),
          description: record.get('content') || '',
          source: record.get('source'), // Author or Institution
          status: record.get('status'),
          score: record.get('score'),
          budget: neo4j.isInt(budgetVal) ? budgetVal.toNumber() : budgetVal,
          website: record.get('website'),
          keywords: record.get('keywords'),
          deadline: record.get('deadline')
        };
    });

    // 3. CONTEXT CREATION (For AI)
    // We use the exact same results for the AI context to ensure consistency.
    const contextData = result.records.map(record => {
      const budgetVal = record.get('budget');
      const budget = neo4j.isInt(budgetVal) ? budgetVal.toNumber() : budgetVal;
      const keywords = record.get('keywords') ? (Array.isArray(record.get('keywords')) ? record.get('keywords').join(', ') : record.get('keywords')) : 'None';
      
      return `
      [TYPE: ${record.get('type')}]
      Title: ${record.get('title')}
      Status: ${record.get('status') || 'N/A'}
      Source (Person/Inst): ${record.get('source')}
      Detail: ${record.get('content')}
      Budget: ${budget ? budget + ' TL' : 'N/A'}
      Website: ${record.get('website') || 'N/A'}
      Keywords: ${keywords}
      ${record.get('deadline') ? `Deadline: ${record.get('deadline')}` : ''}
      `;
    }).join('\n---\n');

    let aiResponse = "";

    if (!contextData || result.records.length === 0) {
       const prompt = `The user searched for: "${refinedQuery}". No records matching over 70% were found in the database. Politely ask the user to try different terms.`;
       const fallbackRes = await chatModel.generateContent(prompt);
       aiResponse = fallbackRes.response.text();
    } else {
        // 4. LLM RESPONSE GENERATION
        const prompt = `
          ROLE: You are an expert Academic Research Assistant for the 'IntelliGraph' platform. Your goal is to help users find funding, collaborators, or literature based on the database records provided below.

          USER INPUT: "${query}"

          CONTEXT FROM DATABASE (Top ${result.records.length} matches):
          ${contextData}

          INSTRUCTIONS:
          1. **Be Conversational & Advisory:** Do not just list the results. Analyze them and speak directly to the user. (e.g., "Based on your interest in X, I found a perfect funding call...")
          2. **Synthesize Connections:** If the user asks about a topic, connect specific **Projects** with relevant **Funding Calls** or **Researchers**. Explain *why* they are a good match.
          3. **Use Metadata Strategically:** 
             - If there is a **Deadline**, mention urgency.
             - If there is a **Budget**, mention if it's a high-value opportunity.
             - Use **Keywords** to group similar results.
          4. **Address the Intent:**
             - If the user has a project idea, suggest funding calls.
             - If the user is looking for people, suggest researchers based on their projects/bios.
             - If the user asks a general question, answer it using the concepts found in the context.
          5. **Citation:** When mentioning a Project or Call, refer to its exact Title and Source so the user knows which card to click in the results list.
          6. **Fallbacks:** If the context doesn't fully answer the specific question, answer as best as you can with the available data, then politely suggest they might need to broaden their search.
          7. **Format:** Use bullet points or short paragraphs for readability. Keep it professional but encouraging.
        `;
    
        const chatResult = await chatModel.generateContent(prompt);
        aiResponse = chatResult.response.text();
    }

    // Return Unified Response
    return NextResponse.json({ 
        answer: aiResponse, 
        results: searchResults 
    });

  } catch (error) {
    console.error('RAG Error:', error);
    return NextResponse.json({ message: 'Server error.' }, { status: 500 });
  } finally {
    if (session) await session.close();
  }
}
