import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByGoogleId, updateUser } from '@/lib/db';
import { generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { googleId, name, email, picture } = body;

    // Validation
    if (!googleId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user exists with Google ID
    let user = getUserByGoogleId(googleId);

    if (!user) {
      // Create new user
      user = createUser({
        name: name || email.split('@')[0],
        email,
        googleId,
        picture,
      });
    } else {
      // Update user with latest info
      updateUser(user.id, {
        picture,
      });
      user = updateUser(user.id, { picture })!;
    }

    // Generate token
    const token = generateToken(user);

    // Create response with cookie
    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          picture: user.picture,
        },
        token,
      },
      { status: 200 }
    );

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error('Google auth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
