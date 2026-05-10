import { NextResponse } from 'next/server';

const AUTH_COOKIES = [
  'auth_token',
  'google_access_token',
  'google_access_token_expiry',
  'google_refresh_token',
];

export async function POST() {
  const response = NextResponse.json(
    { message: 'Logged out successfully' },
    { status: 200 }
  );
  for (const name of AUTH_COOKIES) response.cookies.delete(name);
  return response;
}
