import { NextResponse } from 'next/server';import { NextResponse } from 'next/server';

import driver from '@/lib/neo4j';import driver from '@/lib/neo4j';

import { Session } from 'neo4j-driver';import { Session } from 'neo4j-driver';

import { v4 as uuidv4 } from 'uuid';import { v4 as uuidv4 } from 'uuid';



/**/**

 * GET /api/projects - Retrieve all projects * GET /api/projects - Retrieve all projects

 * POST /api/projects - Create a new project * POST /api/projects - Create a new project

 */ */



export async function GET() {export async function GET() {

  let session: Session | null = null;  let session: Session | null = null;



  try {  try {

    session = driver.session();    session = driver.session();



    const result = await session.run(`    const projects = result.records.map((record) => {

      MATCH (p:Project)

      OPTIONAL MATCH (p)<-[:OWNS]-(a:Academic)    const result = await session.run(`      return record.get('p').properties;

      RETURN p, a

      ORDER BY p.createdAt DESC      MATCH (p:Project)    });

    `);

      OPTIONAL MATCH (p)<-[:OWNS]-(a:Academic)

    const projects = result.records.map((record) => {

      const project = record.get('p').properties;      RETURN p, a    return NextResponse.json(projects, { status: 200 });

      const academic = record.get('a')?.properties;

            ORDER BY p.createdAt DESC

      return {

        ...project,    `);  } catch (error) {

        researcher: academic ? {

          name: academic.name,    console.error('Neo4j query error:', error);

          institution: academic.institution,

          email: academic.email    const projects = result.records.map((record) => {    return NextResponse.json(

        } : null

      };      const project = record.get('p').properties;      { message: 'Internal Server Error' },

    });

      const academic = record.get('a')?.properties;      { status: 500 }

    return NextResponse.json(projects, { status: 200 });

          );

  } catch (error) {

    console.error('Neo4j query error:', error);      return {  } finally {

    return NextResponse.json(

      { message: 'Internal Server Error' },        ...project,    if (session) {

      { status: 500 }

    );        researcher: academic ? {      await session.close();

  } finally {

    if (session) {          name: academic.name,    }

      await session.close();

    }          institution: academic.institution,  }

  }

}          email: academic.email}

        } : null

export async function POST(req: Request) {      };

  let session: Session | null = null;    });



  try {    return NextResponse.json(projects, { status: 200 });

    const body = await req.json();

    const {   } catch (error) {

      userId,     console.error('Neo4j query error:', error);

      title,     return NextResponse.json(

      description,       { message: 'Internal Server Error' },

      keywords,       { status: 500 }

      fieldOfStudy,     );

      startDate,   } finally {

      endDate,     if (session) {

      budget,       await session.close();

      collaborators,     }

      publications,   }

      sdgGoals, }

      status 

    } = body;export async function POST(req: Request) {

  let session: Session | null = null;

    // Input Validation

    if (!userId || !title || !description || !fieldOfStudy) {  try {

      return NextResponse.json(    const body = await req.json();

        { message: 'Required fields: userId, title, description, fieldOfStudy' },    const { 

        { status: 400 }      userId, 

      );      title, 

    }      description, 

      keywords, 

    session = driver.session();      fieldOfStudy, 

      startDate, 

    // Verify that the user exists and is an Academic      endDate, 

    const userResult = await session.run(      budget, 

      'MATCH (a:Academic {userId: $userId}) RETURN a',      collaborators, 

      { userId }      publications, 

    );      sdgGoals, 

      status 

    if (userResult.records.length === 0) {    } = body;

      return NextResponse.json(

        { message: 'Academic user not found.' },    // Input Validation

        { status: 404 }    if (!userId || !title || !description || !fieldOfStudy) {

      );      return NextResponse.json(

    }        { message: 'Required fields: userId, title, description, fieldOfStudy' },

        { status: 400 }

    // Create the project      );

    const projectId = uuidv4();    }

    const createdAt = new Date().toISOString();

    session = driver.session();

    const result = await session.run(`

      MATCH (a:Academic {userId: $userId})    // Verify that the user exists and is an Academic

      CREATE (p:Project {    const userResult = await session.run(

        projectId: $projectId,      'MATCH (a:Academic {userId: $userId}) RETURN a',

        title: $title,      { userId }

        description: $description,    );

        keywords: $keywords,

        fieldOfStudy: $fieldOfStudy,    if (userResult.records.length === 0) {

        startDate: $startDate,      return NextResponse.json(

        endDate: $endDate,        { message: 'Academic user not found.' },

        budget: $budget,        { status: 404 }

        collaborators: $collaborators,      );

        publications: $publications,    }

        sdgGoals: $sdgGoals,

        status: $status,    // Create the project

        createdAt: datetime($createdAt)    const projectId = uuidv4();

      })    const createdAt = new Date().toISOString();

      CREATE (a)-[:OWNS]->(p)

      RETURN p, a    const result = await session.run(`

    `, {      MATCH (a:Academic {userId: $userId})

      userId,      CREATE (p:Project {

      projectId,        projectId: $projectId,

      title,        title: $title,

      description,        description: $description,

      keywords: keywords || '',        keywords: $keywords,

      fieldOfStudy,        fieldOfStudy: $fieldOfStudy,

      startDate: startDate || '',        startDate: $startDate,

      endDate: endDate || '',        endDate: $endDate,

      budget: budget || '',        budget: $budget,

      collaborators: collaborators || '',        collaborators: $collaborators,

      publications: publications || '',        publications: $publications,

      sdgGoals: sdgGoals || [],        sdgGoals: $sdgGoals,

      status: status || 'ongoing',        status: $status,

      createdAt        createdAt: datetime($createdAt)

    });      })

      CREATE (a)-[:OWNS]->(p)

    const project = result.records[0].get('p').properties;      RETURN p, a

    const academic = result.records[0].get('a').properties;    `, {

      userId,

    return NextResponse.json({      projectId,

      ...project,      title,

      researcher: {      description,

        name: academic.name,      keywords: keywords || '',

        institution: academic.institution,      fieldOfStudy,

        email: academic.email      startDate: startDate || '',

      }      endDate: endDate || '',

    }, { status: 201 });      budget: budget || '',

      collaborators: collaborators || '',

  } catch (error) {      publications: publications || '',

    console.error('Project creation error:', error);      sdgGoals: sdgGoals || [],

    return NextResponse.json(      status: status || 'ongoing',

      { message: 'Server error, project creation failed.' },      createdAt

      { status: 500 }    });

    );

  } finally {    const project = result.records[0].get('p').properties;

    if (session) {    const academic = result.records[0].get('a').properties;

      await session.close();

    }    return NextResponse.json({

  }      ...project,

}      researcher: {
        name: academic.name,
        institution: academic.institution,
        email: academic.email
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Project creation error:', error);
    return NextResponse.json(
      { message: 'Server error, project creation failed.' },
      { status: 500 }
    );
  } finally {
    if (session) {
      await session.close();
    }
  }
}