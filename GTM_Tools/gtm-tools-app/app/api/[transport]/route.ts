import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

const handler = createMcpHandler(
  (server) => {
    // Example tool 1: read data
    server.registerTool(
      "get_items",
      {
        description: "Search items in my app by keyword",
        inputSchema: { query: z.string() },
      },
      async ({ query }) => {
        const res = await fetch(
          `${process.env.APP_URL}/api/items?q=${encodeURIComponent(query)}`
        );
        const data = await res.json();
        return { content: [{ type: "text", text: JSON.stringify(data) }] };
      }
    );

    // Example tool 2: create data
    server.registerTool(
      "create_item",
      {
        description: "Create a new item in my app",
        inputSchema: { title: z.string(), description: z.string().optional() },
      },
      async ({ title, description }) => {
        const res = await fetch(`${process.env.APP_URL}/api/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, description }),
        });
        const data = await res.json();
        return { content: [{ type: "text", text: JSON.stringify(data) }] };
      }
    );
  },
  {},
);

export { handler as GET, handler as POST };