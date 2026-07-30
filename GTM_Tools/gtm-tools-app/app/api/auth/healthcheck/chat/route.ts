import { NextRequest, NextResponse } from "next/server";
import client from "@/lib/claude";

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { healthReport, claudeReport, messages } = body as {
            healthReport: unknown;
            claudeReport: unknown;
            messages: ChatMessage[];
        };

        if (!healthReport || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json(
                { success: false, error: "Missing healthReport or messages." },
                { status: 400 }
            );
        }

        const systemPrompt = `You are a GTM (Google Tag Manager) health-check assistant embedded in a dashboard chat.
You have already analyzed this container's health check report and produced an AI audit summary, both given below as context.
Answer the user's follow-up questions specifically using this data. Be concise — a few sentences or a short list, not a restated report. If asked something this data can't answer, say so plainly rather than guessing.

Health Check Report:
${JSON.stringify(healthReport, null, 2)}

AI Audit Summary:
${JSON.stringify(claudeReport ?? null, null, 2)}`;

        const response = await client.messages.create({
            model: "claude-sonnet-5",
            max_tokens: 999,
            system: systemPrompt,
            messages: messages.slice(-6).map(m => ({role: m.role,content: m.content,})),
        });

        const reply = response.content[0]?.type === "text" ? response.content[0].text : "";
        return NextResponse.json({ success: true, reply });
    } catch (error) {
        console.error("Claude Chat Error:", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}