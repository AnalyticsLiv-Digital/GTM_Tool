import { NextRequest, NextResponse } from 'next/server';
import {
  getUserByEmail,
  recordFailedLogin,
  recordSuccessfulLogin,
  verifyPassword,
} from '@/lib/db';
import { generateToken } from '@/lib/auth';
import { loginSchema, validateBody } from '@/lib/validation';
import { rateLimit } from '@/lib/rateLimit';
import { assertSameOrigin } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  try {
    if (!assertSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const ipKey = `login:${request.headers.get('x-forwarded-for') || 'anon'}`;
    if (!rateLimit(ipKey, 10, 60_000)) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again in a minute.' },
        { status: 429 }
      );
    }

    const parsed = await validateBody(request, loginSchema);
    if (!parsed.ok) return parsed.response;
    const { email, password } = parsed.data;

    const user = await getUserByEmail(email);
    if (!user || !user.password) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      return NextResponse.json(
        { error: 'Account temporarily locked. Try again later.' },
        { status: 423 }
      );
    }

    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      await recordFailedLogin(user.id);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    await recordSuccessfulLogin(user.id);
    const token = generateToken(user);

    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          picture: user.picture,
        },
      },
      { status: 200 }
    );

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
