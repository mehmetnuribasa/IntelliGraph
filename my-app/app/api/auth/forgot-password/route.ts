import { NextResponse } from 'next/server';
import driver from '@/lib/neo4j';
import { Session } from 'neo4j-driver';

/**
 * @api {post} /api/auth/forgot-password
 * @desc Sends password reset email (placeholder - email service not implemented)
 * @body { "email": "..." }
 */
export async function POST(req: Request) {
  let session: Session | null = null;

  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { message: 'Email is required.' },
        { status: 400 }
      );
    }

    // Check if user exists
    session = driver.session();
    const result = await session.run(
      `MATCH (a:Academic {email: $email})
       RETURN a.userId AS userId, a.name AS name`,
      { email: email.toLowerCase() }
    );

    // Always return success message for security (don't reveal if email exists)
    // In production, you would send an email here with a reset token/link
    // For now, we'll just return a success message
    
    if (result.records.length > 0) {
      // User exists - in production, send reset email here
      // TODO: Implement email service
      // const resetToken = generateResetToken();
      // await sendPasswordResetEmail(email, resetToken);
      
      return NextResponse.json(
        { 
          message: 'If an account with that email exists, a password reset link has been sent.' 
        },
        { status: 200 }
      );
    } else {
      // User doesn't exist - still return success for security
      return NextResponse.json(
        { 
          message: 'If an account with that email exists, a password reset link has been sent.' 
        },
        { status: 200 }
      );
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ message: 'Server error.' }, { status: 500 });
  } finally {
    if (session) await session.close();
  }
}

