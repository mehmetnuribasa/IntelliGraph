import { NextResponse } from 'next/server';
import driver from '@/lib/neo4j';
import { Session } from 'neo4j-driver';

/**
 * @api {get} /api/search
 * @desc Searches projects and funding calls using text similarity
 * @query {string} q - Search query
 * @query {string} type - Search type (projects, funding-calls, all)
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const searchType = searchParams.get('type') || 'all';

  if (!query || query.trim().length < 2) {
    return NextResponse.json(
      { message: 'Search query must be at least 2 characters long.' },
      { status: 400 }
    );
  }

  let session: Session | null = null;

  try {
    session = driver.session();
    
    const results: any = {
      projects: [],
      fundingCalls: [],
      totalResults: 0
    };

    // Search projects if requested
    if (searchType === 'projects' || searchType === 'all') {
      const projectQuery = `
        MATCH (p:Project)
        OPTIONAL MATCH (a:Academic)-[:LEADS]->(p)
        WHERE toLower(p.title) CONTAINS toLower($query)
           OR toLower(p.description) CONTAINS toLower($query)
           OR toLower(p.keywords) CONTAINS toLower($query)
           OR toLower(p.fieldOfStudy) CONTAINS toLower($query)
        RETURN p, a.name AS academicName, a.institution AS institution
        ORDER BY 
          CASE 
            WHEN toLower(p.title) CONTAINS toLower($query) THEN 1
            WHEN toLower(p.keywords) CONTAINS toLower($query) THEN 2
            WHEN toLower(p.description) CONTAINS toLower($query) THEN 3
            ELSE 4
          END,
          p.createdAt DESC
        LIMIT 20
      `;

      const projectResult = await session.run(projectQuery, { query });
      
      results.projects = projectResult.records.map((record) => ({
        ...record.get('p').properties,
        academicName: record.get('academicName'),
        institution: record.get('institution'),
        type: 'project'
      }));
    }

    // Search funding calls if requested
    if (searchType === 'funding-calls' || searchType === 'all') {
      const callQuery = `
        MATCH (fc:FundingCall)
        OPTIONAL MATCH (i:Institution)-[:POSTED]->(fc)
        WHERE toLower(fc.title) CONTAINS toLower($query)
           OR toLower(fc.description) CONTAINS toLower($query)
           OR toLower(fc.eligibility) CONTAINS toLower($query)
           OR ANY(category IN fc.categories WHERE toLower(category) CONTAINS toLower($query))
           OR ANY(sdg IN fc.sdgFocus WHERE toLower(sdg) CONTAINS toLower($query))
        RETURN fc, i.name AS institutionName
        ORDER BY 
          CASE 
            WHEN toLower(fc.title) CONTAINS toLower($query) THEN 1
            WHEN ANY(category IN fc.categories WHERE toLower(category) CONTAINS toLower($query)) THEN 2
            WHEN toLower(fc.description) CONTAINS toLower($query) THEN 3
            ELSE 4
          END,
          fc.createdAt DESC
        LIMIT 20
      `;

      const callResult = await session.run(callQuery, { query });
      
      results.fundingCalls = callResult.records.map((record) => ({
        ...record.get('fc').properties,
        institutionName: record.get('institutionName'),
        type: 'funding-call'
      }));
    }

    results.totalResults = results.projects.length + results.fundingCalls.length;

    // If searching all, combine and sort results
    if (searchType === 'all') {
      const combinedResults = [
        ...results.projects,
        ...results.fundingCalls
      ].sort((a, b) => {
        // Simple relevance scoring based on title match
        const aScore = a.title.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
        const bScore = b.title.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
        
        if (aScore !== bScore) return bScore - aScore;
        
        // If same relevance, sort by creation date
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      results.combined = combinedResults.slice(0, 20);
    }

    return NextResponse.json(results, { status: 200 });

  } catch (error) {
    console.error('Search error:', error);

    if (error instanceof Error) {
      if (error.message.includes('ServiceUnavailable') || error.message.includes('CONNECTION_FAILURE')) {
        return NextResponse.json(
          { message: 'Database connection failed. Please check if Neo4j is running.' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { message: 'Server error, search failed.', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    if (session) {
      await session.close();
    }
  }
}