import { NextRequest, NextResponse } from "next/server";
import { getClaude, ClaudeNotConfiguredError } from "../claudeClient";
import { classifyAnthropicError } from "@/lib/anthropicError";
import { clearAnthropicKeyCookie, readAnthropicKey } from "@/lib/anthropicKeyCookie";
import { getValidGoogleAccessToken } from "@/lib/googleAuth";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import type { HealthCheckResult } from "./types";

export const maxDuration = 60;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type GetReportBody = {
  healthReport?: {
    results?: HealthCheckResult[];
  };
  messages?: ChatMessage[];
  claudeText?: string;
  claudeReport?: {
    resultText?: string;
  };
};

export async function POST(req: NextRequest) {
  let userApiKey: string | null = null;

  try {
    userApiKey = readAnthropicKey(req);

    // Only logged-in users can use the chat.
    const accessToken = await getValidGoogleAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        { success: false, code: "unauthorized", error: "Please sign in with Google to run the AI audit." },
        { status: 401 }
      );
    }

    // 2) Rate limit: 5 AI audits per hour per user/IP.
    const windowMs = 60 * 60 * 1000;
    if (!rateLimit(`ai-audit:${clientIp(req)}`, 5, windowMs)) {
      return NextResponse.json(
        {
          success: false,
          error: "Chat limit reached. Try again in an hour.",
        },
        { status: 429, headers: { "Retry-After": "3600" } }
      );
    }

    const body = (await req.json()) as GetReportBody;
    const { healthReport, messages } = body;
    // Accept both field names the page may send.
    const claudeText: string = body.claudeText ?? body.claudeReport?.resultText ?? "";

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ success: false, error: "No messages." }, { status: 400 });
    }

    const prompt = [
      "Review the GTM health check and respond to the user's latest message.",
      healthReport ? `Health check report:\n${JSON.stringify(healthReport)}` : "",
      claudeText ? `Existing audit report:\n${claudeText}` : "",
      `Conversation:\n${messages.map((message) => `${message.role}: ${message.content}`).join("\n")}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const { client, model } = await getClaude({ userApiKey: userApiKey ?? undefined });
    const response = await client.messages.create({
      model,
      max_tokens: 8000,
      system: "You are a senior Google Tag Manager implementation and analytics consultant.",
      messages: [{ role: "user", content: prompt }],
    });

    const resultText = response.content
      .filter((content) => content.type === "text")
      .map((content) => content.text)
      .join("\n\n")
      .trim();

    return NextResponse.json({ success: true, reply: resultText });
  } catch (error) {
    if (error instanceof ClaudeNotConfiguredError) {
      console.error("[claude] Not configured:", String(error));
      return NextResponse.json({ success: false, error: "AI chat is not configured." }, { status: 500 });
    }
    const failure = classifyAnthropicError(error);
    const response = NextResponse.json(
      { success: false, code: failure.code, error: failure.message },
      { status: failure.status }
    );
    if (userApiKey && failure.code === "invalid_key") clearAnthropicKeyCookie(response);
    return response;
  }
}