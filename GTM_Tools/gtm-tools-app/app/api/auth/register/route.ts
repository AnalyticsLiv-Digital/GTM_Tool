import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail, hashPassword } from '@/lib/db';
import { generateToken } from '@/lib/auth';
import { registerSchema, validateBody } from '@/lib/validation';
import { rateLimit } from '@/lib/rateLimit';
import { assertSameOrigin } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  try {
    if (!assertSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const ipKey = `register:${request.headers.get('x-forwarded-for') || 'anon'}`;
    if (!rateLimit(ipKey, 5, 60_000)) {
      return NextResponse.json(
        { error: 'Too many attempts. Try again in a minute.' },
        { status: 429 }
      );
    }

    const parsed = await validateBody(request, registerSchema);
    if (!parsed.ok) return parsed.response;
    const { name, email, password } = parsed.data;

    if (await getUserByEmail(email)) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const user = await createUser({ name, email, password: hashedPassword });
    const token = generateToken(user);

    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
      { status: 201 }
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
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
