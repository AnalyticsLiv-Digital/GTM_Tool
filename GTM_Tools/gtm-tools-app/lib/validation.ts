import { NextResponse } from 'next/server';
import { z, ZodSchema } from 'zod';

export const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(254)
  .email('Invalid email address');

export const passwordField = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), {
    message: 'Password must include at least one letter and one number',
  });

export const nameField = z.string().trim().min(1).max(100);

export const registerSchema = z.object({
  name: nameField,
  email: emailField,
  password: passwordField,
});

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1).max(128),
});

export const googleIdTokenSchema = z.object({
  idToken: z.string().min(10),
});

type ValidationOk<T> = { ok: true; data: T };
type ValidationFail = { ok: false; response: NextResponse };

export async function validateBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<ValidationOk<T> | ValidationFail> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }),
    };
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    const first = result.error.issues[0];
    return {
      ok: false,
      response: NextResponse.json(
        { error: first?.message || 'Invalid request' },
        { status: 400 }
      ),
    };
  }
  return { ok: true, data: result.data };
}
