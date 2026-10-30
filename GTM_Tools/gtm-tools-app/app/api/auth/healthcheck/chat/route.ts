import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { classifyAnthropicError } from "@/lib/anthropicError";
import { clearAnthropicKeyCookie, readAnthropicKey } from "@/lib/anthropicKeyCookie";

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { healthReport, claudeText, messages } = body as {
      healthReport: unknown;
      claudeText?: string;
      messages: ChatMessage[];
    };

    if (!healthReport || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: "Missing healthReport or messages." },
        { status: 400 }
      );
    }

    const apiKey = readAnthropicKey(req);
    if (!apiKey) {
      return NextResponse.json(
        { success: false, code: "no_key", error: "Missing Anthropic API key. Please connect your key." },
        { status: 401 }
      );
    }

    const systemPrompt = `You are a GTM (Google Tag Manager) health-check assistant embedded in a dashboard chat.
You already gave the user an initial audit of this container's health check report (included below as your own prior analysis). Continue the conversation naturally — answer their follow-up questions specifically using the report data and your prior analysis. Be concise, write like you're actually talking to them, and if something isn't answerable from this data, say so plainly rather than guessing.

Health Check Report:
${JSON.stringify(healthReport, null, 2)}

Your prior analysis:
${claudeText ?? "(no prior analysis available)"}`;

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1000,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    // Same fix as the main audit route — don't assume content[0] is text.
    const textBlock = response.content.find((c) => c.type === "text");
    const reply = textBlock && "text" in textBlock ? textBlock.text : "";

    return NextResponse.json({ success: true, reply });
  } catch (error) {
    console.error("Claude Chat Error:", error);
    const failure = classifyAnthropicError(error);
    const response = NextResponse.json(
      { success: false, code: failure.code, error: failure.message },
      { status: failure.status }
    );
    if (failure.code === "invalid_key") clearAnthropicKeyCookie(response);
    return response;
  }
}