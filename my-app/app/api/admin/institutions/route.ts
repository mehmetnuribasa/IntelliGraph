import { NextResponse } from 'next/server';
import driver from '@/lib/neo4j';
import { Session } from 'neo4j-driver';
import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'access_secret';
const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;

// Admin Create or Update Institution
/**
 * @api {post} /api/admin/institutions
* @desc Creates a new institution or updates an existing one
* @body {
*           "institutionName": "Tech University",
*           "type": "University",
*           "city": "Tech City",
*           "website": "https://www.techuniversity.edu"
* }
*/
export async function POST(req: Request) {
  let session: Session | null = null;

  try {
    // ADMIN AUTH CHECK
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded: any = jwt.verify(token, ACCESS_TOKEN_SECRET);
      if (decoded.role !== 'ADMIN') {
        return NextResponse.json({ message: 'Forbidden. Admin access only.' }, { status: 403 });
      }
    } catch (err) {
      return NextResponse.json({ message: 'Invalid token.' }, { status: 401 });
    }

    // GET REQUEST BODY
    const body = await req.json();
    const { institutionName, type, city, website } = body;


    // INPUT VALIDATION
    const errors: Record<string, string[]> = {};

    if (!institutionName || typeof institutionName !== 'string' || institutionName.length < 3) {
        errors.institutionName = ['Institution Name is required and must be at least 3 characters.'];
    }

    if (!type || typeof type !== 'string' || type.length < 2) {
        errors.type = ['Type is required (e.g. University, Company).'];
    }

    if (!city || typeof city !== 'string' || city.length < 2) {
        errors.city = ['City is required.'];
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


    
    // DATABASE OPERATION (MERGE)
    // Update if exists, create if not
    session = driver.session();

    const result = await session.run(
      `
      MERGE (i:Institution {name: $institutionName})
      ON CREATE SET
        i.institutionId = randomUUID(),
        i.type = $type,
        i.city = $city,
        i.website = $website,
        i.createdAt = datetime()
      ON MATCH SET
        i.type = $type,
        i.city = $city,
        i.website = $website,
        i.updatedAt = datetime()
      RETURN i
      `,
      {
        institutionName: institutionName,
        type: type || 'Research Center',
        city: city,
        website: website || null
      }
    );

    const institution = result.records[0].get('i').properties;

    return NextResponse.json(
      { message: 'Institution processed successfully.', institution },
      { status: 201 }
    );

  } catch (error) {
        console.error('Admin Create Institution Error:', error);
        return NextResponse.json({ message: 'Server error.' }, { status: 500 });
  } finally {
        if (session) await session.close();
  }
}