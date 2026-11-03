/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getClaude, ClaudeNotConfiguredError } from "../claudeClient";
import { classifyAnthropicError } from "@/lib/anthropicError";
import { getValidGoogleAccessToken } from "@/lib/googleAuth";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    // Only logged-in users can use the chat.
    const accessToken = await getValidGoogleAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: "Please sign in with Google to use the chat." },
        { status: 401 }
      );
    }

    // Rate limit: 30 chat messages per hour per user/IP.
    const limit = rateLimit(`ai-chat:${clientIp(req)}`, 30, 60 * 60 * 1000);
    if (!limit.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Chat limit reached. Try again in ${Math.ceil(limit.retryAfterSec / 60)} minute(s).`,
        },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const body = await req.json();
    const { healthReport, messages } = body;
    // Accept both field names the page may send.
    const claudeText: string = body.claudeText ?? body.claudeReport?.resultText ?? "";

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ success: false, error: "No messages." }, { status: 400 });
    }

    const failed = (healthReport?.results ?? []).filter((r: any) => !r.passed);

    const { client, model } = await getClaude();
    const response = await client.messages.create({
      model,
      max_tokens: 2000,
      system: `You are a senior Google Tag Manager consultant. Answer questions about this audit.
Score: ${healthReport?.score}%.
Failed checks: ${JSON.stringify(failed).slice(0, 30000)}
Earlier audit text: ${String(claudeText ?? "").slice(0, 10000)}`,
      messages: messages
        .slice(-20)
        .map((m: any) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: String(m.content),
        })),
    });

    const reply = response.content
      .filter((c: any) => c.type === "text")
      .map((c: any) => c.text)
      .join("\n\n")
      .trim();

    return NextResponse.json({ success: true, reply });
  } catch (error) {
    if (error instanceof ClaudeNotConfiguredError) {
      console.error("[claude] Not configured:", String(error));
      return NextResponse.json({ success: false, error: "AI chat is not configured." }, { status: 500 });
    }
    const failure = classifyAnthropicError(error);
    return NextResponse.json({ success: false, error: failure.message }, { status: failure.status });
  }
}