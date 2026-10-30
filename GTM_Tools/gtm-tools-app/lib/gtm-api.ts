const GTM_API_BASE =
  "https://tagmanager.googleapis.com/tagmanager/v2";

type GTMRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | undefined>;
};

export async function gtmRequest<T>(
  accessToken: string,
  path: string,
  options: GTMRequestOptions = {}
): Promise<T> {
  const query = new URLSearchParams();

  Object.entries(options.query || {}).forEach(
    ([key, value]) => {
      if (value !== undefined) {
        query.set(key, value);
      }
    }
  );

  const queryString = query.toString();

  const url =
    `${GTM_API_BASE}/${path}` +
    (queryString ? `?${queryString}` : "");

  let response: Response;

  try {
    response = await fetch(url, {
      method: options.method || "GET",

      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },

      body:
        options.body !== undefined
          ? JSON.stringify(options.body)
          : undefined,

      cache: "no-store",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown network error";

    throw new Error(
      `Failed to connect to the GTM API: ${message}`
    );
  }

  const responseText = await response.text();

  if (!response.ok) {
    let apiMessage = responseText;

    try {
      const parsed = JSON.parse(responseText);

      apiMessage =
        parsed?.error?.message ||
        parsed?.message ||
        responseText;
    } catch {
      // Keep the original response if it is not JSON.
    }

    throw new Error(
      `GTM API ${response.status} ${response.statusText}: ${apiMessage.slice(
        0,
        1000
      )}`
    );
  }

  if (!responseText.trim()) {
    return {} as T;
  }

  try {
    return JSON.parse(responseText) as T;
  } catch {
    throw new Error(
      `GTM API returned invalid JSON for ${path}: ${responseText.slice(
        0,
        300
      )}`
    );
  }
}