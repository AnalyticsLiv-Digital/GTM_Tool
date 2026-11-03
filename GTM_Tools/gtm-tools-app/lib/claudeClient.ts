import Anthropic from "@anthropic-ai/sdk";

/**
 * One place that decides HOW the server talks to Claude.
 * Users never paste or see a key.
 *
 * Mode A - Google Cloud (Vertex AI), no Anthropic API key:
 *   CLAUDE_PROVIDER=vertex
 *   GOOGLE_CLOUD_PROJECT=your-gcp-project-id
 *   GOOGLE_CLOUD_REGION=global                (or a region that offers Claude)
 *   GOOGLE_SERVICE_ACCOUNT_JSON={...}         (service account JSON on one line; or use GOOGLE_APPLICATION_CREDENTIALS=path)
 *   CLAUDE_MODEL=<model ID shown in Vertex AI Model Garden>
 *
 * Mode B - Anthropic API key kept on the server:
 *   ANTHROPIC_API_KEY=sk-ant-...
 *   CLAUDE_MODEL=claude-haiku-5-5            (optional)
 */

export type ClaudeConnection = {
  client: Anthropic;
  model: string;
  mode: "vertex" | "api-key";
};

export class ClaudeNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClaudeNotConfiguredError";
  }
}

export async function getClaude(): Promise<ClaudeConnection> {
  const provider = process.env.CLAUDE_PROVIDER?.trim().toLowerCase();
  const model = process.env.CLAUDE_MODEL?.trim();

  if (provider === "vertex") {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT?.trim();
    const region = process.env.GOOGLE_CLOUD_REGION?.trim() || "global";

    if (!projectId) throw new ClaudeNotConfiguredError("GOOGLE_CLOUD_PROJECT is missing.");
    if (!model) {
      throw new ClaudeNotConfiguredError(
        "CLAUDE_MODEL is missing (use the model ID from Vertex AI Model Garden)."
      );
    }

    const { AnthropicVertex } = await import("@anthropic-ai/vertex-sdk");
    const { GoogleAuth } = await import("google-auth-library");

    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
    const googleAuth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
      ...(serviceAccountJson ? { credentials: JSON.parse(serviceAccountJson) } : {}),
    });

    const client = new AnthropicVertex({ projectId, region, googleAuth });
    return { client: client as unknown as Anthropic, model, mode: "vertex" };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new ClaudeNotConfiguredError("ANTHROPIC_API_KEY is missing.");

  return {
    client: new Anthropic({ apiKey }),
    model: model || "claude-haiku-5-5",
    mode: "api-key",
  };
}
