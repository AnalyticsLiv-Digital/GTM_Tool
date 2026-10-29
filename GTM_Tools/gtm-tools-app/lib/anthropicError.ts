import Anthropic from "@anthropic-ai/sdk";

export type AnthropicFailureCode =
  | "invalid_key"
  | "rate_limit"
  | "quota"
  | "overloaded"
  | "bad_request"
  | "network"
  | "unknown";

export type AnthropicFailure = {
  status: number;
  code: AnthropicFailureCode;
  message: string;
};

export function classifyAnthropicError(err: unknown): AnthropicFailure {
  if (err instanceof Anthropic.APIError) {
    const status = err.status ?? 500;
    const body = (err as { error?: unknown }).error as
      | { error?: { message?: string } }
      | undefined;
    const rawMsg = body?.error?.message ?? err.message ?? "Anthropic API error.";

    if (status === 401)
      return { status: 401, code: "invalid_key", message: "Invalid or unauthorized API key." };
    if (status === 403)
      return { status: 403, code: "invalid_key", message: "This API key isn't allowed to make this request." };
    if (status === 429)
      return { status: 429, code: "rate_limit", message: "Rate/usage limit reached for this API key." };
    if (status === 400 && /credit|billing|balance|quota|insufficient/i.test(rawMsg))
      return { status: 400, code: "quota", message: "This API key has run out of credits / quota." };
    if (status === 529)
      return { status: 529, code: "overloaded", message: "Anthropic is temporarily overloaded. Try again shortly." };

    return { status, code: "bad_request", message: rawMsg };
  }

  if (err instanceof Anthropic.APIConnectionError)
    return { status: 503, code: "network", message: "Couldn't reach Anthropic. Check the connection." };

  if (err instanceof Error) return { status: 500, code: "unknown", message: err.message };
  return { status: 500, code: "unknown", message: "Unknown Anthropic error." };
}