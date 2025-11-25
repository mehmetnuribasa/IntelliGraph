import { NextResponse } from 'next/server';
import driver from '@/lib/neo4j';
import { Session } from 'neo4j-driver';
import { hash } from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

/**
 * @api {post} /api/academics/register
 * @desc Creates a new academic user
 * @body {
 * "name": "Prof. Dr. Elif Yılmaz",
 * "email": "elif.yilmaz@uni.edu.tr",
 * "password": "Elif.123",
 * "title": "Prof. Dr." (Optional),
 * "bio": "Expert in artificial intelligence and NLP..." (Optional)
 * }
 */

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let session: Session | null = null;

  try {
    const body = await req.json();
    const { name, email, password, title, bio } = body;

    // Input Validation
    const errors: Record<string, string[]> = {};

    // Name Control
    if (!name || typeof name !== 'string' || name.length < 2) {
      errors.name = ['Name must be at least 2 characters long.'];
    }

    // Email Control
    if (!email || typeof email !== 'string' || !emailRegex.test(email)) {
      errors.email = ['Please enter a valid email address.'];
    }

    // Password Control
    if (!password || typeof password !== 'string') {
       errors.password = ['Password is required.'];
    } else {
       if (password.length < 8) {
          errors.password = ['Password must be at least 8 characters long.'];
       } 
       
       const complexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).+$/;
       if (!complexityRegex.test(password)) {
          if (!errors.password) errors.password = [];
          errors.password.push(
             'Password must contain at least one uppercase letter, one lowercase letter, and one special character.'
          );
       }
    }

    // If the 'errors' object is not empty, return an error response
    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { message: 'Invalid input data.', errors },
        { status: 400 }
      );
    }

    
    session = driver.session();

    // Email Uniqueness Check
    const existingUserResult = await session.run(
      'MATCH (a:Academic {email: $email}) RETURN a',
      { email: email.toLowerCase() }
    );

    if (existingUserResult.records.length > 0) {
      return NextResponse.json(
        { message: 'Email address is already in use.' },
        { status: 409 } // 409 Conflict
      );
    }

    // Hashing the Password
    const passwordHash = await hash(password, 10);

    // Preparing Data for the Database
    const userId = uuidv4();
    const createdAt = new Date().toISOString();

    // An object for optional fields
    const optionalProps: { title?: string; bio?: string } = {};
    if (title) optionalProps.title = title;
    if (bio) optionalProps.bio = bio;

    // Writing Data to Neo4j (CREATE)
    // The 'SET a += $optionalProps' query only adds fields that exist in the optionalProps object.
    const result = await session.run(
      `CREATE (a:Academic {
          userId: $userId,
          email: $email,
          name: $name,
          passwordHash: $passwordHash,
          createdAt: datetime($createdAt)
      }) 
      SET a += $optionalProps
      RETURN a.userId, a.email, a.name, a.title, a.bio, a.createdAt`,
      {
        userId,
        email: email.toLowerCase(),
        name,
        passwordHash,
        createdAt,
        optionalProps,
      }
    );

    const newUser = result.records[0].toObject();

    return NextResponse.json(newUser, { status: 201 }); // 201 Created
    
  } catch (error) {
      console.error('Error occurred:', error);
      return NextResponse.json(
        { message: 'Server error, registration failed.' },
        { status: 500 }
      );
  } finally {
      // Closing the Session
      if (session) {
        await session.close();
      }
  }
}