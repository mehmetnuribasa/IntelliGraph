import { NextResponse } from 'next/server';
import driver from '@/lib/neo4j';
import { Session } from 'neo4j-driver';
import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'access_secret';
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;

/**
 * @api {post} /api/admin/assign-role
 * @desc Assigns 'FUNDING_MANAGER' role to a user and associates them with an institution
 * @body {
 *           "email": "user@example.com",
 *           "institutionName": "Tech University",
 *           "city": "Tech City",
 *           "type": "University",
 *           "website": "https://www.techuniversity.edu"
 * }
 */
export async function POST(req: Request) {
  let session: Session | null = null;

  try {
    // Verifying Admin Access Token
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    let decodedUser: any;
    try {
      decodedUser = jwt.verify(token, ACCESS_TOKEN_SECRET);
      if (decodedUser.role !== 'ADMIN') throw new Error();
    } catch (err) {
      return NextResponse.json({ message: 'Forbidden. Admin only.' }, { status: 403 });
    }

    // GET REQUEST BODY
    const body = await req.json();
    const { email, institutionName, city, type, website } = body;


    // INPUT VALIDATION
    const errors: Record<string, string[]> = {};

    if (!email || typeof email !== 'string' || !emailRegex.test(email)) {
        errors.email = ['Valid email is required.'];
    }

    if (!institutionName || typeof institutionName !== 'string' || institutionName.length < 3) {
        errors.institutionName = ['Institution name must be at least 3 characters.'];
    }

    if (!city || typeof city !== 'string' || city.length < 2) {
        errors.city = ['City is required.'];
    }

    if (!type || typeof type !== 'string' || type.length < 2) {
        errors.type = ['Type is required.'];
    }

    if (!website || typeof website !== 'string') {
        errors.website = ['Website is required.'];
    } else if (!urlRegex.test(website)) {
        errors.website = ['Invalid website URL format.'];
    }

    if (Object.keys(errors).length > 0) {
        return NextResponse.json(
          { message: 'Invalid input data.', errors },
          { status: 400 }
        );
    }

    session = driver.session();

    // ASSIGN ROLE AND INSTITUTION
    const result = await session.run(
        `
        // Find User by Email
        MATCH (u:Academic {email: $email})
        
        // Find or Create Institution
        MERGE (i:Institution {name: $institutionName})
        
        // If created for the first time, set these properties
        ON CREATE SET 
            i.institutionId = randomUUID(),
            i.city = $city,
            i.type = $type, // E.g., 'University', 'Funding Agency'
            i.website = $website,
            i.createdAt = datetime()

        // Update User Role
        SET u.role = 'FUNDING_MANAGER'

        // Remove Old REPRESENTS Relationship
        WITH u, i
        OPTIONAL MATCH (u)-[oldR:REPRESENTS]->(:Institution)
        DELETE oldR

        // Create New Relationship
        MERGE (u)-[:REPRESENTS]->(i)

        RETURN u.name, u.role, i.name, i.city
        `,
        { 
            email, 
            institutionName, 
            city: city, 
            type: type || 'Research Center',
            website: website || null
        }
    );

    if (result.records.length === 0) {
        return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    return NextResponse.json(
        { 
            message: 'Assignment successful.',
            details: result.records[0].toObject()
        },
        { status: 200 }
    );

  } catch (error) {
        console.error('Assign Role Error:', error);
        return NextResponse.json({ message: 'Server error.' }, { status: 500 });
  } finally {
        if (session) await session.close();
  }
}