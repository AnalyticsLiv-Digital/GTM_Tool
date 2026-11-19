import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

const mcp = createMcpHandler(
  (server) => {
    server.registerTool(
      "ping",
      {
        title: "Ping",
        description: "Check that the GTM tool connection is working",
      },
      async () => ({
        content: [{ type: "text", text: "pong - GTM tool is connected" }],
      })
    );

    server.registerTool(
      "search_items",
      {
        title: "Search items",
        description: "Search records in the GTM tool by keyword",
        inputSchema: z.object({
          query: z.string().describe("Search keyword"),
        }),
      },
      async ({ query }) => {
        const res = await fetch(
          `${process.env.APP_URL}/api/items?q=${encodeURIComponent(query)}`
        );
        const data = await res.text();
        return { content: [{ type: "text", text: data }] };
      }
    );
  }
  
);

function guarded(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (!process.env.MCP_SECRET || key !== process.env.MCP_SECRET) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return mcp(req);
}

export { guarded as GET, guarded as POST };