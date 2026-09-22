import { createServer } from "node:http";
import handler from "../api/rfl-advisor.ts";
const port = Number(process.env.RFL_API_PORT || 3001);
createServer(async (req, res) => {
  if (req.url !== "/api/rfl-advisor") {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  try {
    let text = "";
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 48000) {
        res.writeHead(413, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Request too large" }));
        return;
      }
      text += chunk;
    }
    await handler(
      {
        method: req.method,
        headers: req.headers,
        body: text ? JSON.parse(text) : undefined,
      },
      res,
    );
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid JSON request" }));
  }
}).listen(port, "127.0.0.1", () =>
  console.log(`RFL advisor API listening on http://127.0.0.1:${port}`),
);
