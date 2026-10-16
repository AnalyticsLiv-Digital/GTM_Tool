const GTM_API =
  "https://tagmanager.googleapis.com/tagmanager/v2";

export async function gtmRequest<T>(
  path: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${GTM_API}/${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `GTM API Error ${response.status}: ${errorText}`
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}