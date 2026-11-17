import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { classifyAnthropicError } from "@/lib/anthropicError";
import { clearAnthropicKeyCookie, readAnthropicKey, setAnthropicKeyCookie } from "@/lib/anthropicKeyCookie";

// Check the stored key is still good.
export async function GET(req: NextRequest) {
  const apiKey = readAnthropicKey(req);

  if (!apiKey) {
    return NextResponse.json({ connected: false, code: "no_key" });
  }

  try {
    const client = new Anthropic({ apiKey });
    // Token-free auth check.
    await client.models.list();
    return NextResponse.json({ connected: true });
  } catch (err) {
    const failure = classifyAnthropicError(err);
    const response = NextResponse.json(
      { connected: false, code: failure.code, error: failure.message },
      { status: failure.status }
    );
    if (failure.code === "invalid_key") clearAnthropicKeyCookie(response);
    return response;
  }
}

// Verify a new key BEFORE storing it, so a bad key never lands in the cookie.
export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-anthropic-key")?.trim();

  if (!apiKey) {
    return NextResponse.json(
      { connected: false, code: "no_key", error: "Missing API key." },
      { status: 400 }
    );
  }

  try {
    const client = new Anthropic({ apiKey });
    // Token-free auth check.
    await client.models.list();

    const response = NextResponse.json({ connected: true });
    setAnthropicKeyCookie(response, apiKey);
    return response;
  } catch (err) {
    const failure = classifyAnthropicError(err);
    return NextResponse.json(
      { connected: false, code: failure.code, error: failure.message },
      { status: failure.status }
    );
  }
}

// Remove the stored key.
export async function DELETE() {
  const response = NextResponse.json({ connected: false, code: "no_key" });
  clearAnthropicKeyCookie(response);
  return response;
}
