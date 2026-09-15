import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { classifyAnthropicError } from "@/lib/anthropicError";

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
    return NextResponse.json({ connected: true });
  } catch (err) {
    const failure = classifyAnthropicError(err);
    return NextResponse.json(
      { connected: false, code: failure.code, error: failure.message },
      { status: failure.status }
    );
  }
}