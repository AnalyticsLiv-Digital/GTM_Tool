// Pagination helper for GTM v2 list endpoints.
//
// GTM v2 list responses have the shape:
//   { <listKey>: [...], nextPageToken?: string }
// where <listKey> is the singular resource name ("account", "container",
// "workspace", "tag", "trigger", "variable", ...). We loop on nextPageToken
// and accumulate `items`.
//
// Vercel-aware constraints:
//   - hard cap on pages so a misbehaving server can never lock us in a loop
//   - soft deadline so we never blow past Hobby's 10s function timeout; the
//     caller can pass a tighter budget if they're stacking other I/O
//
// On partial failure (a later page errors), we return what we've accumulated
// with `truncated: true` and the `error` describing the failure — the caller
// can choose to surface a warning rather than 500.

export type GtmListResult<T> = {
  items: T[];
  truncated: boolean;
  pages: number;
  error?: { status: number; body: unknown };
};

export type GtmListOptions = {
  /** Hard cap on pages walked. Default 50. */
  maxPages?: number;
  /** Soft deadline in ms from now. Default 8000 (Hobby is 10s). */
  deadlineMs?: number;
  /** Extra query params to merge into every request. */
  query?: Record<string, string>;
};

const DEFAULT_MAX_PAGES = 50;
const DEFAULT_DEADLINE_MS = 8_000;

export async function gtmList<T>(args: {
  url: string;
  accessToken: string;
  listKey: string;
  options?: GtmListOptions;
}): Promise<GtmListResult<T>> {
  const { url, accessToken, listKey, options = {} } = args;
  const maxPages = options.maxPages ?? DEFAULT_MAX_PAGES;
  const deadline = Date.now() + (options.deadlineMs ?? DEFAULT_DEADLINE_MS);

  const items: T[] = [];
  let pageToken: string | undefined;
  let pages = 0;

  while (pages < maxPages) {
    if (Date.now() > deadline && pages > 0) {
      return { items, truncated: true, pages };
    }

    const u = new URL(url);
    if (pageToken) u.searchParams.set("pageToken", pageToken);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) u.searchParams.set(k, v);
    }

    let res: Response;
    try {
      res = await fetch(u.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (err) {
      return {
        items,
        truncated: pages > 0,
        pages,
        error: { status: 0, body: { message: err instanceof Error ? err.message : "fetch failed" } },
      };
    }

    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }

    if (!res.ok) {
      return {
        items,
        truncated: pages > 0,
        pages,
        error: { status: res.status, body },
      };
    }

    pages += 1;
    const page = body as Record<string, unknown> | null;
    const pageItems = (page?.[listKey] as T[] | undefined) ?? [];
    if (Array.isArray(pageItems)) items.push(...pageItems);

    const next = page?.nextPageToken;
    if (typeof next === "string" && next.length > 0) {
      pageToken = next;
      continue;
    }
    return { items, truncated: false, pages };
  }

  // Hit the hard page cap with more data still available.
  return { items, truncated: true, pages };
}
